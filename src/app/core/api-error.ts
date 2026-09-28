import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not-found'
  | 'conflict'
  | 'server'
  | 'network'
  | 'timeout'
  | 'unknown';

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiError {
  kind: ApiErrorKind;
  status: number | null;
  title: string;
  detail: string;
  code?: string;
  traceId?: string;
  fields: ApiFieldError[];
  retryable: boolean;
  raw: unknown;
}

interface ProblemLike {
  title?: unknown;
  detail?: unknown;
  message?: unknown;
  code?: unknown;
  traceId?: unknown;
  status?: unknown;
  details?: unknown;
  errors?: unknown;
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiErrorWrapper) {
    return error.apiError;
  }

  if (error instanceof HttpErrorResponse) {
    return normalizeHttpError(error);
  }

  if (isTimeoutLike(error)) {
    return buildApiError({
      kind: 'timeout',
      status: null,
      title: 'Tiempo de espera agotado',
      detail: 'La consulta tardó más de lo esperado.',
      retryable: true,
      raw: error,
    });
  }

  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  return buildApiError({
    kind: 'unknown',
    status: null,
    title: 'Error inesperado',
    detail: message,
    retryable: false,
    raw: error,
  });
}

export class ApiErrorWrapper extends Error {
  constructor(readonly apiError: ApiError) {
    super(apiError.detail);
    this.name = 'ApiErrorWrapper';
  }
}

function normalizeHttpError(error: HttpErrorResponse): ApiError {
  if (error.status === 0) {
    return buildApiError({
      kind: 'network',
      status: null,
      title: 'Sin conexión',
      detail: 'No se pudo conectar con el servidor.',
      retryable: true,
      raw: error,
    });
  }

  const body = readProblemBody(error.error);
  const status = typeof body.status === 'number' ? body.status : error.status;
  const detail = asString(body.detail) ?? asString(body.message) ?? error.message ?? fallbackDetail(status);
  const title = asString(body.title) ?? fallbackTitle(status);

  return buildApiError({
    kind: kindForStatus(status),
    status,
    title,
    detail,
    code: asString(body.code),
    traceId: asString(body.traceId),
    fields: readFieldErrors(body.details ?? body.errors),
    retryable: status >= 500 || status === 408 || status === 429,
    raw: error,
  });
}

function buildApiError(error: Omit<ApiError, 'fields'> & { fields?: ApiFieldError[] }): ApiError {
  return {
    ...error,
    fields: error.fields ?? [],
  };
}

function readProblemBody(body: unknown): ProblemLike {
  if (isRecord(body)) {
    return body;
  }
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return isRecord(parsed) ? parsed : { detail: body };
    } catch {
      return { detail: body };
    }
  }
  return {};
}

function readFieldErrors(details: unknown): ApiFieldError[] {
  if (Array.isArray(details)) {
    return details
      .map((item) => {
        if (!isRecord(item)) return null;
        const field = asString(item['field'] ?? item['name'] ?? item['property']);
        const message = asString(item['message'] ?? item['detail'] ?? item['reason']);
        return field && message ? { field, message } : null;
      })
      .filter((item): item is ApiFieldError => item !== null);
  }

  if (isRecord(details)) {
    return Object.entries(details)
      .map(([field, value]) => ({ field, message: Array.isArray(value) ? value.join(', ') : String(value) }))
      .filter((item) => item.message.length > 0);
  }

  return [];
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  if (status === 408) return 'timeout';
  return 'unknown';
}

function fallbackTitle(status: number): string {
  if (status === 401) return 'Sesión vencida';
  if (status === 403) return 'Acceso denegado';
  if (status === 404) return 'No encontrado';
  if (status === 409) return 'Regla de negocio';
  if (status >= 500) return 'Error del servidor';
  return 'No se pudo completar la operación';
}

function fallbackDetail(status: number): string {
  if (status === 401) return 'Inicia sesión nuevamente para continuar.';
  if (status === 403) return 'No tienes permiso para esta acción.';
  if (status === 404) return 'El recurso solicitado no existe o ya no está disponible.';
  if (status === 409) return 'La operación no cumple una regla de negocio vigente.';
  if (status >= 500) return 'Intenta nuevamente o contacta a soporte con el código de seguimiento.';
  return 'Revisa la información enviada e intenta nuevamente.';
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimeoutLike(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.message.toLowerCase().includes('timeout'));
}
