// ERC-8004 (Trustless Agents) 최소 ABI 정의
// Identity Registry: 에이전트 신원 등록 (ERC-721 민팅)
// Reputation Registry: 평판 피드백 기록 및 조회

/** Identity Registry — ERC-721 기반 에이전트 등록 */
export const IDENTITY_REGISTRY_ABI = [
  'function register(string agentURI) returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
] as const;

/** Reputation Registry — 평판 피드백 기록 및 집계 조회 */
export const REPUTATION_REGISTRY_ABI = [
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
  'function getSummary(uint256 agentId, address[] memory reviewers, string tag1, string tag2) view returns (uint256 count, int256 summaryValue, uint8 decimals)',
  'function readAllFeedback(uint256 agentId) view returns (tuple(address reviewer, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash, uint256 timestamp)[])',
] as const;

/** 컨트랙트 주소 (Ethereum Sepolia) */
export const ERC8004_CONTRACTS = {
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
} as const;
