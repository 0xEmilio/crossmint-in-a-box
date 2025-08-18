"use client";

import React, { useState, useEffect } from 'react';
import { cardStyles } from '@/lib/constants';

interface ConfigurationStatusProps {
  className?: string;
}

interface ConfigStatus {
  clientApiKey: boolean;
  serverApiKey: boolean;
  collectionId: boolean;
}

// Custom hook to fetch configuration status
export function useConfigStatus() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchConfigStatus = async () => {
      try {
        const response = await fetch('/api/config-status');
        if (!response.ok) {
          throw new Error('Failed to fetch configuration status');
        }
        const data = await response.json();
        setConfigStatus(data);
      } catch (err) {
        console.error('Failed to fetch config status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch configuration status');
      } finally {
        setLoading(false);
      }
    };

    fetchConfigStatus();
  }, [mounted]);

  return { configStatus, loading, error, mounted };
}

export function ConfigurationStatus({ className = "" }: ConfigurationStatusProps) {
  const { configStatus, loading, error, mounted } = useConfigStatus();

  if (!mounted || loading) {
    return null; // Don't show anything while loading or before mount
  }

  if (error) {
    return null; // Don't show anything if there's an error
  }

  if (!configStatus) {
    return null;
  }

  const hasDisabledFeatures = !configStatus.clientApiKey || !configStatus.serverApiKey || !configStatus.collectionId;

  if (!hasDisabledFeatures) {
    return null; // Don't show anything if all features are enabled
  }

  return (
    <div className={`${cardStyles.base} ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-yellow-700">⚠️ Configuration Notice</h3>
      <div className="space-y-2 text-sm">
        {!configStatus.clientApiKey && (
          <div className="flex items-start space-x-2">
            <span className="text-red-500">•</span>
            <div>
              <span className="font-medium text-red-700">Authentication & Wallets</span> are disabled
              <p className="text-gray-600 mt-1">
                Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY</code> to your <code className="bg-gray-100 px-1 rounded">.env.local</code> file
              </p>
            </div>
          </div>
        )}
        
        {!configStatus.serverApiKey && (
          <div className="flex items-start space-x-2">
            <span className="text-red-500">•</span>
            <div>
              <span className="font-medium text-red-700">Onramp, Worldstore & Agent Wallets</span> are disabled
              <p className="text-gray-600 mt-1">
                Add <code className="bg-gray-100 px-1 rounded">CROSSMINT_SERVER_API_KEY</code> to your <code className="bg-gray-100 px-1 rounded">.env.local</code> file
              </p>
            </div>
          </div>
        )}
        
        {!configStatus.collectionId && (
          <div className="flex items-start space-x-2">
            <span className="text-red-500">•</span>
            <div>
              <span className="font-medium text-red-700">NFT Purchase</span> is disabled
              <p className="text-gray-600 mt-1">
                Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_CROSSMINT_COLLECTION_ID</code> to your <code className="bg-gray-100 px-1 rounded">.env.local</code> file
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-gray-600 text-xs">
            Restart the development server after adding environment variables
          </p>
        </div>
      </div>
    </div>
  );
} 