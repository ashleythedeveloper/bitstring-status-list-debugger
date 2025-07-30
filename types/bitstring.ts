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

export interface StatusListResult {
  success: boolean;
  data?: DecodedStatusList;
  error?: string;
} 