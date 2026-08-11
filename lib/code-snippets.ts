export interface CodeSnippet {
  title: string;
  route: string;
  routeCode: string;
  clientCode: string;
}

export const CODE_SNIPPETS: Record<string, CodeSnippet> = {
  "checkout:nft": {
    title: "NFT Checkout",
    route: "app/api/purchase-order/route.ts",
    routeCode: `export async function POST(req: NextRequest) {
  const { walletAddress } = await req.json();
  const order = await createOrder({
    lineItems: { collectionLocator: \`crossmint:\${collectionId}\` },
    recipient: { walletAddress },
  });
  return NextResponse.json({ orderId: order.orderId });
}`,
    clientCode: `const { data } = useQuery({
  queryKey: ["purchase-order", activeWallet],
  queryFn: () => createPurchaseOrder(activeWallet),
});

<CrossmintEmbeddedCheckout
  orderId={data.orderId}
  clientSecret={data.clientSecret}
  appearance={appearance}
  payment={{ crypto: { enabled: true, payer: {...} }, fiat: { enabled: true } }}
/>`,
  },
  "checkout:onramp": {
    title: "Onramp",
    route: "app/api/onramp-order/route.ts",
    routeCode: `export async function POST(req: NextRequest) {
  const { amount, email, walletAddress, subsidizeFees } = await req.json();
  const order = await createOrder({
    lineItems: [{
      tokenLocator: usdcTokenLocator,
      executionParameters: {
        mode: "exact-in",
        amount,
        ...(subsidizeFees ? { configOverride: subsidizeFeesConfigId } : {}),
      },
    }],
    payment: { method: "card", receiptEmail: email },
    recipient: { walletAddress },
  });
  return NextResponse.json({ ...order, clientSecret: order.clientSecret });
}`,
    clientCode: `// KYC and payment are both handled inside CrossmintEmbeddedCheckout's own iframe —
// no hand-built Persona/Checkout.com integration needed on our side.
<CrossmintEmbeddedCheckout
  orderId={order.orderId}
  clientSecret={order.clientSecret}
  payment={{ crypto: { enabled: false }, fiat: { enabled: true }, defaultMethod: "fiat" }}
  appearance={appearance}
/>`,
  },
  "checkout:memecoin": {
    title: "Memecoin Checkout",
    route: "app/api/memecoin-order/route.ts",
    routeCode: `export async function POST(req: NextRequest) {
  const { amount, email, walletAddress, subsidizeFees } = await req.json();
  const order = await createOrder({
    lineItems: {
      tokenLocator: \`base-sepolia:\${xmemeTokenAddress}\`,
      executionParameters: {
        mode: "exact-in",
        amount,
        ...(subsidizeFees ? { configOverride: subsidizeFeesConfigId } : {}),
      },
    },
    payment: { method: "card", receiptEmail: email },
    recipient: { walletAddress },
  });
  return NextResponse.json({ orderId: order.orderId, clientSecret: order.clientSecret });
}`,
    clientCode: `<CrossmintEmbeddedCheckout
  orderId={data.orderId}
  clientSecret={data.clientSecret}
  payment={{ crypto: { enabled: false }, fiat: { enabled: true }, defaultMethod: "fiat" }}
  appearance={appearance}
/>`,
  },
  worldstore: {
    title: "Worldstore",
    route: "app/api/worldstore-order/route.ts",
    routeCode: `export async function POST(req: NextRequest) {
  const { productLocator, email, walletAddress, shipping } = await req.json();
  const order = await createOrder({
    lineItems: { productLocator },
    payment: { method: "crypto" },
    recipient: { walletAddress, email, shipping },
  });
  return NextResponse.json(order);
}`,
    clientCode: `// createOrder -> POST /api/worldstore-order
// pay from the connected wallet, or /api/agent-transaction if paying from an agent wallet
// poll GET /api/worldstore-status until the order settles`,
  },
  agents: {
    title: "Agent Wallets",
    route: "app/api/get-agent-wallets/route.ts",
    routeCode: `export async function POST(req: NextRequest) {
  const { walletAddress } = await req.json();
  const signers = await crossmintFetch(\`/wallets/\${walletAddress}/signers\`);
  return NextResponse.json({ signers });
}`,
    clientCode: `const { hasAgentWallet, agentWalletAddress } = useAgentWallet(wallet?.address);
// create: POST /api/create-agent-wallet
// delegate: POST /api/add-delegated-signer { walletLocator, signer, permissions }`,
  },
  minting: {
    title: "Minting API",
    route: "app/api/nft-collections/route.ts",
    routeCode: `export async function POST(req: NextRequest) {
  const body = await req.json();
  const collection = await crossmintFetch("/collections/", { method: "POST", body });
  return NextResponse.json(collection);
}`,
    clientCode: `// list: GET /api/nft-collections?owner=<wallet>
// create: POST /api/nft-collections { chain, fungibility, metadata }
// edit sales/royalties: PUT /api/nft-collections/{id}`,
  },
  portfolio: {
    title: "Portfolio",
    route: "app/api/get-agent-wallets/route.ts + app/api/nft-collections/route.ts",
    routeCode: `// Wallets: POST /api/get-agent-wallets { walletAddress } -> { signers: AgentWallet[] }
// Balances: GET /api/wallet-balances?wallet=<address> (per wallet)
// Minted NFTs: GET /api/nft-collections?walletAddress=&loginMethod= -> { results: Collection[] }
//   then for each: GET /api/nft-collections?collectionId=<id>&part=nfts -> { results: NFT[] }
//   each NFT's onChain.owner is matched against each wallet's address`,
    clientCode: `// No SDK method for this — balances/NFTs are REST-API-only, composed client-side:
const wallets = [mainWallet, ...agentWallets];
const nfts = collections.flatMap(c => nftsForCollection(c));
wallets.map(w => nfts.filter(n => n.owner === w.address.toLowerCase()));`,
  },
  "wallets:balance": {
    title: "Wallet Balance",
    route: "app/api/wallet-balances/route.ts",
    routeCode: `export async function GET(req: NextRequest) {
  const walletAddress = new URL(req.url).searchParams.get("wallet");
  const response = await fetch(
    \`https://\${baseUrl}.crossmint.com/api/2025-06-09/wallets/\${walletAddress}/balances?tokens=usdc&chains=\${DEFAULT_CHAIN}\`,
    { headers: { "X-API-KEY": apiKey } }
  );
  return NextResponse.json(await response.json());
}`,
    clientCode: `const { formatted, raw, refetch } = useTokenBalance(wallet?.address, DEFAULT_CHAIN);
// under the hood: GET /api/wallet-balances?wallet=<address>`,
  },
  "wallets:transactions": {
    title: "Transaction History",
    route: "app/api/get-transactions/route.ts",
    routeCode: `export async function POST(req: NextRequest) {
  const { walletAddress, page, perPage } = await req.json();
  const response = await fetch(
    \`https://staging.crossmint.com/api/2025-06-09/wallets/\${walletAddress}/transactions?page=\${page}&perPage=\${perPage}\`,
    { headers: { "X-API-KEY": serverApiKey } }
  );
  return NextResponse.json(await response.json());
}`,
    clientCode: `// POST /api/get-transactions { walletAddress, page, perPage }
// approvals for agent-wallet transactions go through POST /api/agent-approval
// { agentWalletAddress, transactionId, signerAddress, signature }`,
  },
  "wallets:send": {
    title: "Send USDC",
    route: "app/api/agent-transfer/route.ts",
    routeCode: `// Direct wallet-to-wallet sends go straight through the SDK:
await wallet.send(recipientAddress, "usdc", amount);

// Sends FROM an agent wallet go through a server route instead:
export async function POST(req: NextRequest) {
  const { agentWalletAddress, recipient, amount, signerLocator } = await req.json();
  const tx = await crossmintFetch(\`/wallets/\${agentWalletAddress}/transactions\`, {
    method: "POST",
    body: { params: { calls: [erc20TransferCall(recipient, amount)] }, signer: signerLocator },
  });
  return NextResponse.json(tx);
}`,
    clientCode: `const result = await wallet.send(recipientAddress, "usdc", amount);
// or, from an agent wallet:
await fetch("/api/agent-transfer", { method: "POST", body: JSON.stringify({ agentWalletAddress, recipient, amount }) });`,
  },
};

export function getCodeSnippet(flowId: string | null): CodeSnippet | null {
  if (!flowId) return null;
  return CODE_SNIPPETS[flowId] ?? null;
}
