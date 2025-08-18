import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';
const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;

export async function GET(req: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'CROSSMINT_SERVER_API_KEY not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get('collectionId');
    const part = searchParams.get('part');
    const walletAddress = (searchParams.get('walletAddress') || '').toLowerCase();
    const loginMethod = (searchParams.get('loginMethod') || '').toLowerCase();
    const actionId = searchParams.get('actionId');

    const baseUrl = CROSSMINT_ENV === 'production' ? 'https://www.crossmint.com/api' : 'https://staging.crossmint.com/api';
    let url = `${baseUrl}/2022-06-09/collections`;
    if (collectionId && (!part || part === 'info')) {
      url = `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}`;
    } else if (collectionId && part === 'royalties') {
      url = `${baseUrl}/v1-alpha1/minting/collections/${encodeURIComponent(collectionId)}/royalties`;
    } else if (collectionId && part === 'templates') {
      const page = searchParams.get('page') || '1';
      const perPage = searchParams.get('perPage') || '10';
      url = `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}/templates?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`;
    } else if (collectionId && part === 'nfts') {
      const page = searchParams.get('page') || '1';
      const perPage = searchParams.get('perPage') || '10';
      url = `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}/nfts?page=${encodeURIComponent(page)}&perPage=${encodeURIComponent(perPage)}`;
    } else if (part === 'action' || part === 'action-status') {
      if (!actionId) {
        return NextResponse.json({ error: 'Missing actionId' }, { status: 400 });
      }
      url = `${baseUrl}/2022-06-09/actions/${encodeURIComponent(actionId)}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': CROSSMINT_API_KEY,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || 'Failed to fetch collections';
      return NextResponse.json({ error: msg, ...(data?.errors ? { errors: data.errors } : {}) }, { status: res.status });
    }
    // If owner info provided, filter to this user's collections based on id prefix hash
    if (url.endsWith('/collections') && walletAddress && loginMethod) {
      const hash = crypto.createHash('sha256').update(`${loginMethod}:${walletAddress}`).digest('hex').slice(0, 16);
      const all = Array.isArray(data?.results) ? data.results : [];
      const filtered = all.filter((c: any) => typeof c?.id === 'string' && c.id.startsWith(`${hash}-`));
      return NextResponse.json({ results: filtered });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'CROSSMINT_SERVER_API_KEY not configured' }, { status: 500 });
    }
    const { collectionId, action, payload } = await req.json();
    if (!collectionId || !action) {
      return NextResponse.json({ error: 'Missing collectionId or action' }, { status: 400 });
    }
    const baseUrl = CROSSMINT_ENV === 'production' ? 'https://www.crossmint.com/api' : 'https://staging.crossmint.com/api';
    let url = '';
    let method = 'PUT';
    let body: any = undefined;
    if (action === 'set-royalties') {
      url = `${baseUrl}/v1-alpha1/minting/collections/${encodeURIComponent(collectionId)}/royalties`;
      body = JSON.stringify(payload || {});
    } else if (action === 'remove-royalties') {
      url = `${baseUrl}/v1-alpha1/minting/collections/${encodeURIComponent(collectionId)}/royalties`;
      method = 'DELETE';
    } else if (action === 'set-transferable') {
      url = `${baseUrl}/v1-alpha1/minting/collections/${encodeURIComponent(collectionId)}/transferable`;
      body = JSON.stringify(payload || {});
    } else if (action === 'update-collection') {
      url = `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}`;
      method = 'PATCH';
      body = JSON.stringify(payload || {});
    } else if (action === 'set-base-uri') {
      // Placeholder endpoint; adjust once final API path is known
      url = `${baseUrl}/v1-alpha1/minting/collections/${encodeURIComponent(collectionId)}/base-uri`;
      body = JSON.stringify(payload || {});
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }
    const res = await fetch(url, {
      method,
      headers: {
        'X-API-KEY': CROSSMINT_API_KEY,
        'Content-Type': 'application/json',
      },
      ...(body ? { body } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || 'Failed to update collection';
      return NextResponse.json({ error: msg, ...(data?.errors ? { errors: data.errors } : {}) }, { status: res.status });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'CROSSMINT_SERVER_API_KEY not configured' }, { status: 500 });
    }
    const body = await req.json();
    const baseUrl = CROSSMINT_ENV === 'production' ? 'https://www.crossmint.com/api' : 'https://staging.crossmint.com/api';

    // Branch: Mint NFT from template
    if (body?.action === 'mint-nft') {
      const { collectionId, recipient, templateId, sendNotification } = body as { collectionId: string; recipient: string; templateId: string; sendNotification?: boolean };
      if (!collectionId || !recipient || !templateId) {
        return NextResponse.json({ error: 'Missing collectionId, recipient or templateId' }, { status: 400 });
      }
      const url = `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}/nfts`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'X-API-KEY': CROSSMINT_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, templateId, sendNotification: typeof sendNotification === 'boolean' ? sendNotification : true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || 'Failed to mint NFT';
        return NextResponse.json({ error: msg, ...(data?.errors ? { errors: data.errors } : {}) }, { status: res.status });
      }
      return NextResponse.json({ ok: true, data });
    }

    // Branch: Template creation when collectionId is provided
    if (body?.collectionId && body?.payload) {
      const { collectionId, templateId, payload } = body as { collectionId: string; templateId?: string; payload: any };
      if (!collectionId) {
        return NextResponse.json({ error: 'Missing collectionId' }, { status: 400 });
      }
      const path = templateId
        ? `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}/templates/${encodeURIComponent(templateId)}`
        : `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}/templates`;
      const method = templateId ? 'PUT' : 'POST';

      const finalPayload: any = { ...(payload || {}) };
      if (typeof finalPayload.reuploadLinkedFiles === 'undefined') {
        finalPayload.reuploadLinkedFiles = true;
      }
      // Omit empty supply if no explicit limit was provided
      if (finalPayload?.supply && (finalPayload.supply.limit === undefined || finalPayload.supply.limit === '' || finalPayload.supply.limit === null)) {
        delete finalPayload.supply;
      }

      const res = await fetch(path, {
        method,
        headers: {
          'X-API-KEY': CROSSMINT_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || 'Failed to create template';
        return NextResponse.json({ error: msg, ...(data?.errors ? { errors: data.errors } : {}) }, { status: res.status });
      }
      return NextResponse.json({ ok: true, data });
    }

    // Branch: Collection creation (default)
    const { walletAddress, loginMethod, payload } = body as { walletAddress: string; loginMethod: string; payload: any };
    if (!walletAddress || !loginMethod) {
      return NextResponse.json({ error: 'Missing walletAddress or loginMethod' }, { status: 400 });
    }
    const owner = `${String(loginMethod).toLowerCase()}:${String(walletAddress).toLowerCase()}`;
    const hash = crypto.createHash('sha256').update(owner).digest('hex').slice(0, 16);
    const id = `${hash}-${Date.now()}`;
    const url = `${baseUrl}/2022-06-09/collections/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-API-KEY': CROSSMINT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        // Ensure chain is included using env; also set standard based on fungibility
        chain: process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'base-sepolia',
        onChain: {
          ...(payload?.onChain || {}),
          type: (payload?.onChain?.type)
            || ((payload?.fungibility === 'semi-fungible') ? 'erc-1155' : 'erc-721'),
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || 'Failed to create collection';
      return NextResponse.json({ error: msg, ...(data?.errors ? { errors: data.errors } : {}) }, { status: res.status });
    }
    return NextResponse.json({ id, data });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'CROSSMINT_SERVER_API_KEY not configured' }, { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get('collectionId');
    const templateId = searchParams.get('templateId');
    if (!collectionId || !templateId) {
      return NextResponse.json({ error: 'Missing collectionId or templateId' }, { status: 400 });
    }
    const baseUrl = CROSSMINT_ENV === 'production' ? 'https://www.crossmint.com/api' : 'https://staging.crossmint.com/api';
    const url = `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}/templates/${encodeURIComponent(templateId)}`;
    const res = await fetch(url, { method: 'DELETE', headers: { 'X-API-KEY': CROSSMINT_API_KEY } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || 'Failed to delete template';
      return NextResponse.json({ error: msg }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'CROSSMINT_SERVER_API_KEY not configured' }, { status: 500 });
    }
    const { collectionId, templateId, payload } = await req.json();
    if (!collectionId || !templateId) {
      return NextResponse.json({ error: 'Missing collectionId or templateId' }, { status: 400 });
    }
    const baseUrl = CROSSMINT_ENV === 'production' ? 'https://www.crossmint.com/api' : 'https://staging.crossmint.com/api';
    const url = `${baseUrl}/2022-06-09/collections/${encodeURIComponent(collectionId)}/templates/${encodeURIComponent(templateId)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'X-API-KEY': CROSSMINT_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || 'Failed to update template';
      return NextResponse.json({ error: msg }, { status: res.status });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


