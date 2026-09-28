const DEPLOYED_API_ORIGIN = 'https://logistica-demo-api.onrender.com';

export const API_V1_PATH = '/api/v1';
export const LEGACY_API_PATH = '/api';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
    return API_V1_PATH;
  }
  return `${DEPLOYED_API_ORIGIN}${API_V1_PATH}`;
}

export function getLegacyApiBaseUrl(): string {
  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
    return LEGACY_API_PATH;
  }
  return `${DEPLOYED_API_ORIGIN}${LEGACY_API_PATH}`;
}

export function isApiRequest(url: string): boolean {
  return matchesPath(url, LEGACY_API_PATH) || matchesPath(url, `${DEPLOYED_API_ORIGIN}${LEGACY_API_PATH}`);
}

export function isLoginRequest(url: string): boolean {
  return url.endsWith('/auth/login');
}

function matchesPath(url: string, path: string): boolean {
  return url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`);
}
