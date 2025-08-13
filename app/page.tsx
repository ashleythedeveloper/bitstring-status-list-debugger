'use client';

import { useState } from 'react';
import { DecodedStatusList, DetailedError } from '@/types/bitstring';
import { BitstringService } from '@/services/bitstringService';
import StatusListInput from '@/components/StatusListInput';
import CredentialInfo from '@/components/CredentialInfo';
import BitViewer from '@/components/BitViewer';
import { AlertCircle, Download } from 'lucide-react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [decoded, setDecoded] = useState<DecodedStatusList | null>(null);
  const [error, setError] = useState<DetailedError | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [autoCheckResult, setAutoCheckResult] = useState<{
    index: number;
    status: boolean;
  } | null>(null);

  const handleFetchStatusList = async (url: string) => {
    setLoading(true);
    setError(null);
    setDecoded(null);
    setCurrentUrl(url);
    setAutoCheckResult(null);

    try {
      const result = await BitstringService.fetchStatusList(url);
      
      if (result.success && result.data) {
        setDecoded(result.data);
        
        // If there's a bit index in the URL, automatically check it
        if (result.urlBitIndex !== undefined) {
          const bitStatus = BitstringService.getBitStatus(result.data.decodedBits, result.urlBitIndex);
          if (typeof bitStatus === 'boolean') {
            setAutoCheckResult({
              index: result.urlBitIndex,
              status: bitStatus
            });
          }
        }
      } else {
        setError(result.error || {
          code: 'UNKNOWN_ERROR' as any,
          message: 'Failed to fetch and decode status list',
          details: 'An unexpected error occurred.'
        });
      }
    } catch (err) {
      setError({
        code: 'UNKNOWN_ERROR' as any,
        message: 'An unexpected error occurred',
        details: err instanceof Error ? err.message : 'Unknown error',
        suggestion: 'Please try again or check the browser console for more details.'
      });
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
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">
                  {error.statusCode ? `Error ${error.statusCode}: ` : 'Error: '}{error.message}
                </h3>
                {error.details && (
                  <p className="text-sm text-red-700 mt-1">{error.details}</p>
                )}
                {error.suggestion && (
                  <div className="mt-3 p-2 bg-red-100 rounded">
                    <p className="text-sm text-red-800">
                      <strong>💡 Suggestion:</strong> {error.suggestion}
                    </p>
                  </div>
                )}
                {error.code && (
                  <p className="text-xs text-red-600 mt-2">Error code: {error.code}</p>
                )}
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
          
          {autoCheckResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">
                Auto-checked Bit from URL Fragment
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg">
                    Bit #{autoCheckResult.index}: <span className={`font-bold ${
                      autoCheckResult.status ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {autoCheckResult.status ? '1 (SET)' : '0 (UNSET)'}
                    </span>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Status: {autoCheckResult.status ? 'Revoked/Suspended' : 'Valid/Active'}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${
                  autoCheckResult.status ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {autoCheckResult.status ? (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )}
          
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