import 'dotenv/config';
import Ain from '../src/ain-import.js';
import { AgentIdentity } from '../src/base-chain/identity.js';
import { loadConfig } from '../src/config.js';

const SEED_TOPICS = [
  { path: 'ai/transformers', title: 'Transformer Architecture', description: 'Neural network architecture based on self-attention mechanism' },
  { path: 'ai/reinforcement-learning', title: 'Reinforcement Learning', description: 'Learning paradigm through environment interaction and rewards' },
  { path: 'crypto/consensus', title: 'Consensus Mechanisms', description: 'Distributed agreement protocols for blockchain networks' },
  { path: 'crypto/defi', title: 'Decentralized Finance', description: 'Financial instruments built on blockchain technology' },
  { path: 'math/category-theory', title: 'Category Theory', description: 'Abstract mathematical theory of structures and relationships' },
];

async function main() {
  const config = loadConfig();

  console.log('=== Cogito Node Registration ===\n');

  // 1. Register ERC-8004 identity on Base
  console.log('1. Registering ERC-8004 identity on Base...');
  const identity = new AgentIdentity(config.baseRpcUrl, config.ainPrivateKey);

  const isRegistered = await identity.isRegistered();
  if (isRegistered) {
    console.log('   Already registered!');
    const info = await identity.getIdentity();
    console.log(`   Name: ${info.name}`);
    console.log(`   Endpoint: ${info.serviceEndpoint}`);
  } else {
    const serviceEndpoint = `http://localhost:${config.x402Port}`;
    const txHash = await identity.register(config.agentName, serviceEndpoint);
    console.log(`   Registered! tx: ${txHash}`);
  }

  // 2. Setup AIN Knowledge app
  console.log('\n2. Setting up AIN Knowledge app...');
  const ain = new Ain(config.ainProviderUrl, config.ainWsUrl);
  const ainAddress = ain.wallet.addAndSetDefaultAccount(config.ainPrivateKey);
  console.log(`   AIN address: ${ainAddress}`);

  try {
    await ain.knowledge.setupApp({ address: ainAddress });
    console.log('   Knowledge app setup complete.');
  } catch (err: any) {
    console.log(`   Setup skipped (may exist): ${err.message}`);
  }

  // 3. Register initial topics
  console.log('\n3. Registering seed topics...');
  for (const topic of SEED_TOPICS) {
    try {
      await ain.knowledge.registerTopic(topic.path, {
        title: topic.title,
        description: topic.description,
      });
      console.log(`   Registered: ${topic.path}`);
    } catch (err: any) {
      console.log(`   Skipped ${topic.path}: ${err.message}`);
    }
  }

  // 4. Summary
  console.log('\n=== Registration Complete ===');
  console.log(`AIN Address:  ${ainAddress}`);
  console.log(`Base Address: ${identity.getAddress()}`);
  console.log(`Agent Name:   ${config.agentName}`);
  console.log(`x402 Port:    ${config.x402Port}`);
}

main().catch((err) => {
  console.error('Registration failed:', err);
  process.exit(1);
});
