import { NextRequest, NextResponse } from 'next/server';
import { getAinClient, getProviderUrl } from '@/lib/ain-client';

/**
 * GET /api/ain/debug?op=...&path=...&address=...&value=...&nodeId=...&hash=...
 * Debug API for direct blockchain state inspection.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const op = searchParams.get('op');

    if (!op) {
      return NextResponse.json(
        { ok: false, error: 'op parameter is required (getValue|getRule|getOwner|getFunction|evalRule|getGraphNode|getNodeEdges|getTx)' },
        { status: 400 }
      );
    }

    const ain = getAinClient();

    switch (op) {
      case 'getValue': {
        const path = searchParams.get('path');
        if (!path) return NextResponse.json({ ok: false, error: 'path parameter required' }, { status: 400 });
        const result = await ain.db.ref(path).getValue();
        return NextResponse.json({ ok: true, op, path, data: result });
      }

      case 'getRule': {
        const path = searchParams.get('path');
        if (!path) return NextResponse.json({ ok: false, error: 'path parameter required' }, { status: 400 });
        const result = await ain.db.ref(path).getRule();
        return NextResponse.json({ ok: true, op, path, data: result });
      }

      case 'getOwner': {
        const path = searchParams.get('path');
        if (!path) return NextResponse.json({ ok: false, error: 'path parameter required' }, { status: 400 });
        const result = await ain.db.ref(path).getOwner();
        return NextResponse.json({ ok: true, op, path, data: result });
      }

      case 'getFunction': {
        const path = searchParams.get('path');
        if (!path) return NextResponse.json({ ok: false, error: 'path parameter required' }, { status: 400 });
        const result = await ain.db.ref(path).getFunction();
        return NextResponse.json({ ok: true, op, path, data: result });
      }

      case 'evalRule': {
        const path = searchParams.get('path');
        const address = searchParams.get('address');
        const value = searchParams.get('value');
        if (!path || !address) {
          return NextResponse.json({ ok: false, error: 'path and address parameters required' }, { status: 400 });
        }
        let parsedValue: any = value;
        try { if (value) parsedValue = JSON.parse(value); } catch { /* use as string */ }
        const result = await ain.db.ref(path).evalRule({ address, value: parsedValue });
        return NextResponse.json({ ok: true, op, path, address, data: result });
      }

      case 'getGraphNode': {
        const nodeId = searchParams.get('nodeId');
        if (!nodeId) return NextResponse.json({ ok: false, error: 'nodeId parameter required' }, { status: 400 });
        const result = await ain.knowledge.getGraphNode(nodeId);
        return NextResponse.json({ ok: true, op, nodeId, data: result });
      }

      case 'getNodeEdges': {
        const nodeId = searchParams.get('nodeId');
        if (!nodeId) return NextResponse.json({ ok: false, error: 'nodeId parameter required' }, { status: 400 });
        const result = await ain.knowledge.getNodeEdges(nodeId);
        return NextResponse.json({ ok: true, op, nodeId, data: result });
      }

      case 'getTx': {
        const hash = searchParams.get('hash');
        if (!hash) return NextResponse.json({ ok: false, error: 'hash parameter required' }, { status: 400 });
        const providerUrl = getProviderUrl();
        const resp = await fetch(providerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'ain_getTransactionByHash',
            params: { hash },
          }),
        });
        const result = await resp.json();
        return NextResponse.json({ ok: true, op, hash, data: result });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown op: ${op}. Valid ops: getValue, getRule, getOwner, getFunction, evalRule, getGraphNode, getNodeEdges, getTx` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Debug operation failed' },
      { status: 500 }
    );
  }
}
