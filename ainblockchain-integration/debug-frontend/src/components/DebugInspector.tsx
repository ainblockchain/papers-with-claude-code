'use client';

import { useState } from 'react';
import { GENESIS_PAPERS, DEBUG_PATHS, ADDR1 } from '@/lib/devnet-samples';
import JsonDisplay from '@/components/JsonDisplay';

type Tab = 'raw' | 'node' | 'entry' | 'rule' | 'tx';

const TABS: { id: Tab; label: string }[] = [
  { id: 'raw', label: 'Raw State' },
  { id: 'node', label: 'Node Inspector' },
  { id: 'entry', label: 'Entry Lookup' },
  { id: 'rule', label: 'Rule Evaluator' },
  { id: 'tx', label: 'Tx Debugger' },
];

export default function DebugInspector() {
  const [activeTab, setActiveTab] = useState<Tab>('raw');

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Debug Inspector</h2>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'raw' && <RawStateTab />}
      {activeTab === 'node' && <NodeInspectorTab />}
      {activeTab === 'entry' && <EntryLookupTab />}
      {activeTab === 'rule' && <RuleEvaluatorTab />}
      {activeTab === 'tx' && <TxDebuggerTab />}
    </div>
  );
}

function RawStateTab() {
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function doOp(op: string) {
    if (!path.trim()) return;
    setLoading(op);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/ain/debug?op=${op}&path=${encodeURIComponent(path.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';
  const btnCls = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:bg-gray-700 disabled:text-gray-500';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Path</label>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/apps/knowledge/graph/nodes"
          className={inputCls}
        />
      </div>

      {/* Quick-fill path buttons */}
      <div className="flex flex-wrap gap-1">
        {DEBUG_PATHS.map((p) => (
          <button
            key={p}
            onClick={() => setPath(p)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-0.5 rounded text-[10px] font-mono transition-colors border border-gray-700"
          >
            {p.replace('/apps/knowledge/', '')}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {['getValue', 'getRule', 'getOwner', 'getFunction'].map((op) => (
          <button
            key={op}
            onClick={() => doOp(op)}
            disabled={!path.trim() || loading !== null}
            className={`${btnCls} ${
              loading === op ? 'bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {loading === op ? '...' : op}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {result && <JsonDisplay data={result} label="Result" />}
    </div>
  );
}

function NodeInspectorTab() {
  const [nodeId, setNodeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchNode() {
    if (!nodeId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const [nodeRes, edgesRes] = await Promise.all([
        fetch(`/api/ain/debug?op=getGraphNode&nodeId=${encodeURIComponent(nodeId.trim())}`),
        fetch(`/api/ain/debug?op=getNodeEdges&nodeId=${encodeURIComponent(nodeId.trim())}`),
      ]);
      const nodeData = await nodeRes.json();
      const edgesData = await edgesRes.json();
      if (!nodeRes.ok) throw new Error(nodeData.error || 'Failed to fetch node');
      setResult({ node: nodeData.data, edges: edgesData.data });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';
  const selectCls = 'bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Node ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            placeholder="owner_address:topic_path:entry_id"
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={fetchNode}
            disabled={!nodeId.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            {loading ? '...' : 'Inspect'}
          </button>
        </div>
      </div>

      {/* Genesis papers as node picker */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Pick from genesis papers</label>
        <select
          onChange={(e) => { if (e.target.value) setNodeId(e.target.value); }}
          value=""
          className={`w-full ${selectCls}`}
        >
          <option value="">Select a paper...</option>
          {GENESIS_PAPERS.map((p, i) => {
            const id = `${p.ownerAddress}:${p.topicPath}:${p.entryId}`;
            return <option key={i} value={id}>{p.title}</option>;
          })}
        </select>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {result && <JsonDisplay data={result} label="Node + Edges" />}
    </div>
  );
}

function EntryLookupTab() {
  const [address, setAddress] = useState(ADDR1);
  const [topicPath, setTopicPath] = useState('');
  const [entryId, setEntryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  function pickPaper(index: number) {
    const p = GENESIS_PAPERS[index];
    setAddress(p.ownerAddress);
    setTopicPath(p.topicPath);
    setEntryId(p.entryId);
  }

  async function fetchEntry() {
    if (!address.trim() || !topicPath.trim() || !entryId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const path = `/apps/knowledge/explorations/${address.trim()}/${topicPath.trim()}/${entryId.trim()}`;
      const res = await fetch(`/api/ain/debug?op=getValue&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';
  const selectCls = 'bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Pick from genesis papers</label>
        <select
          onChange={(e) => { const idx = parseInt(e.target.value); if (!isNaN(idx)) pickPaper(idx); }}
          value=""
          className={`w-full ${selectCls}`}
        >
          <option value="">Select a paper...</option>
          {GENESIS_PAPERS.map((p, i) => (
            <option key={i} value={i}>{p.title}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Topic Path</label>
          <input type="text" value={topicPath} onChange={(e) => setTopicPath(e.target.value)} placeholder="ai/transformers/..." className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Entry ID</label>
          <input type="text" value={entryId} onChange={(e) => setEntryId(e.target.value)} placeholder="entry_id" className={inputCls} />
        </div>
      </div>

      <button
        onClick={fetchEntry}
        disabled={!address.trim() || !topicPath.trim() || !entryId.trim() || loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
      >
        {loading ? 'Loading...' : 'Lookup Entry'}
      </button>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {result && <JsonDisplay data={result} label="Entry Data" />}
    </div>
  );
}

function RuleEvaluatorTab() {
  const [path, setPath] = useState('');
  const [address, setAddress] = useState(ADDR1);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function evalRule() {
    if (!path.trim() || !address.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({
        op: 'evalRule',
        path: path.trim(),
        address: address.trim(),
      });
      if (value.trim()) params.set('value', value.trim());
      const res = await fetch(`/api/ain/debug?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Path</label>
        <input type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/apps/knowledge/explorations/$address/$topic/$entryId" className={inputCls} />
      </div>

      {/* Quick-fill path buttons */}
      <div className="flex flex-wrap gap-1">
        {DEBUG_PATHS.slice(0, 8).map((p) => (
          <button
            key={p}
            onClick={() => setPath(p)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-0.5 rounded text-[10px] font-mono transition-colors border border-gray-700"
          >
            {p.replace('/apps/knowledge/', '')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Value (JSON or string)</label>
          <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder='{"key": "value"} or plain string' className={inputCls} />
        </div>
      </div>

      <button
        onClick={evalRule}
        disabled={!path.trim() || !address.trim() || loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
      >
        {loading ? 'Evaluating...' : 'Eval Rule'}
      </button>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {result && (
        <>
          {result.data !== undefined && (
            <div className={`text-sm font-medium px-3 py-1.5 rounded-lg inline-block ${
              result.data === true || result.data?.result === true
                ? 'bg-green-900/40 text-green-400 border border-green-800'
                : 'bg-red-900/40 text-red-400 border border-red-800'
            }`}>
              {result.data === true || result.data?.result === true ? 'ALLOWED' : 'DENIED'}
            </div>
          )}
          <JsonDisplay data={result} label="Full Response" />
        </>
      )}
    </div>
  );
}

function TxDebuggerTab() {
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchTx() {
    if (!hash.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/ain/debug?op=getTx&hash=${encodeURIComponent(hash.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Transaction Hash</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="0x..."
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={fetchTx}
            disabled={!hash.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            {loading ? '...' : 'Lookup'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {result && <JsonDisplay data={result} label="Transaction" />}
    </div>
  );
}
