import { createTool } from '@mastra/core/tools';
import type { DbClient } from '@mastra/pg';
import { z } from 'zod';

const emptyInputSchema = z.object({});
const timestampOutputSchema = z.object({
  timestamp: z.string(),
});

export function createTools(db: DbClient) {
  const calculate = createTool({
    id: 'calculate',
    description: 'Perform basic arithmetic on two numbers.',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    }),
    outputSchema: z.object({
      result: z.number(),
    }),
    strict: true,
    execute: async ({ operation, a, b }) => {
      if (operation === 'divide' && b === 0) {
        throw new Error('Cannot divide by zero');
      }

      const operations = {
        add: () => a + b,
        subtract: () => a - b,
        multiply: () => a * b,
        divide: () => a / b,
      };

      return { result: operations[operation]() };
    },
  });

  const getCurrentTime = createTool({
    id: 'get-current-time',
    description: 'Return the current time from the Neon Function runtime.',
    inputSchema: emptyInputSchema,
    outputSchema: timestampOutputSchema,
    strict: true,
    execute: async () => ({ timestamp: new Date().toISOString() }),
  });

  const getDatabaseTime = createTool({
    id: 'get-database-time',
    description: 'Return the current time from Neon Postgres.',
    inputSchema: emptyInputSchema,
    outputSchema: timestampOutputSchema,
    strict: true,
    execute: async () => {
      const row = await db.one<{ timestamp: Date }>('SELECT now() AS timestamp');
      return { timestamp: row.timestamp.toISOString() };
    },
  });

  return {
    calculate,
    'get-current-time': getCurrentTime,
    'get-database-time': getDatabaseTime,
  };
}
