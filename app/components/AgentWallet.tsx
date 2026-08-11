"use client";

import React, { useState } from 'react';
import { useWallet } from '@crossmint/client-sdk-react-ui';
import { buttonStyles, cardStyles, DEFAULT_CHAIN } from '@/lib/constants';
import { formatBalance } from '@/lib/utils';
import { useConfigStatus } from './ConfigurationStatus';
import ViewTransactions from './ViewTransactions';
import { apiFetch } from '@/lib/client-api';
import { useApiInspector, useSetActiveFlow } from '@/lib/dev-inspector/ApiInspectorContext';

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

/** Agent wallets are addressed as `userId:agenticwallet-{mainWalletAddress}:{chain}:smart` —
 * their identity is baked into the MAIN wallet's address at creation time. If that main wallet's
 * address ever changes (e.g. a signer/recovery config change on login), an agent wallet created
 * under the old address becomes invisible to the automatic check above, even though it still
 * exists on-chain. This lets you look one up (and send from it) by address directly. */
function AgentWalletLookup() {
  const { wallet } = useWallet();
  const { log } = useApiInspector();
  const [address, setAddress] = useState("");
  const [signer, setSigner] = useState<any>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const lookup = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setSigner(null);
    setBalance(null);
    try {
      const res = await apiFetch('/api/get-agent-wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address.trim() }),
      }, log);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Lookup failed');
      const found = Array.isArray(data?.signers) ? data.signers[0] : null;
      if (!found?.address) {
        setError('No agent wallet found for that address.');
        return;
      }
      setSigner(found);

      const balRes = await apiFetch(`/api/wallet-balances?wallet=${found.address}`, undefined, log);
      const balData = await balRes.json().catch(() => null);
      const usdc = Array.isArray(balData) ? balData.find((b: any) => b.symbol?.toLowerCase() === 'usdc') : null;
      if (usdc) {
        const chainEntry = usdc.chains?.[DEFAULT_CHAIN];
        setBalance({
          usdc: chainEntry ? formatBalance(chainEntry.rawAmount, usdc.decimals) : '0',
          usd: '',
          chain: DEFAULT_CHAIN,
          walletAddress: found.address,
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold dark:text-gray-100">Look up an agent wallet by address</span>
        <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3">
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Agent wallets are tied to whatever main wallet address created them. If your active wallet
            address ever changes, an older agent wallet won&apos;t show up in the automatic check above —
            paste the main wallet address that originally created it to find it here.
          </p>
          <div className="flex gap-2">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... (main wallet address)"
              className="flex-1 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <button type="button" onClick={lookup} disabled={loading || !address.trim()} className={buttonStyles.secondary}>
              {loading ? 'Looking up…' : 'Look up'}
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

          {signer && (
            <div className="mt-3 rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm">
              <div className="font-mono text-xs break-all dark:text-gray-300">{signer.address}</div>
              {balance && (
                <div className="mt-1 text-gray-700 dark:text-gray-300">
                  Balance: <span className="font-semibold text-green-600 dark:text-green-400">{balance.usdc} USDC</span> on {DEFAULT_CHAIN}
                </div>
              )}
              <AgentWalletLookupSend agentWalletAddress={signer.address} defaultRecipient={wallet?.address} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentWalletLookupSend({ agentWalletAddress, defaultRecipient }: { agentWalletAddress: string; defaultRecipient?: string }) {
  const { wallet } = useWallet();
  const { log } = useApiInspector();
  const [recipient, setRecipient] = useState(defaultRecipient || '');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const send = async () => {
    if (!recipient.trim() || !amount.trim() || !wallet?.address) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch('/api/agent-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentWalletAddress,
          recipient: recipient.trim(),
          amount: amount.trim(),
          signerLocator: `external-wallet:${wallet.address}`,
        }),
      }, log);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || 'Transfer failed');
      setSuccess('Transfer submitted.');
    } catch (e: any) {
      // Most likely cause: the current session's wallet isn't a delegated signer on this
      // agent wallet (it may have been delegated under the OLD main wallet identity instead).
      setError(e?.message || 'Transfer failed — your current wallet may not be an authorized signer for this agent wallet.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-gray-200 dark:border-gray-800 pt-3">
      <div className="text-xs font-medium dark:text-gray-300">Send USDC from this agent wallet</div>
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient address"
        className="w-full rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (USDC)"
        className="w-full rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="text-xs text-green-600 dark:text-green-400">{success}</p>}
      <button
        type="button"
        onClick={send}
        disabled={sending || !recipient.trim() || !amount.trim()}
        className={buttonStyles.primary}
      >
        {sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  );
}

function AgentWalletContent() {
  const { wallet } = useWallet();
  const { log } = useApiInspector();
  useSetActiveFlow('agents');

  // Replaces the old page-level "active content" slot for this component's own
  // internal navigation (drilling into an agent wallet's ViewTransactions and back).
  const [viewingTransactionsFor, setViewingTransactionsFor] = useState<string | null>(null);

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
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
          {showSuccess ? (
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4 text-green-600">Delegated Signer Added Successfully!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                The delegated signer has been added to your agent wallet. You can now use it for automated transactions.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowSuccess(false); // Reset success state
                  onClose();
                  // Refresh the entire agent wallet list to get updated delegated signers
                  handleCheckAgentWalletsLocal();
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Close & Refresh
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Add Delegated Signer</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Signer Address
              </label>
              <input
                type="text"
                value={signerAddress}
                onChange={(e) => setSignerAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>



            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allowance (Optional)
              </label>
              <input
                type="text"
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
                placeholder="value in USD"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Set Expiry Date</span>
              </label>

              {showExpiry && (
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expiry Time
                    </label>
                    <input
                      type="time"
                      value={expiryTime}
                      onChange={(e) => setExpiryTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  {expiryDate && expiryTime && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Expires: {new Date(`${expiryDate}T${expiryTime}`).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  <span className="text-sm dark:text-gray-300">Native Token Transfer (ETH)</span>
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
                  <span className="text-sm dark:text-gray-300">ERC20 Token Transfer (USDC)</span>
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
                  <span className="text-sm dark:text-gray-300">Gas Limit</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                * Native Token Transfer (ETH), ERC20 Token Transfer (USDC), and Gas Limit are not yet released.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
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

  const handleCheckAgentWalletsLocal = async () => {
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

      const response = await apiFetch('/api/get-agent-wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet.address,
        }),
      }, log);

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

  const handleCreateAgentWalletLocal = async () => {
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
      await handleCheckAgentWalletsLocal();
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
      await handleCheckAgentWalletsLocal();
      setLocalShowAddSigner(false);
    } catch (error) {
      console.error('Error adding delegated signer:', error);
      setLocalError(error instanceof Error ? error.message : 'Failed to add delegated signer');
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleBackToOptionsLocal = () => {
    setViewingTransactionsFor(null);
  };

  // Auto-check for existing agent wallets when component mounts
  React.useEffect(() => {
    handleCheckAgentWalletsLocal();
  }, []);

  if (viewingTransactionsFor) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setViewingTransactionsFor(null)}
          className="mb-4 px-3 py-1 text-xs bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          ← Back to Agent Wallet
        </button>
        <ViewTransactions walletAddress={viewingTransactionsFor} />
      </div>
    );
  }

  if (localResult) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-green-600">✅ Agent Wallet Created Successfully!</h2>

        <div className="space-y-3 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Agent Wallet Details:</h3>
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
              handleCheckAgentWalletsLocal();
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
      <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">Agent Wallet</h2>

      <AgentWalletLookup />

      {localError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
          <p className="text-red-800 text-sm">{localError}</p>
        </div>
      )}

      {localSigners.length > 0 ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100"></h3>
            <button
              type="button"
              onClick={handleCheckAgentWalletsLocal}
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
                <div key={index} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
                  {/* Agent Wallet Info */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Agent Wallet</h4>
                      <button
                        type="button"
                        onClick={() => setViewingTransactionsFor(walletAddress)}
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
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30">
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
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/30">
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
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">USDC Balance</h5>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Loading balance...
                      </div>
                    </div>
                  )}

                  {/* Delegated Signers */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">Delegated Signers ({delegatedSignersForWallet.length})</h5>
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
                          <div key={signerIndex} className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                <span className="font-medium text-sm">Locator:</span>
                                <span className="ml-2 text-sm font-mono text-gray-600 dark:text-gray-400 break-all">{delegatedSigner.locator}</span>
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
                                      <div key={permIndex} className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-xs">
                                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          {permission.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </div>
                                        {permission.data && (
                                          <div className="text-gray-600 dark:text-gray-400">
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
                                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
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
                      <div className="bg-yellow-50 dark:bg-yellow-500/10 p-3 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
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
          <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
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
            onClick={handleCreateAgentWalletLocal}
            disabled={localIsCreating || !wallet?.address}
            className={`${buttonStyles.primary} ${localIsCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {localIsCreating ? 'Creating...' : 'Create Agent Wallet'}
          </button>
        ) : null}
      </div>

      {/* Mandatory self-delegation modal */}
      {mustAddSelfWallet && wallet?.address && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Add Your Wallet as a Delegate</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              To use the agent wallet for automated transactions, you must add
              your wallet as a delegated signer.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded p-3 text-xs mb-4 dark:text-gray-300">
              <div><span className="font-medium">Agent wallet:</span> <span className="font-mono break-all">{mustAddSelfWallet}</span></div>
              <div><span className="font-medium">Your wallet:</span> <span className="font-mono break-all">{wallet.address}</span></div>
            </div>
            {addSelfError && (
              <div className="mb-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 text-xs rounded p-2">{addSelfError}</div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMustAddSelfWallet(null)}
                disabled={isAddingSelf}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
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
                    await handleCheckAgentWalletsLocal();
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
}

export default function AgentWallet() {
  const { configStatus, mounted, loading } = useConfigStatus();
  const isServerApiKeyConfigured = mounted ? (configStatus?.serverApiKey ?? false) : false;

  if (!mounted || loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
      </div>
    );
  }

  if (!isServerApiKeyConfigured) {
    return (
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
  }

  return <AgentWalletContent />;
}
