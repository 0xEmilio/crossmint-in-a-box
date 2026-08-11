// Resolves the USDC tokenLocator for onramp orders. Shared by every onramp
// variant so the staging/production token address table only lives in one place.

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV === "production" ? "production" : "staging";
const DEFAULT_CHAIN = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || "base-sepolia";

const USDC_ADDRESSES = {
  "base-sepolia": {
    staging: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    production: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  solana: {
    staging: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    production: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
} as const;

/** Returns a `chain:address` tokenLocator for USDC on the configured DEFAULT_CHAIN, or null if unsupported. */
export function getUsdcTokenLocator(): string | null {
  const addresses = USDC_ADDRESSES[DEFAULT_CHAIN as keyof typeof USDC_ADDRESSES];
  if (!addresses) return null;
  const address = addresses[CROSSMINT_ENV as keyof typeof addresses];
  return `${DEFAULT_CHAIN}:${address}`;
}
