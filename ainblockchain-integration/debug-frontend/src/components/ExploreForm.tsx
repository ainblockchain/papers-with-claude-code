'use client';

import { useState } from 'react';
import {
  GENESIS_PAPERS,
  SAMPLE_EXPLORATIONS,
  type GenesisPaper,
  type SampleExploration,
} from '@/lib/devnet-samples';

interface EntryRef {
  ownerAddress: string;
  topicPath: string;
  entryId: string;
}

interface RelatedEntry extends EntryRef {
  type: string;
}

export default function ExploreForm() {
  const [topicPath, setTopicPath] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [depth, setDepth] = useState<number>(1);
  const [tags, setTags] = useState('');
  const [parentEntry, setParentEntry] = useState<EntryRef | null>(null);
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(sample: SampleExploration) {
    setTopicPath(sample.topicPath);
    setTitle(sample.title);
    setContent(sample.content);
    setSummary(sample.summary);
    setDepth(sample.depth);
    setTags(sample.tags);
    setParentEntry(sample.parentEntry || null);
    setRelatedEntries(
      (sample.relatedEntries || []).map((e) => ({
        ownerAddress: e.ownerAddress,
        topicPath: e.topicPath,
        entryId: e.entryId,
        type: e.type,
      }))
    );
    setResult(null);
    setError(null);
  }

  function pickParentFromGenesis(paper: GenesisPaper) {
    setParentEntry({
      ownerAddress: paper.ownerAddress,
      topicPath: paper.topicPath,
      entryId: paper.entryId,
    });
  }

  function addRelatedEntry() {
    setRelatedEntries([
      ...relatedEntries,
      { ownerAddress: '', topicPath: '', entryId: '', type: 'related' },
    ]);
  }

  function removeRelatedEntry(index: number) {
    setRelatedEntries(relatedEntries.filter((_, i) => i !== index));
  }

  function updateRelatedEntry(index: number, field: keyof RelatedEntry, value: string) {
    const updated = [...relatedEntries];
    updated[index] = { ...updated[index], [field]: value };
    setRelatedEntries(updated);
  }

  function pickRelatedFromGenesis(index: number, paper: GenesisPaper) {
    const updated = [...relatedEntries];
    updated[index] = {
      ...updated[index],
      ownerAddress: paper.ownerAddress,
      topicPath: paper.topicPath,
      entryId: paper.entryId,
    };
    setRelatedEntries(updated);
  }

  async function handleSubmit() {
    if (!topicPath.trim() || !title.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        topicPath: topicPath.trim(),
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim(),
        depth,
      };
      if (tags.trim()) {
        payload.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
      if (parentEntry && parentEntry.ownerAddress && parentEntry.topicPath && parentEntry.entryId) {
        payload.parentEntry = parentEntry;
      }
      const validRelated = relatedEntries.filter(
        (e) => e.ownerAddress && e.topicPath && e.entryId && e.type
      );
      if (validRelated.length > 0) {
        payload.relatedEntries = validRelated;
      }

      const res = await fetch('/api/explorations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';
  const selectCls = 'bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-2">Submit Exploration</h2>
      <p className="text-gray-400 text-sm mb-4">
        Record an exploration entry for a topic on the AIN blockchain.
      </p>

      {/* Sample presets row */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Sample Presets:</p>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_EXPLORATIONS.map((sample, i) => (
            <button
              key={i}
              onClick={() => applyPreset(sample)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-2.5 py-1 rounded-full text-xs transition-colors border border-gray-700 hover:border-gray-500"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Topic Path *</label>
            <input
              type="text"
              value={topicPath}
              onChange={(e) => setTopicPath(e.target.value)}
              placeholder="ai/transformers/attention"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Exploration title"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Detailed exploration content..."
            rows={4}
            className={`${inputCls} resize-y`}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Summary</label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief summary of the exploration"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depth</label>
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value) || 1)}
              min={1}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="attention, multi-head, research"
              className={inputCls}
            />
          </div>
        </div>

        {/* Parent Entry */}
        <div className="border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium">Parent Entry (optional)</label>
            <select
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                if (!isNaN(idx)) pickParentFromGenesis(GENESIS_PAPERS[idx]);
              }}
              value=""
              className={selectCls}
            >
              <option value="">Pick from known papers...</option>
              {GENESIS_PAPERS.map((p, i) => (
                <option key={i} value={i}>{p.title}</option>
              ))}
            </select>
          </div>
          {parentEntry ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Owner</label>
                <input
                  type="text"
                  value={parentEntry.ownerAddress}
                  onChange={(e) => setParentEntry({ ...parentEntry, ownerAddress: e.target.value })}
                  placeholder="0x..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Topic Path</label>
                <input
                  type="text"
                  value={parentEntry.topicPath}
                  onChange={(e) => setParentEntry({ ...parentEntry, topicPath: e.target.value })}
                  placeholder="ai/transformers/..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Entry ID</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={parentEntry.entryId}
                    onChange={(e) => setParentEntry({ ...parentEntry, entryId: e.target.value })}
                    placeholder="entry_id"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    onClick={() => setParentEntry(null)}
                    className="text-red-400 hover:text-red-300 text-xs px-1.5"
                    title="Clear parent"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600">No parent entry set. Pick from known papers or it will be added when you select one.</p>
          )}
        </div>

        {/* Related Entries */}
        <div className="border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium">Related Entries (optional)</label>
            <button
              onClick={addRelatedEntry}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
            >
              + Add
            </button>
          </div>
          {relatedEntries.length === 0 ? (
            <p className="text-xs text-gray-600">No related entries. Click + Add to create one.</p>
          ) : (
            <div className="space-y-2">
              {relatedEntries.map((entry, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <select
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        if (!isNaN(idx)) pickRelatedFromGenesis(i, GENESIS_PAPERS[idx]);
                      }}
                      value=""
                      className={selectCls}
                    >
                      <option value="">Pick from known papers...</option>
                      {GENESIS_PAPERS.map((p, j) => (
                        <option key={j} value={j}>{p.title}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeRelatedEntry(i)}
                      className="text-red-400 hover:text-red-300 text-xs px-1.5"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <input
                      type="text"
                      value={entry.ownerAddress}
                      onChange={(e) => updateRelatedEntry(i, 'ownerAddress', e.target.value)}
                      placeholder="0x..."
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={entry.topicPath}
                      onChange={(e) => updateRelatedEntry(i, 'topicPath', e.target.value)}
                      placeholder="topic/path"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={entry.entryId}
                      onChange={(e) => updateRelatedEntry(i, 'entryId', e.target.value)}
                      placeholder="entry_id"
                      className={inputCls}
                    />
                    <select
                      value={entry.type}
                      onChange={(e) => updateRelatedEntry(i, 'type', e.target.value)}
                      className={selectCls}
                    >
                      <option value="related">related</option>
                      <option value="extends">extends</option>
                      <option value="prerequisite">prerequisite</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !topicPath.trim() || !title.trim()}
        className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? 'Submitting...' : 'Submit Exploration'}
      </button>

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">Result</p>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
