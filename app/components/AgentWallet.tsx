"use client";

import React, { useState } from 'react';
import { useWallet } from '@crossmint/client-sdk-react-ui';
import { buttonStyles, cardStyles, DEFAULT_CHAIN } from '@/lib/constants';
import { formatBalance } from '@/lib/utils';
import { useConfigStatus } from './ConfigurationStatus';
import ViewTransactions from './ViewTransactions';

interface AdminSigner {
  type: string;
  address: string;
  locator: string;
}

interface DelegatedSigner {
  type: string;
  locator: string;
  chains?: Record<string, any>;
  permissions?: Array<{
    type: string;
    data: any;
  }>;
  expiresAt?: number;
}

interface WalletBalance {
  usdc: string;
  usd: string;
  chain: string;
  walletAddress: string;
}

interface AgentWalletProps {
  onShowContent: (content: React.ReactNode) => void;
  isActive: boolean;
}

export default function AgentWallet({ onShowContent, isActive }: AgentWalletProps) {
  const { wallet } = useWallet();
  const { configStatus, mounted } = useConfigStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [signers, setSigners] = useState<any[]>([]);
  const [adminSigners, setAdminSigners] = useState<Record<string, AdminSigner>>({});
  const [delegatedSigners, setDelegatedSigners] = useState<Record<string, DelegatedSigner[]>>({});
  const [walletBalances, setWalletBalances] = useState<Record<string, WalletBalance>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [showAddSigner, setShowAddSigner] = useState<string | false>(false);

  const isServerApiKeyConfigured = mounted ? (configStatus?.serverApiKey ?? false) : false;

  const handleCheckAgentWallets = async () => {
    if (!wallet?.address) {
      setError('No wallet address available');
      return;
    }

    setIsLoading(true);
    setError(null);
          setSigners([]);
      setAdminSigners({});
      setDelegatedSigners({});
      setWalletBalances({});

    try {
      console.log('Checking agent wallets for wallet:', wallet.address);
      
      // Use the API endpoint to check for existing agent wallets
      const response = await fetch('/api/get-agent-wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet.address,
        }),
      });

      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check agent wallets');
      }

      const agentWallets = data.signers || [];
      setSigners(agentWallets);

      // Get admin signers, delegated signers and balances for each agent wallet
      for (const agentWallet of agentWallets) {
        await getAdminSigner(agentWallet.address);
        await getDelegatedSigners(agentWallet.address);
        await getWalletBalance(agentWallet.address);
      }
    } catch (err) {
      console.error('Error checking agent wallets:', err);
      setError(err instanceof Error ? err.message : 'Failed to check agent wallets');
    } finally {
      setIsLoading(false);
    }
  };

  const getAdminSigner = async (walletAddress: string) => {
    try {
      // This would call the Crossmint API to get admin signer
      // For now, we'll use a placeholder based on the structure you provided
      const adminSigner: AdminSigner = {
        type: "evm-fireblocks-custodial",
        address: "0xcC3A5221b20f363A77fBD23880Ec94B112483F10",
        locator: "evm-fireblocks-custodial:0xcC3A5221b20f363A77fBD23880Ec94B112483F10"
      };
      
      setAdminSigners(prev => ({
        ...prev,
        [walletAddress]: adminSigner
      }));
    } catch (error) {
      console.error('Error getting admin signer:', error);
    }
  };

  const getDelegatedSigners = async (walletAddress: string) => {
    try {
      // This would call the Crossmint API to get delegated signers
      // For now, we'll use a placeholder
      const signers: DelegatedSigner[] = [
        {
          type: 'evm-keypair',
          locator: 'evm-keypair:0x1234567890123456789012345678901234567890',
          chains: {
            base: { status: 'active' },
            polygon: { status: 'active' }
          },
          permissions: [
            {
              type: 'native-token-transfer',
              data: { allowance: '0.1' }
            },
            {
              type: 'erc20-token-transfer',
              data: { 
                address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                allowance: '100'
              }
            }
          ]
        }
      ];
      
      setDelegatedSigners(prev => ({
        ...prev,
        [walletAddress]: signers
      }));
    } catch (error) {
      console.error('Error getting delegated signers:', error);
    }
  };

  const getWalletBalance = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/get-wallet-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          chain: 'base'
        }),
      });

      if (response.ok) {
        const balance = await response.json();
        setWalletBalances(prev => ({
          ...prev,
          [walletAddress]: balance
        }));
      }
    } catch (error) {
      console.error('Error getting wallet balance:', error);
    }
  };

  const handleCreateAgentWallet = async () => {
    if (!wallet?.address) {
      setError('No wallet address available');
      return;
    }

    setIsCreating(true);
    setError(null);
    setResult(null);

    try {
      console.log('Creating agent wallet with address:', wallet.address);
      
      const response = await fetch('/api/create-agent-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminSignerAddress: wallet.address,
          userWalletAddress: wallet.address,
        }),
      });

      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agent wallet');
      }

      console.log('Setting result:', data);
      setResult(data);
      
      // Refresh the agent wallets list after creation
      await handleCheckAgentWallets();
    } catch (err) {
      console.error('Error creating agent wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to create agent wallet');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToOptions = () => {
    onShowContent(null);
  };

  const handleAddDelegatedSigner = async (walletAddress: string, signerData: any) => {
    try {
      const response = await fetch('/api/add-delegated-signer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletLocator: walletAddress,
          ...signerData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add delegated signer');
      }

      // Refresh delegated signers for this wallet
      await getDelegatedSigners(walletAddress);
      setShowAddSigner(false);
    } catch (error) {
      console.error('Error adding delegated signer:', error);
      setError(error instanceof Error ? error.message : 'Failed to add delegated signer');
    }
  };

  const handleClick = () => {
    if (!isServerApiKeyConfigured) {
      onShowContent(
        <div className={cardStyles.base}>
          <h2 className="text-xl font-semibold mb-4 text-center text-red-600">Server API Key Not Configured</h2>
          <div className={cardStyles.error}>
            <p className="text-red-700 mb-2">
              Agent wallet functionality requires a server API key. Please add the following environment variable:
            </p>
            <code className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm block">
              CROSSMINT_SERVER_API_KEY=your-server-api-key
            </code>
            <p className="text-red-600 text-sm mt-2">
              Add this to your <code className="bg-red-100 px-1 rounded">.env.local</code> file and restart the development server.
            </p>
          </div>
        </div>
      );
      return;
    }

    const AgentWalletForm = () => {
      const [localIsLoading, setLocalIsLoading] = useState(false);
      const [localIsCreating, setLocalIsCreating] = useState(false);
      const [localSigners, setLocalSigners] = useState<any[]>([]);
      const [localAdminSigners, setLocalAdminSigners] = useState<Record<string, AdminSigner>>({});
      const [localError, setLocalError] = useState<string | null>(null);
      const [localResult, setLocalResult] = useState<any>(null);
      const [hasChecked, setHasChecked] = useState(false);
      const [localShowAddSigner, setLocalShowAddSigner] = useState<string | false>(false);
      const [localDelegatedSigners, setLocalDelegatedSigners] = useState<Record<string, DelegatedSigner[]>>({});
      const [localWalletBalances, setLocalWalletBalances] = useState<Record<string, WalletBalance>>({});
      const [mustAddSelfWallet, setMustAddSelfWallet] = useState<string | null>(null);
      const [isAddingSelf, setIsAddingSelf] = useState(false);
      const [addSelfError, setAddSelfError] = useState<string | null>(null);
              const [showSuccess, setShowSuccess] = useState(false);

        // Reset success state when modal opens
        React.useEffect(() => {
          setShowSuccess(false);
        }, []);

      // Add Delegated Signer Modal Component
      const AddDelegatedSignerModal = ({ 
        walletAddress, 
        onAdd, 
        onClose 
      }: { 
        walletAddress: string; 
        onAdd: (walletAddress: string, signerData: any) => Promise<void>;
        onClose: () => void;
      }) => {
        const [signerAddress, setSignerAddress] = useState('');
        const chain = DEFAULT_CHAIN || 'base-sepolia'; // Use the configured default chain
        const [permissions, setPermissions] = useState<Record<string, boolean>>({
          'native-token-transfer': false,
          'erc20-token-transfer': false,
          'gas-limit': false,
        });
        const [allowance, setAllowance] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [showExpiry, setShowExpiry] = useState(false);
        const [expiryDate, setExpiryDate] = useState('');
        const [expiryTime, setExpiryTime] = useState('');

        // Reset form when modal opens
        React.useEffect(() => {
          setSignerAddress('');
          setAllowance('');
          setPermissions({
            'native-token-transfer': false,
            'erc20-token-transfer': false,
            'gas-limit': false
          });
          setShowExpiry(false);
          setExpiryDate('');
          setExpiryTime('');
        }, []);

        const handleSubmit = async () => {
          if (!signerAddress.trim()) {
            alert('Please enter a signer address');
            return;
          }

          if (showExpiry && (!expiryDate || !expiryTime)) {
            alert('Please select both date and time for expiry');
            return;
          }

          setIsSubmitting(true);
          try {
            const permissionsArray = Object.entries(permissions)
              .filter(([_, enabled]) => enabled)
              .map(([type, _]) => {
                switch (type) {
                  case 'native-token-transfer':
                    return {
                      type: 'native-token-transfer',
                      data: { allowance: allowance || '0.1' }
                    };
                  case 'erc20-token-transfer':
                    return {
                      type: 'erc20-token-transfer',
                      data: { 
                        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
                        allowance: allowance || '100'
                      }
                    };
                  case 'gas-limit':
                    return {
                      type: 'gas-limit',
                      data: { limit: allowance || '0x1234' }
                    };
                  default:
                    return null;
                }
              })
              .filter(Boolean);

            // Prepare signer data
            const signerData: any = {
              signer: signerAddress,
              chain,
              permissions: permissionsArray
            };

            // Add expiry if enabled and date/time are provided
            if (showExpiry && expiryDate && expiryTime) {
              const expiryDateTime = new Date(`${expiryDate}T${expiryTime}`);
              signerData.expiresAt = expiryDateTime.getTime();
            }

            console.log('Adding delegated signer with chain:', chain);
            await onAdd(walletAddress, signerData);
            
            // Show success state only if no error was thrown
            setShowSuccess(true);
          } catch (error) {
            console.error('Error adding delegated signer:', error);
            // Don't show success state, let the error be handled by the parent
            throw error; // Re-throw so parent can handle it
          } finally {
            setIsSubmitting(false);
          }
        };

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              {showSuccess ? (
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4 text-green-600">Delegated Signer Added Successfully!</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    The delegated signer has been added to your agent wallet. You can now use it for automated transactions.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccess(false); // Reset success state
                      onClose();
                      // Refresh the entire agent wallet list to get updated delegated signers
                      handleCheckAgentWallets();
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Close & Refresh
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-4">Add Delegated Signer</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signer Address
                  </label>
                  <input
                    type="text"
                    value={signerAddress}
                    onChange={(e) => setSignerAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                

                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allowance (Optional)
                  </label>
                  <input
                    type="text"
                    value={allowance}
                    onChange={(e) => setAllowance(e.target.value)}
                    placeholder="value in USD"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Expiry Toggle and Fields */}
                <div>
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={showExpiry}
                      onChange={(e) => setShowExpiry(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Set Expiry Date</span>
                  </label>
                  
                  {showExpiry && (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Time
                        </label>
                        <input
                          type="time"
                          value={expiryTime}
                          onChange={(e) => setExpiryTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      {expiryDate && expiryTime && (
                        <div className="text-xs text-gray-600">
                          Expires: {new Date(`${expiryDate}T${expiryTime}`).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center opacity-50 cursor-not-allowed">
                      <input 
                        type="checkbox" 
                        checked={permissions['native-token-transfer']}
                        onChange={(e) => setPermissions(prev => ({
                          ...prev,
                          'native-token-transfer': e.target.checked
                        }))}
                        disabled
                        className="mr-2" 
                      />
                      <span className="text-sm">Native Token Transfer (ETH)</span>
                    </label>
                    <label className="flex items-center opacity-50 cursor-not-allowed">
                      <input 
                        type="checkbox" 
                        checked={permissions['erc20-token-transfer']}
                        onChange={(e) => setPermissions(prev => ({
                          ...prev,
                          'erc20-token-transfer': e.target.checked
                        }))}
                        disabled
                        className="mr-2" 
                      />
                      <span className="text-sm">ERC20 Token Transfer (USDC)</span>
                    </label>
                    <label className="flex items-center opacity-50 cursor-not-allowed">
                      <input 
                        type="checkbox" 
                        checked={permissions['gas-limit']}
                        onChange={(e) => setPermissions(prev => ({
                          ...prev,
                          'gas-limit': e.target.checked
                        }))}
                        disabled
                        className="mr-2" 
                      />
                      <span className="text-sm">Gas Limit</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Native Token Transfer (ETH), ERC20 Token Transfer (USDC), and Gas Limit are not yet released. 
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !signerAddress.trim() || (showExpiry && (!expiryDate || !expiryTime))}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Signer'}
                </button>
              </div>
                </>
              )}
            </div>
          </div>
        );
      };

      const handleCheckAgentWallets = async () => {
        if (!wallet?.address) {
          setLocalError('No wallet address available');
          return;
        }

        setLocalIsLoading(true);
        setLocalError(null);
        setLocalSigners([]);
        setLocalAdminSigners({});
        setLocalDelegatedSigners({});
        setLocalWalletBalances({});

        try {
          console.log('Checking agent wallets for wallet:', wallet.address);
          
          const response = await fetch('/api/get-agent-wallets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: wallet.address,
            }),
          });

          const data = await response.json();
          console.log('API response:', data);

          if (!response.ok) {
            throw new Error(data.error || 'Failed to check agent wallets');
          }

          const agentWallets = data.signers || [];
          setLocalSigners(agentWallets);
          setHasChecked(true);

          // Extract admin signers, delegated signers from agent wallet config and get balances
          let firstNeedingSelf: string | null = null;
          for (const agentWallet of agentWallets) {
            // Extract admin signer from the agent wallet config
            if (agentWallet.config?.adminSigner) {
              setLocalAdminSigners(prev => ({
                ...prev,
                [agentWallet.address]: agentWallet.config.adminSigner
              }));
            }
            
            // Extract delegated signers from the agent wallet config
            const delegatedSigners = agentWallet.config?.delegatedSigners || [];
            setLocalDelegatedSigners(prev => ({
              ...prev,
              [agentWallet.address]: delegatedSigners
            }));

            // Detect if user's wallet is missing from delegated signers
            if (!firstNeedingSelf && Array.isArray(delegatedSigners)) {
              const addrLc = wallet.address.toLowerCase();
              const hasSelf = delegatedSigners.some((ds: any) => {
                const loc = (ds?.locator || ds)?.toString?.().toLowerCase?.() || '';
                if (loc.includes(':')) {
                  const last = loc.split(':').pop();
                  return last === addrLc;
                }
                const dsAddr = (ds?.address || '').toString().toLowerCase();
                return dsAddr === addrLc;
              });
              if (!hasSelf) firstNeedingSelf = agentWallet.address;
            }
            
            // Get balance for the agent wallet
            await getLocalWalletBalance(agentWallet.address);
          }
          setMustAddSelfWallet(firstNeedingSelf);
        } catch (err) {
          console.error('Error checking agent wallets:', err);
          setLocalError(err instanceof Error ? err.message : 'Failed to check agent wallets');
        } finally {
          setLocalIsLoading(false);
        }
      };



      const getLocalWalletBalance = async (walletAddress: string) => {
        console.log(`Fetching balance for agent wallet: ${walletAddress}`);
        try {
          const response = await fetch(`/api/wallet-balances?wallet=${walletAddress}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log(`Balance API response status: ${response.status}`);
          if (response.ok) {
            const data = await response.json();
            console.log(`Balance for agent wallet ${walletAddress}:`, data);
            
            // Parse USDC balance using the same logic as BalanceFetcher
            const usdcData = data.find((b: any) => b.token === 'usdc');
            const chainBalance = usdcData?.balances?.[DEFAULT_CHAIN] || '0';
            const formattedBalance = usdcData ? formatBalance(chainBalance, usdcData.decimals) : '0';
            
            // Transform the response to match our expected format
            const balance = {
              usdc: formattedBalance,
              usd: formattedBalance, // For now, assume 1 USDC = 1 USD
              chain: DEFAULT_CHAIN || 'base',
              walletAddress,
            };
            
            console.log(`Parsed balance for ${walletAddress}:`, balance);
            setLocalWalletBalances(prev => ({
              ...prev,
              [walletAddress]: balance
            }));
          } else {
            const errorData = await response.json();
            console.error('Failed to fetch balance for agent wallet:', walletAddress, errorData);
          }
        } catch (error) {
          console.error('Error getting wallet balance for agent wallet:', walletAddress, error);
        }
      };

      const handleCreateAgentWallet = async () => {
        if (!wallet?.address) {
          setLocalError('No wallet address available');
          return;
        }

        setLocalIsCreating(true);
        setLocalError(null);
        setLocalResult(null);

        try {
          console.log('Creating agent wallet with address:', wallet.address);
          
          const response = await fetch('/api/create-agent-wallet', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              adminSignerAddress: wallet.address,
              userWalletAddress: wallet.address,
            }),
          });

          const data = await response.json();
          console.log('API response:', data);

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create agent wallet');
          }

          console.log('Setting result:', data);
          setLocalResult(data);
          
          // Refresh the agent wallets list after creation
          await handleCheckAgentWallets();
        } catch (err) {
          console.error('Error creating agent wallet:', err);
          setLocalError(err instanceof Error ? err.message : 'Failed to create agent wallet');
        } finally {
          setLocalIsCreating(false);
        }
      };

      const handleAddDelegatedSignerLocal = async (walletAddress: string, signerData: any) => {
        try {
          const response = await fetch('/api/add-delegated-signer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletLocator: walletAddress,
              ...signerData
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add delegated signer');
          }

          // Refresh the entire agent wallet list to get updated delegated signers
          await handleCheckAgentWallets();
          setLocalShowAddSigner(false);
        } catch (error) {
          console.error('Error adding delegated signer:', error);
          setLocalError(error instanceof Error ? error.message : 'Failed to add delegated signer');
          throw error; // Re-throw so modal can handle it
        }
      };

      const handleBackToOptions = () => {
        onShowContent(null);
      };

      // Auto-check for existing agent wallets when component mounts
      React.useEffect(() => {
        handleCheckAgentWallets();
      }, []);

      if (localResult) {
        return (
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-green-600">✅ Agent Wallet Created Successfully!</h2>
            
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Agent Wallet Details:</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <span className="ml-2">{localResult.type}</span>
                  </div>
                  {localResult.address && (
                    <div>
                      <span className="font-medium">Address:</span>
                      <span className="ml-2 font-mono text-green-600 break-all">{localResult.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setLocalResult(null);
                  setLocalError(null);
                  handleCheckAgentWallets();
                }}
                className={buttonStyles.primary}
              >
                View Agent Wallet
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="w-full">
          <h2 className="text-xl font-semibold mb-4">Agent Wallet</h2>

          {localError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{localError}</p>
            </div>
          )}

          {localSigners.length > 0 ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900"></h3>
                <button
                  type="button"
                  onClick={handleCheckAgentWallets}
                  disabled={localIsLoading}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {localIsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div className="space-y-6">
                {localSigners.map((signer, index) => {
                  const walletAddress = signer.address;
                  const balance = localWalletBalances[walletAddress];
                  const delegatedSignersForWallet = localDelegatedSigners[walletAddress] || [];
                  
                  console.log(`Agent wallet ${walletAddress}:`, {
                    balance,
                    delegatedSigners: delegatedSignersForWallet.length
                  });
                  
                  return (
                    <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      {/* Agent Wallet Info */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">Agent Wallet</h4>
                          <button
                            type="button"
                            onClick={() => {
                              const ViewTransactionsWithAgentCallback = () => (
                                <ViewTransactions 
                                  onShowContent={(content) => {
                                    if (content === null) {
                                      // Return to agent wallet form
                                      onShowContent(<AgentWalletForm />);
                                    } else {
                                      onShowContent(content);
                                    }
                                  }}
                                  isActive={false}
                                  walletAddress={walletAddress}
                                />
                              );
                              onShowContent(<ViewTransactionsWithAgentCallback />);
                            }}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            View Transactions
                          </button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Address:</span>
                            <span className="ml-2 font-mono text-green-600 break-all">{signer.address}</span>
                          </div>
                          {signer.type && (
                            <div>
                              <span className="font-medium">Type:</span>
                              <span className="ml-2">{signer.type}</span>
                            </div>
                          )}
                          {signer.status && (
                            <div>
                              <span className="font-medium">Status:</span>
                              <span className="ml-2 text-green-600">{signer.status}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin Signer */}
                      {localAdminSigners[walletAddress] && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h5 className="font-medium text-blue-900 mb-2">Admin Signer</h5>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Type:</span>
                              <span className="ml-2">{localAdminSigners[walletAddress].type}</span>
                            </div>
                            <div>
                              <span className="font-medium">Address:</span>
                              <span className="ml-2 font-mono text-blue-600 break-all">{localAdminSigners[walletAddress].address}</span>
                            </div>
                            <div>
                              <span className="font-medium">Locator:</span>
                              <span className="ml-2 font-mono text-blue-600 break-all">{localAdminSigners[walletAddress].locator}</span>
                            </div>
                          </div>
                        </div>
                      )}



                      {/* USDC Balance */}
                      {balance ? (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <h5 className="font-medium text-green-900 mb-2">Balance</h5>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">USDC:</span>
                              <span className="ml-2 text-green-600 font-mono">{balance.usdc}</span>
                            </div>
                            <div>
                              <span className="font-medium">Chain:</span>
                              <span className="ml-2 capitalize">{balance.chain}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <h5 className="font-medium text-gray-900 mb-2">USDC Balance</h5>
                          <div className="text-sm text-gray-600">
                            Loading balance...
                          </div>
                        </div>
                      )}

                      {/* Delegated Signers */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">Delegated Signers ({delegatedSignersForWallet.length})</h5>
                          <button
                            type="button"
                            onClick={() => setLocalShowAddSigner(walletAddress)}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Add Signer
                          </button>
                        </div>
                        
                        {localShowAddSigner === walletAddress && (
                          <AddDelegatedSignerModal
                            walletAddress={walletAddress}
                            onAdd={handleAddDelegatedSignerLocal}
                            onClose={() => setLocalShowAddSigner(false)}
                          />
                        )}
                        
                        {delegatedSignersForWallet.length > 0 ? (
                          <div className="space-y-3">
                            {delegatedSignersForWallet.map((delegatedSigner, signerIndex) => (
                              <div key={signerIndex} className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                    <span className="font-medium text-sm">Locator:</span>
                                    <span className="ml-2 text-sm font-mono text-gray-600 break-all">{delegatedSigner.locator}</span>
                                  </div>
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                      {delegatedSigner.locator.split(':')[0]}
                                    </span>
                                  </div>
                                  
                                  

                                  {/* Chains */}
                                  {delegatedSigner.chains && Object.keys(delegatedSigner.chains).length > 0 && (
                                    <div>
                                      <span className="font-medium text-sm">Chains:</span>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {Object.entries(delegatedSigner.chains).map(([chain, status]: [string, any]) => (
                                          <span
                                            key={chain}
                                            className={`text-xs px-2 py-1 rounded ${
                                              status.status === 'active' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}
                                          >
                                            {chain}: {status.status}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Permissions */}
                                  {delegatedSigner.permissions && delegatedSigner.permissions.length > 0 && (
                                    <div>
                                      <span className="font-medium text-sm">Permissions:</span>
                                      <div className="mt-2 space-y-2">
                                        {delegatedSigner.permissions.map((permission, permIndex) => (
                                          <div key={permIndex} className="bg-gray-50 p-2 rounded text-xs">
                                            <div className="font-medium text-gray-700 mb-1">
                                              {permission.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </div>
                                            {permission.data && (
                                              <div className="text-gray-600">
                                                {Object.entries(permission.data).map(([key, value]: [string, any]) => (
                                                  <div key={key}>
                                                    <span className="font-medium">{key}:</span>
                                                    <span className="ml-1 font-mono">{String(value)}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Expiry */}
                                  {delegatedSigner.expiresAt && (
                                    <div>
                                      <span className="font-medium text-sm">Expires:</span>
                                      <span className="ml-2 text-sm text-gray-600">
                                        {new Date(delegatedSigner.expiresAt).toLocaleString()}
                                      </span>
                                      {delegatedSigner.expiresAt < Date.now() && (
                                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                          EXPIRED
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-800">No delegated signers found. Add one to enable automated transactions.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : hasChecked && !localIsLoading ? (
            <div className="mb-6">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-medium text-yellow-900 mb-2">No Agent Wallets Found</h3>
                <p className="text-yellow-800 text-sm mb-3">
                  You haven't created any agent wallets yet. Agent wallets can be used for automated transactions.
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            {localSigners.length === 0 && hasChecked ? (
              <button
                type="button"
                onClick={handleCreateAgentWallet}
                disabled={localIsCreating || !wallet?.address}
                className={`${buttonStyles.primary} ${localIsCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {localIsCreating ? 'Creating...' : 'Create Agent Wallet'}
              </button>
            ) : null}
          </div>

          {/* Add Delegated Signer Modal */}
          {localShowAddSigner && (
            <AddDelegatedSignerModal
              walletAddress={localShowAddSigner}
              onAdd={handleAddDelegatedSigner}
              onClose={() => setLocalShowAddSigner(false)}
            />
          )}

          {/* Mandatory self-delegation modal */}
          {mustAddSelfWallet && wallet?.address && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-2">Add Your Wallet as a Delegate</h3>
                <p className="text-sm text-gray-700 mb-4">
                  To use the agent wallet for automated transactions, you must add
                  your wallet as a delegated signer.
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs mb-4">
                  <div><span className="font-medium">Agent wallet:</span> <span className="font-mono break-all">{mustAddSelfWallet}</span></div>
                  <div><span className="font-medium">Your wallet:</span> <span className="font-mono break-all">{wallet.address}</span></div>
                </div>
                {addSelfError && (
                  <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded p-2">{addSelfError}</div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMustAddSelfWallet(null)}
                    disabled={isAddingSelf}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!mustAddSelfWallet || !wallet?.address) return;
                      setIsAddingSelf(true);
                      setAddSelfError(null);
                      try {
                        await handleAddDelegatedSignerLocal(mustAddSelfWallet, {
                          signer: wallet.address,
                          chain: DEFAULT_CHAIN,
                          // No permissions; keep payload minimal as requested
                        });
                        setMustAddSelfWallet(null);
                        await handleCheckAgentWallets();
                      } catch (e: any) {
                        setAddSelfError(e?.message || 'Failed to add signer');
                      } finally {
                        setIsAddingSelf(false);
                      }
                    }}
                    disabled={isAddingSelf}
                    className={`flex-1 px-4 py-2 ${isAddingSelf ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md disabled:opacity-50`}
                  >
                    {isAddingSelf ? 'Adding…' : 'Add Now'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    onShowContent(<AgentWalletForm />);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="agent-wallet"
      className={
        !isServerApiKeyConfigured
          ? buttonStyles.disabled
          : isActive 
            ? `${buttonStyles.primary} ring-2 ring-green-500`
            : buttonStyles.primary
      }
      disabled={!isServerApiKeyConfigured}
      title={
        !isServerApiKeyConfigured 
          ? 'Server API key not configured' 
          : undefined
      }
    >
      Your Agent
    </button>
  );
} 