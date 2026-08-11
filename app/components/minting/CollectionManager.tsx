"use client";

import React from 'react';
import { buttonStyles, cardStyles, DEFAULT_CHAIN, inputStyles } from '@/lib/constants';
import { useCrossmintAuth as useAuth, useWallet } from '@crossmint/client-sdk-react-ui';
import { useConfigStatus } from '../ConfigurationStatus';
import { CollectionDetail } from './CollectionDetail';
import { apiFetch } from '@/lib/client-api';
import { useApiInspector, useSetActiveFlow } from '@/lib/dev-inspector/ApiInspectorContext';

export function CollectionManager() {
  const { configStatus, mounted, loading } = useConfigStatus();
  const isServerApiKeyConfigured = mounted ? (configStatus?.serverApiKey ?? false) : false;

  if (!mounted || loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
      </div>
    );
  }

  if (!isServerApiKeyConfigured) {
    return (
      <div className={cardStyles.base}>
        <h2 className="text-xl font-semibold mb-4 text-center text-red-600">Server API Key Not Configured</h2>
        <div className={cardStyles.error}>
          <p className="text-red-700 mb-2">Collection Manager requires a server API key. Please add:</p>
          <code className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm block">CROSSMINT_SERVER_API_KEY=your-server-api-key</code>
          <p className="text-red-600 text-sm mt-2">Add this to your <code className="bg-red-100 px-1 rounded">.env.local</code> and restart.</p>
        </div>
      </div>
    );
  }

  return <CollectionManagerContent />;
}

type ManagerView =
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'edit'; collection: any }
  | { type: 'detail'; id: string };

function CollectionManagerContent() {
  const { user } = useAuth();
  const { wallet } = useWallet();
  const { log } = useApiInspector();
  useSetActiveFlow('minting');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [collections, setCollections] = React.useState<any[]>([]);
  const [view, setView] = React.useState<ManagerView>({ type: 'list' });
  const fallbackImage = 'https://www.crossmint.com/assets/crossmint/crossmint-url-preview.png';
  const resolveImageUrl = (u?: string) => {
    if (!u) return fallbackImage;
    if (u.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${u.replace('ipfs://', '')}`;
    return u;
  };

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Owner-scoped filtering: pass wallet and method so backend can filter by hashed id prefix
      const ownerParams = new URLSearchParams();
      const ownerWallet = (wallet?.address || '').toLowerCase();
      const rawLoginMethod: any = (user as any)?.provider || (user as any)?.loginMethod || 'email';
      const loginMethod = String(rawLoginMethod).toLowerCase();
      if (ownerWallet && loginMethod) {
        ownerParams.set('walletAddress', ownerWallet);
        ownerParams.set('loginMethod', loginMethod);
      }
      const res = await apiFetch(`/api/nft-collections${ownerParams.toString() ? `?${ownerParams.toString()}` : ''}`, { method: 'GET' }, log);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch collections');
      const all = Array.isArray(data?.results) ? data.results : [];
      const filtered = all.filter((c: any) => (c?.onChain?.chain || '').toLowerCase() === DEFAULT_CHAIN.toLowerCase());
      setCollections(filtered);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch collections');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCollections();
  }, []);

  if (view.type === 'create') {
    return <CreateCollection onDone={() => { setView({ type: 'list' }); fetchCollections(); }} />;
  }

  if (view.type === 'edit') {
    return <EditCollection collection={view.collection} onClose={() => setView({ type: 'list' })} />;
  }

  if (view.type === 'detail') {
    return <CollectionDetail id={view.id} onBack={() => setView({ type: 'list' })} />;
  }

  return (
    <div className={cardStyles.base}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Collection Manager</h2>
        <div className="flex gap-2">
          <button type="button" onClick={fetchCollections} disabled={isLoading} className={buttonStyles.secondary}>
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={() => setView({ type: 'create' })} className={buttonStyles.primary}>
            + New Collection
          </button>
        </div>
      </div>
      {error && (
        <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>
      )}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading collections…</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">No collections on {DEFAULT_CHAIN}.</div>
      ) : (
        <div className="space-y-3">
          {collections.map((c) => (
            <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <img
                    src={resolveImageUrl(c.metadata?.imageUrl)}
                    alt="Collection"
                    className="w-12 h-12 rounded object-cover bg-gray-100 dark:bg-gray-800"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
                  />
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{c.metadata?.name || 'Untitled'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 leading-snug">{c.metadata?.description || 'No description'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 px-2 py-1 rounded">{c.onChain?.chain}</span>
                  <span className="text-[10px] uppercase tracking-wide bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded">{c.onChain?.type || 'n/a'}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="mt-3 border-t border-gray-200 dark:border-gray-800" />

              {/* Details grid */}
              <div className="mt-3 grid grid-cols-6 gap-3 text-xs">
                <div className="col-span-6 sm:col-span-3">
                  <div className="text-gray-500 dark:text-gray-500">Collection ID</div>
                  <div className="font-mono break-all text-gray-800 dark:text-gray-300">{c.id}</div>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <div className="text-gray-500 dark:text-gray-500">Contract</div>
                  <div className="font-mono break-all text-gray-800 dark:text-gray-300">{c.onChain?.contractAddress || c.onChain?.mintAddress}</div>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <div className="text-gray-500 dark:text-gray-500">Transferable</div>
                  <div className="text-gray-800 dark:text-gray-300">{String(c.transferable)}</div>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <div className="text-gray-500 dark:text-gray-500">Standard</div>
                  <div className="text-gray-800 dark:text-gray-300">{c.onChain?.type || 'n/a'}</div>
                </div>
              </div>

              {/* Sales summary */}
              {c.payments && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 text-xs">
                  <div className="grid grid-cols-6 gap-2">
                    <div className="col-span-2">
                      <div className="text-gray-500 dark:text-gray-500">Price</div>
                      <div className="text-gray-800 dark:text-gray-300">{c.payments.price} {c.payments.currency}</div>
                    </div>
                    <div className="col-span-4">
                      <div className="text-gray-500 dark:text-gray-500">Recipient</div>
                      <div className="font-mono break-all text-gray-800 dark:text-gray-300">{c.payments.recipientAddress}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Royalties summary */}
              {c.royalties?.recipients && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-800 text-xs">
                  <div className="text-gray-500 dark:text-gray-500 mb-1">Royalties</div>
                  <div className="text-gray-800 dark:text-gray-300">
                    {(c.royalties.recipients as any[]).map((r:any, idx:number) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <span className="font-mono break-all">{r.address}</span>
                        <span className="text-gray-700 dark:text-gray-300">{r.basisPoints} bps</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setView({ type: 'detail', id: c.id })}
                  className={buttonStyles.secondary}
                >
                  View Collection
                </button>
                <button
                  type="button"
                  onClick={() => setView({ type: 'edit', collection: c })}
                  className={buttonStyles.primary}
                >
                  Edit Collection
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditCollection({ collection, onClose }: { collection: any; onClose: () => void }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [transferable, setTransferable] = React.useState<boolean>(!!collection.transferable);
  const [royaltyAddress, setRoyaltyAddress] = React.useState<string>('');
  const [royaltyBps, setRoyaltyBps] = React.useState<number>(0);
  const [baseUri, setBaseUri] = React.useState<string>('');
  const [price, setPrice] = React.useState<string>(collection?.payments?.price || '');
  const [currency, setCurrency] = React.useState<string>(collection?.payments?.currency || 'usdc');
  const [recipientAddress, setRecipientAddress] = React.useState<string>(collection?.payments?.recipientAddress || '');
  const { wallet } = useWallet();
  const ownerWalletAddress = (wallet?.address || '').toLowerCase();
  const [useMyWalletRecipient, setUseMyWalletRecipient] = React.useState<boolean>(false);

  const updateRoyalties = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/nft-collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: collection.id,
          action: 'set-royalties',
          payload: { recipients: [{ address: royaltyAddress, basisPoints: royaltyBps }] },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to set royalties');
    } catch (e: any) {
      setError(e?.message || 'Failed to set royalties');
    } finally {
      setIsSaving(false);
    }
  };

  const removeRoyalties = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/nft-collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: collection.id, action: 'remove-royalties' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to remove royalties');
    } catch (e: any) {
      setError(e?.message || 'Failed to remove royalties');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTransferable = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/nft-collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: collection.id, action: 'set-transferable', payload: { value: transferable } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to set transferability');
    } catch (e: any) {
      setError(e?.message || 'Failed to set transferability');
    } finally {
      setIsSaving(false);
    }
  };

  const updateBaseUri = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/nft-collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: collection.id, action: 'set-base-uri', payload: { value: baseUri } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to set base URI');
    } catch (e: any) {
      setError(e?.message || 'Failed to set base URI');
    } finally {
      setIsSaving(false);
    }
  };

  const updateCollection = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload: any = {};
      if (price || currency || recipientAddress) {
        payload.payments = {} as any;
        if (price) (payload.payments as any).price = price;
        if (currency) (payload.payments as any).currency = currency;
        if (recipientAddress) (payload.payments as any).recipientAddress = recipientAddress;
      }
      const res = await fetch('/api/nft-collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: collection.id, action: 'update-collection', payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update collection');
    } catch (e: any) {
      setError(e?.message || 'Failed to update collection');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cardStyles.base}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Edit Collection</h2>
        <button type="button" onClick={onClose} className={buttonStyles.secondary}>Back</button>
      </div>
      {error && (
        <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>
      )}
      <div className="space-y-6">
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Sales (Payments)</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Configure primary sale price and recipient on {DEFAULT_CHAIN}.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">Price</label>
              <input placeholder="e.g. 1.0" className={inputStyles.base} value={price} onChange={(e) => setPrice(e.target.value)} />
              <div className="mt-3">
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">Currency</div>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="edit-currency" value="usdc" checked={currency === 'usdc'} onChange={(e) => setCurrency(e.target.value)} />
                    USDC
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="edit-currency" value="eth" checked={currency === 'eth'} onChange={(e) => setCurrency(e.target.value)} />
                    ETH
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">Recipient (0x...)</label>
              <input className={inputStyles.base + ' disabled:!bg-gray-50 dark:disabled:!bg-gray-800'} value={useMyWalletRecipient ? ownerWalletAddress : recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} disabled={useMyWalletRecipient} placeholder="0x…" />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={useMyWalletRecipient} onChange={(e) => setUseMyWalletRecipient(e.target.checked)} />
                Use my wallet ({ownerWalletAddress || 'no wallet'})
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={updateCollection} disabled={isSaving} className={buttonStyles.primary}>{isSaving ? 'Saving…' : 'Update Sales'}</button>
          </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Royalties (EIP-2981)</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Applies to all NFTs in this collection (EVM only).</p>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Recipient (0x...)" className="border p-2 rounded w-full text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" value={royaltyAddress} onChange={(e) => setRoyaltyAddress(e.target.value)} />
            <input placeholder="Basis points (e.g. 100)" type="number" className="border p-2 rounded w-full text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" value={royaltyBps} onChange={(e) => setRoyaltyBps(parseInt(e.target.value || '0', 10))} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={updateRoyalties} disabled={isSaving} className={buttonStyles.primary}>{isSaving ? 'Saving…' : 'Set Royalties'}</button>
            <button type="button" onClick={removeRoyalties} disabled={isSaving} className={buttonStyles.danger}>Remove royalties</button>
          </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Transferability</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Toggle whether tokens can be transferred between wallets.</p>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={transferable} onChange={(e) => setTransferable(e.target.checked)} /> Transferable</label>
          <div className="mt-3">
            <button type="button" onClick={updateTransferable} disabled={isSaving} className={buttonStyles.primary}>{isSaving ? 'Saving…' : 'Update Transferability'}</button>
          </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Custom Base URI</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Set a custom base URI for metadata (advanced).</p>
          <input placeholder="ipfs://... or https://..." className="border p-2 rounded w-full text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" value={baseUri} onChange={(e) => setBaseUri(e.target.value)} />
          <div className="mt-3">
            <button type="button" onClick={updateBaseUri} disabled={isSaving} className={buttonStyles.primary}>{isSaving ? 'Saving…' : 'Set Base URI'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateCollection({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { wallet } = useWallet();
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const defaultImageUrl = 'https://www.crossmint.com/assets/crossmint/crossmint-url-preview.png';
  const [useDefaultImage, setUseDefaultImage] = React.useState<boolean>(true);
  const [symbol, setSymbol] = React.useState('');
  const [fungibility, setFungibility] = React.useState<'non-fungible' | 'semi-fungible'>('non-fungible');
  const [transferable, setTransferable] = React.useState(true);
  const [price, setPrice] = React.useState('');
  const [currency, setCurrency] = React.useState('usdc');
  const [recipientAddress, setRecipientAddress] = React.useState('');
  const ownerWallet = (wallet?.address || '').toLowerCase();
  const [useMyWalletRecipient, setUseMyWalletRecipient] = React.useState<boolean>(true);

  const handleCreate = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const ownerWallet = (wallet?.address || '').toLowerCase();
      const rawLoginMethod: any = (user as any)?.provider || (user as any)?.loginMethod || 'email';
      const loginMethod = String(rawLoginMethod).toLowerCase();
      const payload: any = {
        fungibility,
        transferable,
        // No subscription controls in this app
        metadata: { name, description, imageUrl: (useDefaultImage || !imageUrl) ? defaultImageUrl : imageUrl, symbol },
      };
      const finalRecipient = useMyWalletRecipient ? ownerWallet : recipientAddress;
      if (price || currency || finalRecipient) {
        payload.payments = {} as any;
        if (price) (payload.payments as any).price = price;
        if (currency) (payload.payments as any).currency = currency;
        if (finalRecipient) (payload.payments as any).recipientAddress = finalRecipient;
      }
      const res = await fetch('/api/nft-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: ownerWallet, loginMethod, payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to create collection');
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Failed to create collection');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cardStyles.base}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">New Collection</h2>
        <button type="button" onClick={onDone} className={buttonStyles.secondary}>Back to List</button>
      </div>
      {error && <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>}
      <div className="space-y-6">
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Basics</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              <span className="block mb-1">Name</span>
              <input className="border p-2 rounded w-full text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-sm text-gray-700 dark:text-gray-300">
              <span className="block mb-1">Symbol (optional)</span>
              <input className="border p-2 rounded w-full text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </label>
            <label className="text-sm text-gray-700 dark:text-gray-300 md:col-span-2">
              <span className="block mb-1">Image URL</span>
              <input className="border p-2 rounded w-full text-sm disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800" value={useDefaultImage ? defaultImageUrl : imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={useDefaultImage} />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={useDefaultImage} onChange={(e) => setUseDefaultImage(e.target.checked)} />
                Use default image
              </label>
            </label>
            <label className="text-sm text-gray-700 dark:text-gray-300 md:col-span-2">
              <span className="block mb-1">Description</span>
              <textarea className="border p-2 rounded w-full text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-gray-700 dark:text-gray-300 mb-1">Fungibility</div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <input type="radio" name="new-fungibility" value="non-fungible" checked={fungibility === 'non-fungible'} onChange={(e) => setFungibility(e.target.value as any)} />
                  ERC-721
                </label>
                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <input type="radio" name="new-fungibility" value="semi-fungible" checked={fungibility === 'semi-fungible'} onChange={(e) => setFungibility(e.target.value as any)} />
                  ERC-1155
                </label>
              </div>
            </div>
            <div>
              <div className="text-gray-700 dark:text-gray-300 mb-1">Transferability</div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={transferable} onChange={(e) => setTransferable(e.target.checked)} /> Enable transfers</label>
            </div>
          </div>
        </div>
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Sales (Payments)</h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              <span className="block mb-1">Price</span>
              <input className="border p-2 rounded w-full text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <div className="col-span-2">
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">Currency</div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="radio" name="new-currency" value="usdc" checked={currency === 'usdc'} onChange={(e) => setCurrency(e.target.value)} />
                  USDC
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="radio" name="new-currency" value="eth" checked={currency === 'eth'} onChange={(e) => setCurrency(e.target.value)} />
                  ETH
                </label>
              </div>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className="text-sm text-gray-700 dark:text-gray-300 w-full">
                <span className="block mb-1">Recipient (0x...)</span>
                <input className="border p-2 rounded w-full text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" value={useMyWalletRecipient ? ownerWallet : recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} disabled={useMyWalletRecipient} />
              </label>
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={useMyWalletRecipient} onChange={(e) => setUseMyWalletRecipient(e.target.checked)} />
            Use my wallet as recipient ({ownerWallet || 'no wallet'})
          </label>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={handleCreate} disabled={isSaving} className={buttonStyles.primary}>{isSaving ? 'Creating…' : 'Create Collection'}</button>
        </div>
      </div>
    </div>
  );
}

