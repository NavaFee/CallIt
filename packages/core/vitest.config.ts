import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Chain integration tests hit Sui testnet and need a funded wallet;
    // they are opt-in via RUN_CHAIN_TESTS=1 (see test/chain.integration.test.ts).
    testTimeout: 120_000,
  },
});
