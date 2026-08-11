import { WalletInfo, BalanceFetcher, SendFlow, ViewTransactions } from "@/app/components";

export default function WalletsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Wallets</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Balance, sending, and transaction history for your active wallet.
        </p>
      </div>

      <WalletInfo />

      <div className="grid gap-6 md:grid-cols-2">
        <BalanceFetcher />
        <SendFlow />
      </div>

      <ViewTransactions />
    </div>
  );
}
