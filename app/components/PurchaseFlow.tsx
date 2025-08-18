"use client";

import React from "react";
import { useWallet, CrossmintEmbeddedCheckout } from "@crossmint/client-sdk-react-ui";
import { useAccount } from "wagmi";
import { type Hex, parseTransaction } from "viem";
import { buttonStyles, cardStyles, DEFAULT_CHAIN, DEFAULT_SIGNER_TYPE } from "@/lib/constants";
import { formatBalance } from "@/lib/utils";

interface PurchaseFlowProps {
  onShowContent: (content: React.ReactNode) => void;
  isActive: boolean;
}

export function PurchaseFlow({ onShowContent, isActive }: PurchaseFlowProps) {
  const { wallet, getOrCreateWallet } = useWallet();
  const { address: externalWallet, isConnected } = useAccount();

  const isWeb3User = !!externalWallet;
  const activeWallet = isWeb3User ? externalWallet : wallet?.address || "";

  // Agent payment is not supported for NFT checkout

  const collectionId = process.env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID;
  const isCollectionConfigured = !!collectionId;

  // Debug logging
  React.useEffect(() => {
    console.log("PurchaseFlow Debug:", {
      externalWallet,
      isConnected,
      activeWallet,
      isWeb3User,
      crossmintWallet: wallet?.address,
      walletAvailable: !!wallet,
    });
  }, [externalWallet, isConnected, activeWallet, isWeb3User, wallet?.address, wallet]);


  const handlePurchaseClick = () => {
    if (!isCollectionConfigured) {
      onShowContent(
        <div className={cardStyles.base}>
          <h2 className="text-xl font-semibold mb-4 text-center text-red-600">Collection Not Configured</h2>
          <div className={cardStyles.error}>
            <p className="text-red-700 mb-2">
              The NFT collection is not configured. Please add the following environment variable:
            </p>
            <code className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm block">
              NEXT_PUBLIC_CROSSMINT_COLLECTION_ID=your-collection-id
            </code>
            <p className="text-red-600 text-sm mt-2">
              Add this to your <code className="bg-red-100 px-1 rounded">.env.local</code> file and restart the development server.
            </p>
          </div>
        </div>
      );
      return;
    }

    if (!activeWallet) {
      onShowContent(
        <div className={cardStyles.error}>
          <p className="text-red-700">Please create or connect a wallet first</p>
        </div>
      );
      return;
    }

    onShowContent(
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r  px-6 py-4">
            <h2 className="text-2xl font-bold text-black text-center">Purchase NFT (Embedded Checkout)</h2>
          </div>

          {/* Main Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6">

              {/* Checkout Form */}
              <div>
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Method</h3>
                  {/* Agent wallet payment not supported in NFT checkout */}
                  
                  {/* Wallet Status Check */}
                  {!wallet && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800">
                        ⚠️ Wallet not available. Please ensure your wallet is connected and try again.
                      </p>
                                              <p className="text-yellow-700 text-sm mt-1">
                          Debug info: isConnected={isConnected.toString()}, crossmintWallet={wallet ? "true" : "false"}, externalWallet={externalWallet ? "true" : "false"}
                        </p>
                    </div>
                  )}
                  
                  <div className="min-h-[400px]">
                    {wallet ? (
                      <CrossmintEmbeddedCheckout
                        recipient={{ walletAddress: activeWallet }}
                        lineItems={{
                          collectionLocator: `crossmint:${collectionId}`,
                          callData: {
                            totalPrice: "1",
                            quantity: 1,
                          },
                        }}
                        payment={{
                          crypto: {
                            enabled: true,
                            payer: {
                              address: activeWallet,
                              initialChain: "base-sepolia",
                              supportedChains: ["base-sepolia", "polygon-amoy"],
                              handleChainSwitch: async (chain: string) => {
                              if (!wallet) {
                                throw new Error("Wallet not available for chain switch");
                              }
                            },
                              handleSignAndSendTransaction: async (serializedTx: string) => {
                                console.log("Transaction signing requested");
                                if (!wallet) {
                                  console.error("Wallet not available for transaction");
                                  return {
                                    success: false,
                                    errorMessage: "Wallet not found. Please ensure your wallet is connected.",
                                  };
                                }

                                try {
                                  const tx = parseTransaction(serializedTx as Hex);
                                  console.log("Parsed transaction:", tx);
                                  console.log("Using existing wallet:", wallet.address, "on chain:", wallet.chain);
                                  
                                  // Sign with client Crossmint wallet
                                  const { EVMWallet } = await import('@crossmint/client-sdk-react-ui');
                                  const evmWallet = EVMWallet.from(wallet);
                                  const transactionInput = { transaction: serializedTx } as any;
                                  const transactionResult = await evmWallet.sendTransaction(transactionInput);
                                  
                                  console.log("Transaction sent successfully:", transactionResult);
                                  return { success: true, txId: transactionResult.hash || "" };
                                } catch (error) {
                                  console.error("Transaction failed:", error);
                                  return {
                                    success: false,
                                    errorMessage:
                                      error instanceof Error
                                        ? error.message
                                        : "Transaction failed",
                                  };
                                }
                              },
                            },
                          },
                          fiat: { enabled: true },
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                          <p className="text-gray-600">Loading wallet client...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Secure Payment
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Instant Delivery
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  24/7 Support
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <button
      type="button"
      onClick={handlePurchaseClick}
      className={
        !isCollectionConfigured
          ? buttonStyles.disabled
          : isActive 
            ? buttonStyles.primary
            : buttonStyles.secondary
      }
      title={!isCollectionConfigured ? 'Collection ID not configured' : ''}
    >
      NFT Checkout
    </button>
  );
} 