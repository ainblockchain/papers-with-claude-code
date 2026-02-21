// CLI 데모 — 마켓플레이스 인프라만 셋업하고, 에이전트는 OpenClaw cron으로 자율 동작
//
// 이 스크립트는 Hedera 테스트넷에 인프라를 생성하고,
// 에이전트 시작 방법 + 웹 대시보드 접속 정보를 출력한다.
// 에이전트를 직접 제어하지 않는다 (자율 에이전트 경제).
//
// 실행: npm run demo                    (기본: attention-is-all-you-need)
//       npm run demo -- bert            (BERT 논문 선택)

import 'dotenv/config';
import {
  createContext,
  setupMarketplaceInfra,
  hashscanUrl,
} from './hedera/client.js';

// ── 터미널 출력 ──

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function banner(text: string) {
  const line = '═'.repeat(60);
  console.log(`\n${C.cyan}${line}${C.reset}`);
  console.log(`${C.bold}${C.cyan}  ${text}${C.reset}`);
  console.log(`${C.cyan}${line}${C.reset}\n`);
}

function step(num: number, text: string) {
  console.log(`\n${C.yellow}▸ Step ${num}${C.reset} ${C.bold}${text}${C.reset}`);
}

function log(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`);
}

function link(label: string, url: string) {
  console.log(`  ${C.dim}${label}: ${C.cyan}${url}${C.reset}`);
}

// ── 메인 ──

async function main() {
  const paperUrl = process.argv[2] || 'attention-is-all-you-need';
  const budget = 100;

  banner('Course Generation Marketplace — Autonomous Agent Economy');
  log('🏪', 'Mode: Autonomous Agents (HCS polling via OpenClaw cron)');
  log('📄', `Target Paper: ${paperUrl}`);
  log('💰', `Budget: ${budget} KNOW\n`);

  // ──────────────────────────────────────────
  // Step 1: 마켓플레이스 인프라 셋업
  // ──────────────────────────────────────────
  step(1, 'Hedera 테스트넷 연결 & 마켓플레이스 인프라 생성');

  const ctx = createContext();
  log('✅', `Operator: ${ctx.operatorId.toString()}`);

  const infra = await setupMarketplaceInfra(ctx, budget, (msg) => log('⏳', msg));

  log('✅', `${C.yellow}Escrow${C.reset}    → ${infra.escrowAccount.accountId}`);
  log('✅', `${C.blue}Analyst${C.reset}   → ${infra.analystAccount.accountId}`);
  log('✅', `${C.green}Architect${C.reset} → ${infra.architectAccount.accountId}`);
  log('✅', `${C.magenta}Scholar${C.reset}   → ${infra.scholarAccount.accountId}`);
  link('   HCS Topic', hashscanUrl('topic', infra.topicId));
  link('   KNOW Token', hashscanUrl('token', infra.tokenId));

  // ──────────────────────────────────────────
  // Step 2: 에이전트 시작 안내
  // ──────────────────────────────────────────
  step(2, '에이전트 시작 (OpenClaw cron 등록)');

  console.log(`
  에이전트는 서버가 직접 제어하지 않습니다.
  아래 명령으로 에이전트들을 자율 폴링 모드로 시작하세요:

  ${C.bold}bash scripts/start-agents.sh${C.reset}

  또는 개별 등록:

  ${C.dim}openclaw cron add --name "analyst-poll" --agent analyst --every 5s \\
    --message "Check HCS topic ${infra.topicId} for new work" --session isolated${C.reset}

  ${C.dim}openclaw cron add --name "architect-poll" --agent architect --every 5s \\
    --message "Check HCS topic ${infra.topicId} for new work" --session isolated${C.reset}

  ${C.dim}openclaw cron add --name "scholar-poll" --agent scholar --every 5s \\
    --message "Check HCS topic ${infra.topicId} for consultation requests" --session isolated${C.reset}
`);

  // ──────────────────────────────────────────
  // Step 3: 웹 대시보드 안내
  // ──────────────────────────────────────────
  step(3, '웹 대시보드 시작');

  console.log(`
  두 개의 분리된 웹 서비스를 실행하세요:

  ${C.bold}1. 의뢰인 대시보드 (port 4000)${C.reset}
     ${C.cyan}npm run web${C.reset}
     → 일감 게시, 입찰 승인, 리뷰 제출

  ${C.bold}2. 에이전트 모니터 (port 4001)${C.reset}
     ${C.cyan}npm run monitor${C.reset}
     → HCS 피드 실시간 관찰, 에이전트 활동 추적
     → http://localhost:4001?topicId=${infra.topicId}&tokenId=${infra.tokenId}
`);

  // ── 요약 ──
  banner('인프라 준비 완료 — 에이전트가 HCS를 자율 폴링할 준비 완료');

  console.log(`  ${C.bold}HashScan에서 확인:${C.reset}\n`);
  link('  HCS Topic', hashscanUrl('topic', infra.topicId));
  link('  KNOW Token', hashscanUrl('token', infra.tokenId));
  link('  Escrow', hashscanUrl('account', infra.escrowAccount.accountId));
  link('  Analyst', hashscanUrl('account', infra.analystAccount.accountId));
  link('  Architect', hashscanUrl('account', infra.architectAccount.accountId));
  link('  Scholar', hashscanUrl('account', infra.scholarAccount.accountId));

  console.log(`\n  ${C.bold}다음 단계:${C.reset}`);
  console.log(`  1. ${C.cyan}bash scripts/start-agents.sh${C.reset} — 에이전트 cron 등록`);
  console.log(`  2. ${C.cyan}npm run web${C.reset} — 의뢰인 대시보드 시작`);
  console.log(`  3. ${C.cyan}npm run monitor${C.reset} — 에이전트 모니터 시작`);
  console.log(`  4. 대시보드에서 일감 게시 → 에이전트 자율 입찰 대기\n`);
}

main().catch((err) => {
  console.error(`\n${C.red}Error:${C.reset}`, err.message ?? err);
  process.exit(1);
});
