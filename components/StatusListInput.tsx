'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface StatusListInputProps {
  onFetch: (url: string) => void;
  loading: boolean;
}

export default function StatusListInput({ onFetch, loading }: StatusListInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !loading) {
      onFetch(url.trim());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Bitstring Status List Debugger
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Status List Credential URL
            </label>
            <div className="relative">
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/status-list-credential"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                disabled={loading}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {loading ? (
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!url.trim() || loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Fetching and Decoding...' : 'Fetch Status List'}
          </button>
        </form>
      </div>
    </div>
  );
} 