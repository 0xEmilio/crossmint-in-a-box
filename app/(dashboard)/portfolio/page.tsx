import { PortfolioViewer } from "@/app/components/PortfolioViewer";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Portfolio</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Balances and minted NFTs across your main wallet and agent wallet(s).
        </p>
      </div>

      <PortfolioViewer />
    </div>
  );
}
