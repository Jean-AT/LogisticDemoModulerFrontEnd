import { ApiError } from './api-error';

export type LoadState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'empty'; data: T | null; error: null }
  | { status: 'error'; data: T | null; error: ApiError };

export const idleState = <T>(): LoadState<T> => ({ status: 'idle', data: null, error: null });
export const loadingState = <T>(data: T | null = null): LoadState<T> => ({ status: 'loading', data, error: null });
export const successState = <T>(data: T): LoadState<T> => ({ status: 'success', data, error: null });
export const emptyState = <T>(data: T | null = null): LoadState<T> => ({ status: 'empty', data, error: null });
export const errorState = <T>(error: ApiError, data: T | null = null): LoadState<T> => ({ status: 'error', data, error });

export function isEmptyData(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  if (isPageLike(data)) return data.content.length === 0;
  return data === null || data === undefined;
}

function isPageLike(value: unknown): value is { content: unknown[] } {
  return typeof value === 'object' && value !== null && Array.isArray((value as { content?: unknown }).content);
}
