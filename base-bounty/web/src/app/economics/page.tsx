'use client';

import { useEffect, useState } from 'react';
import NodeEconomics from '@/components/NodeEconomics';
import { getAllRegisteredNodes, getUSDCBalance, getETHBalance, NodeIdentity } from '@/lib/base-client';
import { getAgentStatus } from '@/lib/agent-client';

interface NodeData {
  identity: NodeIdentity;
  usdcBalance: number;
  ethBalance: number;
  revenue?: any;
}

export default function EconomicsPage() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const identities = await getAllRegisteredNodes();
        const nodeData: NodeData[] = [];

        for (const identity of identities) {
          try {
            const [usdcBalance, ethBalance] = await Promise.all([
              getUSDCBalance(identity.address).catch(() => 0),
              getETHBalance(identity.address).catch(() => 0),
            ]);

            // Try to get revenue data from the agent's status endpoint
            let revenue;
            try {
              const status = await getAgentStatus();
              revenue = status?.revenue;
            } catch {}

            nodeData.push({ identity, usdcBalance, ethBalance, revenue });
          } catch {
            nodeData.push({ identity, usdcBalance: 0, ethBalance: 0 });
          }
        }

        setNodes(nodeData);
      } catch {
        setNodes([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Node Economics</h1>
        <p className="text-gray-400 text-sm">
          Financial health of all registered Cogito nodes
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse bg-gray-800 rounded-lg h-48" />
          ))}
        </div>
      ) : nodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nodes.map((node) => (
            <NodeEconomics
              key={node.identity.address}
              address={node.identity.address}
              usdcBalance={node.usdcBalance}
              ethBalance={node.ethBalance}
              revenue={node.revenue}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No registered nodes found.</p>
      )}
    </div>
  );
}
