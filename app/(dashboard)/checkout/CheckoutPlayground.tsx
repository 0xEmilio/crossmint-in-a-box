"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeEditorProvider } from "@/lib/checkout-theme-editor/ThemeEditorContext";
import { Tabs } from "../components/Tabs";
import { CheckoutThemeEditor } from "./components/CheckoutThemeEditor";

// Each tab's dependencies are only fetched once that tab is actually selected,
// not on every /checkout visit.
const NftCheckoutTab = dynamic(() => import("./tabs/NftCheckoutTab").then((m) => m.NftCheckoutTab), {
  loading: () => <TabLoading />,
  ssr: false,
});
const ClassicOnrampVariant = dynamic(() => import("./tabs/onramp/ClassicOnrampVariant").then((m) => m.ClassicOnrampVariant), {
  loading: () => <TabLoading />,
  ssr: false,
});
const MemecoinTab = dynamic(() => import("./tabs/MemecoinTab").then((m) => m.MemecoinTab), {
  loading: () => <TabLoading />,
  ssr: false,
});

const FLOW_TABS = [
  { id: "nft", label: "NFT Checkout" },
  { id: "onramp", label: "Onramp" },
  { id: "memecoin", label: "Memecoin" },
] as const;

type FlowId = (typeof FLOW_TABS)[number]["id"];

function isFlowId(value: string | null): value is FlowId {
  return FLOW_TABS.some((tab) => tab.id === value);
}

export function CheckoutPlayground() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedFlow = searchParams.get("flow");
  const activeFlow: FlowId = isFlowId(requestedFlow) ? requestedFlow : "nft";

  const setFlow = (id: FlowId) => {
    router.push(`/checkout?flow=${id}`, { scroll: false });
  };

  return (
    <ThemeEditorProvider>
      <div>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Checkout Playground</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            One integration pattern, three payment experiences — same server-created order, injected into the embedded checkout.
            The design panel drives the NFT, Onramp, and Memecoin checkouts live.
          </p>
        </div>

        <div className="mb-6">
          <Tabs tabs={FLOW_TABS} activeId={activeFlow} onChange={setFlow} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="order-2 lg:order-1">
            <CheckoutThemeEditor activeFlow={activeFlow} />
          </div>
          <div className="order-1 lg:order-2">
            {activeFlow === "nft" && <NftCheckoutTab />}
            {activeFlow === "onramp" && <ClassicOnrampVariant />}
            {activeFlow === "memecoin" && <MemecoinTab />}
          </div>
        </div>
      </div>
    </ThemeEditorProvider>
  );
}

function TabLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  );
}
