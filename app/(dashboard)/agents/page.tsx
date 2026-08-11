import AgentWallet from "@/app/components/AgentWallet";

export default function AgentsPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Agents</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Create and manage delegated agent wallets, permissions, and balances.
      </p>
      <div className="mt-6">
        <AgentWallet />
      </div>
    </div>
  );
}
