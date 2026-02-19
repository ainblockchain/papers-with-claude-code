const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3402';

async function api(action: string, params: Record<string, any> = {}): Promise<any> {
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json.result;
}

export async function getAgentStatus(): Promise<any> {
  const res = await fetch(`${AGENT_URL}/status`);
  return res.json();
}

export async function getGraphStats(): Promise<any> {
  return api('getGraphStats');
}

export async function getFrontierMap(topicPath?: string): Promise<any> {
  return api('getFrontierMap', { topicPath });
}

export async function getFrontier(topicPath: string): Promise<any> {
  return api('getFrontier', { topicPath });
}

export async function getTopicStats(topicPath: string): Promise<any> {
  return api('getTopicStats', { topicPath });
}

export async function listTopics(): Promise<string[]> {
  return api('listTopics');
}

export async function listSubtopics(topicPath: string): Promise<string[]> {
  return api('listSubtopics', { topicPath });
}

export async function getExplorers(topicPath: string): Promise<string[]> {
  return api('getExplorers', { topicPath });
}

export async function getExplorations(address: string, topicPath: string): Promise<any> {
  return api('getExplorations', { address, topicPath });
}

export async function getAllFrontierEntries(): Promise<any[]> {
  return api('getAllFrontierEntries');
}

export async function getRecentExplorations(limit = 20): Promise<any[]> {
  return api('getRecentExplorations', { limit });
}

export async function getKnowledgeGraph(): Promise<{ nodes: any[]; edges: any[] }> {
  return api('getKnowledgeGraph');
}
