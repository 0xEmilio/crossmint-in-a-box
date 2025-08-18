import { BALANCE_DECIMAL_PLACES } from './constants';

// Format blockchain balance from raw value to human readable
export function formatBalance(balance: string, decimals: number): string {
  const num = parseFloat(balance) / Math.pow(10, decimals);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: BALANCE_DECIMAL_PLACES,
  });
}

// Convert chain identifier to display name
export function getChainDisplayName(chain: string): string {
  return chain
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Parse balance to float for calculations
export function parseBalanceToFloat(balance: string, decimals: number): number {
  return parseFloat(balance) / Math.pow(10, decimals);
}

// Check if user has sufficient balance for transaction
export function hasSufficientBalance(
  userBalance: string, 
  decimals: number, 
  requiredAmount: number
): boolean {
  const balanceFloat = parseBalanceToFloat(userBalance, decimals);
  return balanceFloat >= requiredAmount;
}

// Validate required environment variables
export function validateEnvironment(): string[] {
  const missing: string[] = [];
  
  if (!process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY) {
    missing.push('NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY');
  }
  
  if (!process.env.CROSSMINT_SERVER_API_KEY) {
    missing.push('CROSSMINT_SERVER_API_KEY');
  }
  
  return missing;
} 