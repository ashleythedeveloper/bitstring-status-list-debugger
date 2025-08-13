'use client';

import { useState } from 'react';
import { DecodedStatusList, BitStatus, DetailedError } from '@/types/bitstring';
import { BitstringService } from '@/services/bitstringService';
import { Search, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface BitViewerProps {
  decoded: DecodedStatusList;
}

export default function BitViewer({ decoded }: BitViewerProps) {
  const [singleIndex, setSingleIndex] = useState('');
  const [startIndex, setStartIndex] = useState('');
  const [endIndex, setEndIndex] = useState('');
  const [viewMode, setViewMode] = useState<'single' | 'range'>('single');
  const [result, setResult] = useState<{
    type: 'single' | 'range';
    data: boolean | BitStatus[];
    index?: number;
    error?: DetailedError;
  } | null>(null);

  const handleSingleBitCheck = () => {
    const index = parseInt(singleIndex);
    if (isNaN(index)) {
      setResult({
        type: 'single',
        data: false,
        error: {
          code: 'INVALID_BIT_INDEX' as any,
          message: 'Invalid input',
          details: 'Please enter a valid number for the bit index.'
        }
      });
      return;
    }
    
    const status = BitstringService.getBitStatus(decoded.decodedBits, index);
    
    if (typeof status === 'boolean') {
      setResult({
        type: 'single',
        data: status,
        index
      });
    } else {
      // status is a DetailedError
      setResult({
        type: 'single',
        data: false,
        error: status
      });
    }
  };

  const handleRangeCheck = () => {
    const start = parseInt(startIndex);
    const end = parseInt(endIndex);
    
    if (isNaN(start) || isNaN(end)) {
      setResult({
        type: 'range',
        data: [],
        error: {
          code: 'INVALID_BIT_RANGE' as any,
          message: 'Invalid input',
          details: 'Please enter valid numbers for both start and end indices.'
        }
      });
      return;
    }
    
    const statuses = BitstringService.getBitRange(decoded.decodedBits, start, end);
    
    if (Array.isArray(statuses)) {
      setResult({
        type: 'range',
        data: statuses
      });
    } else {
      // statuses is a DetailedError
      setResult({
        type: 'range',
        data: [],
        error: statuses
      });
    }
  };

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? (
      <XCircle className="h-5 w-5 text-red-500" />
    ) : (
      <CheckCircle className="h-5 w-5 text-green-500" />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Search className="h-5 w-5 text-blue-600" />
        Bit Status Viewer
      </h2>
      
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setViewMode('single')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'single'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Single Bit
          </button>
          <button
            onClick={() => setViewMode('range')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'range'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bit Range
          </button>
        </div>
        
        {viewMode === 'single' ? (
          <div className="flex gap-3">
            <input
              type="number"
              value={singleIndex}
              onChange={(e) => setSingleIndex(e.target.value)}
              placeholder="Enter bit index (0-based)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              min="0"
              max={decoded.totalBits - 1}
            />
            <button
              onClick={handleSingleBitCheck}
              disabled={!singleIndex}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Check Bit
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              type="number"
              value={startIndex}
              onChange={(e) => setStartIndex(e.target.value)}
              placeholder="Start index"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              min="0"
              max={decoded.totalBits - 1}
            />
            <input
              type="number"
              value={endIndex}
              onChange={(e) => setEndIndex(e.target.value)}
              placeholder="End index"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              min={startIndex || 0}
              max={decoded.totalBits - 1}
            />
            <button
              onClick={handleRangeCheck}
              disabled={!startIndex || !endIndex}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Check Range
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          {result.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800">{result.error.message}</h4>
                  {result.error.details && (
                    <p className="text-sm text-red-700 mt-1">{result.error.details}</p>
                  )}
                  {result.error.suggestion && (
                    <p className="text-sm text-red-600 mt-2">
                      <strong>Suggestion:</strong> {result.error.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : result.type === 'single' ? (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">
                  Bit {result.index}: <span className={`font-bold ${
                    result.data ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {result.data ? '1' : '0'}
                  </span>
                </span>
                <StatusIcon status={result.data as boolean} />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Status: {result.data ? 'Revoked/Suspended' : 'Valid'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">
                Range Results ({(result.data as BitStatus[]).length} bits)
              </h3>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 gap-1 p-2">
                  {(result.data as BitStatus[]).map((bit) => (
                    <div
                      key={bit.index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <span>
                        Index {bit.index}: <span className={`font-medium ${
                          bit.status ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {bit.status ? '1' : '0'}
                        </span>
                      </span>
                      <StatusIcon status={bit.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <p><strong>Note:</strong> A bit value of 1 typically indicates the credential is revoked or suspended. A bit value of 0 indicates the credential is valid.</p>
      </div>
    </div>
  );
} 