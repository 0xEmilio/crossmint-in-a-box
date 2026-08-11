import { WorldstoreFlow } from "@/app/components";

export default function WorldstorePage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Worldstore</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Buy real-world products with crypto or a Crossmint agent wallet.
      </p>
      <div className="mt-6">
        <WorldstoreFlow />
      </div>
    </div>
  );
}
