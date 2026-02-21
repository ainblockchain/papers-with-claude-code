// CLI demo — only sets up marketplace infrastructure; agents operate autonomously via OpenClaw cron
//
// This script creates infrastructure on Hedera testnet
// and prints agent startup instructions + web dashboard access info.
// It does not directly control agents (autonomous agent economy).
//
// Run: npm run demo                    (default: attention-is-all-you-need)
//      npm run demo -- bert            (select BERT paper)

import 'dotenv/config';
import {
  createContext,
  setupMarketplaceInfra,
  hashscanUrl,
} from './hedera/client.js';

// ── Terminal output ──

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

// ── Main ──

async function main() {
  const paperUrl = process.argv[2] || 'attention-is-all-you-need';
  const budget = 100;

  banner('Course Generation Marketplace — Autonomous Agent Economy');
  log('🏪', 'Mode: Autonomous Agents (HCS polling via OpenClaw cron)');
  log('📄', `Target Paper: ${paperUrl}`);
  log('💰', `Budget: ${budget} KNOW\n`);

  // ──────────────────────────────────────────
  // Step 1: Marketplace infrastructure setup
  // ──────────────────────────────────────────
  step(1, 'Connect to Hedera testnet & create marketplace infrastructure');

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
  // Step 2: Agent startup instructions
  // ──────────────────────────────────────────
  step(2, 'Start agents (register OpenClaw cron)');

  console.log(`
  Agents are not directly controlled by the server.
  Start agents in autonomous polling mode with the following command:

  ${C.bold}bash scripts/start-agents.sh${C.reset}

  Or register individually:

  ${C.dim}openclaw cron add --name "analyst-poll" --agent analyst --every 5s \\
    --message "Check HCS topic ${infra.topicId} for new work" --session isolated${C.reset}

  ${C.dim}openclaw cron add --name "architect-poll" --agent architect --every 5s \\
    --message "Check HCS topic ${infra.topicId} for new work" --session isolated${C.reset}

  ${C.dim}openclaw cron add --name "scholar-poll" --agent scholar --every 5s \\
    --message "Check HCS topic ${infra.topicId} for consultation requests" --session isolated${C.reset}
`);

  // ──────────────────────────────────────────
  // Step 3: Web dashboard instructions
  // ──────────────────────────────────────────
  step(3, 'Start web dashboard');

  console.log(`
  Run two separate web services:

  ${C.bold}1. Client Dashboard (port 4000)${C.reset}
     ${C.cyan}npm run web${C.reset}
     → Post tasks, approve bids, submit reviews

  ${C.bold}2. Agent Monitor (port 4001)${C.reset}
     ${C.cyan}npm run monitor${C.reset}
     → Real-time HCS feed observation, agent activity tracking
     → http://localhost:4001?topicId=${infra.topicId}&tokenId=${infra.tokenId}
`);

  // ── Summary ──
  banner('Infrastructure ready — agents are ready to autonomously poll HCS');

  console.log(`  ${C.bold}Verify on HashScan:${C.reset}\n`);
  link('  HCS Topic', hashscanUrl('topic', infra.topicId));
  link('  KNOW Token', hashscanUrl('token', infra.tokenId));
  link('  Escrow', hashscanUrl('account', infra.escrowAccount.accountId));
  link('  Analyst', hashscanUrl('account', infra.analystAccount.accountId));
  link('  Architect', hashscanUrl('account', infra.architectAccount.accountId));
  link('  Scholar', hashscanUrl('account', infra.scholarAccount.accountId));

  console.log(`\n  ${C.bold}Next steps:${C.reset}`);
  console.log(`  1. ${C.cyan}bash scripts/start-agents.sh${C.reset} — Register agent cron jobs`);
  console.log(`  2. ${C.cyan}npm run web${C.reset} — Start client dashboard`);
  console.log(`  3. ${C.cyan}npm run monitor${C.reset} — Start agent monitor`);
  console.log(`  4. Post a task from the dashboard → Wait for autonomous agent bids\n`);
}

main().catch((err) => {
  console.error(`\n${C.red}Error:${C.reset}`, err.message ?? err);
  process.exit(1);
});
