// ERC-8004 (Trustless Agents) minimal ABI definitions
// Identity Registry: agent identity registration (ERC-721 minting)
// Reputation Registry: reputation feedback recording and querying

/** Identity Registry — ERC-721 based agent registration */
export const IDENTITY_REGISTRY_ABI = [
  'function register(string agentURI) returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
] as const;

/** Reputation Registry — feedback recording and aggregated querying */
export const REPUTATION_REGISTRY_ABI = [
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
  'function getSummary(uint256 agentId, address[] memory reviewers, string tag1, string tag2) view returns (uint256 count, int256 summaryValue, uint8 decimals)',
  'function readAllFeedback(uint256 agentId) view returns (tuple(address reviewer, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash, uint256 timestamp)[])',
] as const;

/** Contract addresses (Ethereum Sepolia) */
export const ERC8004_CONTRACTS = {
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
} as const;
