import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError, timeout } from 'rxjs';
import { getApiBaseUrl } from './api.config';
import { ApiErrorWrapper, normalizeApiError } from './api-error';
import { PageResponse } from './models';

export interface ApiRequestOptions {
  params?: HttpParams | Record<string, string | number | boolean | null | undefined>;
  headers?: HttpHeaders | Record<string, string>;
  context?: HttpContext;
  timeoutMs?: number;
  idempotencyKey?: string;
  withCredentials?: boolean;
}

const DEFAULT_TIMEOUT_MS = 30000;

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = getApiBaseUrl();

  get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.withApiErrors(
      this.http.get<T>(this.url(path), {
        params: this.params(options.params),
        headers: this.headers(options),
        context: options.context,
        withCredentials: options.withCredentials,
      }),
      options.timeoutMs,
    );
  }

  getPage<T>(path: string, options: ApiRequestOptions = {}): Observable<PageResponse<T>> {
    return this.get<PageResponse<T>>(path, options);
  }

  post<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.withApiErrors(
      this.http.post<T>(this.url(path), body, {
        params: this.params(options.params),
        headers: this.headers(options),
        context: options.context,
        withCredentials: options.withCredentials,
      }),
      options.timeoutMs,
    );
  }

  put<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.withApiErrors(
      this.http.put<T>(this.url(path), body, {
        params: this.params(options.params),
        headers: this.headers(options),
        context: options.context,
        withCredentials: options.withCredentials,
      }),
      options.timeoutMs,
    );
  }

  delete<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.withApiErrors(
      this.http.delete<T>(this.url(path), {
        params: this.params(options.params),
        headers: this.headers(options),
        context: options.context,
        withCredentials: options.withCredentials,
      }),
      options.timeoutMs,
    );
  }

  download(path: string, options: ApiRequestOptions = {}): Observable<Blob> {
    return this.withApiErrors(
      this.http.get(this.url(path), {
        params: this.params(options.params),
        headers: this.headers(options),
        context: options.context,
        responseType: 'blob',
        withCredentials: options.withCredentials,
      }),
      options.timeoutMs,
    );
  }

  private url(path: string): string {
    return path.startsWith('/') ? `${this.baseUrl}${path}` : `${this.baseUrl}/${path}`;
  }

  private params(params: ApiRequestOptions['params']): HttpParams | undefined {
    if (!params || params instanceof HttpParams) {
      return params;
    }

    return Object.entries(params).reduce((next, [key, value]) => {
      if (value === null || value === undefined || value === '') {
        return next;
      }
      return next.set(key, String(value));
    }, new HttpParams());
  }

  private headers(options: ApiRequestOptions): HttpHeaders | undefined {
    let headers = options.headers instanceof HttpHeaders ? options.headers : new HttpHeaders(options.headers ?? {});
    if (options.idempotencyKey) {
      headers = headers.set('Idempotency-Key', options.idempotencyKey);
    }
    return headers.keys().length > 0 ? headers : undefined;
  }

  private withApiErrors<T>(request: Observable<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Observable<T> {
    return request.pipe(
      timeout({ first: timeoutMs }),
      catchError((error: unknown) => throwError(() => new ApiErrorWrapper(normalizeApiError(error)))),
    );
  }
}
