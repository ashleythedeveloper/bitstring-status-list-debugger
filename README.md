# Bitstring Status List Debugger

A Next.js web application for debugging and analyzing Bitstring Status List credentials used in verifiable credentials systems. This tool allows you to fetch, decode, and inspect status list credentials to check the revocation or suspension status of individual credentials.

## Features

- **URL Input & Fetching**: Enter any URL pointing to a Bitstring Status List credential
- **Credential Detection**: Automatically detects embedded proof vs enveloped verifiable credentials
- **Status List Decoding**: Decodes GZIP-compressed, Base64URL-encoded bitstrings
- **Credential Information Display**: Shows metadata including issuer, validity dates, and purpose
- **Bit Status Checking**:
  - Check individual bit status by index
  - Check ranges of bits with visual indicators
- **Export Functionality**: Download analyzed data as JSON
- **Modern UI**: Responsive design with Tailwind CSS and Lucide icons

## Supported Formats

- **Embedded proof credentials**: Traditional verifiable credentials with embedded proofs
- **Enveloped verifiable credentials**: JWT-style enveloped credentials
- **GZIP compression**: Automatically handles compressed bitstrings
- **Base64URL encoding**: Proper decoding of encoded status lists

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Enter URL**: Paste the URL of a Bitstring Status List credential into the input field
2. **Fetch & Decode**: Click "Fetch Status List" to retrieve and decode the credential
3. **View Information**: Review the credential metadata and total bit count
4. **Check Bits**:
   - Use "Single Bit" mode to check individual status entries
   - Use "Bit Range" mode to check multiple consecutive bits
5. **Export Data**: Click "Download JSON" to save the analyzed data

## API Reference

### BitstringService

The core service class that handles fetching and decoding operations:

- `fetchStatusList(url: string)`: Fetches and decodes a status list credential
- `decodeStatusList(encodedList: string)`: Decodes a Base64URL + GZIP encoded bitstring
- `getBitStatus(decodedBits: Uint8Array, index: number)`: Gets the status of a specific bit
- `getBitRange(decodedBits: Uint8Array, start: number, end: number)`: Gets status for a range of bits
- `formatCredentialInfo(decoded: DecodedStatusList)`: Formats credential metadata for display

### Types

Key TypeScript interfaces:

- `BitstringStatusList`: The core status list structure
- `StatusListCredential`: Standard verifiable credential format
- `EnvelopedVerifiableCredential`: JWT-style enveloped format
- `DecodedStatusList`: Complete decoded result with metadata
- `BitStatus`: Individual bit status with index and purpose

## Understanding Bit Status

- **Bit Value 0 (UNSET)**: Credential is **valid/active**
- **Bit Value 1 (SET)**: Credential is **revoked/suspended**

The status purpose (revocation, suspension, etc.) is defined in the credential metadata.

## Project Structure

```
bitstring-status-list-debugger/
├── app/
│   ├── globals.css          # Global styles and Tailwind directives
│   ├── layout.tsx          # Root layout component
│   └── page.tsx            # Main application page
├── components/
│   ├── BitViewer.tsx       # Bit status checking interface
│   ├── CredentialInfo.tsx  # Credential metadata display
│   └── StatusListInput.tsx # URL input and fetch controls
├── services/
│   └── bitstringService.ts # Core decoding and analysis logic
├── types/
│   └── bitstring.ts        # TypeScript type definitions
└── package.json           # Dependencies and scripts
```

## Dependencies

- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling framework
- **Lucide React**: Icon library
- **pako**: GZIP compression/decompression
- **base64url**: Base64URL encoding/decoding

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Security Notes

- This tool makes HTTP requests to external URLs - ensure you trust the sources
- Credentials are processed client-side only
- No data is stored or transmitted to external servers beyond the initial fetch
