const STUDIO_VALUES: Readonly<Record<string, string>> = {
  MASTRA_AGENT_SIGNALS: 'false',
  MASTRA_API_PREFIX: '/api',
  MASTRA_AUTO_DETECT_URL: 'true',
  MASTRA_CLOUD_API_ENDPOINT: '',
  MASTRA_EXPERIMENTAL_FEATURES: 'false',
  MASTRA_EXPERIMENTAL_UI: 'false',
  MASTRA_HIDE_CLOUD_CTA: 'true',
  MASTRA_ORGANIZATION_ID: '',
  MASTRA_PLATFORM_OBSERVABILITY_ENDPOINT: '',
  MASTRA_PLATFORM_PROJECT_ID: '',
  MASTRA_REQUEST_CONTEXT_PRESETS: '',
  MASTRA_SERVER_HOST: '',
  MASTRA_SERVER_PORT: '',
  MASTRA_SERVER_PROTOCOL: '',
  MASTRA_SIGNALS_UI: 'false',
  MASTRA_STUDIO_BASE_PATH: '',
  MASTRA_TELEMETRY_DISABLED: 'true',
  MASTRA_TEMPLATES: 'false',
};

const PLACEHOLDER = /%%([A-Z0-9_]+)%%/g;

export const STUDIO_BUCKET = 'mastra-studio';

export function configureStudioHtml(template: string): string {
  const configured = template.replaceAll(PLACEHOLDER, (_placeholder, key: string) => {
    const value = STUDIO_VALUES[key];
    if (value === undefined) {
      throw new Error(`Unsupported Mastra Studio placeholder: ${key}`);
    }
    return value;
  });

  if (PLACEHOLDER.test(configured)) {
    throw new Error('Mastra Studio HTML contains unresolved placeholders');
  }

  return configured;
}

export type StudioAsset =
  | { type: 'asset'; key: string }
  | { type: 'index' }
  | { type: 'not-found' }
  | { type: 'invalid' };

export function resolveStudioAsset(pathname: string, accept: string | undefined): StudioAsset {
  if (pathname === '/') {
    return { type: 'index' };
  }

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return { type: 'not-found' };
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { type: 'invalid' };
  }

  const segments = decoded.split('/').filter(Boolean);
  if (decoded.includes('\\') || segments.some((segment) => segment === '.' || segment === '..')) {
    return { type: 'invalid' };
  }

  const key = segments.join('/');
  if (key.includes('.')) {
    return { type: 'asset', key };
  }

  return accept?.includes('text/html') ? { type: 'index' } : { type: 'not-found' };
}

export function publicObjectUrl(endpoint: string, key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${endpoint.replace(/\/$/, '')}/${STUDIO_BUCKET}/${encodedKey}`;
}
