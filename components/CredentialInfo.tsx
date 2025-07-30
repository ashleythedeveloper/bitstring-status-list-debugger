'use client';

import { DecodedStatusList } from '@/types/bitstring';
import { BitstringService } from '@/services/bitstringService';
import { Shield, Clock, Hash, Target } from 'lucide-react';

interface CredentialInfoProps {
  decoded: DecodedStatusList;
}

export default function CredentialInfo({ decoded }: CredentialInfoProps) {
  const info = BitstringService.formatCredentialInfo(decoded);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-blue-600" />
        Credential Information
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-500">Credential Type</label>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                info.credentialType === 'enveloped' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {info.credentialType.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500">Status Purpose</label>
            <div className="flex items-center gap-2 mt-1">
              <Target className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 font-medium">{info.statusPurpose}</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500">Total Bits</label>
            <div className="flex items-center gap-2 mt-1">
              <Hash className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 font-medium">{info.totalBits.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-500">ID</label>
            <p className="text-sm text-gray-900 break-all mt-1">{info.id}</p>
          </div>
          
          {info.validFrom && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Valid From</label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900">
                  {new Date(info.validFrom).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          
          {info.validUntil && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Valid Until</label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900">
                  {new Date(info.validUntil).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-500 mb-2">Issuer</label>
        <p className="text-sm text-gray-900 break-all">
          {typeof info.issuer === 'string' ? info.issuer : JSON.stringify(info.issuer)}
        </p>
      </div>
    </div>
  );
} 