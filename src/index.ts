import { Hono } from 'hono';
import { MastraServer, type HonoBindings, type HonoVariables } from '@mastra/hono';
import { requireEnv } from './env';
import { auth, mastra } from './mastra';
import { publicObjectUrl, resolveStudioAsset } from './studio-assets';

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();
const storageEndpoint = requireEnv('AWS_ENDPOINT_URL_S3');

app.get('/health', (context) => context.json({ status: 'ok' }));
app.get('/refresh-events', async (context) => {
  const user = await auth.getCurrentUser(context.req.raw);
  if (!user) {
    return context.json({ error: 'Unauthorized' }, 401);
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'));
      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30_000);

      context.req.raw.signal.addEventListener(
        'abort',
        () => {
          if (heartbeat) clearInterval(heartbeat);
          if (!closed) {
            closed = true;
            controller.close();
          }
        },
        { once: true },
      );
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      closed = true;
    },
  });

  return new Response(body, {
    headers: {
      'cache-control': 'no-cache, no-transform',
      'content-type': 'text/event-stream',
      'x-refresh-mode': 'stream',
    },
  });
});

const server = new MastraServer({ app, mastra });
await server.init();

mastra.loggerVNext.info('Mastra Studio ready', {
  runtime: 'neon-functions',
});
await mastra.observability.flush();

process.once('SIGINT', () => {
  void (async () => {
    try {
      await mastra.observability.flush();
      await mastra.shutdown();
      process.exit(0);
    } catch (error) {
      console.error('Mastra Studio shutdown failed', error);
      process.exit(1);
    }
  })();
});

app.all('/api', (context) => context.json({ error: 'Not found' }, 404));
app.all('/api/*', (context) => context.json({ error: 'Not found' }, 404));

app.all('*', async (context) => {
  if (context.req.method !== 'GET' && context.req.method !== 'HEAD') {
    return context.text('Method not allowed', 405);
  }

  const asset = resolveStudioAsset(context.req.path, context.req.header('accept'));
  if (asset.type === 'invalid') {
    return context.text('Invalid path', 400);
  }
  if (asset.type === 'not-found') {
    return context.text('Not found', 404);
  }

  const key = asset.type === 'index' ? 'index.html' : asset.key;
  let upstream: Response;
  try {
    upstream = await fetch(publicObjectUrl(storageEndpoint, key), {
      method: context.req.method,
    });
  } catch (error) {
    mastra.loggerVNext.error('Studio asset fetch failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return context.text('Studio assets unavailable', 502);
  }

  if (!upstream.ok) {
    if (upstream.status === 404 && asset.type === 'asset') {
      return context.text('Not found', 404);
    }
    return context.text('Studio assets unavailable', 502);
  }

  const headers = new Headers();
  for (const name of ['cache-control', 'content-length', 'content-type', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  headers.set('x-content-type-options', 'nosniff');

  return new Response(context.req.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
});

export default app;
