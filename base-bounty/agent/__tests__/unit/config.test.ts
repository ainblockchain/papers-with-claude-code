import { jest } from '@jest/globals';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Remove all config env vars so we start clean
    delete process.env.AIN_PRIVATE_KEY;
    delete process.env.BASE_PRIVATE_KEY;
    delete process.env.AIN_PROVIDER_URL;
    delete process.env.AIN_WS_URL;
    delete process.env.BASE_RPC_URL;
    delete process.env.BUILDER_CODE;
    delete process.env.AGENT_NAME;
    delete process.env.THINK_INTERVAL_MS;
    delete process.env.X402_PORT;
    delete process.env.X402_FACILITATOR_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function setRequiredEnv() {
    process.env.AIN_PRIVATE_KEY = '0xtest_ain_private_key';
    process.env.BASE_PRIVATE_KEY = '0xtest_base_private_key';
  }

  it('should load required env vars', () => {
    setRequiredEnv();
    const config = loadConfig();

    expect(config.ainPrivateKey).toBe('0xtest_ain_private_key');
    expect(config.basePrivateKey).toBe('0xtest_base_private_key');
  });

  it('should throw when AIN_PRIVATE_KEY is missing', () => {
    process.env.BASE_PRIVATE_KEY = '0xtest';
    expect(() => loadConfig()).toThrow('Missing required env var: AIN_PRIVATE_KEY');
  });

  it('should throw when BASE_PRIVATE_KEY is missing', () => {
    process.env.AIN_PRIVATE_KEY = '0xtest';
    expect(() => loadConfig()).toThrow('Missing required env var: BASE_PRIVATE_KEY');
  });

  it('should use default values for optional env vars', () => {
    setRequiredEnv();
    const config = loadConfig();

    expect(config.ainProviderUrl).toBe('http://localhost:8081');
    expect(config.ainWsUrl).toBe('ws://localhost:5100');
    expect(config.baseRpcUrl).toBe('https://mainnet.base.org');
    expect(config.builderCode).toBe('cogito_node');
    expect(config.x402FacilitatorUrl).toBe('https://facilitator.x402.org');
    expect(config.agentName).toBe('cogito-alpha');
    expect(config.thinkIntervalMs).toBe(60000);
    expect(config.x402Port).toBe(3402);
  });

  it('should use env vars when provided', () => {
    setRequiredEnv();
    process.env.AIN_PROVIDER_URL = 'http://custom:9999';
    process.env.AIN_WS_URL = 'ws://custom:5555';
    process.env.BASE_RPC_URL = 'https://custom-rpc.example.com';
    process.env.BUILDER_CODE = 'my_agent';
    process.env.AGENT_NAME = 'test-node';
    process.env.THINK_INTERVAL_MS = '30000';
    process.env.X402_PORT = '4000';

    const config = loadConfig();

    expect(config.ainProviderUrl).toBe('http://custom:9999');
    expect(config.ainWsUrl).toBe('ws://custom:5555');
    expect(config.baseRpcUrl).toBe('https://custom-rpc.example.com');
    expect(config.builderCode).toBe('my_agent');
    expect(config.agentName).toBe('test-node');
    expect(config.thinkIntervalMs).toBe(30000);
    expect(config.x402Port).toBe(4000);
  });

  it('should parse THINK_INTERVAL_MS as integer', () => {
    setRequiredEnv();
    process.env.THINK_INTERVAL_MS = '45000';

    const config = loadConfig();

    expect(config.thinkIntervalMs).toBe(45000);
    expect(typeof config.thinkIntervalMs).toBe('number');
  });
});
