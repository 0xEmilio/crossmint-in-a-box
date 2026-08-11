"use client";

import React from "react";
import {
  CrossmintAuthProvider,
  CrossmintCheckoutProvider,
  CrossmintProvider,
  CrossmintWalletProvider,
  useCrossmintAuth as useAuth,
} from "@crossmint/client-sdk-react-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useDisconnect } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { DEFAULT_CHAIN, buttonStyles } from "@/lib/constants";
import { ConfigurationStatus } from "@/app/components";
import { Sidebar } from "./components/Sidebar";
import { DevInspector } from "./components/DevInspector";
import { ApiInspectorProvider } from "@/lib/dev-inspector/ApiInspectorContext";

const queryClient = new QueryClient();

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY || ""}>
          <CrossmintAuthProvider
            loginMethods={["email", "google", "twitter"]}
            authModalTitle="Sign in to Crossmint Demo"
          >
            <CrossmintWalletProvider
              createOnLogin={{
                chain: DEFAULT_CHAIN as any,
                recovery: { type: "email" },
              }}
            >
              <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
            </CrossmintWalletProvider>
          </CrossmintAuthProvider>
        </CrossmintProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, login, logout } = useAuth();
  const { disconnect } = useDisconnect();
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleLogout = () => {
    try {
      logout();
      disconnect();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (!hasMounted) return null;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <button type="button" onClick={login} className={buttonStyles.primary}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div key={user?.email || "anon"} className="flex h-screen overflow-hidden">
      <ApiInspectorProvider>
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            {children}
            <ConfigurationStatus />
          </div>
        </main>
        <DevInspector />
      </ApiInspectorProvider>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AuthGate>{children}</AuthGate>
    </Providers>
  );
}
