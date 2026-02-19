'use client';

import { useState } from 'react';
import { GENESIS_PAPERS } from '@/lib/devnet-samples';

interface CoursePreset {
  label: string;
  topicPath: string;
  title: string;
  content: string;
  summary: string;
  depth: number;
  tags: string;
  price: string;
  parentIndex?: number; // index into GENESIS_PAPERS
}

const COURSE_PRESETS: CoursePreset[] = [
  {
    label: 'Transformer Fundamentals',
    topicPath: 'ai/transformers/attention',
    title: 'Transformer Architecture: A Comprehensive Guide',
    content: 'This course covers the complete transformer architecture from the ground up. Topics include: scaled dot-product attention, multi-head attention, positional encoding, encoder-decoder stacks, layer normalization, and residual connections. Includes hands-on implementation exercises.',
    summary: 'Complete guide to transformer architecture with hands-on exercises',
    depth: 3,
    tags: 'transformer, attention, architecture, course',
    price: '10',
    parentIndex: 0, // Transformer
  },
  {
    label: 'GPT Fine-tuning Masterclass',
    topicPath: 'ai/transformers/decoder-only',
    title: 'Fine-tuning GPT Models: From Basics to Production',
    content: 'Learn how to fine-tune GPT models for domain-specific tasks. Covers: data preparation, LoRA and QLoRA adapters, hyperparameter tuning, evaluation metrics, deployment strategies. Practical examples with GPT-2 and open-source models.',
    summary: 'Practical fine-tuning of GPT models with LoRA adapters',
    depth: 2,
    tags: 'gpt, fine-tuning, lora, production',
    price: '25',
    parentIndex: 4, // GPT-2
  },
  {
    label: 'BERT for NLP Applications',
    topicPath: 'ai/transformers/encoder-only',
    title: 'BERT in Practice: NLP Applications and Deployment',
    content: 'Hands-on course covering BERT for real-world NLP tasks. Topics: text classification, named entity recognition, question answering, semantic search, sentence embeddings. Includes deployment with ONNX and TorchServe.',
    summary: 'Practical BERT applications for NLP tasks',
    depth: 2,
    tags: 'bert, nlp, classification, search',
    price: '15',
    parentIndex: 2, // BERT
  },
];

export default function CoursePublishForm() {
  const [topicPath, setTopicPath] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [depth, setDepth] = useState<number>(1);
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('');
  const [parentOwner, setParentOwner] = useState('');
  const [parentTopic, setParentTopic] = useState('');
  const [parentEntryId, setParentEntryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(preset: CoursePreset) {
    setTopicPath(preset.topicPath);
    setTitle(preset.title);
    setContent(preset.content);
    setSummary(preset.summary);
    setDepth(preset.depth);
    setTags(preset.tags);
    setPrice(preset.price);
    if (preset.parentIndex !== undefined) {
      const parent = GENESIS_PAPERS[preset.parentIndex];
      setParentOwner(parent.ownerAddress);
      setParentTopic(parent.topicPath);
      setParentEntryId(parent.entryId);
    } else {
      setParentOwner('');
      setParentTopic('');
      setParentEntryId('');
    }
    setResult(null);
    setError(null);
  }

  function pickParent(index: number) {
    const p = GENESIS_PAPERS[index];
    setParentOwner(p.ownerAddress);
    setParentTopic(p.topicPath);
    setParentEntryId(p.entryId);
  }

  async function handlePublish() {
    if (!topicPath.trim() || !title.trim() || !content.trim() || !price.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/knowledge/publish-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicPath: topicPath.trim(),
          title: title.trim(),
          content: content.trim(),
          summary: summary.trim(),
          depth,
          tags: tags.trim(),
          price: price.trim(),
          parentEntry: parentOwner.trim() && parentTopic.trim() && parentEntryId.trim()
            ? { ownerAddress: parentOwner.trim(), topicPath: parentTopic.trim(), entryId: parentEntryId.trim() }
            : null,
        }),
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
      <h2 className="text-lg font-semibold text-white mb-2">Publish Gated Course</h2>
      <p className="text-gray-400 text-sm mb-4">
        Publish a course with x402 payment gating. Content is stored on the gateway
        and metadata is recorded on-chain.
      </p>

      {/* Course presets */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Sample Presets:</p>
        <div className="flex flex-wrap gap-1.5">
          {COURSE_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => applyPreset(preset)}
              className="bg-purple-900/40 hover:bg-purple-800/40 text-purple-300 px-2.5 py-1 rounded-full text-xs transition-colors border border-purple-800"
            >
              {preset.label}
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
              placeholder="Introduction to Blockchain"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Full course content (this will be gated behind payment)..."
            rows={6}
            className={`${inputCls} resize-y`}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Summary</label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief description shown to potential buyers"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price (AIN) *</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="10"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depth</label>
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value) || 1)}
              min={1}
              max={5}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="transformer, course"
              className={inputCls}
            />
          </div>
        </div>

        {/* Graph: Parent Entry (optional) */}
        <details className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <summary className="px-3 py-2 cursor-pointer text-xs text-gray-400 hover:text-gray-300 transition-colors">
            Link to parent entry (graph edge)
          </summary>
          <div className="px-3 pb-3 pt-1 space-y-2">
            <p className="text-xs text-gray-500">
              Connect this entry to an existing one. Creates an &quot;extends&quot; edge in the knowledge graph.
            </p>
            <div className="mb-2">
              <select
                onChange={(e) => { const idx = parseInt(e.target.value); if (!isNaN(idx)) pickParent(idx); }}
                value=""
                className={`w-full ${selectCls}`}
              >
                <option value="">Pick from genesis papers...</option>
                {GENESIS_PAPERS.map((p, i) => (
                  <option key={i} value={i}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Owner Address</label>
                <input
                  type="text"
                  value={parentOwner}
                  onChange={(e) => setParentOwner(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Topic Path</label>
                <input
                  type="text"
                  value={parentTopic}
                  onChange={(e) => setParentTopic(e.target.value)}
                  placeholder="ai/transformers/..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Entry ID</label>
                <input
                  type="text"
                  value={parentEntryId}
                  onChange={(e) => setParentEntryId(e.target.value)}
                  placeholder="transformer_2017"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
            </div>
          </div>
        </details>
      </div>

      <button
        onClick={handlePublish}
        disabled={loading || !topicPath.trim() || !title.trim() || !content.trim() || !price.trim()}
        className="mt-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? 'Publishing...' : 'Publish Course'}
      </button>

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">Publish Result</p>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
