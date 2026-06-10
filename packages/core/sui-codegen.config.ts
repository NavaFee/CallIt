import type { SuiCodegenConfig } from '@mysten/codegen';

/**
 * Generates typed Move bindings for DeepBook Predict directly from the
 * deployed testnet package, so the bindings always match the live bytecode.
 * Regenerate with `pnpm codegen` after a protocol redeploy (update the
 * package ID here and in src/config.ts).
 */
const config: SuiCodegenConfig = {
  output: './src/generated',
  packages: [
    {
      package: '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138',
      packageName: 'deepbook_predict',
      network: 'testnet',
    },
  ],
};

export default config;
