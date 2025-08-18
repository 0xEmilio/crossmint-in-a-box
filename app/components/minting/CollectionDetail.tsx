"use client";

import React from 'react';
import { buttonStyles, cardStyles, DEFAULT_CHAIN } from '@/lib/constants';
import { useWallet, CrossmintEmbeddedCheckout } from '@crossmint/client-sdk-react-ui';
import { useAccount } from 'wagmi';

function PreviewCheckoutButton({ collectionId, templateId }: { collectionId: string; templateId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${buttonStyles.secondary} !p-2`} title="Preview checkout" aria-label="Preview checkout">
        <MoneyIcon />
      </button>
      {open && <PreviewCheckoutModal collectionId={collectionId} templateId={templateId} onClose={() => setOpen(false)} />}
    </>
  );
}

function PreviewCheckoutModal({ collectionId, templateId, onClose }: { collectionId: string; templateId: string; onClose: () => void }) {
  const { wallet } = useWallet();
  const { address: externalWallet } = useAccount();
  const activeWallet = externalWallet || wallet?.address || '';
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Preview Payments</h3>
          <button type="button" onClick={onClose} className={buttonStyles.secondary}>Close</button>
        </div>
        <div className="min-h-[420px]">
          {wallet ? (
            <CrossmintEmbeddedCheckout
              recipient={{ walletAddress: activeWallet }}
              lineItems={{
                collectionLocator: `crossmint:${collectionId}:${templateId}`,
                callData: { quantity: 1 },
              }}
              payment={{ fiat: { enabled: true }, crypto: { enabled: true } }}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading wallet client...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

//

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true" {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function CollectionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [info, setInfo] = React.useState<any>(null);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [nfts, setNfts] = React.useState<any[]>([]);
  const [pageT, setPageT] = React.useState(1);
  const [pageN, setPageN] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = React.useState<string | null>(null);

  const fallbackImage = 'https://www.crossmint.com/assets/crossmint/crossmint-url-preview.png';
  const resolveImageUrl = (u?: string) => {
    if (!u) return fallbackImage;
    if (u.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${u.replace('ipfs://', '')}`;
    return u;
  };

  const fetchPage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const iRes = await fetch(`/api/nft-collections?collectionId=${encodeURIComponent(id)}&part=info`);
      const iData = await iRes.json();
      if (!iRes.ok) throw new Error(iData?.error || 'Failed to fetch collection');
      setInfo(iData);
      const tRes = await fetch(`/api/nft-collections?collectionId=${encodeURIComponent(id)}&part=templates&page=${pageT}&perPage=10`);
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData?.error || 'Failed to fetch templates');
      setTemplates(Array.isArray(tData) ? tData : (tData?.results || []));
      const nRes = await fetch(`/api/nft-collections?collectionId=${encodeURIComponent(id)}&part=nfts&page=${pageN}&perPage=10`);
      const nData = await nRes.json();
      if (!nRes.ok) throw new Error(nData?.error || 'Failed to fetch NFTs');
      setNfts(Array.isArray(nData) ? nData : (nData?.results || []));
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => { fetchPage(); }, [pageT, pageN]);

  const is1155 = (info?.onChain?.type || '').toLowerCase() === 'erc-1155';

  return (
    <div className={cardStyles.base}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={resolveImageUrl(info?.metadata?.imageUrl)}
            alt="Collection"
            className="w-12 h-12 rounded object-cover bg-gray-100 cursor-zoom-in"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
            onClick={() => {
              const src = resolveImageUrl(info?.metadata?.imageUrl);
              if (src) setPreviewSrc(src);
            }}
          />
          <div>
            <h2 className="text-xl font-semibold">{info?.metadata?.name || 'Collection Details'}</h2>
            {info?.metadata?.description && <p className="text-xs text-gray-600">{info.metadata.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} className={buttonStyles.secondary}>Back to Collections</button>
          <button type="button" onClick={fetchPage} disabled={isLoading} className={buttonStyles.secondary}>Refresh</button>
        </div>
      </div>


      {/* Summary grid */}
      {info && (
        <div className="mb-6">
          <div className="mb-2">
            <h3 className="font-semibold text-gray-900">Collection Summary</h3>
          </div>
          <div className="p-4 border border-gray-200 rounded bg-white">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Collection ID</div>
                <div className="font-mono text-sm text-gray-900 break-all">{info.id}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Contract ({info.onChain?.chain || DEFAULT_CHAIN})</div>
                <div className="font-mono text-sm text-gray-900 max-w-full overflow-hidden">
                  <span className="block truncate" title={String(info.onChain?.contractAddress || info.onChain?.mintAddress || '-')}>{info.onChain?.contractAddress || info.onChain?.mintAddress || '-'}</span>
                </div>
              </div>
            </div>
            {info.payments && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Sales</div>
                <div className="text-sm text-gray-900">{info.payments.price} {info.payments.currency} → <span className="font-mono break-all">{info.payments.recipientAddress}</span></div>
              </div>
            )}
            <div className="mt-4 grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Standard</div>
                <div className="text-sm text-gray-900">{info.onChain?.type || 'n/a'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Transferable</div>
                <div className="text-sm text-gray-900">{String(info.transferable)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {error && <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>}

      {/* Templates section */}
      <div className="mb-6 border border-gray-200 rounded bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Templates</h3>
          <div>
            <AddTemplateButton collectionId={id} is1155={is1155} onDone={() => fetchPage()} />
          </div>
        </div>
        {isLoading ? (
          <div className="text-sm text-gray-600">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="text-sm text-gray-600">No templates.</div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.templateId} className="border border-gray-200 rounded p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={resolveImageUrl(t.metadata?.image || t.metadata?.imageUrl)}
                      alt="Template"
                      className="w-10 h-10 rounded object-cover bg-gray-100 cursor-zoom-in"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
                      onClick={() => {
                        const src = resolveImageUrl(t.metadata?.image || t.metadata?.imageUrl);
                        if (src) setPreviewSrc(src);
                      }}
                    />
                    <div>
                      <div className="text-sm font-semibold">{t.metadata?.name || 'Untitled'}</div>
                      <div className="text-xs text-gray-600">{t.metadata?.description || 'No description'}</div>
                      {is1155 && <div className="text-xxs text-gray-500 mt-1">Token ID: {t.onChain?.tokenId ?? '-'}</div>}
                      <div className="text-xxs text-gray-500">Supply: {t.supply?.minted ?? 0}/{t.supply?.limit ?? '-'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <MintFromTemplateButton collectionId={id} templateId={t.templateId} onDone={() => fetchPage()} />
                    <PreviewCheckoutButton collectionId={id} templateId={t.templateId} />
                    <EditTemplateButton
                      collectionId={id}
                      is1155={is1155}
                      template={t}
                      onDone={() => fetchPage()}
                    />
                    <button type="button" title="Delete template" aria-label="Delete template" onClick={async () => {
                      try {
                        const res = await fetch(`/api/nft-collections?collectionId=${encodeURIComponent(id)}&templateId=${encodeURIComponent(t.templateId)}`, { method: 'DELETE' });
                        const d = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(d?.error || 'Failed to delete');
                        fetchPage();
                      } catch (_) {}
                    }} className={`${buttonStyles.danger} !p-2`}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <button type="button" onClick={() => setPageT(Math.max(1, pageT - 1))} disabled={pageT <= 1} className={`${buttonStyles.secondary} !py-1 !px-2`} title="Previous page">
            <ChevronLeftIcon />
          </button>
          <span className="text-xs text-gray-600">Page {pageT}</span>
          <button type="button" onClick={() => setPageT(pageT + 1)} className={`${buttonStyles.secondary} !py-1 !px-2`} title="Next page">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* NFTs section */}
      <div className="mb-2 border border-gray-200 rounded bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{is1155 ? 'SFTs' : 'NFTs'}</h3>
        </div>
        {isLoading ? (
          <div className="text-sm text-gray-600">Loading NFTs…</div>
        ) : nfts.length === 0 ? (
          <div className="text-sm text-gray-600">No NFTs.</div>
        ) : (
          <div className="space-y-2">
            {nfts.map((n) => (
              <details key={n.id} className="border border-gray-200 rounded">
                <summary className="p-3 text-sm cursor-pointer flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveImageUrl(n.metadata?.image)}
                      alt={is1155 ? 'SFT' : 'NFT'}
                      className="w-8 h-8 rounded object-cover bg-gray-100 cursor-zoom-in"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
                      onClick={() => {
                        const src = resolveImageUrl(n.metadata?.image);
                        if (src) setPreviewSrc(src);
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">{n.metadata?.name || n.id}</span>
                      <span className="text-xxs text-gray-600">Owner: {n.onChain?.owner ?? '-'}</span>
                    </div>
                  </div>
                  <span className="text-xxs text-gray-600">Token #{n.onChain?.tokenId ?? '-'}</span>
                </summary>
                <div className="p-3 text-xs space-y-1">
                  <div><span className="font-medium">ID:</span> <span className="font-mono break-all">{n.id}</span></div>
                  <div><span className="font-medium">Status:</span> {n.onChain?.status ?? '-'}</div>
                  <div><span className="font-medium">Tx:</span> <span className="font-mono break-all">{n.onChain?.txId ?? '-'}</span></div>
                  <div><span className="font-medium">Contract:</span> <span className="font-mono break-all">{n.onChain?.contractAddress ?? '-'}</span></div>
                  <div><span className="font-medium">Chain:</span> {n.onChain?.chain ?? DEFAULT_CHAIN}</div>
                  {n.metadata?.description && <div><span className="font-medium">Description:</span> {n.metadata.description}</div>}
                </div>
              </details>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <button type="button" onClick={() => setPageN(Math.max(1, pageN - 1))} disabled={pageN <= 1} className={`${buttonStyles.secondary} !py-1 !px-2`} title="Previous page">
            <ChevronLeftIcon />
          </button>
          <span className="text-xs text-gray-600">Page {pageN}</span>
          <button type="button" onClick={() => setPageN(pageN + 1)} className={`${buttonStyles.secondary} !py-1 !px-2`} title="Next page">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {previewSrc && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setPreviewSrc(null)}>
          <div className="relative max-w-5xl w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow cursor-pointer"
              aria-label="Close preview"
              onClick={() => setPreviewSrc(null)}
            >
              ×
            </button>
            <img
              src={previewSrc}
              alt="Preview"
              className="w-full h-auto max-h-[90vh] object-contain rounded"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


function AddTemplateButton({ collectionId, is1155, onDone }: { collectionId: string; is1155: boolean; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonStyles.primary}>+ Add Template</button>
      {open && (
        <AddTemplateModal collectionId={collectionId} is1155={is1155} onClose={() => { setOpen(false); onDone(); }} />
      )}
    </>
  );
}

function AddTemplateModal({ collectionId, is1155, onClose }: { collectionId: string; is1155: boolean; onClose: () => void }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [useDefaultImage, setUseDefaultImage] = React.useState(false);
  const [enableSupplyLimit, setEnableSupplyLimit] = React.useState(false);
  const [supplyLimit, setSupplyLimit] = React.useState<string>('');
  const [enableTokenId, setEnableTokenId] = React.useState(false);
  const [tokenId, setTokenId] = React.useState<string>('');
  const [useCustomTemplateId, setUseCustomTemplateId] = React.useState(false);
  const [customTemplateId, setCustomTemplateId] = React.useState<string>('');

  const defaultImage = 'https://tinyurl.com/defaultNFTImage';

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload: any = {
        metadata: {
          name,
          description,
          image: (useDefaultImage || !imageUrl) ? defaultImage : imageUrl,
        },
        reuploadLinkedFiles: true,
      };
      if (enableSupplyLimit && supplyLimit) {
        payload.supply = { limit: Number(supplyLimit) };
      }
      if (is1155 && enableTokenId && tokenId) {
        payload.onChain = { tokenId };
      }
      const res = await fetch('/api/nft-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, templateId: (useCustomTemplateId && customTemplateId) ? customTemplateId : undefined, payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to create template');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Add Template</h3>
          <button type="button" onClick={onClose} className={buttonStyles.secondary}>Close</button>
        </div>
        {error && <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>}
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm text-gray-700">
              <span className="block mb-1">Name</span>
              <input className="border p-2 rounded w-full text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              <span className="block mb-1">Description</span>
              <textarea rows={4} className="border p-2 rounded w-full text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              <span className="block mb-1">Image URL</span>
              <input className="border p-2 rounded w-full text-sm" value={useDefaultImage ? defaultImage : imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={useDefaultImage} placeholder="https://... or ipfs://..." />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={useDefaultImage} onChange={(e) => setUseDefaultImage(e.target.checked)} />
                Use default image
              </label>
            </label>
            <div className="text-sm text-gray-700">
              <label className="flex items-center gap-2 mb-1">
                <input type="checkbox" checked={enableSupplyLimit} onChange={(e) => setEnableSupplyLimit(e.target.checked)} />
                Enable supply limit
              </label>
              <input className="border p-2 rounded w-full text-sm disabled:bg-gray-50" value={supplyLimit} onChange={(e) => setSupplyLimit(e.target.value)} disabled={!enableSupplyLimit} placeholder="e.g. 1" />
            </div>
            {is1155 && (
              <div className="text-sm text-gray-700">
                <label className="flex items-center gap-2 mb-1">
                  <input type="checkbox" checked={enableTokenId} onChange={(e) => setEnableTokenId(e.target.checked)} />
                  Provide tokenId (ERC-1155)
                </label>
                <input className="border p-2 rounded w-full text-sm disabled:bg-gray-50" value={tokenId} onChange={(e) => setTokenId(e.target.value)} disabled={!enableTokenId} placeholder="Custom tokenId (optional)" />
              </div>
            )}
            <div className="text-sm text-gray-700 md:col-span-2">
              <label className="flex items-center gap-2 mb-1">
                <input type="checkbox" checked={useCustomTemplateId} onChange={(e) => setUseCustomTemplateId(e.target.checked)} />
                Use custom templateId
              </label>
              <input className="border p-2 rounded w-full text-sm disabled:bg-gray-50" value={customTemplateId} onChange={(e) => setCustomTemplateId(e.target.value)} disabled={!useCustomTemplateId} placeholder="Provide templateId to PUT a specific ID" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={buttonStyles.secondary}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={isSaving} className={buttonStyles.primary}>{isSaving ? 'Saving…' : 'Create Template'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}


function EditTemplateButton({ collectionId, is1155, template, onDone }: { collectionId: string; is1155: boolean; template: any; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${buttonStyles.secondary} !p-2`} title="Edit template" aria-label="Edit template">
        <PencilIcon />
      </button>
      {open && (
        <EditTemplateModal collectionId={collectionId} is1155={is1155} template={template} onClose={() => { setOpen(false); onDone(); }} />
      )}
    </>
  );
}

function EditTemplateModal({ collectionId, is1155, template, onClose }: { collectionId: string; is1155: boolean; template: any; onClose: () => void }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState<string>(template?.metadata?.name || '');
  const [description, setDescription] = React.useState<string>(template?.metadata?.description || '');
  const [image, setImage] = React.useState<string>(template?.metadata?.image || template?.metadata?.imageUrl || '');
  const [enableSupplyLimit, setEnableSupplyLimit] = React.useState<boolean>(typeof template?.supply?.limit === 'number');
  const [supplyLimit, setSupplyLimit] = React.useState<string>(template?.supply?.limit != null ? String(template.supply.limit) : '');
  const [enableTokenId, setEnableTokenId] = React.useState<boolean>(is1155 && typeof template?.onChain?.tokenId !== 'undefined');
  const [tokenId, setTokenId] = React.useState<string>(is1155 && template?.onChain?.tokenId != null ? String(template.onChain.tokenId) : '');
  const [activeTab, setActiveTab] = React.useState<'metadata' | 'supply' | 'token'>('metadata');

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload: any = {};
      if (activeTab === 'metadata') {
        payload.metadata = { name, description, image };
      } else if (activeTab === 'supply') {
        if (enableSupplyLimit && supplyLimit !== '') {
          payload.supply = { limit: Number(supplyLimit) };
        } else {
          payload.supply = {};
        }
      } else if (activeTab === 'token') {
        if (is1155 && enableTokenId && tokenId !== '') {
          payload.onChain = { tokenId };
        } else {
          payload.onChain = {};
        }
      }
      const res = await fetch('/api/nft-collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, templateId: template.templateId, payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update template');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit Template</h3>
          <button type="button" onClick={onClose} className={buttonStyles.secondary}>Close</button>
        </div>
        {error && <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>}
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-gray-200" role="tablist" aria-label="Edit template tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'metadata'}
              onClick={() => setActiveTab('metadata')}
              className={`px-3 py-2 -mb-[1px] border-b-2 text-sm transition-colors ${activeTab === 'metadata' ? 'border-green-600 text-green-700 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
            >
              Metadata
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'supply'}
              onClick={() => setActiveTab('supply')}
              className={`px-3 py-2 -mb-[1px] border-b-2 text-sm transition-colors ${activeTab === 'supply' ? 'border-green-600 text-green-700 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
            >
              Supply
            </button>
            {is1155 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'token'}
                onClick={() => setActiveTab('token')}
                className={`px-3 py-2 -mb-[1px] border-b-2 text-sm transition-colors ${activeTab === 'token' ? 'border-green-600 text-green-700 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
              >
                Token
              </button>
            )}
          </div>

          {activeTab === 'metadata' && (
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm text-gray-700">
                <span className="block mb-1">Name</span>
                <input className="border p-2 rounded w-full text-sm" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="text-sm text-gray-700 md:col-span-2">
                <span className="block mb-1">Description</span>
                <textarea rows={4} className="border p-2 rounded w-full text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="text-sm text-gray-700 md:col-span-2">
                <span className="block mb-1">Image URL</span>
                <input className="border p-2 rounded w-full text-sm" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://... or ipfs://..." />
              </label>
            </div>
          )}

          {activeTab === 'supply' && (
            <div className="text-sm text-gray-700">
              <label className="flex items-center gap-2 mb-1">
                <input type="checkbox" checked={enableSupplyLimit} onChange={(e) => setEnableSupplyLimit(e.target.checked)} />
                Enable supply limit
              </label>
              <input className="border p-2 rounded w-full text-sm disabled:bg-gray-50" value={supplyLimit} onChange={(e) => setSupplyLimit(e.target.value)} disabled={!enableSupplyLimit} placeholder="e.g. 1" />
            </div>
          )}

          {is1155 && activeTab === 'token' && (
            <div className="text-sm text-gray-700">
              <label className="flex items-center gap-2 mb-1">
                <input type="checkbox" checked={enableTokenId} onChange={(e) => setEnableTokenId(e.target.checked)} />
                Provide tokenId (ERC-1155)
              </label>
              <input className="border p-2 rounded w-full text-sm disabled:bg-gray-50" value={tokenId} onChange={(e) => setTokenId(e.target.value)} disabled={!enableTokenId} placeholder="Custom tokenId (optional)" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={buttonStyles.secondary}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={isSaving} className={buttonStyles.primary}>{isSaving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MintIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function MoneyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M1 8h4M19 8h4M1 16h4M19 16h4" />
    </svg>
  );
}

function MintFromTemplateButton({ collectionId, templateId, onDone }: { collectionId: string; templateId: string; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${buttonStyles.secondary} !p-2`} title="Mint from template" aria-label="Mint from template">
        <MintIcon />
      </button>
      {open && <MintFromTemplateModal collectionId={collectionId} templateId={templateId} onClose={() => setOpen(false)} onDone={onDone} />}
    </>
  );
}

function MintFromTemplateModal({ collectionId, templateId, onClose, onDone }: { collectionId: string; templateId: string; onClose: () => void; onDone: () => void }) {
  const [recipientType, setRecipientType] = React.useState<'address' | 'email' | 'userId' | 'twitter'>('address');
  const [address, setAddress] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [uid, setUid] = React.useState<string>('');
  const [handle, setHandle] = React.useState<string>('');
  const [sendNotification, setSendNotification] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'success' | 'failed' | 'timeout'>('idle');

  const composeRecipient = (): string | null => {
    if (recipientType === 'address') {
      if (!address) return null;
      return `${DEFAULT_CHAIN}:${address}`;
    }
    if (recipientType === 'email') {
      if (!email) return null;
      return `email:${email}:${DEFAULT_CHAIN}`;
    }
    if (recipientType === 'userId') {
      if (!uid) return null;
      return `userId:${uid}:${DEFAULT_CHAIN}`;
    }
    if (recipientType === 'twitter') {
      if (!handle) return null;
      return `twitter:${handle}:${DEFAULT_CHAIN}`;
    }
    return null;
  };

  const recipientString = composeRecipient();
  const canSubmit = !!recipientString;

  const submit = async () => {
    const recipient = composeRecipient();
    if (!recipient) {
      setError('Please complete the recipient fields');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      setStatus('pending');
      const res = await fetch('/api/nft-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mint-nft', collectionId, recipient, templateId, sendNotification }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to mint');
      const actionId = data?.data?.id || data?.actionId || data?.id || data?.data?.actionId;
      if (actionId) {
        const deadline = Date.now() + 3 * 60 * 1000;
        let finalStatus: 'success' | 'failed' | 'timeout' = 'timeout';
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 3000));
          const sres = await fetch(`/api/nft-collections?part=action-status&actionId=${encodeURIComponent(actionId)}`);
          const sdata = await sres.json().catch(() => ({}));
          if (!sres.ok) break;
          const st = (sdata?.status || '').toLowerCase();
          if (st === 'succeeded' || st === 'success' || st === 'completed') { finalStatus = 'success'; break; }
          if (st === 'failed' || st === 'error') { finalStatus = 'failed'; break; }
        }
        setStatus(finalStatus);
        if (finalStatus === 'failed') {
          console.error('Mint failed', { actionId });
        } else if (finalStatus === 'timeout') {
          console.warn('Mint still pending; check later', { actionId });
        }
        onClose();
        if (typeof onDone === 'function') onDone();
      } else {
        setStatus('success');
        onClose();
        if (typeof onDone === 'function') onDone();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to mint');
      setStatus('failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Mint from Template</h3>
          <button type="button" onClick={onClose} className={buttonStyles.secondary}>Close</button>
        </div>
        {error && <div className={cardStyles.error}><p className="text-red-700">{error}</p></div>}
        {isSaving || status === 'pending' ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-700">Minting…</p>
            <p className="mt-1 text-xxs text-gray-500">This can take a few moments. We'll close when done.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-700 mb-2">Recipient Type</div>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="radio" name="rcp-type" checked={recipientType==='address'} onChange={() => setRecipientType('address')} /> Address</label>
                <label className="flex items-center gap-2"><input type="radio" name="rcp-type" checked={recipientType==='email'} onChange={() => setRecipientType('email')} /> Email</label>
                <label className="flex items-center gap-2"><input type="radio" name="rcp-type" checked={recipientType==='userId'} onChange={() => setRecipientType('userId')} /> User ID</label>
                <label className="flex items-center gap-2"><input type="radio" name="rcp-type" checked={recipientType==='twitter'} onChange={() => setRecipientType('twitter')} /> Twitter</label>
              </div>
            </div>
            {recipientType === 'address' && (
              <label className="text-sm text-gray-700 block">
                <span className="block mb-1">Wallet Address (0x...)</span>
                <input className="border p-2 rounded w-full text-sm" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." />
              </label>
            )}
            {recipientType === 'email' && (
              <label className="text-sm text-gray-700 block">
                <span className="block mb-1">Email</span>
                <input className="border p-2 rounded w-full text-sm" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="me@example.com" />
              </label>
            )}
            {recipientType === 'userId' && (
              <label className="text-sm text-gray-700 block">
                <span className="block mb-1">User ID</span>
                <input className="border p-2 rounded w-full text-sm" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="your-user-id" />
              </label>
            )}
            {recipientType === 'twitter' && (
              <label className="text-sm text-gray-700 block">
                <span className="block mb-1">Twitter handle</span>
                <input className="border p-2 rounded w-full text-sm" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="jack" />
              </label>
            )}
            {/* Chain is fixed to DEFAULT_CHAIN; not exposed in UI */}
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} />
              Send notification
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className={buttonStyles.secondary}>Cancel</button>
              <button type="button" onClick={submit} disabled={!canSubmit} className={buttonStyles.primary}>Mint</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

