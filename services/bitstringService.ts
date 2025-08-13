import { inflate } from 'pako';
import base64url from 'base64url';
import {
  StatusListCredential,
  EnvelopedVerifiableCredential,
  DecodedStatusList,
  StatusListResult,
  BitStatus
} from '@/types/bitstring';

export class BitstringService {
  static async fetchStatusList(url: string): Promise<StatusListResult> {
    try {
      // Fetch the credential from the URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch status list: ${response.status} ${response.statusText}`);
      }

      const credential = await response.json();
      
      // Determine if it's an enveloped or embedded proof credential
      const isEnveloped = credential.type === 'EnvelopedVerifiableCredential';
      
      let statusListCredential: StatusListCredential;
      let credentialType: 'embedded' | 'enveloped';

      if (isEnveloped) {
        const envelopedCred = credential as EnvelopedVerifiableCredential;
        // Extract and decode JWT from the id field
        statusListCredential = this.decodeEnvelopedCredential(envelopedCred);
        credentialType = 'enveloped';
      } else {
        statusListCredential = credential as StatusListCredential;
        credentialType = 'embedded';
      }

      // Extract the bitstring status list
      const bitstringList = statusListCredential.credentialSubject;
      
      if (!bitstringList || bitstringList.type !== 'BitstringStatusList') {
        throw new Error('Invalid credential: missing or invalid BitstringStatusList');
      }

      // Decode the status list
      const decodedBits = this.decodeStatusList(bitstringList.encodedList);

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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static decodeStatusList(encodedList: string): Uint8Array {
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
          throw new Error(`Base64 decoding failed: ${atobError instanceof Error ? atobError.message : 'Unknown error'}`);
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
          throw gzipError;
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
            throw new Error(`All decompression methods failed. Deflate: ${deflateError}, Raw: ${rawError}`);
          }
        }
      }
      
      return decompressed;
    } catch (error) {
      console.error('Error in decodeStatusList:', error);
      console.error('Encoded list sample:', encodedList.substring(0, 100));
      console.error('Full encoded list:', encodedList);
      throw new Error(`Failed to decode status list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static getBitStatus(decodedBits: Uint8Array, index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    
    if (byteIndex >= decodedBits.length) {
      throw new Error(`Index ${index} is out of range (max: ${decodedBits.length * 8 - 1})`);
    }
    
    const byte = decodedBits[byteIndex];
    return (byte & (1 << bitIndex)) !== 0;
  }

  static getBitRange(decodedBits: Uint8Array, startIndex: number, endIndex: number): BitStatus[] {
    if (startIndex < 0 || endIndex < startIndex) {
      throw new Error('Invalid range: startIndex must be >= 0 and endIndex must be >= startIndex');
    }

    const maxIndex = decodedBits.length * 8 - 1;
    if (startIndex > maxIndex || endIndex > maxIndex) {
      throw new Error(`Range [${startIndex}, ${endIndex}] exceeds maximum index ${maxIndex}`);
    }

    const result: BitStatus[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        status: this.getBitStatus(decodedBits, i),
        purpose: 'revocation' // This could be made dynamic based on the credential
      });
    }

    return result;
  }

  static decodeEnvelopedCredential(envelopedCred: EnvelopedVerifiableCredential): StatusListCredential {
    try {      
      // Extract JWT from the id field (remove the data: prefix)
      const jwtToken = envelopedCred.id.replace('data:application/vc-ld+jwt,', '');
      
      // Decode JWT payload (simple base64 decode - no signature verification)
      const parts = jwtToken.split('.');
      if (parts.length !== 3) {
        throw new Error(`Invalid JWT format: expected 3 parts, got ${parts.length}`);
      }
            
      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      
      const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
      
      const credentialData = JSON.parse(decodedPayload);
      
      return credentialData as StatusListCredential;
    } catch (error) {
      console.error('Error in decodeEnvelopedCredential:', error);
      throw new Error(`Failed to decode enveloped credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
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