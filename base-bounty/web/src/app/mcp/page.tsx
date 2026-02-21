'use client';

import { useState } from 'react';

interface ToolDef {
  name: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
}

const TOOLS: ToolDef[] = [
  {
    name: 'search_arxiv',
    description: 'Search arXiv for academic papers matching a query. Enriches results with citation counts and TLDR summaries via Semantic Scholar.',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query for arXiv papers' },
      { name: 'maxResults', type: 'number', required: false, description: 'Maximum results (1-20, default 5)' },
      { name: 'includeFullText', type: 'boolean', required: false, description: 'Fetch full paper text for top result' },
    ],
  },
  {
    name: 'find_github_repo',
    description: 'Find the official GitHub repository for a given paper. Uses HuggingFace Papers API first, then falls back to GitHub search.',
    params: [
      { name: 'paperTitle', type: 'string', required: true, description: 'Title of the academic paper' },
      { name: 'authors', type: 'string[]', required: false, description: 'Paper author names to improve matching' },
      { name: 'includeContent', type: 'boolean', required: false, description: 'Fetch README and key source files' },
    ],
  },
  {
    name: 'publication_guide',
    description: 'Enrich a lesson with related papers and code repos into a publication-ready guide with full paper text excerpts and code snippets.',
    params: [
      { name: 'title', type: 'string', required: true, description: 'Title of the lesson or topic' },
      { name: 'content', type: 'string', required: true, description: 'Content/description of the lesson' },
      { name: 'tags', type: 'string[]', required: true, description: 'Tags categorizing the lesson' },
    ],
  },
  {
    name: 'check_publication_status',
    description: 'Check if similar enriched content already exists on the AIN blockchain to prevent duplicate publications.',
    params: [
      { name: 'topicPath', type: 'string', required: true, description: 'AIN knowledge-graph topic path' },
      { name: 'title', type: 'string', required: true, description: 'Title of the content to publish' },
      { name: 'tags', type: 'string[]', required: false, description: 'Optional tags for the content' },
    ],
  },
];

export default function McpPage() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTool = TOOLS.find(t => t.name === selectedTool);

  function handleParamChange(name: string, value: string) {
    setParamValues(prev => ({ ...prev, [name]: value }));
  }

  async function handleCall() {
    if (!activeTool) return;
    setLoading(true);
    setResult(null);
    setError(null);

    // Build arguments from param values
    const args: Record<string, unknown> = {};
    for (const param of activeTool.params) {
      const raw = paramValues[param.name];
      if (!raw && !param.required) continue;
      if (param.type === 'number') {
        args[param.name] = Number(raw) || undefined;
      } else if (param.type === 'boolean') {
        args[param.name] = raw === 'true';
      } else if (param.type === 'string[]') {
        args[param.name] = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
      } else {
        args[param.name] = raw;
      }
    }

    try {
      const res = await fetch('/api/mcp-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: activeTool.name, args }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(JSON.stringify(data.result, null, 2));
      }
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTool(name: string) {
    setSelectedTool(name === selectedTool ? null : name);
    setParamValues({});
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">MCP Tools</h1>
        <p className="text-gray-400">
          Model Context Protocol server exposing Cogito's paper research and knowledge publishing tools
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono">
            POST /api/mcp
          </span>
          <span className="text-xs text-gray-500">Streamable HTTP transport</span>
          <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded font-mono">
            cogito-mcp v1.0.0
          </span>
        </div>
      </div>

      {/* Tool Cards */}
      <div className="space-y-3">
        {TOOLS.map((tool) => (
          <div key={tool.name} className="bg-gray-800 rounded-lg border border-gray-700">
            <button
              onClick={() => handleSelectTool(tool.name)}
              className="w-full text-left p-4 flex items-start justify-between hover:bg-gray-750 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-cogito-blue font-bold">{tool.name}</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                    {tool.params.filter(p => p.required).length} required
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{tool.description}</p>
              </div>
              <span className="text-gray-500 ml-3 text-sm">{selectedTool === tool.name ? '\u25B2' : '\u25BC'}</span>
            </button>

            {selectedTool === tool.name && (
              <div className="border-t border-gray-700 p-4 space-y-4">
                {/* Parameter Inputs */}
                <div className="space-y-3">
                  <div className="text-xs text-gray-400 uppercase">Parameters</div>
                  {tool.params.map((param) => (
                    <div key={param.name}>
                      <label className="flex items-center gap-2 text-xs mb-1">
                        <span className="font-mono text-gray-300">{param.name}</span>
                        <span className="text-[10px] text-gray-500">{param.type}</span>
                        {param.required && (
                          <span className="text-[10px] text-red-400">required</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={paramValues[param.name] || ''}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        placeholder={param.description}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono text-gray-300 focus:outline-none focus:border-cogito-blue placeholder-gray-600"
                      />
                    </div>
                  ))}
                </div>

                {/* Call Button */}
                <button
                  onClick={handleCall}
                  disabled={loading}
                  className="px-4 py-2 bg-cogito-blue text-white text-sm font-medium rounded-lg hover:bg-cogito-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Calling...' : `Call ${tool.name}`}
                </button>

                {/* Result */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="text-xs text-red-400">{error}</div>
                  </div>
                )}
                {result && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 overflow-auto max-h-96">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{result}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Connection Info */}
      <div>
        <h2 className="text-xl font-bold mb-3">Connect via MCP Client</h2>
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 space-y-4">
          <p className="text-xs text-gray-400">
            Add this server to any MCP-compatible client (Claude Code, Claude Desktop, Cursor, etc.)
          </p>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre">{`{
  "mcpServers": {
    "cogito-mcp": {
      "type": "streamable-http",
      "url": "${typeof window !== 'undefined' ? window.location.origin : 'https://cogito.ainetwork.ai'}/api/mcp"
    }
  }
}`}</pre>
          </div>
          <div className="text-[10px] text-gray-500 space-y-1">
            <div>Protocol: MCP Streamable HTTP (POST with JSON-RPC 2.0)</div>
            <div>Tools: {TOOLS.length} registered ({TOOLS.map(t => t.name).join(', ')})</div>
          </div>
        </div>
      </div>
    </div>
  );
}
