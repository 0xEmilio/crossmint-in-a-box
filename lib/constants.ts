// Shared constants and configuration
export const DEFAULT_CHAIN = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'base-sepolia';
export const DEFAULT_SIGNER_TYPE = process.env.NEXT_PUBLIC_SIGNER_TYPE || 'passkey';
export const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';

// CSS Classes - consolidating common patterns
export const buttonStyles = {
  primary: '!bg-green-600 !hover:bg-green-700 !text-white !font-bold !py-2 !px-4 !rounded !transition-colors',
  secondary: '!bg-green-600 !hover:bg-gray-700 !text-white !font-bold !py-2 !px-4 !rounded !transition-colors',
  danger: '!bg-red-500 !hover:bg-red-700 !text-white !font-bold !py-2 !px-4 !rounded !transition-colors',
  disabled: '!bg-gray-400 !cursor-not-allowed !text-white !font-bold !py-2 !px-4 !rounded',
  success: '!bg-green-600 !hover:bg-green-700 !text-white !font-bold !py-2 !px-4 !rounded !transition-colors',
};

export const cardStyles = {
  base: '!border !border-gray-200 dark:!border-gray-800 dark:!text-gray-100 !rounded-lg !p-6',
  error: '!bg-red-50 dark:!bg-red-500/10 !border !border-red-200 dark:!border-red-500/30 !rounded-md !p-4',
  success: '!bg-green-50 dark:!bg-green-500/10 !border !border-green-200 dark:!border-green-500/30 !rounded-md !p-4',
  info: '!bg-green-50 dark:!bg-green-500/10 !border !border-green-200 dark:!border-green-500/30 !rounded-md !p-4',
  warning: '!bg-yellow-50 dark:!bg-yellow-500/10 !border !border-yellow-200 dark:!border-yellow-500/30 !rounded-md !p-3',
};

export const inputStyles = {
  base: '!w-full !px-3 !py-2 !border !border-gray-300 dark:!border-gray-700 dark:!bg-gray-900 dark:!text-gray-100 !rounded-md !focus:outline-none !focus:ring-2 !focus:ring-green-500 !focus:border-transparent',
  error: '!w-full !px-3 !py-2 !border !border-red-300 dark:!border-red-700 dark:!bg-gray-900 dark:!text-gray-100 !rounded-md !focus:outline-none !focus:ring-2 !focus:ring-red-500 !focus:border-transparent',
};

// Crossmint dashboard-configured `configOverride` id that subsidizes onramp/memecoin fees.
export const SUBSIDIZE_FEES_CONFIG_OVERRIDE_ID = '672380f5-1ef7-4539-a92e-94bf1bcd4e5f';

// Utility constants
export const BALANCE_DECIMAL_PLACES = 6;
export const WORLDSTORE_RETRY_LIMIT = 120; // 2 minutes at 1 second intervals
export const RETRY_INTERVAL = 1000; // 1 second 