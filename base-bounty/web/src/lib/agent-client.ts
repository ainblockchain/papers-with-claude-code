const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3402';
const AIN_PROVIDER_URL = process.env.NEXT_PUBLIC_AIN_PROVIDER_URL || 'http://localhost:8081';

async function rpc(method: string, params: Record<string, any> = {}): Promise<any> {
  const res = await fetch(`${AIN_PROVIDER_URL}/json-rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.result?.code) {
    throw new Error(json.result.message || `RPC error ${json.result.code}`);
  }
  return json.result?.result ?? json.result;
}

export async function getAgentStatus(): Promise<any> {
  const res = await fetch(`${AGENT_URL}/status`);
  return res.json();
}

export async function getGraphStats(): Promise<any> {
  return rpc('ain_knowledge_getGraphStats');
}

export async function getFrontierMap(topicPath?: string): Promise<any> {
  return rpc('ain_knowledge_getFrontierMap', { topic_path: topicPath });
}

export async function getTopicStats(topicPath: string): Promise<any> {
  return rpc('ain_knowledge_getTopicStats', { topic_path: topicPath });
}

export async function listTopics(): Promise<any> {
  return rpc('ain_knowledge_listTopics');
}

export async function getExplorers(topicPath: string): Promise<any> {
  return rpc('ain_knowledge_getExplorers', { topic_path: topicPath });
}

export async function getExplorations(agentUrl: string, topicPath: string): Promise<any> {
  const res = await fetch(`${agentUrl}/knowledge/explore/${topicPath}`);
  return res.json();
}

export async function getKnowledgeGraph(agentUrl: string): Promise<any> {
  const res = await fetch(`${agentUrl}/knowledge/graph`);
  return res.json();
}
