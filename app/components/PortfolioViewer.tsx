"use client";

import React from "react";
import { useWallet, useCrossmintAuth as useAuth } from "@crossmint/client-sdk-react-ui";
import { cardStyles, DEFAULT_CHAIN } from "@/lib/constants";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { apiFetch } from "@/lib/client-api";
import { useApiInspector, useSetActiveFlow } from "@/lib/dev-inspector/ApiInspectorContext";
import { Tabs } from "@/app/(dashboard)/components/Tabs";

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "main", label: "Main" },
  { id: "agent", label: "Agent" },
] as const;

type FilterId = (typeof FILTER_TABS)[number]["id"];

interface PortfolioWallet {
  type: "main" | "agent";
  address: string;
  label: string;
}

interface PortfolioNft {
  id: string;
  name: string;
  image?: string;
  collectionTitle: string;
  tokenId?: string;
  owner: string;
}

function useAgentWalletAddresses(mainWalletAddress: string | undefined, log: ReturnType<typeof useApiInspector>["log"]) {
  const [addresses, setAddresses] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!mainWalletAddress) return;
    let cancelled = false;
    setLoading(true);
    apiFetch("/api/get-agent-wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: mainWalletAddress }),
    }, log)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const signers = Array.isArray(data?.signers) ? data.signers : [];
        setAddresses(signers.map((s: any) => s?.address).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setAddresses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mainWalletAddress, log]);

  return { addresses, loading };
}

function useMintedNfts(mainWalletAddress: string | undefined, loginMethod: string, log: ReturnType<typeof useApiInspector>["log"]) {
  const [nfts, setNfts] = React.useState<PortfolioNft[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!mainWalletAddress) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const collectionsRes = await apiFetch(
          `/api/nft-collections?walletAddress=${encodeURIComponent(mainWalletAddress.toLowerCase())}&loginMethod=${encodeURIComponent(loginMethod)}`,
          { method: "GET" },
          log
        );
        const collectionsData = await collectionsRes.json();
        const collections = Array.isArray(collectionsData?.results) ? collectionsData.results : [];

        const nftLists = await Promise.all(
          collections.map(async (collection: any) => {
            const res = await apiFetch(
              `/api/nft-collections?collectionId=${encodeURIComponent(collection.id)}&part=nfts&page=1&perPage=50`,
              { method: "GET" },
              log
            );
            const data = await res.json();
            const results = Array.isArray(data) ? data : data?.results || [];
            return results.map((n: any) => ({
              id: n.id ?? `${collection.id}-${n.onChain?.tokenId}`,
              name: n.metadata?.name || n.id,
              image: n.metadata?.image,
              collectionTitle: collection.metadata?.name || collection.id,
              tokenId: n.onChain?.tokenId,
              owner: (n.onChain?.owner || "").toLowerCase(),
            }));
          })
        );

        if (!cancelled) setNfts(nftLists.flat());
      } catch {
        if (!cancelled) setNfts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mainWalletAddress, loginMethod, log]);

  return { nfts, loading };
}

function WalletCard({ wallet, nfts, log }: { wallet: PortfolioWallet; nfts: PortfolioNft[]; log: ReturnType<typeof useApiInspector>["log"] }) {
  const { formatted, loading: balanceLoading } = useTokenBalance(wallet.address, DEFAULT_CHAIN, "usdc", log);
  const ownedNfts = nfts.filter((n) => n.owner === wallet.address.toLowerCase());

  return (
    <div className={cardStyles.base}>
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            wallet.type === "main"
              ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
              : "bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400"
          }`}
        >
          {wallet.label}
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {balanceLoading ? "…" : `${formatted} USDC`}
        </span>
      </div>
      <p className="mb-3 break-all text-xs text-gray-500 dark:text-gray-400">{wallet.address}</p>

      <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          NFTs ({ownedNfts.length})
        </div>
        {ownedNfts.length === 0 ? (
          <p className="text-xs text-gray-400">No NFTs from your minted collections.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {ownedNfts.map((nft) => (
              <div key={nft.id} className="rounded-lg border border-gray-100 p-2 text-center dark:border-gray-800">
                {nft.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={nft.image} alt={nft.name} className="mb-1 aspect-square w-full rounded object-cover" />
                ) : (
                  <div className="mb-1 flex aspect-square w-full items-center justify-center rounded bg-gray-100 text-gray-400 dark:bg-gray-800">
                    ?
                  </div>
                )}
                <div className="truncate text-xs font-medium text-gray-800 dark:text-gray-200" title={nft.name}>
                  {nft.name}
                </div>
                <div className="truncate text-[10px] text-gray-400" title={nft.collectionTitle}>
                  {nft.collectionTitle}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PortfolioViewer() {
  const { wallet } = useWallet();
  const { user } = useAuth();
  const { log } = useApiInspector();
  useSetActiveFlow("portfolio");

  const loginMethod = String((user as any)?.provider || (user as any)?.loginMethod || "email").toLowerCase();
  const mainAddress = wallet?.address;

  const { addresses: agentAddresses, loading: agentLoading } = useAgentWalletAddresses(mainAddress, log);
  const { nfts, loading: nftsLoading } = useMintedNfts(mainAddress, loginMethod, log);
  const [filter, setFilter] = React.useState<FilterId>("all");

  if (!mainAddress) {
    return (
      <div className={cardStyles.error}>
        <p className="text-red-700">Please create or connect a wallet first</p>
      </div>
    );
  }

  const wallets: PortfolioWallet[] = [
    { type: "main", address: mainAddress, label: "Main Wallet" },
    ...agentAddresses.map((address, i) => ({
      type: "agent" as const,
      address,
      label: agentAddresses.length > 1 ? `Agent Wallet ${i + 1}` : "Agent Wallet",
    })),
  ];

  const visibleWallets = filter === "all" ? wallets : wallets.filter((w) => w.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs tabs={FILTER_TABS} activeId={filter} onChange={setFilter} />
        {(agentLoading || nftsLoading) && (
          <span className="text-xs text-gray-400">Loading…</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleWallets.map((w) => (
          <WalletCard key={w.address} wallet={w} nfts={nfts} log={log} />
        ))}
      </div>
    </div>
  );
}
