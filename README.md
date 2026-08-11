# Crossmint Wallet SDK Demo (Auth, Smart Wallets, Onramp, Agents, NFTs)

A Next.js 14 demo that showcases Crossmint auth, smart wallets, USDC transfers, agent wallets (delegated signers), fiat onramp, embedded NFT checkout, and collection management.

## 🚀 Quick Start

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Configure Environment Variables**
Create a `.env.local` file in the root directory:

```bash
# Required - Authentication & Basic Features
NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY=your-client-side-api-key

# Required - Advanced Features (Onramp, Worldstore, Agent Wallets, View Transactions)
CROSSMINT_SERVER_API_KEY=your-server-side-api-key

# Optional - Default Configuration
NEXT_PUBLIC_DEFAULT_CHAIN=base-sepolia
NEXT_PUBLIC_SIGNER_TYPE=passkey
NEXT_PUBLIC_CROSSMINT_ENV=staging

# Optional - NFT Collection (for purchase testing)
NEXT_PUBLIC_CROSSMINT_COLLECTION_ID=your-collection-id

# Optional - Memecoin Checkout (fiat-only, so this can be any Solana address)
NEXT_PUBLIC_MEMECOIN_RECIPIENT_ADDRESS=your-solana-address

# Optional - overrides Crossmint's public staging "xmeme" test token
NEXT_PUBLIC_XMEME_TOKEN_ADDRESS=

## Notes
- Keep server keys server-side. Never expose `CROSSMINT_SERVER_API_KEY` in client code.
```

### 3. **Start Development Server**
```bash
npm run dev
```

### 4. **Open Application**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Dashboard Organization

The application features a logically organized dashboard with three main sections:

### **Your Wallet** Section
- **Fetch Balances** - Check real-time USDC balances across chains
- **View Transactions** - Browse transaction history with expandable details
- **Your Agent** - Create and manage agent wallets for automated transactions

### **Funding** Section
- **Buy USDC — Classic** - Custom step wizard with Persona KYC + Checkout.com
- **Add Funds (Bank Style)** - Neobank-transfer-style skin over the same card/Apple Pay/Google Pay rails
- **Buy USDC — Minimal** - Numpad-driven, dark-themed embedded checkout (port of Crossmint's minimal-checkout quickstart)
- **Send USDC** - Transfer USDC to other addresses with balance validation

### **Commerce** Section
- **NFT Checkout** - Purchase NFTs via embedded Crossmint checkout (server-created order, crypto or fiat payment)
- **Memecoin Checkout** - Buy Crossmint's public "xmeme" test token with a card, no wallet required
- **Worldstore** - Amazon shopping integration with crypto payments
  
### **Minting** Section
- **Collection Manager** - Create/edit collections, view details, manage templates/NFTs

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` | ✅ | Client-side API key for Crossmint | - |
| `CROSSMINT_SERVER_API_KEY` | ✅ | Server-side API key for advanced features | - |
| `NEXT_PUBLIC_DEFAULT_CHAIN` | ❌ | Default blockchain network | `base-sepolia` |
| `NEXT_PUBLIC_SIGNER_TYPE` | ❌ | Default wallet signer method | `passkey` |
| `NEXT_PUBLIC_CROSSMINT_ENV` | ❌ | Crossmint environment | `staging` |
| `NEXT_PUBLIC_CROSSMINT_COLLECTION_ID` | ❌ | NFT collection for embedded checkout | - |
| `NEXT_PUBLIC_MEMECOIN_RECIPIENT_ADDRESS` | ❌ | Solana address receiving Memecoin Checkout purchases | - |
| `NEXT_PUBLIC_XMEME_TOKEN_ADDRESS` | ❌ | Override for Crossmint's public "xmeme" test token | Crossmint's staging xmeme token |

### Supported Chains
- Base Sepolia (default)
- Ethereum Sepolia
- Other EVM chains (configurable)

### Supported Signer Types
- Passkey (default)
- Email
- Phone
- API Key
- External Wallet

## 🎯 Features

### **Authentication & Wallets**
- **Multi-Method Login**: Email, Google, Web3 wallet support
- **Smart Wallet Creation**: Automatic wallet creation for email/social users
- **Web3 Integration**: Connect existing wallets seamlessly
- **Wallet Management**: View balances, transaction history, and wallet details

### **Balance Management**
- **Real-time Balances**: Check USDC balances across multiple chains
- **Balance Validation**: Automatic insufficient funds detection
- **Multi-chain Support**: View balances on different networks

### **Transaction Management**
- **Transaction History**: View all transactions with expandable details
- **Status Tracking**: Real-time transaction status updates
- **Explorer Links**: Direct links to blockchain explorers
- **Pagination**: Navigate through large transaction lists
- **Agent Wallet Transactions**: View transactions for agent wallets with "Back to Agent" navigation

### **USDC Transfers**
- **Send USDC**: Transfer USDC to any address
- **Balance Validation**: Prevent insufficient funds transactions
- **Preset Amounts**: Quick selection of common amounts (0.1, 1, 5 USDC)
- **MAX Option**: Send entire balance with one click
- **Transaction Tracking**: Monitor transaction status and explorer links

### **Fiat Onramp (Buy USDC)**
- **Three UI variants on one integration**: Classic (custom KYC wizard), Bank Style (neobank-transfer skin), Minimal (numpad-driven, dark theme)
- **KYC Integration**: Persona identity verification (Classic); handled inside the embedded checkout iframe for Bank Style/Minimal
- **Payment Processing**: Secure fiat-to-crypto conversion
- **Order Tracking**: Monitor purchase status and confirmations

### **Agent Wallets**
- **Agent Creation**: Create automated transaction wallets
- **Delegated Signers**: Add signers with specific permissions
- **Expiry Management**: Set expiration dates for delegated signers
- **Balance Monitoring**: Track agent wallet USDC balances
- **Transaction Viewing**: View agent wallet transaction history

### **NFT Purchases & Minting**
- **Embedded Checkout**: Seamless NFT checkout (fiat + crypto), order created server-side and referenced by `orderId`
- **Per-template Preview**: Money icon opens embedded checkout preview for a template
- **Mint from Template**: Mint NFTs to recipient (supports chain:, email:, userId:, twitter: formats)
- **Collections CRUD**: Create/edit collections (payments, royalties, transferability, base URI)
- **Templates CRUD**: Create/update/delete templates; ERC-1155 tokenId optional
- **NFTs**: Paginated list with details

### **Memecoin Checkout**
- **Card-only Purchase**: Buy Crossmint's public "xmeme" test token, no wallet or seed phrase required on the buyer's side
- **Fixed Solana Recipient**: Payment is fiat-only, so the token lands in a configured Solana address rather than the app's EVM wallet
- **Theme Picker**: Live preview of the embedded checkout's canned appearance presets

### **Amazon Worldstore**
- **Complete Shopping Flow**: Email → Address → Product → Review → Purchase
- **Product Quotes**: Real-time pricing and tax calculation
- **Balance Integration**: Automatic balance checking and onramp integration
- **Order Tracking**: Monitor order status and delivery

## 🏗️ Architecture

### File Structure
```
app/
├── components/           # React components
│   ├── AgentWallet.tsx       # Agent wallet management
│   ├── BalanceFetcher.tsx    # Balance checking
│   ├── BankOnrampFlow.tsx    # Onramp — Bank Style variant
│   ├── CheckoutThemePicker.tsx # Live appearance preset picker for embedded checkouts
│   ├── ConfigurationStatus.tsx # Environment validation
│   ├── MemecoinCheckoutFlow.tsx # Memecoin (xmeme) checkout
│   ├── MinimalOnrampFlow.tsx  # Onramp — Minimal variant
│   ├── OnrampFlow.tsx        # Onramp — Classic variant
│   ├── PurchaseFlow.tsx      # NFT purchases
│   ├── SendFlow.tsx          # USDC transfers
│   ├── ViewTransactions.tsx  # Transaction history
│   ├── WalletInfo.tsx        # Wallet display
│   ├── WorldstoreFlow.tsx    # Amazon integration
│   └── minting/
│       ├── CollectionManager.tsx  # Collections list/create/edit
│       └── CollectionDetail.tsx   # Collection details, templates, NFTs, minting
│   └── index.ts              # Component exports
├── api/                  # API routes
│   ├── get-transactions/     # Transaction fetching
│   ├── get-agent-wallets/    # Agent wallet management
│   ├── add-delegated-signer/ # Delegated signer management
│   ├── wallet-balances/      # Balance fetching
│   ├── nft-collections/      # Collections/templates/NFTs API + mint + action status
│   ├── purchase-order/       # NFT checkout order creation
│   ├── memecoin-order/       # Memecoin checkout order creation
│   ├── onramp-order/         # Onramp — Classic order creation
│   ├── onramp-embedded-order/ # Onramp — Bank Style/Minimal order creation
│   ├── onramp-status/        # Onramp order tracking
│   ├── onramp-kyc-complete/  # Onramp KYC completion callback
│   ├── worldstore-order/     # Order creation
│   └── worldstore-status/    # Order tracking
├── globals.css          # Global styles
├── layout.tsx           # App layout
└── page.tsx             # Main application

lib/
├── constants.ts         # Shared constants & styles
├── utils.ts             # Utility functions
├── wagmi.ts             # Web3 configuration
├── crossmint-server.ts  # Shared server-side fetch/createOrder/getOrder/updateOrder helpers
├── checkout-themes.ts   # Canned embedded-checkout appearance presets
├── onramp-token.ts       # USDC token-locator lookup by chain
└── hooks/
    ├── useAgentWallet.ts # Shared agent-wallet lookup
    ├── useTokenBalance.ts # Shared balance-fetching
    └── usePolling.ts     # Shared order-status polling
```

### Key Dependencies
- **Framework**: Next.js 14 with App Router
- **Blockchain**: Wagmi + Viem for Web3 integration
- **Crossmint**: `@crossmint/client-sdk-react-ui`
- **Styling**: TailwindCSS with custom components
- **State**: React hooks with optimized re-rendering

## 🎮 Usage Guide

### 1. **Getting Started**
1. Connect your wallet or sign in with email/Google
2. Smart wallets are created automatically for email/social users
3. Web3 users can connect existing wallets

### 2. **Managing Your Wallet**
- **Check Balances**: Click "Fetch Balances" to view USDC balances
- **View Transactions**: Click "View Transactions" to see transaction history
- **Send USDC**: Use "Send USDC" to transfer funds to other addresses

### 3. **Agent Wallets**
- **Create Agent**: Click "Your Agent" to create automated transaction wallets
- **Add Signers**: Delegate transaction signing to other addresses
- **Set Expiry**: Configure expiration dates for delegated signers
- **View Transactions**: Monitor agent wallet activity

### 4. **Funding Your Wallet**
- **Buy USDC**: Use "Buy USDC" for fiat-to-crypto conversion
- **KYC Process**: Complete identity verification for purchases
- **Payment Options**: Pay with various fiat payment methods

### 5. **Making Purchases & Minting**
- **NFT Checkout**: Use "NFT Checkout" to purchase NFTs
- **Preview Payments**: Click the money icon on a template in collection details
- **Mint NFT**: Click the plus icon on a template; mint via supported recipient formats
- **Worldstore**: Use "Worldstore" for Amazon shopping with crypto

## 🔒 Security Features

- **Server API Key Protection**: Advanced features require server-side API key
- **Environment Validation**: Automatic detection of missing configuration
- **Error Handling**: Graceful error display and recovery
- **Transaction Validation**: Balance and permission checks
- **KYC Integration**: Secure identity verification for onramp

## 🚨 Configuration Status

The application includes automatic configuration status detection that:
- **Validates Environment**: Checks for required environment variables
- **Shows Warnings**: Displays helpful messages for missing configuration
- **Guides Setup**: Provides specific instructions for enabling features
- **Graceful Degradation**: Disables features that require missing configuration

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Adding New Features
1. Create component in `app/components/`
2. Add API route in `app/api/` if needed
3. Export component in `app/components/index.ts`
4. Add to dashboard in `app/page.tsx`

## 🤖 LLM/Agent Integration

We include a machine-readable task map to help assistants implement parts of this repo in other apps.

- File: `docs/llm_tasks.yaml`
- Contents:
  - Required environment variables
  - Component and API paths
  - Example snippets (providers, embedded checkout line item)
  - High-level tasks (onramp, embedded checkout, agent wallets, view transactions, send USDC, collection manager)
  - Prompt triggers mapping to tasks

Assistants (Cursor/LLMs) can read this file and automatically propose imports/insertions to wire features into a different project.

## 📝 Recent Updates

### Dashboard Organization
- **Logical Grouping**: Features organized into "Your Wallet", "Funding", and "Commerce" sections
- **Improved Naming**: More descriptive component names (Your Agent, Buy USDC, Send USDC, NFT Checkout)
- **Better UX**: Clear visual hierarchy and responsive layout

### Transaction Management
- **View Transactions Module**: New dedicated module for browsing transaction history
- **Expandable Details**: Click transactions to see full details
- **Pagination**: Navigate through large transaction lists
- **Agent Integration**: View agent wallet transactions with proper navigation

### Agent Wallet Enhancements
- **Expiry Management**: Set expiration dates for delegated signers
- **Date/Time Picker**: User-friendly expiry configuration
- **Enhanced Display**: Show expiry information and expired status
- **Transaction Viewing**: View agent wallet transactions with "Back to Agent" navigation

### UI/UX Improvements
- **Loading States**: Proper loading indicators throughout
- **Error Handling**: Graceful error display and recovery
- **Responsive Design**: Works on all screen sizes
- **Visual Feedback**: Status indicators and progress tracking 
