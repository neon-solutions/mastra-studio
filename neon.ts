import { defineConfig } from '@neon/config/v1';

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
        env: {
          MASTRA_MODEL: process.env.MASTRA_MODEL ?? '',
          MASTRA_STUDIO_TOKEN: process.env.MASTRA_STUDIO_TOKEN ?? '',
        },
      },
    },
  },
});
