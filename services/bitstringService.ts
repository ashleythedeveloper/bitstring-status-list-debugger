import { inflate } from 'pako';
import base64url from 'base64url';
import {
  StatusListCredential,
  EnvelopedVerifiableCredential,
  DecodedStatusList,
  StatusListResult,
  BitStatus,
  ErrorCode,
  DetailedError
} from '@/types/bitstring';

export class BitstringService {
  private static createError(code: ErrorCode, message: string, details?: string, statusCode?: number, suggestion?: string): DetailedError {
    return { code, message, details, statusCode, suggestion };
  }

  static async fetchStatusList(url: string): Promise<StatusListResult> {
    try {
      // Fetch the credential from the URL
      let response: Response;
      try {
        response = await fetch(url);
      } catch (fetchError) {
        // Network-level errors
        if (fetchError instanceof TypeError && fetchError.message.includes('CORS')) {
          return {
            success: false,
            error: this.createError(
              ErrorCode.CORS_ERROR,
              'Cross-origin request blocked',
              'The server doesn\'t allow requests from this domain.',
              undefined,
              'Contact the server administrator to enable CORS, or use a proxy server.'
            )
          };
        }
        return {
          success: false,
          error: this.createError(
            ErrorCode.NETWORK_ERROR,
            'Unable to connect to the server',
            fetchError instanceof Error ? fetchError.message : 'Network request failed',
            undefined,
            'Check your internet connection and verify the URL is correct.'
          )
        };
      }

      // Handle HTTP status codes
      if (!response.ok) {
        let error: DetailedError;
        switch (response.status) {
          case 404:
            error = this.createError(
              ErrorCode.NOT_FOUND,
              'Credential not found',
              `The URL returned a 404 Not Found error.`,
              404,
              'Verify the URL is correct and the credential exists.'
            );
            break;
          case 401:
            error = this.createError(
              ErrorCode.UNAUTHORIZED,
              'Authentication required',
              'The server requires authentication to access this credential.',
              401,
              'Provide valid authentication credentials or contact the credential issuer.'
            );
            break;
          case 403:
            error = this.createError(
              ErrorCode.FORBIDDEN,
              'Access denied',
              'You don\'t have permission to access this credential.',
              403,
              'Contact the credential issuer for access permissions.'
            );
            break;
          case 500:
            error = this.createError(
              ErrorCode.SERVER_ERROR,
              'Server error',
              'The credential server encountered an internal error.',
              500,
              'Try again later or contact the server administrator.'
            );
            break;
          case 502:
            error = this.createError(
              ErrorCode.BAD_GATEWAY,
              'Bad gateway',
              'The server received an invalid response from an upstream server.',
              502,
              'Try again later. The issue is likely temporary.'
            );
            break;
          case 503:
            error = this.createError(
              ErrorCode.SERVICE_UNAVAILABLE,
              'Service unavailable',
              'The credential service is temporarily unavailable.',
              503,
              'The service may be under maintenance. Try again later.'
            );
            break;
          default:
            error = this.createError(
              ErrorCode.SERVER_ERROR,
              `HTTP ${response.status} error`,
              response.statusText || 'Server returned an error response.',
              response.status,
              'Check the URL and try again later.'
            );
        }
        return { success: false, error };
      }

      // Parse JSON response
      let credential: any;
      try {
        credential = await response.json();
      } catch (jsonError) {
        return {
          success: false,
          error: this.createError(
            ErrorCode.INVALID_JSON,
            'Invalid JSON response',
            'The server response is not valid JSON.',
            undefined,
            'Verify the URL points to a valid credential endpoint.'
          )
        };
      }
      
      // Validate credential has a type field
      if (!credential.type) {
        return {
          success: false,
          error: this.createError(
            ErrorCode.MISSING_CREDENTIAL_TYPE,
            'Invalid credential format',
            'The credential is missing the required "type" field.',
            undefined,
            'Ensure the URL points to a valid verifiable credential.'
          )
        };
      }

      // Determine if it's an enveloped or embedded proof credential
      const isEnveloped = credential.type === 'EnvelopedVerifiableCredential';
      
      let statusListCredential: StatusListCredential;
      let credentialType: 'embedded' | 'enveloped';

      if (isEnveloped) {
        const envelopedCred = credential as EnvelopedVerifiableCredential;
        // Extract and decode JWT from the id field
        const decodeResult = this.decodeEnvelopedCredential(envelopedCred);
        if ('error' in decodeResult) {
          return { success: false, error: decodeResult.error };
        }
        statusListCredential = decodeResult.credential;
        credentialType = 'enveloped';
      } else if (Array.isArray(credential.type) || typeof credential.type === 'string') {
        statusListCredential = credential as StatusListCredential;
        credentialType = 'embedded';
      } else {
        return {
          success: false,
          error: this.createError(
            ErrorCode.UNSUPPORTED_CREDENTIAL_TYPE,
            'Unsupported credential type',
            `Credential type "${credential.type}" is not supported.`,
            undefined,
            'Expected "EnvelopedVerifiableCredential" or a standard credential with embedded proof.'
          )
        };
      }

      // Extract the bitstring status list
      const bitstringList = statusListCredential.credentialSubject;
      
      if (!bitstringList) {
        return {
          success: false,
          error: this.createError(
            ErrorCode.MISSING_BITSTRING_LIST,
            'Missing BitstringStatusList',
            'The credential does not contain a credentialSubject field.',
            undefined,
            'The credential structure is invalid. Verify it\'s a status list credential.'
          )
        };
      }

      if (bitstringList.type !== 'BitstringStatusList') {
        return {
          success: false,
          error: this.createError(
            ErrorCode.INVALID_CREDENTIAL_FORMAT,
            'Invalid BitstringStatusList',
            `Expected type "BitstringStatusList" but got "${bitstringList.type}".`,
            undefined,
            'The credential is not a valid Bitstring Status List credential.'
          )
        };
      }

      if (!bitstringList.encodedList) {
        return {
          success: false,
          error: this.createError(
            ErrorCode.INVALID_CREDENTIAL_FORMAT,
            'Missing encoded list',
            'The BitstringStatusList does not contain an encodedList field.',
            undefined,
            'The status list credential is incomplete or corrupted.'
          )
        };
      }

      // Decode the status list
      const decodeResult = this.decodeStatusList(bitstringList.encodedList);
      if ('error' in decodeResult) {
        return { success: false, error: decodeResult.error };
      }
      const decodedBits = decodeResult.data;

      const result: DecodedStatusList = {
        credential: statusListCredential, // Always store the actual credential data
        bitstringList,
        decodedBits,
        totalBits: decodedBits.length * 8,
        credentialType,
        originalEnvelopedCredential: isEnveloped ? credential : undefined
      };

      return {
        success: true,
        data: result
      };

    } catch (error) {
      // Catch any unexpected errors
      return {
        success: false,
        error: this.createError(
          ErrorCode.UNKNOWN_ERROR,
          'An unexpected error occurred',
          error instanceof Error ? error.message : 'Unknown error',
          undefined,
          'Please try again or report this issue if it persists.'
        )
      };
    }
  }

  static decodeStatusList(encodedList: string): { data: Uint8Array } | { error: DetailedError } {
    try {      
      // Try multiple decoding approaches
      let compressed: Buffer;
      
      try {
        // First try with base64url library
        compressed = base64url.toBuffer(encodedList);
      } catch (base64urlError) {
        console.warn('base64url library failed, trying manual decode:', base64urlError);
        
        // Manual base64url decoding as fallback (browser-compatible)
        let base64 = encodedList.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        while (base64.length % 4) {
          base64 += '=';
        }
        
        try {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          compressed = Buffer.from(bytes);
        } catch (atobError) {
          console.error('Manual base64 decode failed:', atobError);
          return {
            error: this.createError(
              ErrorCode.BASE64_DECODE_ERROR,
              'Failed to decode Base64URL data',
              `The encoded list could not be decoded from Base64URL format. ${atobError instanceof Error ? atobError.message : 'Unknown error'}`,
              undefined,
              'The encoded data may be corrupted or not properly Base64URL encoded.'
            )
          };
        }
      }
      
      // Check what type of data we have
      const hex = Array.from(compressed.subarray(0, 10))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      // Try different decompression methods
      let decompressed: Uint8Array;
      
      // Check for GZIP magic bytes (1f 8b)
      if (compressed[0] === 0x1f && compressed[1] === 0x8b) {
        try {
          decompressed = inflate(compressed);
        } catch (gzipError) {
          console.error('GZIP decompression failed:', gzipError);
          return {
            error: this.createError(
              ErrorCode.GZIP_DECODE_ERROR,
              'Failed to decompress GZIP data',
              `The GZIP compressed data could not be decompressed. ${gzipError instanceof Error ? gzipError.message : 'Unknown error'}`,
              undefined,
              'The compressed data may be corrupted. Try fetching the credential again.'
            )
          };
        }
      } else {        
        // Try raw deflate
        try {
          decompressed = inflate(compressed, { raw: true });
        } catch (deflateError) {
          console.warn('Raw deflate failed:', deflateError);
          
          // Try treating as uncompressed data
          try {
            decompressed = new Uint8Array(compressed);
          } catch (rawError) {
            console.error('All decompression methods failed');
            return {
              error: this.createError(
                ErrorCode.DECOMPRESSION_ERROR,
                'Failed to decompress data',
                `Unable to decompress the encoded list. Tried GZIP and raw deflate. Data header: ${hex}`,
                undefined,
                'The data may not be compressed or uses an unsupported compression format.'
              )
            };
          }
        }
      }
      
      return { data: decompressed };
    } catch (error) {
      console.error('Error in decodeStatusList:', error);
      console.error('Encoded list sample:', encodedList.substring(0, 100));
      return {
        error: this.createError(
          ErrorCode.UNKNOWN_ERROR,
          'Failed to decode status list',
          error instanceof Error ? error.message : 'Unknown decoding error',
          undefined,
          'An unexpected error occurred while decoding. Please report this issue.'
        )
      };
    }
  }

  static getBitStatus(decodedBits: Uint8Array, index: number): boolean | DetailedError {
    if (index < 0) {
      return this.createError(
        ErrorCode.INVALID_BIT_INDEX,
        'Invalid bit index',
        `Bit index must be non-negative, but got ${index}.`,
        undefined,
        'Use a valid index starting from 0.'
      );
    }

    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    const maxIndex = decodedBits.length * 8 - 1;
    
    if (byteIndex >= decodedBits.length) {
      return this.createError(
        ErrorCode.INVALID_BIT_INDEX,
        'Bit index out of range',
        `Index ${index} exceeds the maximum index ${maxIndex}.`,
        undefined,
        `Valid range is 0 to ${maxIndex}.`
      );
    }
    
    const byte = decodedBits[byteIndex];
    return (byte & (1 << bitIndex)) !== 0;
  }

  static getBitRange(decodedBits: Uint8Array, startIndex: number, endIndex: number): BitStatus[] | DetailedError {
    if (startIndex < 0) {
      return this.createError(
        ErrorCode.INVALID_BIT_RANGE,
        'Invalid start index',
        `Start index must be non-negative, but got ${startIndex}.`,
        undefined,
        'Use a valid start index starting from 0.'
      );
    }

    if (endIndex < startIndex) {
      return this.createError(
        ErrorCode.INVALID_BIT_RANGE,
        'Invalid bit range',
        `End index (${endIndex}) must be greater than or equal to start index (${startIndex}).`,
        undefined,
        'Ensure the end index is not less than the start index.'
      );
    }

    const maxIndex = decodedBits.length * 8 - 1;
    if (startIndex > maxIndex) {
      return this.createError(
        ErrorCode.INVALID_BIT_RANGE,
        'Start index out of range',
        `Start index ${startIndex} exceeds the maximum index ${maxIndex}.`,
        undefined,
        `Valid range is 0 to ${maxIndex}.`
      );
    }

    if (endIndex > maxIndex) {
      return this.createError(
        ErrorCode.INVALID_BIT_RANGE,
        'End index out of range',
        `End index ${endIndex} exceeds the maximum index ${maxIndex}.`,
        undefined,
        `Valid range is 0 to ${maxIndex}.`
      );
    }

    // Check if range is too large (prevent performance issues)
    const rangeSize = endIndex - startIndex + 1;
    if (rangeSize > 10000) {
      return this.createError(
        ErrorCode.INVALID_BIT_RANGE,
        'Range too large',
        `Range size (${rangeSize}) is too large. Maximum allowed is 10000 bits.`,
        undefined,
        'Try a smaller range or check specific bits individually.'
      );
    }

    const result: BitStatus[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const bitStatus = this.getBitStatus(decodedBits, i);
      if (typeof bitStatus === 'boolean') {
        result.push({
          index: i,
          status: bitStatus,
          purpose: 'revocation' // This could be made dynamic based on the credential
        });
      }
    }

    return result;
  }

  static decodeEnvelopedCredential(envelopedCred: EnvelopedVerifiableCredential): { credential: StatusListCredential } | { error: DetailedError } {
    try {      
      // Validate the id field exists
      if (!envelopedCred.id) {
        return {
          error: this.createError(
            ErrorCode.JWT_PARSE_ERROR,
            'Missing JWT token',
            'The EnvelopedVerifiableCredential does not contain an id field with the JWT.',
            undefined,
            'The credential format is invalid.'
          )
        };
      }

      // Extract JWT from the id field (handle multiple possible prefixes)
      let jwtToken = envelopedCred.id;
      
      // Try different possible data URL prefixes
      const possiblePrefixes = [
        'data:application/vc+jwt,',
        'data:application/vc-ld+jwt,',
        'data:application/vc+ld+jwt,',
        'data:application/jwt,'
      ];
      
      let prefixFound = false;
      for (const prefix of possiblePrefixes) {
        if (jwtToken.startsWith(prefix)) {
          jwtToken = jwtToken.substring(prefix.length);
          prefixFound = true;
          break;
        }
      }
      
      if (!prefixFound) {
        return {
          error: this.createError(
            ErrorCode.JWT_PARSE_ERROR,
            'Invalid JWT format',
            `The id field does not contain a valid JWT token with a recognized prefix. Got: "${envelopedCred.id.substring(0, 50)}..."`,
            undefined,
            'Expected format: "data:application/vc+jwt,{JWT_TOKEN}" or similar'
          )
        };
      }
      
      if (!jwtToken) {
        return {
          error: this.createError(
            ErrorCode.JWT_PARSE_ERROR,
            'Empty JWT token',
            'The JWT token is empty after removing the data URL prefix.',
            undefined,
            'The credential format is invalid.'
          )
        };
      }

      // Decode JWT payload (simple base64 decode - no signature verification)
      const parts = jwtToken.split('.');
      if (parts.length !== 3) {
        return {
          error: this.createError(
            ErrorCode.JWT_PARSE_ERROR,
            'Invalid JWT structure',
            `JWT must have 3 parts (header.payload.signature), but found ${parts.length} parts.`,
            undefined,
            'The JWT token is malformed or corrupted.'
          )
        };
      }
            
      // Decode the payload (second part)
      const payload = parts[1];
      if (!payload) {
        return {
          error: this.createError(
            ErrorCode.JWT_PARSE_ERROR,
            'Empty JWT payload',
            'The JWT payload section is empty.',
            undefined,
            'The JWT token is corrupted.'
          )
        };
      }

      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      
      let decodedPayload: string;
      try {
        decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
      } catch (base64Error) {
        return {
          error: this.createError(
            ErrorCode.BASE64_DECODE_ERROR,
            'Failed to decode JWT payload',
            `Could not decode the JWT payload from Base64. ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`,
            undefined,
            'The JWT payload is not valid Base64 encoded data.'
          )
        };
      }
      
      let credentialData: any;
      try {
        credentialData = JSON.parse(decodedPayload);
      } catch (jsonError) {
        return {
          error: this.createError(
            ErrorCode.INVALID_JSON,
            'Invalid JWT payload JSON',
            `The JWT payload is not valid JSON. ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
            undefined,
            'The JWT contains malformed data.'
          )
        };
      }
      
      // Validate the decoded credential has required fields
      if (!credentialData.credentialSubject) {
        return {
          error: this.createError(
            ErrorCode.INVALID_CREDENTIAL_FORMAT,
            'Invalid credential in JWT',
            'The decoded JWT does not contain a valid StatusListCredential.',
            undefined,
            'The JWT payload does not match the expected credential format.'
          )
        };
      }

      return { credential: credentialData as StatusListCredential };
    } catch (error) {
      console.error('Error in decodeEnvelopedCredential:', error);
      return {
        error: this.createError(
          ErrorCode.UNKNOWN_ERROR,
          'Failed to decode enveloped credential',
          error instanceof Error ? error.message : 'Unknown error',
          undefined,
          'An unexpected error occurred while decoding the JWT.'
        )
      };
    }
  }

  static formatCredentialInfo(decoded: DecodedStatusList): Record<string, any> {
    const { credential, bitstringList, credentialType } = decoded;
    
    return {
      credentialType,
      id: bitstringList.id,
      statusPurpose: bitstringList.statusPurpose,
      totalBits: decoded.totalBits,
      validFrom: bitstringList.validFrom,
      validUntil: bitstringList.validUntil,
      issuer: credential.issuer // credential is always StatusListCredential now
    };
  }
} 