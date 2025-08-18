'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui';
import { buttonStyles, cardStyles, inputStyles } from '@/lib/constants';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { useConfigStatus } from './ConfigurationStatus';

// Dynamic import for Persona (client-side only)
let Persona: any = null;
if (typeof window !== 'undefined') {
  import('persona').then((module) => {
    Persona = module.default;
  });
}

interface OnrampFlowProps {
  onShowContent: (content: React.ReactNode) => void;
  isActive: boolean;
}

const SUPPORTED_CHAINS = ['base-sepolia', 'solana'];

export function OnrampFlow({ onShowContent, isActive }: OnrampFlowProps) {
  const { wallet } = useWallet();
  const { user } = useAuth();
  const { configStatus, mounted } = useConfigStatus();

  const isChainSupported = SUPPORTED_CHAINS.includes(DEFAULT_CHAIN);
  const isServerApiKeyConfigured = mounted ? (configStatus?.serverApiKey ?? false) : false;

  const handleClick = () => {
    if (!isServerApiKeyConfigured) {
      onShowContent(
        <div className={cardStyles.base}>
          <h2 className="text-xl font-semibold mb-4 text-center text-red-600">Server API Key Not Configured</h2>
          <div className={cardStyles.error}>
            <p className="text-red-700 mb-2">
              The onramp feature requires a server API key. Please add the following environment variable:
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

    if (!isChainSupported) {
      onShowContent(
        <div className={cardStyles.base}>
          <h2 className="text-xl font-semibold mb-4 text-center">Buy USDC</h2>
          <div className={cardStyles.error}>
            <p className="text-red-700">
              Onramp is not supported for chain: {DEFAULT_CHAIN}
            </p>
            <p className="text-sm text-red-600 mt-2">
              Supported chains: {SUPPORTED_CHAINS.join(', ')}
            </p>
          </div>
        </div>
      );
      return;
    }

    const OnrampForm = () => {
      const [step, setStep] = React.useState(1);
      const [amount, setAmount] = React.useState('10');
      const [email, setEmail] = React.useState(user?.email || '');
      const [loading, setLoading] = React.useState(false);
      const [order, setOrder] = React.useState<any>(null);
      const [kycStatus, setKycStatus] = React.useState<string>('');
      const [paymentStatus, setPaymentStatus] = React.useState<string>('');
      const [error, setError] = React.useState('');
      const [result, setResult] = React.useState<any>(null);
      const [kycCompleted, setKycCompleted] = useState(false);
      const [personaClient, setPersonaClient] = useState<any>(null);
      const [kycInfo, setKycInfo] = useState<any>(null);
      const [kycCancelled, setKycCancelled] = useState(false);
      const [paymentSession, setPaymentSession] = useState<any>(null);
      const [checkoutFlow, setCheckoutFlow] = useState<any>(null);
      const [hasAgentWallet, setHasAgentWallet] = useState(false);
      const [depositSelection, setDepositSelection] = useState<'user' | 'agent' | 'custom' | null>(null);
      const [agentWalletAddress, setAgentWalletAddress] = useState<string>('');
      const [agentBalance, setAgentBalance] = useState<string>('0');
      const [agentBalanceLoading, setAgentBalanceLoading] = useState(false);
      const [userBalance, setUserBalance] = useState<string>('0');
      const [userBalanceLoading, setUserBalanceLoading] = useState(false);
      const [customAddress, setCustomAddress] = useState<string>('');

      // Initialize Persona SDK when KYC info is available
      useEffect(() => {
        if (!kycInfo) return;
        
        const loadPersona = async () => {
          if (!Persona) {
            try {
              const personaModule = await import('persona');
              Persona = personaModule.default;
            } catch (error) {
              console.error('Failed to load Persona SDK:', error);
              return;
            }
          }
          
          if (kycInfo && !personaClient) {
            try {
              const client = new Persona.Client({
                templateId: kycInfo.templateId,
                environment: process.env.NEXT_PUBLIC_CROSSMINT_ENV === 'production' ? 'production' : 'sandbox',
                onReady: () => client.open(),
                onComplete: ({ inquiryId, status, fields }: { inquiryId: string; status: string; fields: any }) => {
                  handleKycComplete(inquiryId);
                },
                onCancel: ({ inquiryId, sessionToken }: { inquiryId?: string; sessionToken?: string }) => {
                  setKycCancelled(true);
                  setError('Identity verification was cancelled. You can reopen it below.');
                },
                onError: (error: any) => {
                  setError('Identity verification failed: ' + error.message);
                  setStep(1);
                }
                });
                setPersonaClient(client);
            } catch (error) {
              console.error('Failed to create Persona client:', error);
            }
          }
        };

        loadPersona();
      }, [kycInfo]);

      const handleKycComplete = async (inquiryId: string) => {
        setKycCompleted(true);
        setKycCancelled(false);
        
        try {
          const orderId = order?.order?.orderId;
          
          if (!orderId || !inquiryId) {
            setError('Missing required data. Please try again.');
            return;
          }
          
          const response = await fetch('/api/onramp-kyc-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              inquiryId: inquiryId,
              status: 'approved'
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            setError('Failed to complete KYC verification. Please try again.');
            return;
          }

          const data = await response.json();
          setOrder(data);
        setStep(3);
        } catch (error) {
          console.error('Error notifying Crossmint:', error);
          setError('Failed to complete KYC verification. Please try again.');
        }
      };

      const reopenKyc = async () => {
        setKycCancelled(false);
        setError('');
        setPersonaClient(null);
        setKycInfo({ ...kycInfo });
      };

      const initializePayment = async (checkoutcomPaymentSession: any, checkoutcomPublicKey: string) => {
                try {
          // Wait for Checkout script to load with timeout
          if (typeof (window as any).CheckoutWebComponents === 'undefined') {
            await new Promise((resolve, reject) => {
              let attempts = 0;
              const maxAttempts = 50; // 5 seconds timeout

              const checkCheckout = () => {
                attempts++;
                if (typeof (window as any).CheckoutWebComponents !== 'undefined') {
                  resolve(true);
                } else if (attempts >= maxAttempts) {
                  reject(new Error('Checkout script failed to load'));
                } else {
                  setTimeout(checkCheckout, 100);
                }
              };
              checkCheckout();
            });
          }

          // Use CheckoutWebComponents since that's what's actually loading
          let checkout: any;
          if (typeof (window as any).CheckoutWebComponents === 'function') {
            checkout = await (window as any).CheckoutWebComponents({
              publicKey: checkoutcomPublicKey,
              environment: "sandbox",
              locale: "en-US",
              paymentSession: checkoutcomPaymentSession,
              onReady: () => {},
              onPaymentCompleted: (component: any, paymentResponse: any) => {
                setResult(paymentResponse);
                setStep(5);
              },
              onError: (component: any, error: any) => {
                setError('Payment form error: ' + error.message);
              },
            });
            checkout = checkout.create("flow");
          } else {
            throw new Error('CheckoutWebComponents is not available');
          }

          checkout.mount("#payment-container");
          setCheckoutFlow(checkout);
          setPaymentSession(checkoutcomPaymentSession);
        } catch (error) {
          console.error('Failed to initialize payment:', error);
          setError('Failed to load payment form: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      };

      // Auto-start payment when step 3 is reached
      useEffect(() => {
        const startPayment = async () => {
          console.log('Payment useEffect triggered:', {
            step,
            hasOrder: !!order,
            hasPaymentSession: !!paymentSession,
            hasCheckoutFlow: !!checkoutFlow
          });
          
          const latestOrder = order?.order || order;
          const hasPaymentData = latestOrder?.payment?.preparation?.checkoutcomPaymentSession?.id && 
                                latestOrder?.payment?.preparation?.checkoutcomPublicKey;
          
          console.log('Payment data check:', {
            latestOrder: !!latestOrder,
            paymentPreparation: !!latestOrder?.payment?.preparation,
            paymentSession: !!latestOrder?.payment?.preparation?.checkoutcomPaymentSession,
            publicKey: !!latestOrder?.payment?.preparation?.checkoutcomPublicKey,
            hasPaymentData
          });
          
          if (step === 3 && order && hasPaymentData && !paymentSession && !checkoutFlow) {
            console.log('Starting payment initialization...');
            const latestOrder = order?.order || order;
            const paymentSessionData = latestOrder?.payment?.preparation?.checkoutcomPaymentSession;
            const publicKey = latestOrder?.payment?.preparation?.checkoutcomPublicKey;
            
            if (!paymentSessionData || !publicKey) {
              console.error('Missing payment data:', { paymentSessionData, publicKey });
              setError('Payment session not available - please wait for KYC completion');
              return;
            }
            
            await initializePayment(paymentSessionData, publicKey);
          } else {
            console.log('Payment conditions not met:', {
              step,
              hasOrder: !!order,
              hasPaymentData,
              hasPaymentSession: !!paymentSession,
              hasCheckoutFlow: !!checkoutFlow
            });
          }
        };

        startPayment();
      }, [step, order, paymentSession, checkoutFlow]);

      const createOrder = async () => {
        if (!wallet?.address) {
          setError('Wallet not connected');
          return;
        }

        setLoading(true);
        setError('');

        try {
          let destinationAddress = wallet.address;
          if (hasAgentWallet) {
            if (depositSelection === 'agent') destinationAddress = agentWalletAddress;
            if (depositSelection === 'custom' && customAddress.trim()) destinationAddress = customAddress.trim();
          }
          const response = await fetch('/api/onramp-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount,
              email,
              walletAddress: destinationAddress
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create order');
          }

          const data = await response.json();
          setOrder(data);
          
          if (data.order.payment.status === 'requires-kyc') {
            const kycPreparation = data.order.payment.preparation?.kyc;
            
            if (kycPreparation && kycPreparation.provider === 'persona') {
              const kycInfo = {
                templateId: kycPreparation.templateId,
                referenceId: kycPreparation.referenceId
              };
              setKycInfo(kycInfo);
              setStep(2);
            } else {
              setError('KYC configuration not found in order response');
            }
          } else if (data.order.payment.status === 'awaiting-payment') {
            setStep(3);
          }
        } catch (err) {
          console.error('Order creation failed:', err);
          setError(err instanceof Error ? err.message : 'Failed to create order');
        } finally {
          setLoading(false);
        }
      };

      // Poll for status updates
      React.useEffect(() => {
        if (step === 2 || step === 3) {
          const interval = setInterval(async () => {
            if (!order?.order?.orderId) return;

            try {
              const response = await fetch(`/api/onramp-status?orderId=${order.order.orderId}`);
              if (!response.ok) throw new Error('Failed to check order status');
              
              const data = await response.json();
              setKycStatus(data.payment?.status || '');
              setPaymentStatus(data.payment?.status || '');
              setOrder(data);

              if (data.payment?.status === 'awaiting-payment') {
                setStep(3);
              } else if (data.payment?.status === 'rejected-kyc') {
                setError('KYC verification was rejected. Please try again.');
                setStep(1);
              } else if (data.payment?.status === 'manual-kyc') {
                setStep(4);
              } else if (data.payment?.status === 'completed') {
                setResult(data);
                setStep(5);
              }
            } catch (err) {
              console.error('Status check failed:', err);
            }
          }, 5000);

          return () => clearInterval(interval);
        }
      }, [step, order]);

      const reset = () => {
        setStep(1);
        setAmount('10');
        setEmail(user?.email || '');
        setOrder(null);
        setKycStatus('');
        setPaymentStatus('');
        setError('');
        setResult(null);
        setLoading(false);
        setKycCompleted(false);
        setKycInfo(null);
        setKycCancelled(false);
        setPaymentSession(null);
        setCheckoutFlow(null);
      };

      const canContinue = () => {
        const basicValid = email.trim() !== '' && parseFloat(amount) > 0;
        if (!hasAgentWallet) return basicValid;
        if (depositSelection === null) return false;
        if (depositSelection === 'custom') return basicValid && customAddress.trim().length > 0;
        return basicValid;
      };

      useEffect(() => {
        const init = async () => {
          if (!wallet?.address) return;
          await fetchAgentWallet();
          await fetchUserBalance();
        };
        init();
      }, [wallet?.address]);

      const fetchAgentWallet = async () => {
        try {
          const response = await fetch('/api/get-agent-wallets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: wallet?.address })
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

      const fetchAgentBalance = async (address: string) => {
        setAgentBalanceLoading(true);
        try {
          const response = await fetch(`/api/wallet-balances?wallet=${address}`);
          if (!response.ok) throw new Error('Failed to fetch agent balance');
          const data = await response.json();
          const usdcData = data.find((token: any) => token.token === 'usdc');
          const chainBalance = usdcData?.balances?.[DEFAULT_CHAIN] || '0';
          const formatted = usdcData ? (parseFloat(chainBalance) / Math.pow(10, usdcData.decimals)).toFixed(2) : '0';
          setAgentBalance(formatted);
        } catch (e) {
          console.error('Failed to fetch agent balance', e);
          setAgentBalance('0');
        } finally {
          setAgentBalanceLoading(false);
        }
      };

      const fetchUserBalance = async () => {
        setUserBalanceLoading(true);
        try {
          if (!wallet?.address) return;
          const response = await fetch(`/api/wallet-balances?wallet=${wallet.address}`);
          if (!response.ok) throw new Error('Failed to fetch user balance');
          const data = await response.json();
          const usdcData = data.find((token: any) => token.token === 'usdc');
          const chainBalance = usdcData?.balances?.[DEFAULT_CHAIN] || '0';
          const formatted = usdcData ? (parseFloat(chainBalance) / Math.pow(10, usdcData.decimals)).toFixed(2) : '0';
          setUserBalance(formatted);
        } catch (e) {
          console.error('Failed to fetch user balance', e);
          setUserBalance('0');
        } finally {
          setUserBalanceLoading(false);
        }
      };

      const renderStep1 = () => (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 1: Select USDC Quantity</h3>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={inputStyles.base}
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (USD)
            </label>
            <input
              id="amount"
              type="number"
              min="5"
              max="10000"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              className={inputStyles.base}
            />
            <p className="text-sm text-gray-500 mt-1">Minimum: $5, Maximum: $10,000</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {['10', '25', '69', '100'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={buttonStyles.secondary}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {hasAgentWallet && (
            <div className="p-4 bg-gray-50 rounded border">
              <div className="mb-2 font-medium text-sm">Deposit to</div>
              <div className="space-y-3">
                <label className={`flex items-start justify-between p-3 rounded border ${depositSelection === 'user' ? 'ring-2 ring-green-500 border-green-400 bg-white' : 'border-gray-200'}`}>
                  <span className="flex items-start">
                    <input
                      type="radio"
                      name="deposit-destination"
                      checked={depositSelection === 'user'}
                      onChange={() => setDepositSelection('user')}
                      className="mr-3 mt-1"
                    />
                    <span>
                      <div className="text-sm font-medium">My wallet</div>
                      <div className="text-xs text-gray-600 break-all">{wallet?.address}</div>
                      <div className="text-xs text-gray-700 mt-1">Balance: {userBalanceLoading ? 'Loading...' : `${userBalance} USDC`}</div>
                    </span>
                  </span>
                </label>
                <label className={`flex items-start justify-between p-3 rounded border ${depositSelection === 'agent' ? 'ring-2 ring-green-500 border-green-400 bg-white' : 'border-gray-200'}`}>
                  <span className="flex items-start">
                    <input
                      type="radio"
                      name="deposit-destination"
                      checked={depositSelection === 'agent'}
                      onChange={() => setDepositSelection('agent')}
                      className="mr-3 mt-1"
                    />
                    <span>
                      <div className="text-sm font-medium">Agent wallet</div>
                      <div className="text-xs text-gray-600 break-all">{agentWalletAddress}</div>
                      <div className="text-xs text-gray-700 mt-1">Balance: {agentBalanceLoading ? 'Loading...' : `${agentBalance} USDC`}</div>
                    </span>
                  </span>
                </label>
                <label className={`block p-3 rounded border ${depositSelection === 'custom' ? 'ring-2 ring-green-500 border-green-400 bg-white' : 'border-gray-200'}`}>
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="deposit-destination"
                      checked={depositSelection === 'custom'}
                      onChange={() => setDepositSelection('custom')}
                      className="mr-3 mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Custom address</div>
                      <input
                        type="text"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="0x..."
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                      />
                    </div>
                  </div>
                </label>
              </div>
              {depositSelection === null || (depositSelection === 'custom' && !customAddress.trim()) ? (
                <div className="mt-2 text-xs text-red-600">Please select a destination{depositSelection === 'custom' ? ' and enter an address' : ''}</div>
              ) : null}
            </div>
          )}

          <button
            onClick={createOrder}
            disabled={loading || !canContinue()}
            className={canContinue() && !loading ? buttonStyles.primary : buttonStyles.disabled}
          >
            {loading ? 'Creating Order...' : 'Continue to KYC'}
          </button>
        </div>
      );

      const renderStep2 = () => (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 2: Identity Verification</h3>
          <p className="text-gray-600">Please complete the identity verification process to continue with your purchase.</p>
          
          <div className={cardStyles.info}>
            <p className="text-gray-700">
              KYC verification is required for crypto purchases. This process helps ensure compliance and security.
            </p>
          </div>

          <div className="min-h-[400px] border rounded-lg p-4">
            {!personaClient ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Initializing identity verification...</p>
                </div>
              </div>
            ) : !kycInfo ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-red-600 mb-2">KYC configuration not available</p>
                  <p className="text-sm text-gray-500">Please try again or contact support</p>
                </div>
              </div>
            ) : kycCancelled ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-600 mb-4">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">KYC verification was cancelled</p>
                  <button
                    onClick={reopenKyc}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Reopen Verification
                  </button>
                </div>
              </div>
            ) : (
              <div id="persona-container" className="w-full h-full">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Listening for KYC completion...</p>
                    <p className="text-sm text-gray-500 mt-1">Please complete the verification in the popup window</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Identity verification is powered by Persona
          </p>
        </div>
      );

      const renderStep3 = () => (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 3: Payment</h3>
          
          {order && (
            <div className={cardStyles.info}>
              <h4 className="font-semibold mb-2">Order Summary</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Amount:</strong> ${amount} USD</p>
                <p><strong>USDC to receive:</strong> ~{order?.order?.lineItems?.[0]?.quote?.totalPrice?.amount || order?.lineItems?.[0]?.quote?.totalPrice?.amount || 'Calculating...'} USDC</p>
                <p><strong>Recipient:</strong> {hasAgentWallet ? (depositSelection === 'agent' ? agentWalletAddress : depositSelection === 'custom' ? customAddress : wallet?.address) : wallet?.address}</p>
              </div>
            </div>
          )}

          <div id="payment-container" className="min-h-[400px] border rounded-lg p-4">
            {!checkoutFlow ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading payment form...</p>
                  <p className="text-sm text-gray-500 mt-1">Please wait while we prepare your payment</p>
                  <button
                    onClick={() => {
                      const latestOrder = order?.order || order;
                      const paymentSessionData = latestOrder?.payment?.preparation?.checkoutcomPaymentSession;
                      const publicKey = latestOrder?.payment?.preparation?.checkoutcomPublicKey;
                      if (paymentSessionData && publicKey) {
                        initializePayment(paymentSessionData, publicKey);
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Retry Loading Payment Form
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <p className="text-sm text-gray-500">
            Payment processing is handled securely by Checkout.com
          </p>
        </div>
      );

      const renderStep4 = () => (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Manual Review Required</h3>
          
          <div className={cardStyles.warning}>
            <p className="text-yellow-700">
              Your identity verification is under manual review. This process typically takes 1-2 business days.
            </p>
          </div>

          <p className="text-gray-600">
            You will receive an email notification once the review is complete. You can check back here for updates.
          </p>
        </div>
      );

      const renderStep5 = () => {
        const finalOrderId = (result && (result.orderId || result.order?.orderId)) || (order && (order.order?.orderId || order.orderId)) || '';
        const receivedAmount = (result && result.order?.lineItems?.[0]?.quote?.totalPrice?.amount) || (order && order.order?.lineItems?.[0]?.quote?.totalPrice?.amount) || '';
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-600">Purchase Successful!</h3>
            
            <div className={cardStyles.success}>
              <h4 className="font-semibold mb-2">Transaction Details</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Order ID:</strong> {finalOrderId || '—'}</p>
                <p><strong>Amount:</strong> ${amount} USD</p>
                <p><strong>Status:</strong> Completed</p>
              </div>
            </div>

            <p className="text-gray-600">
              Your USDC has been sent to your wallet. You will receive an email receipt shortly.
            </p>
          </div>
        );
      };

      return (
        <div className={cardStyles.base}>
          <h2 className="text-xl font-semibold mb-4 text-center">USDC On-ramp Flow</h2>

          {error && (
            <div className={`${cardStyles.error} mb-8`}>
              <p className="text-red-700 break-words overflow-hidden">{error}</p>
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}

          {step > 1 && step < 5 && (
            <div className="mt-6">
              <button
                onClick={reset}
                className={buttonStyles.secondary}
              >
                Start Over
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="flex justify-between mt-6">
              <button
                onClick={reset}
                className={buttonStyles.primary}
              >
                Buy More USDC
              </button>
              <button
                onClick={() => onShowContent(null)}
                className={buttonStyles.secondary}
              >
                Close
              </button>
            </div>
          )}
        </div>
      );
    };

    onShowContent(<OnrampForm />);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        !isServerApiKeyConfigured || !isChainSupported
          ? buttonStyles.disabled
          : isActive 
            ? buttonStyles.primary
            : buttonStyles.secondary
      }
      disabled={!isServerApiKeyConfigured || !isChainSupported}
      title={
        !isServerApiKeyConfigured 
          ? 'Server API key not configured' 
          : !isChainSupported 
            ? `Onramp not supported for ${DEFAULT_CHAIN}` 
            : undefined
      }
    >
      Buy USDC
    </button>
  );
} 