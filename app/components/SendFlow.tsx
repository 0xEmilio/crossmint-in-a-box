"use client";

import React from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { useAccount, useSignMessage } from "wagmi";
import { 
  buttonStyles, 
  cardStyles, 
  inputStyles, 
  DEFAULT_CHAIN, 
  DEFAULT_SIGNER_TYPE 
} from "@/lib/constants";
import { 
  formatBalance, 
  getChainDisplayName, 
  parseBalanceToFloat, 
  hasSufficientBalance 
} from "@/lib/utils";

interface TokenBalance {
  token: string;
  decimals: number;
  balances: Record<string, string>;
}

interface SendFlowProps {
  onShowContent: (content: React.ReactNode) => void;
  isActive: boolean;
}

export function SendFlow({ onShowContent, isActive }: SendFlowProps) {
  const { wallet, getOrCreateWallet } = useWallet();
  const { address: externalWallet } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const isWeb3User = !!externalWallet;
  const activeWallet = isWeb3User ? externalWallet : wallet?.address || "";

  const handleSendClick = () => {
    if (!activeWallet) {
      onShowContent(
        <div className={cardStyles.error}>
          <p className="text-red-700">Please create or connect a wallet first</p>
        </div>
      );
      return;
    }
    
    const SendForm = () => {
      const [balances, setBalances] = React.useState<TokenBalance[]>([]);
      // We always use Crossmint wallet for approvals; no dependence on wagmi external connections
      const [isLoadingBalances, setIsLoadingBalances] = React.useState(true);
      const [isLoading, setIsLoading] = React.useState(false);
      const [recipient, setRecipient] = React.useState("");
      const [amount, setAmount] = React.useState("");
      const [error, setError] = React.useState<React.ReactNode | null>(null);
      const [success, setSuccess] = React.useState<string | null>(null);
      const [transactionResult, setTransactionResult] = React.useState<{
        hash: string; 
        explorerLink: string; 
        transactionId: string
      } | null>(null);
      const [currentStep, setCurrentStep] = React.useState<'amount' | 'recipient' | 'success'>('amount');
      const [hasAgentWallet, setHasAgentWallet] = React.useState(false);
      const [depositSelection, setDepositSelection] = React.useState<'user' | 'agent' | null>(null);
      const [agentWalletAddress, setAgentWalletAddress] = React.useState<string>('');
      const [agentBalanceFormatted, setAgentBalanceFormatted] = React.useState<string>('0');
      const [agentBalanceLoading, setAgentBalanceLoading] = React.useState(false);
      const [agentRawBalance, setAgentRawBalance] = React.useState<number>(0);
      const [recipientSelection, setRecipientSelection] = React.useState<'preset' | 'custom' | null>(null);
      const [recipientPreset, setRecipientPreset] = React.useState<'user' | 'agent' | null>(null);
      const [agentTxStatus, setAgentTxStatus] = React.useState<string | null>(null);
      const [agentTxError, setAgentTxError] = React.useState<any>(null);
      const [approvalMessage, setApprovalMessage] = React.useState<string | null>(null);
      const [hasAttemptedApproval, setHasAttemptedApproval] = React.useState(false);
      const [isApproving, setIsApproving] = React.useState(false);
      const [approvalError, setApprovalError] = React.useState<string | null>(null);
      const pollIntervalRef = React.useRef<any>(null);
      const isHex32 = (m: string) => /^0x([0-9a-fA-F]{64})$/.test(m);
      const [hasPendingApproval, setHasPendingApproval] = React.useState(false);
      const [hasSubmittedApproval, setHasSubmittedApproval] = React.useState(false);
      const [requiredSignerAddress, setRequiredSignerAddress] = React.useState<string | null>(null);
      const [requiredSignerType, setRequiredSignerType] = React.useState<string | null>(null);

      const selectedChain = DEFAULT_CHAIN;

      React.useEffect(() => {
        fetchBalances();
        fetchAgentWallet();
      }, []);

      const fetchBalances = async () => {
        try {
          setIsLoadingBalances(true);
          const response = await fetch(`/api/wallet-balances?wallet=${activeWallet}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch balances: ${response.statusText}`);
          }

          const data = await response.json();
          setBalances(data);
        } catch (err) {
          console.error("Failed to fetch balances:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch balances");
        } finally {
          setIsLoadingBalances(false);
        }
      };

      const fetchAgentWallet = async () => {
        try {
          if (!wallet?.address) return;
          const response = await fetch('/api/get-agent-wallets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: wallet.address })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to get agent wallets');
          const signers = data.signers || [];
          if (signers.length > 0) {
            setHasAgentWallet(true);
            const address = signers[0].address;
            setAgentWalletAddress(address);
            await fetchAgentBalance(address);
          } else {
            setHasAgentWallet(false);
            setDepositSelection(null);
          }
        } catch (e) {
          console.error('Failed to fetch agent wallets', e);
          setHasAgentWallet(false);
          setDepositSelection(null);
        }
      };

      const ensureDelegatedSigner = async (amountToSend: string) => {
        try {
          if (!hasAgentWallet || !agentWalletAddress || !wallet?.address) return;
          const USDC_BY_CHAIN: Record<string, string> = {
            'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          };
          const usdc = USDC_BY_CHAIN[DEFAULT_CHAIN] || USDC_BY_CHAIN['base-sepolia'];
          // Try to add or update external-wallet delegated signer with ERC20 transfer permission
          await fetch('/api/add-delegated-signer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletLocator: agentWalletAddress,
              signer: wallet.address,
              chain: DEFAULT_CHAIN,
              permissions: [
                {
                  type: 'erc20-token-transfer',
                  data: { address: usdc, allowance: amountToSend || '1' },
                },
              ],
            }),
          }).catch(() => {});
        } catch (_) {}
      };

      const fetchAgentBalance = async (address: string) => {
        setAgentBalanceLoading(true);
        try {
          const response = await fetch(`/api/wallet-balances?wallet=${address}`);
          if (!response.ok) throw new Error('Failed to fetch agent balance');
          const data = await response.json();
          const usdcData = data.find((b: any) => b.token === 'usdc');
          const chainBalance = usdcData?.balances?.[selectedChain] || '0';
          const formatted = usdcData ? formatBalance(chainBalance, usdcData.decimals) : '0';
          const raw = usdcData ? parseBalanceToFloat(chainBalance, usdcData.decimals) : 0;
          setAgentBalanceFormatted(formatted);
          setAgentRawBalance(raw);
        } catch (e) {
          console.error('Failed to fetch agent balance', e);
          setAgentBalanceFormatted('0');
          setAgentRawBalance(0);
        } finally {
          setAgentBalanceLoading(false);
        }
      };

      const usdcData = balances.find(b => b.token === 'usdc');
      const chainBalance = usdcData?.balances?.[selectedChain] || '0';
      const formattedBalance = usdcData ? formatBalance(chainBalance, usdcData.decimals) : '0';
      const rawBalance = usdcData ? parseBalanceToFloat(chainBalance, usdcData.decimals) : 0;

      const requestedAmount = parseFloat(amount) || 0;
      const selectedRawBalance = depositSelection === 'agent' ? agentRawBalance : rawBalance;
      const isInsufficientBalance = requestedAmount > selectedRawBalance;

      const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const recipientAddress = recipientSelection === 'preset'
          ? (recipientPreset === 'agent' ? agentWalletAddress : (wallet?.address || ''))
          : recipient;

        if (!activeWallet || !recipientAddress || !selectedChain || !amount) {
          setError("Missing required fields");
          return;
        }

        if (requestedAmount <= 0) {
          setError("Amount must be greater than 0");
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          let chainWallet = wallet;

          if (!isWeb3User && wallet) {
            if (wallet.chain !== selectedChain) {
              const newWallet = await getOrCreateWallet({
                chain: selectedChain as any,
                signer: { type: DEFAULT_SIGNER_TYPE as any }
              });
              if (newWallet) {
                chainWallet = newWallet;
              } else {
                throw new Error(`Failed to create wallet for ${selectedChain}`);
              }
            }
          }

          if (!chainWallet) {
            throw new Error("No wallet available");
          }

          // If sending from agent wallet, use server route that calls Crossmint
          if (hasAgentWallet && depositSelection === 'agent') {
            const res = await fetch('/api/agent-transfer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                agentWalletAddress: agentWalletAddress,
                recipient: recipientAddress,
                amount,
                // Always sign with Crossmint wallet address as delegated signer
                signerLocator: wallet?.address ? `external-wallet:${wallet.address}` : undefined,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data?.error || data?.message || 'Agent transfer failed');
            }
            // Normalize to transactionResult shape if possible
            setTransactionResult({
              hash: data?.transactionHash || data?.hash || '',
              explorerLink: data?.explorerLink || '',
              transactionId: data?.id || data?.transactionId || '',
            });
            setAgentTxStatus(data?.status || 'pending');
            setSuccess(data?.status === 'completed' ? `Successfully sent ${amount} USDC!` : 'Transfer created • awaiting approval');
            setCurrentStep('success');

            // Poll to enrich details (explorer link/status)
            const txId = data?.id || data?.transactionId;
            if (txId) {
              let tries = 0;
              const maxTries = 60; // poll up to ~60s
              const interval = setInterval(async () => {
                tries++;
                try {
                  const statusRes = await fetch(`/api/agent-transaction?agentWalletAddress=${encodeURIComponent(agentWalletAddress)}&transactionId=${encodeURIComponent(txId)}`);
                  if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    const explorer = statusData?.onChain?.explorerLink || statusData?.explorerLink || '';
                    const hash = statusData?.onChain?.txId || statusData?.hash || '';
                    const pendingList = Array.isArray(statusData?.approvals?.pending) ? statusData.approvals.pending : [];
                    const submittedList = Array.isArray(statusData?.approvals?.submitted) ? statusData.approvals.submitted : [];
                    const pending = pendingList.length > 0;
                    const submitted = submittedList.length > 0;
                    const pendingMsg = statusData?.approvals?.pending?.[0]?.message || '';
                    if (!hash && pendingMsg && !approvalMessage) {
                      setApprovalMessage(pendingMsg);
                    }
                    const pendingSigner = statusData?.approvals?.pending?.[0]?.signer || null;
                    const reqAddr = pendingSigner?.address || null;
                    if (reqAddr) setRequiredSignerAddress(reqAddr);
                    if (pendingSigner?.type) setRequiredSignerType(pendingSigner.type);
                    setAgentTxStatus(statusData?.status || null);
                    setHasPendingApproval(pending);
                    setHasSubmittedApproval(submitted);
                    if (statusData?.status === 'failed') {
                      setApprovalError(statusData?.error?.message || 'Transaction failed');
                      setAgentTxError(statusData?.error || null);
                      clearInterval(interval);
                      pollIntervalRef.current = null;
                    }
                    setTransactionResult(prev => ({
                      hash: hash || prev?.hash || '',
                      explorerLink: explorer || prev?.explorerLink || '',
                      transactionId: txId,
                    }));
                    if (explorer || hash || statusData?.status === 'completed') {
                      clearInterval(interval);
                      pollIntervalRef.current = null;
                    }
                  }
                } catch (_) {}
                if (tries >= maxTries) clearInterval(interval);
              }, 1000);
              pollIntervalRef.current = interval;
            }
            return;
          }

          const result = await chainWallet.send(recipientAddress, 'usdc', amount);
          
          setTransactionResult(result);
          setSuccess(`Successfully sent ${amount} USDC!`);
          setCurrentStep('success');
          
        } catch (error) {
          console.error("Send failed:", error);
          setError(error instanceof Error ? error.message : "Transaction failed");
        } finally {
          setIsLoading(false);
        }
      };

      const handleApprove = async (txId: string) => {
        if (!approvalMessage || hasAttemptedApproval) return;
        setIsApproving(true);
        setApprovalError(null);
        try {
          let sig: string | undefined;
          if (wallet) {
            try {
              const { EVMWallet } = await import('@crossmint/client-sdk-react-ui');
              const evmWallet = EVMWallet.from(wallet);
              // Try simple string first
              if ((evmWallet as any).signMessage) {
                try {
                  sig = await (evmWallet as any).signMessage(approvalMessage);
                } catch (e) {
                  // Fallback to object form
                  sig = await (evmWallet as any).signMessage({ message: approvalMessage });
                }
              }
            } catch (e: any) {
              setApprovalError(e?.message || 'Failed to sign');
            }
          }
          if (!sig) return;
          const res = await fetch('/api/agent-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentWalletAddress,
              transactionId: txId,
              signerAddress: (externalWallet as string) || (wallet?.address || ''),
              signature: sig,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || data?.message || 'Approval failed');
          }
          setHasAttemptedApproval(true);
          setHasSubmittedApproval(true);
          // Kick an immediate status refresh so UI updates without waiting full interval
          try {
            const statusRes = await fetch(`/api/agent-transaction?agentWalletAddress=${encodeURIComponent(agentWalletAddress)}&transactionId=${encodeURIComponent(txId)}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const explorer = statusData?.onChain?.explorerLink || statusData?.explorerLink || '';
              const hash = statusData?.onChain?.txId || statusData?.hash || '';
              setAgentTxStatus(statusData?.status || null);
              setTransactionResult(prev => ({
                hash: hash || prev?.hash || '',
                explorerLink: explorer || prev?.explorerLink || '',
                transactionId: txId,
              }));
            }
          } catch {}
        } catch (e: any) {
          setApprovalError(e?.message || 'Approval failed');
        } finally {
          setIsApproving(false);
        }
      };

      const reset = () => {
        setCurrentStep('amount');
        setAmount('');
        setRecipient('');
        setError(null);
        setSuccess(null);
        setTransactionResult(null);
        fetchBalances();
      };

      const renderInsufficientBalanceError = () => (
        <div className={`${cardStyles.error} text-center`}>
          <div className="mb-3">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c.77.833 1.732 2.5 3.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-700 mb-4">
            You need USDC on {getChainDisplayName(selectedChain)} to send payments.
          </p>
          <div className="flex space-x-3 justify-center">
                          <button
                onClick={() => onShowContent(null)}
                className={buttonStyles.primary}
              >
                Go to Buy USDC
              </button>
            <button
              onClick={fetchBalances}
              disabled={isLoadingBalances}
              className={buttonStyles.secondary}
            >
              {isLoadingBalances ? 'Refreshing...' : 'Refresh Balance'}
            </button>
          </div>
        </div>
      );

      if (isLoadingBalances) {
        return (
          <div className={cardStyles.base}>
            <h2 className="text-xl font-semibold mb-4 text-center">Loading Balance...</h2>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          </div>
        );
      }

      if (rawBalance === 0) {
        return (
          <div className={cardStyles.base}>
            <h2 className="text-xl font-semibold mb-4 text-center">Send USDC</h2>
            {renderInsufficientBalanceError()}
          </div>
        );
      }

      return (
        <div className={cardStyles.base}>
          <h2 className="text-xl font-semibold mb-4 text-center">Send USDC</h2>

          {currentStep === 'amount' && (
            <div>
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  From: <span className="font-medium">{getChainDisplayName(selectedChain)}</span>
                </p>
                <div className="flex items-center text-sm text-gray-600">
                  <span>Available: <span className="font-medium">{depositSelection === 'agent' ? agentBalanceFormatted : formattedBalance} USDC</span></span>
                  <button
                    onClick={fetchBalances}
                    disabled={isLoadingBalances}
                    className="ml-2 p-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300 transition-colors"
                    title="Refresh balance"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                {hasAgentWallet && (
                  <div className="mt-3">
                    <div className="mb-1 text-sm font-medium">Send from</div>
                    <div className="space-y-2">
                      <label className={`flex items-start justify-between p-3 rounded border ${depositSelection === 'user' ? 'ring-2 ring-green-500 border-green-400 bg-white' : 'border-gray-200'}`}>
                        <span className="flex items-start">
                          <input
                            type="radio"
                            name="send-source"
                            checked={depositSelection === 'user'}
                            onChange={() => setDepositSelection('user')}
                            className="mr-3 mt-1"
                          />
                          <span>
                            <div className="text-sm font-medium">My wallet</div>
                            <div className="text-xs text-gray-600 break-all">{wallet?.address}</div>
                            <div className="text-xs text-gray-700 mt-1">Balance: {formattedBalance} USDC</div>
                          </span>
                        </span>
                      </label>
                      <label className={`flex items-start justify-between p-3 rounded border ${depositSelection === 'agent' ? 'ring-2 ring-green-500 border-green-400 bg-white' : 'border-gray-200'}`}>
                        <span className="flex items-start">
                          <input
                            type="radio"
                            name="send-source"
                            checked={depositSelection === 'agent'}
                            onChange={() => setDepositSelection('agent')}
                            className="mr-3 mt-1"
                          />
                          <span>
                            <div className="text-sm font-medium">Agent wallet</div>
                            <div className="text-xs text-gray-600 break-all">{agentWalletAddress}</div>
                            <div className="text-xs text-gray-700 mt-1">Balance: {agentBalanceFormatted} USDC</div>
                          </span>
                        </span>
                      </label>
                    </div>
                    {depositSelection === null && (
                      <div className="mt-2 text-xs text-red-600">Please select a wallet</div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (USDC)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.000001"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={inputStyles.base}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {['0.1', '1', '6.9', 'MAX'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        if (preset === 'MAX') {
                          const max = depositSelection === 'agent' ? agentRawBalance : rawBalance;
                          setAmount(max.toString());
                        } else {
                          setAmount(preset);
                        }
                      }}
                      className={buttonStyles.secondary}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {error && <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>}

                <button
                  type="button"
                  onClick={() => {
                    if (requestedAmount <= 0) {
                      setError("Please enter a valid amount");
                      return;
                    }
                    if (isInsufficientBalance) {
                      setError("Insufficient balance");
                      return;
                    }
                    setCurrentStep('recipient');
                  }}
                  disabled={!amount || requestedAmount <= 0 || (hasAgentWallet && depositSelection === null) || (recipientSelection === 'custom' && !recipient)}
                  className={requestedAmount > 0 ? buttonStyles.primary : buttonStyles.disabled}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 'recipient' && (
            <div>
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  Sending: <span className="font-bold text-green-600">{requestedAmount} USDC</span>
                </p>
                <p className="text-sm text-gray-600">
                  From: <span className="font-medium">{getChainDisplayName(selectedChain)}</span>
                </p>
              </div>

              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-3">
                  <div className="mb-1 text-sm font-medium">Recipient</div>
                  <label className={`block p-3 rounded border ${recipientSelection === 'preset' ? 'ring-2 ring-green-500 border-green-400 bg-white' : 'border-gray-200'}`}>
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="recipient-selection"
                        checked={recipientSelection === 'preset'}
                        onChange={() => { setRecipientSelection('preset'); setRecipientPreset(depositSelection === 'agent' ? 'user' : 'agent'); }}
                        className="mr-3 mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Send to {depositSelection === 'agent' ? 'my wallet' : 'agent wallet'}</div>
                        <div className="text-xs text-gray-600 break-all mt-1">
                          {depositSelection === 'agent' ? (wallet?.address || '') : agentWalletAddress}
                        </div>
                      </div>
                    </div>
                  </label>
                  <label className={`block p-3 rounded border ${recipientSelection === 'custom' ? 'ring-2 ring-green-500 border-green-400 bg-white' : 'border-gray-200'}`}>
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="recipient-selection"
                        checked={recipientSelection === 'custom'}
                        onChange={() => setRecipientSelection('custom')}
                        className="mr-3 mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Enter address</div>
                        <input
                          type="text"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="0x..."
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                        />
                      </div>
                    </div>
                  </label>
                </div>

                {error && <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('amount')}
                    className={buttonStyles.secondary}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || (recipientSelection === 'custom' && !recipient)}
                    className={buttonStyles.success}
                  >
                    {isLoading ? 'Sending...' : 'Send USDC'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 'success' && (
            <div className="text-center space-y-4">
              <h3 className={`text-lg font-semibold ${agentTxStatus === 'failed' ? 'text-red-600' : 'text-green-600'}`}>{agentTxStatus === 'failed' ? 'Transaction Failed' : transactionResult?.hash ? 'Transaction Successful!' : 'Transfer Created'}</h3>
              <p className={agentTxStatus === 'failed' ? 'text-red-600' : 'text-green-600'}>
                {agentTxStatus === 'failed' 
                  ? (agentTxError?.message || 'Transaction failed') 
                  : (transactionResult?.hash ? (success || 'Completed') : 'Awaiting wallet approval')}
              </p>
              
              {transactionResult && (
                <div className={cardStyles.info}>
                  <h4 className="font-semibold mb-2">Transaction Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>ID:</strong> {transactionResult.transactionId}</p>
                    <p><strong>Status:</strong> {agentTxStatus === 'failed' ? 'failed' : (transactionResult.hash ? 'completed' : 'pending')}</p>
                    {transactionResult.hash ? (
                      <>
                        <p><strong>Hash:</strong> {transactionResult.hash}</p>
                        {transactionResult.explorerLink && (
                          <a 
                            href={transactionResult.explorerLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-black hover:text-gray-800 underline"
                          >
                            View on Explorer →
                          </a>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Failure details */}
              {agentTxStatus === 'failed' && agentTxError && (
                <div className={cardStyles.error}>
                  <div className="text-sm">
                    <p className="font-semibold">{agentTxError.reason || 'Failed'}</p>
                    <p className="text-red-700 text-xs mb-1">{agentTxError.message || 'Execution reverted'}</p>
                    {agentTxError.revert?.type && (
                      <p className="text-xs">Type: {agentTxError.revert.type}</p>
                    )}
                    {agentTxError.revert?.reason && (
                      <p className="text-xs">Reason: {agentTxError.revert.reason}</p>
                    )}
                    {agentTxError.revert?.reasonData && (
                      <p className="text-xs">Code: {agentTxError.revert.reasonData}</p>
                    )}
                    {agentTxError.revert?.simulationLink && (
                      <a
                        className="text-xs underline"
                        href={agentTxError.revert.simulationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View simulation →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Submitted approval indicator */}
              {transactionResult && !transactionResult.hash && agentTxStatus !== 'failed' && hasSubmittedApproval && (
                <div className={cardStyles.info}>
                  <div className="text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">Approval submitted</span>
                    <p className="mt-2 text-gray-700 text-xs">Waiting for on-chain execution and confirmation…</p>
                  </div>
                </div>
              )}

              {/* Approval call-to-action when pending */}
              {transactionResult && !transactionResult.hash && agentTxStatus !== 'failed' && hasPendingApproval && (
                <div className={cardStyles.warning}>
                  <div className="text-sm">
                    <p className="font-semibold mb-2">Action required</p>
                    <p className="mb-3">Approve this transfer to submit it on-chain.</p>
                    {approvalError && (
                      <div className="mb-2 text-red-700 text-xs">{approvalError}</div>
                    )}
                    {/* Always signed by Crossmint wallet for this app */}
                    {agentTxError?.revert?.simulationLink && (
                      <a
                        className="text-xs underline"
                        href={agentTxError.revert.simulationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View simulation →
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApprove(transactionResult.transactionId)}
                      disabled={isApproving || !approvalMessage}
                      className={buttonStyles.primary}
                    >
                      {isApproving ? 'Approving…' : approvalMessage ? 'Approve with Wallet' : 'Waiting for approval info…'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 justify-center">
                <button
                  onClick={reset}
                  className={buttonStyles.primary}
                >
                  Send More
                </button>
                <button
                  onClick={() => onShowContent(null)}
                  className={buttonStyles.secondary}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      );
    };

    onShowContent(<SendForm />);
  };

  return (
    <button
      type="button"
      onClick={handleSendClick}
      className={isActive ? buttonStyles.primary : buttonStyles.secondary}
    >
      Send USDC
    </button>
  );
} 