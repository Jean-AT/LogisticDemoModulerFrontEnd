const DEPLOYED_API_ORIGIN = 'https://logistica-demo-api.onrender.com';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
    return '/api';
  }
  return `${DEPLOYED_API_ORIGIN}/api`;
}

export function isApiRequest(url: string): boolean {
  return url.startsWith('/api') || url.startsWith(`${DEPLOYED_API_ORIGIN}/api`);
}
