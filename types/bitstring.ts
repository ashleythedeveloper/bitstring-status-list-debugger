export interface BitstringStatusList {
  '@context': string[];
  id: string;
  type: 'BitstringStatusList';
  statusPurpose: 'revocation' | 'suspension' | string;
  encodedList: string;
  validFrom?: string;
  validUntil?: string;
}

export interface StatusListCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string | object;
  validFrom?: string;
  validUntil?: string;
  credentialSubject: BitstringStatusList;
  proof?: any;
}

export interface EnvelopedVerifiableCredential {
  '@context': string[];
  id: string; // Contains JWT token with format "data:application/vc-ld+jwt,{JWT}"
  type: 'EnvelopedVerifiableCredential';
}

export interface CredentialStatus {
  id: string;
  type: 'BitstringStatusListEntry';
  statusPurpose: 'revocation' | 'suspension' | string;
  statusListIndex: string;
  statusListCredential: string;
}

export interface BitStatus {
  index: number;
  status: boolean;
  purpose: string;
}

export interface DecodedStatusList {
  credential: StatusListCredential; // Always the actual decoded credential data
  bitstringList: BitstringStatusList;
  decodedBits: Uint8Array;
  totalBits: number;
  credentialType: 'embedded' | 'enveloped';
  originalEnvelopedCredential?: EnvelopedVerifiableCredential; // Original wrapper for enveloped creds
}

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CORS_ERROR = 'CORS_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // HTTP errors
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SERVER_ERROR = 'SERVER_ERROR',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Parsing errors
  INVALID_JSON = 'INVALID_JSON',
  INVALID_CREDENTIAL_FORMAT = 'INVALID_CREDENTIAL_FORMAT',
  MISSING_CREDENTIAL_TYPE = 'MISSING_CREDENTIAL_TYPE',
  UNSUPPORTED_CREDENTIAL_TYPE = 'UNSUPPORTED_CREDENTIAL_TYPE',
  MISSING_BITSTRING_LIST = 'MISSING_BITSTRING_LIST',
  
  // Decoding errors
  BASE64_DECODE_ERROR = 'BASE64_DECODE_ERROR',
  GZIP_DECODE_ERROR = 'GZIP_DECODE_ERROR',
  JWT_PARSE_ERROR = 'JWT_PARSE_ERROR',
  DECOMPRESSION_ERROR = 'DECOMPRESSION_ERROR',
  
  // Validation errors
  INVALID_BIT_INDEX = 'INVALID_BIT_INDEX',
  INVALID_BIT_RANGE = 'INVALID_BIT_RANGE',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface DetailedError {
  code: ErrorCode;
  message: string;
  details?: string;
  statusCode?: number;
  suggestion?: string;
}

export interface StatusListResult {
  success: boolean;
  data?: DecodedStatusList;
  error?: DetailedError;
} 