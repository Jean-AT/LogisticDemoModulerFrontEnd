import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorWrapper, normalizeApiError } from './api-error';

describe('normalizeApiError', () => {
  it('normalizes ProblemDetail payloads with field details and trace id', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        title: 'Solicitud inválida',
        detail: 'Hay campos inválidos.',
        code: 'VALIDATION_ERROR',
        traceId: 'trace-123',
        details: [{ field: 'monto', message: 'Debe ser mayor que cero' }],
      },
    });

    const normalized = normalizeApiError(error);

    expect(normalized.kind).toBe('validation');
    expect(normalized.status).toBe(400);
    expect(normalized.detail).toBe('Hay campos inválidos.');
    expect(normalized.code).toBe('VALIDATION_ERROR');
    expect(normalized.traceId).toBe('trace-123');
    expect(normalized.fields).toEqual([{ field: 'monto', message: 'Debe ser mayor que cero' }]);
    expect(normalized.retryable).toBe(false);
  });

  it('keeps business-rule conflicts readable', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { detail: 'Saldo insuficiente para la línea seleccionada.', code: 'BUSINESS_RULE_VIOLATION' },
    });

    const normalized = normalizeApiError(error);

    expect(normalized.kind).toBe('conflict');
    expect(normalized.detail).toBe('Saldo insuficiente para la línea seleccionada.');
    expect(normalized.code).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('normalizes network failures as retryable', () => {
    const normalized = normalizeApiError(new HttpErrorResponse({ status: 0 }));

    expect(normalized.kind).toBe('network');
    expect(normalized.status).toBeNull();
    expect(normalized.retryable).toBe(true);
  });

  it('does not wrap an already normalized API error twice', () => {
    const wrapped = new ApiErrorWrapper(normalizeApiError(new HttpErrorResponse({ status: 403 })));

    expect(normalizeApiError(wrapped)).toBe(wrapped.apiError);
  });
});
