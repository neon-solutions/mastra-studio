import { defineConfig } from '@neon/config/v1';

function requireDeploySetting(name: 'MASTRA_MODEL' | 'MASTRA_STUDIO_TOKEN'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name} before running Neon CLI commands`);
  }
  return value;
}

export default defineConfig({
  preview: {
    aiGateway: true,
    buckets: {
      'mastra-studio': { access: 'public_read' },
    },
    functions: {
      studio: {
        name: 'Mastra Studio',
        source: 'src/index.ts',
        dev: { port: 8787 },
        env: {
          MASTRA_MODEL: requireDeploySetting('MASTRA_MODEL'),
          MASTRA_STUDIO_TOKEN: requireDeploySetting('MASTRA_STUDIO_TOKEN'),
        },
      },
    },
  },
});
