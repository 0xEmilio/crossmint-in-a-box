'use client';

import React from 'react';
import { useWallet, useCrossmintAuth as useAuth } from '@crossmint/client-sdk-react-ui';
import { 
  buttonStyles, 
  cardStyles, 
  inputStyles, 
  DEFAULT_CHAIN, 
  DEFAULT_SIGNER_TYPE,
  WORLDSTORE_RETRY_LIMIT,
  RETRY_INTERVAL
} from '@/lib/constants';
import { useConfigStatus } from './ConfigurationStatus';
import { useAgentWallet as useAgentWalletInfo } from '@/lib/hooks/useAgentWallet';
import { useTokenBalance } from '@/lib/hooks/useTokenBalance';
import { usePolling } from '@/lib/hooks/usePolling';
import { apiFetch } from '@/lib/client-api';
import { useApiInspector, useSetActiveFlow } from '@/lib/dev-inspector/ApiInspectorContext';

export function WorldstoreFlow() {
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
            The Worldstore feature requires a server API key. Please add the following environment variable:
          </p>
          <code className="bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 px-2 py-1 rounded text-sm block">
            CROSSMINT_SERVER_API_KEY=your-server-api-key
          </code>
          <p className="text-red-600 dark:text-red-400 text-sm mt-2">
            Add this to your <code className="bg-red-100 dark:bg-red-500/20 dark:text-red-300 px-1 rounded">.env.local</code> file and restart the development server.
          </p>
        </div>
      </div>
    );
  }

  return <WorldstoreForm />;
}

function WorldstoreForm() {
  const { wallet, getWallet, createWallet } = useWallet();
  const { user } = useAuth();
  const { log } = useApiInspector();
  useSetActiveFlow('worldstore');
  const [step, setStep] = React.useState(1);
  const [email, setEmail] = React.useState(user?.email || '');
  const [name, setName] = React.useState('');
  const [address1, setAddress1] = React.useState('');
  const [address2, setAddress2] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [zip, setZip] = React.useState('');
  const [item, setItem] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [quote, setQuote] = React.useState<any>(null);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState('');
  const [useAgentWallet, setUseAgentWallet] = React.useState(false);
  const [pendingStatusCheck, setPendingStatusCheck] = React.useState<{ orderId: string; transaction: any } | null>(null);

  const { hasAgentWallet, agentWalletAddress } = useAgentWalletInfo(wallet?.address, log);
  const { formatted: agentBalance, loading: agentBalanceLoading } = useTokenBalance(agentWalletAddress || undefined, DEFAULT_CHAIN, "usdc", log);
  const { formatted: balance, loading: balanceLoading, refetch: fetchBalance } = useTokenBalance(wallet?.address, DEFAULT_CHAIN, "usdc", log);

  React.useEffect(() => {
    if (!hasAgentWallet) setUseAgentWallet(false);
  }, [hasAgentWallet]);

  React.useEffect(() => {
    if (quote && step === 4) {
      fetchBalance();
    }
  }, [quote, step]);

  const getQuote = async () => {
    if (!wallet?.address) {
      setError('Wallet not connected');
      return;
    }

    setQuoteLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/worldstore-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asin: item,
          walletAddress: hasAgentWallet && useAgentWallet ? agentWalletAddress : wallet.address,
          recipient: {
            email,
            name,
            line1: address1,
            line2: address2,
            city,
            state,
            postalCode: zip,
            country: 'US'
          }
        })
      }, log);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get quote');
      }

      const data = await response.json();
      setQuote(data);
      setStep(4);
    } catch (err) {
      console.error('Quote failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleOrder = async () => {
    if (!wallet || !quote) return;

    setLoading(true);
    setError('');

    try {
      const serializedTransaction = quote.order?.payment?.preparation?.serializedTransaction;
      const payerAddress = quote.order?.payment?.preparation?.payerAddress;

      if (!serializedTransaction || !payerAddress) {
        throw new Error('Missing payment preparation data. Please try getting a new quote.');
      }

      let transactionResult: any = null;
      if (hasAgentWallet && useAgentWallet) {
        // Submit via Crossmint agent-transaction path with delegated signer
        const res = await fetch('/api/agent-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentWalletAddress: agentWalletAddress,
            transaction: serializedTransaction,
            signer: [`external-wallet:${wallet.address}`],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Agent transaction submit failed');
        }
        transactionResult = {
          hash: data?.hash || '',
          transactionId: data?.id || data?.transactionId || '',
          explorerLink: data?.explorerLink || '',
        };
      } else {
        // Default: use client wallet to sign and send
        let chainWallet = wallet;
        if (wallet.chain !== DEFAULT_CHAIN) {
          const newWallet = (await getWallet({ chain: DEFAULT_CHAIN as any } as any))
            || (await createWallet({ chain: DEFAULT_CHAIN as any, recovery: { type: "email" } } as any));
          if (newWallet) {
            chainWallet = newWallet;
          } else {
            throw new Error(`Failed to create wallet for ${DEFAULT_CHAIN}`);
          }
        }
        const { EVMWallet } = await import('@crossmint/client-sdk-react-ui');
        const evmWallet = EVMWallet.from(chainWallet);
        const transactionInput = { transaction: serializedTransaction } as any;
        transactionResult = await evmWallet.sendTransaction(transactionInput);
      }

      setStep(5);
      setPendingStatusCheck({ orderId: quote.order.orderId, transaction: transactionResult });

    } catch (error) {
      console.error('Order failed:', error);
      setError(error instanceof Error ? error.message : 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  usePolling(
    async () => {
      if (!pendingStatusCheck) return true;
      try {
        const response = await fetch(`/api/worldstore-status?orderId=${pendingStatusCheck.orderId}`);
        if (!response.ok) throw new Error('Failed to check order status');

        const orderData = await response.json();
        if (orderData.payment?.status === 'completed') {
          setResult({ orderStatus: 'completed', orderData, transaction: pendingStatusCheck.transaction });
          return true;
        }
        return false;
      } catch (err) {
        console.error('Status check failed:', err);
        setResult({ emailNotification: true, transaction: pendingStatusCheck.transaction });
        return true;
      }
    },
    {
      enabled: !!pendingStatusCheck && !result,
      intervalMs: RETRY_INTERVAL,
      maxAttempts: WORLDSTORE_RETRY_LIMIT,
      onMaxAttemptsReached: () => {
        if (pendingStatusCheck) setResult({ emailNotification: true, transaction: pendingStatusCheck.transaction });
      },
    }
  );

  const reset = () => {
    setStep(1);
    setEmail('');
    setName('');
    setAddress1('');
    setAddress2('');
    setCity('');
    setState('');
    setZip('');
    setItem('');
    setQuote(null);
    setResult(null);
    setError('');
    setLoading(false);
    setQuoteLoading(false);
    setPendingStatusCheck(null);
  };

  const canContinue = (currentStep: number) => {
    switch (currentStep) {
      case 1: return email.trim() !== '';
      case 2: return name.trim() !== '' && address1.trim() !== '' && city.trim() !== '' && state.trim() !== '' && zip.trim() !== '';
      case 3: return item.trim() !== '';
      default: return false;
    }
  };

  const isInsufficientBalance = () => {
    if (!quote?.order?.quote?.totalPrice?.amount) return false;
    const totalCost = parseFloat(quote.order.quote.totalPrice.amount);
    const userBalance = parseFloat(balance);
    return userBalance < totalCost;
  };

  return (
    <WorldstoreFlowContent
      step={step}
      setStep={setStep}
      email={email}
      setEmail={setEmail}
      name={name}
      setName={setName}
      address1={address1}
      setAddress1={setAddress1}
      address2={address2}
      setAddress2={setAddress2}
      city={city}
      setCity={setCity}
      state={state}
      setState={setState}
      zip={zip}
      setZip={setZip}
      item={item}
      setItem={setItem}
      loading={loading}
      quoteLoading={quoteLoading}
      quote={quote}
      result={result}
      error={error}
      setError={setError}
      balance={balance}
      balanceLoading={balanceLoading}
      useAgentWallet={useAgentWallet}
      setUseAgentWallet={setUseAgentWallet}
      hasAgentWallet={hasAgentWallet}
      agentWalletAddress={agentWalletAddress}
      agentBalance={agentBalance}
      agentBalanceLoading={agentBalanceLoading}
      userWalletAddress={wallet?.address}
      fetchBalance={fetchBalance}
      onGetQuote={getQuote}
      onOrder={handleOrder}
      onReset={reset}
      onClose={reset}
      canContinue={canContinue}
      isInsufficientBalance={isInsufficientBalance}
    />
  );
}

function WorldstoreFlowContent({
  step,
  setStep,
  email,
  setEmail,
  name,
  setName,
  address1,
  setAddress1,
  address2,
  setAddress2,
  city,
  setCity,
  state,
  setState,
  zip,
  setZip,
  item,
  setItem,
  loading,
  quoteLoading,
  quote,
  result,
  error,
  setError,
  balance,
  balanceLoading,
  useAgentWallet,
  setUseAgentWallet,
  hasAgentWallet,
  agentWalletAddress,
  agentBalance,
  agentBalanceLoading,
  userWalletAddress,
  fetchBalance,
  onGetQuote,
  onOrder,
  onReset,
  onClose,
  canContinue,
  isInsufficientBalance
}: any) {

  return (
    <div className={cardStyles.base}>
      <h2 className="text-xl font-semibold mb-4 text-center">Amazon Worldstore Flow</h2>

      {error && (
        <div className={cardStyles.error}>
          <p className="text-red-700 dark:text-red-300 break-words overflow-hidden">{error}</p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 1: Email Receipt</h3>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          <button
            onClick={() => setStep(2)}
            disabled={!canContinue(1)}
            className={canContinue(1) ? buttonStyles.primary : buttonStyles.disabled}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 2: Shipping Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputStyles.base}
                required
              />
            </div>
            <div>
              <label htmlFor="address1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address Line 1
              </label>
              <input
                id="address1"
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                className={inputStyles.base}
                required
              />
            </div>
            <div>
              <label htmlFor="address2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address Line 2 (Optional)
              </label>
              <input
                id="address2"
                type="text"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                className={inputStyles.base}
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputStyles.base}
                required
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State
              </label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={inputStyles.base}
                required
              />
            </div>
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ZIP Code
              </label>
              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className={inputStyles.base}
                required
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setStep(1)}
              className={buttonStyles.secondary}
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canContinue(2)}
              className={canContinue(2) ? buttonStyles.primary : buttonStyles.disabled}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 3: What to Buy</h3>
          <div>
            <label htmlFor="item" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amazon ASIN or Product URL
            </label>
            <input
              id="item"
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="B08N5WRWNW or amazon.com/dp/..."
              className={inputStyles.base}
              required
            />
          </div>
          {hasAgentWallet && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded border dark:border-gray-800">
              <div className="mb-2 font-medium text-sm dark:text-gray-100">Pay with</div>
              <div className="space-y-2">
                <label className={`flex items-start justify-between p-3 rounded border ${!useAgentWallet ? 'ring-2 ring-green-500 border-green-400 bg-white dark:bg-gray-900' : 'border-gray-200 dark:border-gray-800'}`}>
                  <span className="flex items-start">
                    <input
                      type="radio"
                      name="ws-source"
                      checked={!useAgentWallet}
                      onChange={() => setUseAgentWallet(false)}
                      className="mr-3 mt-1"
                    />
                    <span>
                      <div className="text-sm font-medium dark:text-gray-100">My wallet</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 break-all">{userWalletAddress}</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Balance: {balanceLoading ? 'Loading...' : `${balance} USDC`}</div>
                    </span>
                  </span>
                </label>
                <label className={`flex items-start justify-between p-3 rounded border ${useAgentWallet ? 'ring-2 ring-green-500 border-green-400 bg-white dark:bg-gray-900' : 'border-gray-200 dark:border-gray-800'}`}>
                  <span className="flex items-start">
                    <input
                      type="radio"
                      name="ws-source"
                      checked={useAgentWallet}
                      onChange={() => setUseAgentWallet(true)}
                      className="mr-3 mt-1"
                    />
                    <span>
                      <div className="text-sm font-medium dark:text-gray-100">Agent wallet</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 break-all">{agentWalletAddress}</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Balance: {agentBalanceLoading ? 'Loading...' : `${agentBalance} USDC`}</div>
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}
          <div className="flex space-x-3">
            <button
              onClick={() => setStep(2)}
              className={buttonStyles.secondary}
            >
              Back
            </button>
            <button
              onClick={onGetQuote}
              disabled={!canContinue(3) || quoteLoading}
              className={canContinue(3) && !quoteLoading ? buttonStyles.primary : buttonStyles.disabled}
            >
              {quoteLoading ? 'Getting Quote...' : 'Get Quote'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && quote && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 4: Review Product</h3>

          <div className="space-y-6">
            {quote.order?.lineItems?.[0] && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-4">
                <div className="flex space-x-4">
                  {quote.order.lineItems[0].metadata?.imageUrl && (
                    <img
                      src={quote.order.lineItems[0].metadata.imageUrl}
                      alt="Product"
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {quote.order.lineItems[0].metadata?.name || 'Product'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {quote.order.lineItems[0].metadata?.description || 'No description available'}
                    </p>
                    <div className="space-y-1 text-sm dark:text-gray-300">
                      <div className="flex justify-between">
                        <span>Item Price:</span>
                        <span className="font-medium">${quote.order.lineItems[0].quote?.charges?.unit?.amount || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sales Tax:</span>
                        <span className="font-medium">${quote.order.lineItems[0].quote?.charges?.salesTax?.amount || '0'}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t dark:border-gray-700 pt-1">
                        <span>Total:</span>
                        <span>${quote.order.quote?.totalPrice?.amount || '0'} USDC</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={cardStyles.info}>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">📦 Delivery Information</h4>
              <div className="space-y-1 text-sm dark:text-gray-300">
                <p><strong>Ship to:</strong> {name}</p>
                <p><strong>Address:</strong> {address1} {address2 && `, ${address2}`}</p>
                <p><strong>Location:</strong> {city}, {state} {zip}</p>
                <p><strong>Email receipt:</strong> {email}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">💰 Payment Info</h4>
                <button
                  onClick={fetchBalance}
                  disabled={balanceLoading}
                  className={buttonStyles.secondary}
                  title="Refresh balance"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2 text-sm dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Paying with:</span>
                  <span className="font-medium">{useAgentWallet ? 'Agent wallet' : 'My wallet'}</span>
                </div>
                {useAgentWallet && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 break-all text-right">{agentWalletAddress}</div>
                )}
                <div className="flex justify-between">
                  <span>Your USDC Balance:</span>
                  <span className="font-medium">${useAgentWallet ? agentBalance : balance} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Total:</span>
                  <span className="font-medium">${quote.order.quote?.totalPrice?.amount || '0'} USDC</span>
                </div>

                {isInsufficientBalance() && (
                  <div className="mt-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-md p-4 text-center">
                    <div className="mb-3">
                      <svg className="mx-auto h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c.77.833 1.732 2.5 3.732 2.5z" />
                      </svg>
                      <p className="font-semibold text-red-800 dark:text-red-300">Insufficient Balance</p>
                    </div>
                    <p className="text-red-700 dark:text-red-300 mb-3">
                      You need ${quote.order.quote?.totalPrice?.amount || '0'} USDC but only have ${useAgentWallet ? agentBalance : balance} USDC
                    </p>
                    <p className="text-red-700 dark:text-red-300">
                      Please buy more USDC to complete this order.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className={buttonStyles.secondary}
            >
              Back
            </button>
            <button
              onClick={onOrder}
              disabled={loading || isInsufficientBalance()}
              className={
                loading || isInsufficientBalance() 
                  ? buttonStyles.disabled 
                  : buttonStyles.success
              }
            >
              {loading ? 'Placing Order...' : isInsufficientBalance() ? 'Insufficient Balance' : 'Confirm Order'}
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          {!result ? (
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-green-600">Processing Order...</h3>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <p className="text-green-600">Transaction sent! Monitoring fulfillment...</p>
            </div>
          ) : result.emailNotification ? (
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-green-600">Order Submitted!</h3>
              <div className={cardStyles.info}>
                <p className="text-green-700 dark:text-green-300">
                  Your order has been submitted and payment processed. You will receive an email confirmation shortly.
                </p>
              </div>
              {result.transaction && (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 dark:text-gray-100">Transaction Details</h4>
                  <div className="space-y-1 text-sm dark:text-gray-300">
                    <p><strong>Hash:</strong> {result.transaction.hash}</p>
                    <p><strong>ID:</strong> {result.transaction.transactionId}</p>
                    <a
                      href={result.transaction.explorerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black dark:text-gray-100 hover:text-gray-800 dark:hover:text-gray-300 underline"
                    >
                      View on Explorer →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-green-600">Order Completed!</h3>
              <div className={cardStyles.success}>
                <div className="space-y-2 dark:text-gray-100">
                  <p><strong>Order ID:</strong> {result.orderData?.orderId}</p>
                  <p><strong>Amount:</strong> ${result.orderData?.quote?.totalPrice?.amount} USDC</p>
                  <p><strong>Status:</strong> {result.orderData?.payment?.status}</p>
                  <p><strong>Confirmation email:</strong> {email}</p>
                </div>
              </div>
              {result.transaction && (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 dark:text-gray-100">Transaction Details</h4>
                  <div className="space-y-1 text-sm dark:text-gray-300">
                    <p><strong>Hash:</strong> {result.transaction.hash}</p>
                    <p><strong>ID:</strong> {result.transaction.transactionId}</p>
                    <a
                      href={result.transaction.explorerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black dark:text-gray-100 hover:text-gray-800 dark:hover:text-gray-300 underline"
                    >
                      View on Explorer →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="flex justify-between">
              <button
                onClick={onReset}
                className={buttonStyles.primary}
              >
                Place Another Order
              </button>
              <button
                onClick={onClose}
                className={buttonStyles.secondary}
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 