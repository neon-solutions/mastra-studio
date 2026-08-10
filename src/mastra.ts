import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { SimpleAuth } from '@mastra/core/server';
import { Memory } from '@mastra/memory';
import { Observability, MastraStorageExporter } from '@mastra/observability';
import { PostgresStoreVNext } from '@mastra/pg';
import { requireEnv } from './env';
import { createTools } from './tools';

const connectionString = requireEnv('DATABASE_URL');
const storage = new PostgresStoreVNext({
  id: 'mastra-studio',
  connectionString,
  max: 3,
  observability: {
    connectionString,
    max: 2,
    schemaName: 'mastra_observability',
  },
});

const tools = createTools(storage.db);

const memory = new Memory({
  storage,
  options: {
    lastMessages: 20,
    workingMemory: {
      enabled: true,
      scope: 'resource',
      template: `# User profile
- Name:
- Location:
- Current project:
- Preferences:
`,
    },
  },
});

const assistant = new Agent({
  id: 'neon-assistant',
  name: 'Neon assistant',
  instructions:
    'You are a concise assistant. Remember durable user details when they are provided and use them in later conversations.',
  model: requireEnv('MASTRA_MODEL'),
  memory,
  tools,
});

const token = requireEnv('MASTRA_STUDIO_TOKEN');
export const auth = new SimpleAuth({
  tokens: {
    [token]: {
      id: 'studio-admin',
      name: 'Studio admin',
      role: 'admin',
    },
  },
});

export const mastra = new Mastra({
  agents: { assistant },
  environment: 'production',
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra-studio',
        exporters: [new MastraStorageExporter({ maxBatchSize: 1 })],
        logging: {
          enabled: true,
          level: 'info',
        },
      },
    },
  }),
  storage,
  tools,
  server: { auth },
  studio: { auth },
});
