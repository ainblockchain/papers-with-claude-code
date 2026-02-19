'use client';

import { useEffect, useState } from 'react';
import NetworkOverview from '@/components/NetworkOverview';
import { getAgentStatus, getGraphStats, listTopics } from '@/lib/agent-client';

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    getGraphStats().then(setStats).catch(() => {});
    getAgentStatus().then(setAgentStatus).catch(() => {});
    listTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Collective Intelligence</h1>
        <p className="text-gray-400">
          Global knowledge graph state of all ERC-8004 registered Cogito nodes
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase">Topics</div>
          <div className="text-2xl font-bold text-white mt-1">{topics.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase">Graph Nodes</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.node_count ?? '...'}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase">Graph Edges</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.edge_count ?? '...'}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase">Agent Cycles</div>
          <div className="text-2xl font-bold text-white mt-1">
            {agentStatus?.thinkCount ?? '...'}
          </div>
        </div>
      </div>

      {/* Recent explorations from agent status */}
      {agentStatus?.recentExplorations && (
        <div>
          <h2 className="text-xl font-bold mb-3">Recent Explorations</h2>
          <div className="space-y-2">
            {agentStatus.recentExplorations.map((exp: any, i: number) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="font-semibold">{exp.title}</div>
                <div className="text-sm text-gray-400 mt-1">{exp.summary}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {exp.topicPath} | depth {exp.depth}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network overview */}
      <NetworkOverview />
    </div>
  );
}
