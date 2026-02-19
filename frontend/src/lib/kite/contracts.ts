// Chain configuration constants and LearningLedger ABI

export const LEARNING_LEDGER_ADDRESS =
  process.env.NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS || '';

export const KITE_CHAIN_CONFIG = {
  testnet: {
    chainId: 2368,
    rpcUrl: 'https://rpc-testnet.gokite.ai/',
    explorerUrl: 'https://testnet.kitescan.ai/',
    faucetUrl: 'https://faucet.gokite.ai',
  },
  mainnet: {
    chainId: 2366,
    rpcUrl: 'https://rpc.gokite.ai/',
    explorerUrl: 'https://kitescan.ai/',
  },
} as const;

export function getChainConfig() {
  const chainId = Number(
    process.env.NEXT_PUBLIC_KITE_CHAIN_ID || '2368'
  );
  return chainId === 2366 ? KITE_CHAIN_CONFIG.mainnet : KITE_CHAIN_CONFIG.testnet;
}

// Human-readable ABI for ethers.js
export const LEARNING_LEDGER_ABI = [
  'function enrollCourse(string paperId) payable',
  'function completeStage(string paperId, uint256 stageNum, uint256 score) payable',
  'function getProgress(address agent, string paperId) view returns (bool isEnrolled, uint256 currentStage, uint256 totalPaid, uint256 enrolledAt)',
  'function getStageCompletion(address agent, string paperId, uint256 stageNum) view returns (uint256 completedAt, uint256 score, bytes32 attestationHash)',
  'event CourseEnrolled(address indexed agent, string paperId, uint256 timestamp)',
  'event StageCompleted(address indexed agent, string paperId, uint256 stageNum, uint256 score)',
  'event PaymentReceived(address indexed from, string paperId, uint256 amount)',
] as const;
