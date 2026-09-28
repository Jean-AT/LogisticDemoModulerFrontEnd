import { emptyState, errorState, idleState, isEmptyData, loadingState, successState } from './load-state';
import { normalizeApiError } from './api-error';

describe('load-state helpers', () => {
  it('creates explicit remote states', () => {
    const error = normalizeApiError(new Error('falló'));

    expect(idleState().status).toBe('idle');
    expect(loadingState(['prev']).data).toEqual(['prev']);
    expect(successState([1]).status).toBe('success');
    expect(emptyState([]).status).toBe('empty');
    expect(errorState(error).error).toBe(error);
  });

  it('detects empty arrays and page responses', () => {
    expect(isEmptyData([])).toBe(true);
    expect(isEmptyData({ content: [] })).toBe(true);
    expect(isEmptyData({ content: [1] })).toBe(false);
    expect(isEmptyData(['x'])).toBe(false);
  });
});
