// AIN Blockchain adapter for on-chain learning progress, knowledge graph, and community features

import type { ApiResponse, ExplorationInput, LearnerProgress } from '@/lib/ain/types';
import type { UserLocation, CourseLocation } from '@/lib/ain/location-types';

export interface AinBlockchainAdapter {
  // Account
  getAccountInfo(): Promise<{ address: string; balance: number }>;

  // Topics
  listTopics(): Promise<any>;
  registerTopic(topicPath: string, title: string, description: string): Promise<any>;
  getTopicInfo(topicPath: string): Promise<{ info: any; subtopics: any }>;
  getTopicStats(topicPath: string): Promise<any>;
  getTopicExplorers(topicPath: string): Promise<any>;

  // Explorations
  recordExploration(input: ExplorationInput): Promise<any>;
  getExplorations(address: string, topicPath: string): Promise<any>;
  getExplorationsByUser(address: string): Promise<any>;

  // Frontier
  getFrontierMap(topicPath?: string): Promise<any>;
  getTopicFrontier(topicPath: string): Promise<any>;

  // Knowledge Graph
  getGraph(): Promise<any>;
  getGraphNode(nodeId: string): Promise<{ node: any; edges: any }>;

  // Progress
  getProgress(address: string): Promise<LearnerProgress>;

  // Locations (ainspace)
  updateLocation(location: UserLocation): Promise<any>;
  getLocation(address: string): Promise<UserLocation | null>;
  getAllLocations(): Promise<Record<string, UserLocation>>;

  // Course locations
  setCourseLocation(course: CourseLocation): Promise<any>;
  getCourseLocations(): Promise<Record<string, CourseLocation>>;

  // x402 Content
  publishContent(params: {
    content: string;
    title: string;
    price: string;
    payTo: string;
    description: string;
  }): Promise<{ contentId: string; contentHash: string }>;
  listContent(): Promise<any[]>;
  accessEntry(ownerAddress: string, topicPath: string, entryId: string): Promise<any>;
}

class RealAinAdapter implements AinBlockchainAdapter {
  private async fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    const json: ApiResponse<T> = await res.json();
    if (!json.ok) throw new Error(json.error || 'API call failed');
    return json.data as T;
  }

  async getAccountInfo() {
    return this.fetchApi<{ address: string; balance: number }>('/api/ain/whoami');
  }

  async listTopics() {
    return this.fetchApi('/api/topics');
  }

  async registerTopic(topicPath: string, title: string, description: string) {
    return this.fetchApi('/api/topics/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicPath, title, description }),
    });
  }

  async getTopicInfo(topicPath: string) {
    return this.fetchApi<{ info: any; subtopics: any }>(
      `/api/topics/info?topicPath=${encodeURIComponent(topicPath)}`
    );
  }

  async getTopicStats(topicPath: string) {
    return this.fetchApi(`/api/topics/stats?topicPath=${encodeURIComponent(topicPath)}`);
  }

  async getTopicExplorers(topicPath: string) {
    return this.fetchApi(`/api/topics/explorers?topicPath=${encodeURIComponent(topicPath)}`);
  }

  async recordExploration(input: ExplorationInput) {
    return this.fetchApi('/api/explorations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  }

  async getExplorations(address: string, topicPath: string) {
    return this.fetchApi(
      `/api/explorations?address=${encodeURIComponent(address)}&topicPath=${encodeURIComponent(topicPath)}`
    );
  }

  async getExplorationsByUser(address: string) {
    return this.fetchApi(`/api/explorations/by-user?address=${encodeURIComponent(address)}`);
  }

  async getFrontierMap(topicPath?: string) {
    const qs = topicPath ? `?topicPath=${encodeURIComponent(topicPath)}` : '';
    return this.fetchApi(`/api/frontier-map${qs}`);
  }

  async getTopicFrontier(topicPath: string) {
    return this.fetchApi(`/api/topics/frontier?topicPath=${encodeURIComponent(topicPath)}`);
  }

  async getGraph() {
    return this.fetchApi('/api/knowledge/graph');
  }

  async getGraphNode(nodeId: string) {
    return this.fetchApi<{ node: any; edges: any }>(
      `/api/knowledge/graph?nodeId=${encodeURIComponent(nodeId)}`
    );
  }

  async getProgress(address: string) {
    return this.fetchApi<LearnerProgress>(
      `/api/knowledge/progress?address=${encodeURIComponent(address)}`
    );
  }

  async updateLocation(location: UserLocation) {
    return this.fetchApi('/api/ain/locations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
    });
  }

  async getLocation(address: string) {
    return this.fetchApi<UserLocation | null>(
      `/api/ain/locations?address=${encodeURIComponent(address)}`
    );
  }

  async getAllLocations() {
    return this.fetchApi<Record<string, UserLocation>>('/api/ain/locations');
  }

  async setCourseLocation(course: CourseLocation) {
    return this.fetchApi('/api/ain/courses/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
  }

  async getCourseLocations() {
    return this.fetchApi<Record<string, CourseLocation>>('/api/ain/courses/locations');
  }

  async publishContent(params: {
    content: string;
    title: string;
    price: string;
    payTo: string;
    description: string;
  }) {
    const res = await fetch('/api/knowledge/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Publish failed');
    return { contentId: json.contentId, contentHash: json.contentHash };
  }

  async listContent() {
    return this.fetchApi<any[]>('/api/knowledge/list');
  }

  async accessEntry(ownerAddress: string, topicPath: string, entryId: string) {
    return this.fetchApi('/api/knowledge/access-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerAddress, topicPath, entryId }),
    });
  }
}

class MockAinAdapter implements AinBlockchainAdapter {
  private _locations = new Map<string, UserLocation>();
  private _courseLocations = new Map<string, CourseLocation>();

  async getAccountInfo() {
    return { address: '0x' + 'a'.repeat(40), balance: 100 };
  }

  async listTopics() {
    return {
      'transformers': { title: 'Transformers', description: 'Transformer architecture and variants' },
      'transformers/foundations': { title: 'Foundations', description: 'Core transformer concepts' },
    };
  }

  async registerTopic(_topicPath: string, _title: string, _description: string) {
    return { tx_hash: '0x' + 'b'.repeat(64) };
  }

  async getTopicInfo(_topicPath: string) {
    return {
      info: { title: 'Transformers', description: 'Transformer architecture' },
      subtopics: { foundations: { title: 'Foundations' } },
    };
  }

  async getTopicStats(_topicPath: string) {
    return { explorer_count: 5, max_depth: 3, avg_depth: 1.8 };
  }

  async getTopicExplorers(_topicPath: string) {
    return ['0x' + '1'.repeat(40), '0x' + '2'.repeat(40)];
  }

  async recordExploration(_input: ExplorationInput) {
    return { tx_hash: '0x' + 'c'.repeat(64), entry_id: 'mock-entry-' + Date.now() };
  }

  async getExplorations(_address: string, _topicPath: string) {
    return {
      'entry-1': { title: 'Self-Attention', depth: 1, summary: 'Learned attention mechanism', created_at: Date.now() - 86400000 },
      'entry-2': { title: 'Multi-Head Attention', depth: 2, summary: 'Extended to multi-head', created_at: Date.now() },
    };
  }

  async getExplorationsByUser(_address: string) {
    return {
      'transformers|foundations': {
        'entry-1': { title: 'Self-Attention', depth: 1, summary: 'Learned attention mechanism', created_at: Date.now() },
      },
    };
  }

  async getFrontierMap(_topicPath?: string) {
    return {
      'transformers/foundations': { explorer_count: 12, max_depth: 4, avg_depth: 2.1 },
      'transformers/efficiency': { explorer_count: 8, max_depth: 3, avg_depth: 1.5 },
      'transformers/frontier': { explorer_count: 3, max_depth: 2, avg_depth: 1.2 },
    };
  }

  async getTopicFrontier(_topicPath: string) {
    return { explorer_count: 5, max_depth: 3, entries: [] };
  }

  async getGraph() {
    return {
      nodes: {
        'node-1': { address: '0x' + 'a'.repeat(40), topic_path: 'transformers/foundations', title: 'Self-Attention', depth: 1, created_at: Date.now() },
        'node-2': { address: '0x' + 'a'.repeat(40), topic_path: 'transformers/foundations', title: 'Multi-Head Attention', depth: 2, created_at: Date.now() },
        'node-3': { address: '0x' + 'a'.repeat(40), topic_path: 'transformers/efficiency', title: 'Flash Attention', depth: 2, created_at: Date.now() },
      },
      edges: {
        'node-2': { 'node-1': { type: 'extends', created_at: Date.now(), created_by: '0x' + 'a'.repeat(40) } },
        'node-3': { 'node-1': { type: 'related', created_at: Date.now(), created_by: '0x' + 'a'.repeat(40) } },
      },
    };
  }

  async getGraphNode(_nodeId: string) {
    return {
      node: { address: '0x' + 'a'.repeat(40), title: 'Self-Attention', depth: 1 },
      edges: {},
    };
  }

  async getProgress(_address: string): Promise<LearnerProgress> {
    return {
      address: '0x' + 'a'.repeat(40),
      totalTopics: 2,
      totalEntries: 3,
      totalPurchases: 1,
      topics: [
        {
          topicPath: 'transformers/foundations',
          entryCount: 2,
          maxDepth: 2,
          entries: [
            { entryId: 'e1', title: 'Self-Attention', depth: 1, summary: 'Core attention', price: null, createdAt: Date.now() - 86400000 },
            { entryId: 'e2', title: 'Multi-Head Attention', depth: 2, summary: 'Extended', price: null, createdAt: Date.now() },
          ],
        },
      ],
      purchases: [
        { key: 'p1', seller: '0x' + 'b'.repeat(40), topicPath: 'transformers/efficiency', entryId: 'flash', amount: '10', currency: 'AIN', accessedAt: Date.now() },
      ],
    };
  }

  async updateLocation(location: UserLocation) {
    const address = '0x' + 'a'.repeat(40);
    this._locations.set(address, location);
    return { tx_hash: '0x' + 'f'.repeat(64) };
  }

  async getLocation(address: string) {
    return this._locations.get(address) || null;
  }

  async getAllLocations() {
    const result: Record<string, UserLocation> = {};
    // Include mock friend locations
    const mockFriendLocations: Record<string, UserLocation> = {
      ['0x' + '1'.repeat(40)]: { x: 15, y: 10, direction: 'down', scene: 'village', updatedAt: Date.now() - 3000 },
      ['0x' + '2'.repeat(40)]: { x: 30, y: 20, direction: 'right', scene: 'village', updatedAt: Date.now() - 5000 },
      ['0x' + '3'.repeat(40)]: { x: 42, y: 15, direction: 'left', scene: 'course', paperId: 'moonshine-2410', stageIndex: 2, updatedAt: Date.now() - 10000 },
    };
    Object.assign(result, mockFriendLocations);
    for (const [addr, loc] of this._locations) {
      result[addr] = loc;
    }
    return result;
  }

  async setCourseLocation(course: CourseLocation) {
    this._courseLocations.set(course.paperId, course);
    return { tx_hash: '0x' + 'f'.repeat(64) };
  }

  async getCourseLocations() {
    const result: Record<string, CourseLocation> = {};
    for (const [id, loc] of this._courseLocations) {
      result[id] = loc;
    }
    return result;
  }

  async publishContent(_params: {
    content: string;
    title: string;
    price: string;
    payTo: string;
    description: string;
  }) {
    return { contentId: 'mock-' + Date.now(), contentHash: '0x' + 'd'.repeat(64) };
  }

  async listContent() {
    return [
      { contentId: 'c1', title: 'Flash Attention Deep Dive', price: '10', payTo: '0x' + 'b'.repeat(40), description: 'Premium lesson', contentHash: '0x' + 'e'.repeat(64), createdAt: Date.now() },
    ];
  }

  async accessEntry(_ownerAddress: string, _topicPath: string, _entryId: string) {
    return { content: 'This is premium content about Flash Attention...', paid: true, receipt: { amount: '10', currency: 'AIN' } };
  }
}

const USE_REAL_AIN = process.env.NEXT_PUBLIC_USE_AIN_CHAIN === 'true';
export const ainAdapter: AinBlockchainAdapter = USE_REAL_AIN
  ? new RealAinAdapter()
  : new MockAinAdapter();
