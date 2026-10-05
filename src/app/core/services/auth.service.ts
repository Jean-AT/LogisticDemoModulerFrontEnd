import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { getLegacyApiBaseUrl } from '../api.config';
import { LoginResponse, UserRole, Usuario } from '../models';
import { SessionService } from '../session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${getLegacyApiBaseUrl()}/auth`;

  constructor(
    private readonly http: HttpClient,
    private readonly session: SessionService,
  ) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<unknown>(`${this.base}/login`, { username, password })
      .pipe(map((response) => normalizeLoginResponse(response, username)));
  }

  currentUser(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.base}/me`);
  }

  logout(): void {
    this.session.logout();
  }
}

function normalizeLoginResponse(response: unknown, username: string): LoginResponse {
  const record = asRecord(response);
  const token = readString(record['token'] ?? record['accessToken'] ?? record['access_token'] ?? record['jwt']);
  if (!token) {
    throw new Error('La respuesta de login no incluye token de acceso.');
  }

  return {
    token,
    tokenType: readString(record['tokenType'] ?? record['token_type']) ?? 'Bearer',
    user: readUser(record['user'], token, username),
  };
}

function readUser(value: unknown, token: string, fallbackUsername: string): Usuario {
  const user = asRecord(value);
  const claims = decodeJwtPayload(token);
  const username = readString(user['username'] ?? claims['username'] ?? claims['preferred_username'] ?? claims['sub']) ?? fallbackUsername;
  return {
    id: readNumber(user['id'] ?? claims['id'] ?? claims['userId']) ?? 0,
    username,
    fullName: readString(user['fullName'] ?? user['name'] ?? claims['fullName'] ?? claims['name']) ?? username,
    role: readRole(user['role'] ?? user['roles'] ?? claims['role'] ?? claims['roles'] ?? claims['authorities'] ?? claims['scope']),
    active: readBoolean(user['active'] ?? claims['active']) ?? true,
  };
}

function readRole(value: unknown): UserRole {
  const roles = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\s]+/)
      : [];
  const normalized = roles.map((role) => String(role).replace(/^ROLE_/, '').toUpperCase());
  return (normalized.find(isUserRole) as UserRole | undefined) ?? 'ADMIN';
}

function isUserRole(value: string): value is UserRole {
  return value === 'SOLICITANTE' || value === 'APROBADOR' || value === 'COMPRAS' || value === 'ADMIN';
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) return {};
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return asRecord(JSON.parse(atob(padded)));
  } catch {
    return {};
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
