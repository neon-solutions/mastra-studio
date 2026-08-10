import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { configureStudioHtml, STUDIO_BUCKET } from '../src/studio-assets';
import { requireEnv } from '../src/env';

const studioDirectory = join(import.meta.dir, '..', 'node_modules', 'mastra', 'dist', 'studio');

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat().sort();
}

function cacheControl(key: string): string {
  if (key === 'index.html') {
    return 'no-cache';
  }
  return key.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
}

const client = new S3Client({
  endpoint: requireEnv('AWS_ENDPOINT_URL_S3'),
  region: requireEnv('AWS_REGION'),
  credentials: {
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

const files = await listFiles(studioDirectory);
for (const path of files) {
  const file = Bun.file(path);
  const key = relative(studioDirectory, path).split('\\').join('/');
  const body =
    key === 'index.html'
      ? new TextEncoder().encode(configureStudioHtml(await file.text()))
      : await file.bytes();

  await client.send(
    new PutObjectCommand({
      Bucket: STUDIO_BUCKET,
      Key: key,
      Body: body,
      CacheControl: cacheControl(key),
      ContentType: file.type || 'application/octet-stream',
    }),
  );
}

console.log(`Uploaded ${files.length} Mastra Studio assets.`);
