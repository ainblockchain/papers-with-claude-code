// Barrel re-export — 기존 import 경로(hedera/client.js) 호환 유지
// 실제 구현은 context, hcs, hts, escrow, utils 서브모듈에 분산

export type { HederaContext, AgentAccount, HCSMessage } from './context.js';
export { createContext, createAgentAccount } from './context.js';
export { createTopic, submitMessage, getTopicMessages } from './hcs.js';
export { createToken, associateToken, transferTokenFromTreasury, transferToken, getTokenBalance } from './hts.js';
export type { InfrastructureIds } from './escrow.js';
export { setupOrReuse, setupMarketplaceInfra, escrowRelease } from './escrow.js';
export { hashscanUrl } from './utils.js';
