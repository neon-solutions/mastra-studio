import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  configureStudioHtml,
  publicObjectUrl,
  resolveStudioAsset,
} from '../src/studio-assets';

describe('configureStudioHtml', () => {
  it('configures every placeholder in the installed Studio', () => {
    const template = readFileSync(
      join(import.meta.dirname, '..', 'node_modules', 'mastra', 'dist', 'studio', 'index.html'),
      'utf8',
    );

    const configured = configureStudioHtml(template);

    expect(configured).not.toContain('%%MASTRA_');
    expect(configured).toContain('<base href="/" />');
    expect(configured).toContain("window.MASTRA_AUTO_DETECT_URL = 'true'");
    expect(configured).toContain("window.MASTRA_API_PREFIX = '/api'");
  });

  it('fails when a Mastra upgrade adds an unknown placeholder', () => {
    expect(() => configureStudioHtml('%%MASTRA_NEW_SETTING%%')).toThrow(
      'Unsupported Mastra Studio placeholder: MASTRA_NEW_SETTING',
    );
  });
});

describe('resolveStudioAsset', () => {
  it('serves the index for root and browser navigation', () => {
    expect(resolveStudioAsset('/', 'text/html')).toEqual({ type: 'index' });
    expect(resolveStudioAsset('/agents/neon-assistant', 'text/html')).toEqual({ type: 'index' });
  });

  it('serves explicit assets without falling back', () => {
    expect(resolveStudioAsset('/assets/app.js', '*/*')).toEqual({
      type: 'asset',
      key: 'assets/app.js',
    });
  });

  it('keeps API misses and invalid paths out of the SPA', () => {
    expect(resolveStudioAsset('/api/missing', 'text/html')).toEqual({ type: 'not-found' });
    expect(resolveStudioAsset('/%2e%2e/secret', 'text/html')).toEqual({ type: 'invalid' });
  });
});

it('constructs a path-style public Object Storage URL', () => {
  expect(publicObjectUrl('https://storage.example/', 'assets/app file.js')).toBe(
    'https://storage.example/mastra-studio/assets/app%20file.js',
  );
});
