// Barrel re-export — maintains backward compatibility with import path (hedera/client.js)
// Actual implementations are distributed across context, hcs, hts, escrow, utils submodules

export type { HederaContext, AgentAccount, HCSMessage } from './context.js';
export { createContext, createAgentAccount } from './context.js';
export { createTopic, submitMessage, getTopicMessages, getAllTopicMessages } from './hcs.js';
export { createToken, associateToken, transferTokenFromTreasury, transferToken, getTokenBalance } from './hts.js';
export type { InfrastructureIds } from './escrow.js';
export { setupOrReuse, setupMarketplaceInfra, escrowRelease } from './escrow.js';
export { hashscanUrl } from './utils.js';
