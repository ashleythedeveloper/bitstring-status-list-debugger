'use client';

import { useState } from 'react';
import { DecodedStatusList } from '@/types/bitstring';
import { BitstringService } from '@/services/bitstringService';
import StatusListInput from '@/components/StatusListInput';
import CredentialInfo from '@/components/CredentialInfo';
import BitViewer from '@/components/BitViewer';
import { AlertCircle, Download } from 'lucide-react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [decoded, setDecoded] = useState<DecodedStatusList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  const handleFetchStatusList = async (url: string) => {
    setLoading(true);
    setError(null);
    setDecoded(null);
    setCurrentUrl(url);

    try {
      const result = await BitstringService.fetchStatusList(url);
      
      if (result.success && result.data) {
        setDecoded(result.data);
      } else {
        setError(result.error || 'Failed to fetch and decode status list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!decoded) return;

    const dataToDownload = {
      url: currentUrl,
      credential: decoded.credential,
      originalEnvelopedCredential: decoded.originalEnvelopedCredential,
      credentialInfo: BitstringService.formatCredentialInfo(decoded),
      fetchedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitstring-status-list-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <StatusListInput onFetch={handleFetchStatusList} loading={loading} />
      
      {error && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {decoded && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Status List Analysis
            </h2>
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </button>
          </div>
          
          <CredentialInfo decoded={decoded} />
          <BitViewer decoded={decoded} />
        </div>
      )}

      {!loading && !decoded && !error && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to Bitstring Status List Debugger
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Enter a URL pointing to a Bitstring Status List credential to analyze its contents, 
              decode the status list, and check individual bits or ranges.
            </p>
            <div className="mt-6 text-sm text-gray-500">
              <p className="mb-2"><strong>Supported formats:</strong></p>
              <ul className="text-left inline-block">
                <li>• Embedded proof credentials</li>
                <li>• Enveloped verifiable credentials</li>
                <li>• GZIP compressed bitstrings</li>
                <li>• Base64URL encoded data</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 