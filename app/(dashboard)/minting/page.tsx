import { CollectionManager } from "@/app/components";

export default function MintingPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Minting API</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Create and manage NFT collections, then mint from them.
      </p>
      <div className="mt-6">
        <CollectionManager />
      </div>
    </div>
  );
}
