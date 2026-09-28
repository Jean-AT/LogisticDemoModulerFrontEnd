import {
  API_V1_PATH,
  LEGACY_API_PATH,
  getApiBaseUrl,
  getLegacyApiBaseUrl,
  isApiRequest,
  isLoginRequest,
} from './api.config';

describe('API configuration', () => {
  it('uses V2 by default and retains an explicit legacy base', () => {
    expect(getApiBaseUrl()).toBe(API_V1_PATH);
    expect(getLegacyApiBaseUrl()).toBe(LEGACY_API_PATH);
  });

  it('recognizes V2 and legacy API requests without matching similar paths', () => {
    expect(isApiRequest('/api/v1/auth/me')).toBe(true);
    expect(isApiRequest('/api/requerimientos')).toBe(true);
    expect(isApiRequest('/apiary/example')).toBe(false);
    expect(isApiRequest('/assets/api.json')).toBe(false);
  });

  it('recognizes login requests independently of the API version', () => {
    expect(isLoginRequest('/api/v1/auth/login')).toBe(true);
    expect(isLoginRequest('/api/auth/login')).toBe(true);
    expect(isLoginRequest('/api/v1/auth/me')).toBe(false);
  });
});
