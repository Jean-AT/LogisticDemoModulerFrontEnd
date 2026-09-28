import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ApiError, normalizeApiError } from './api-error';

const DEFAULT_DURATION_MS = 4500;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snack = inject(MatSnackBar);
  private lastMessage = '';
  private lastShownAt = 0;

  success(message: string): void {
    this.open(message, 'success', { duration: DEFAULT_DURATION_MS });
  }

  info(message: string): void {
    this.open(message, 'info', { duration: DEFAULT_DURATION_MS });
  }

  error(error: unknown): ApiError {
    const apiError = normalizeApiError(error);
    const detail = apiError.traceId ? `${apiError.detail} Código de seguimiento: ${apiError.traceId}` : apiError.detail;
    this.open(detail, 'error', { duration: apiError.kind === 'server' ? 8000 : DEFAULT_DURATION_MS });
    return apiError;
  }

  private open(message: string, panelClass: 'success' | 'info' | 'error', config: MatSnackBarConfig = {}): void {
    const now = Date.now();
    if (message === this.lastMessage && now - this.lastShownAt < 1200) {
      return;
    }
    this.lastMessage = message;
    this.lastShownAt = now;
    this.snack.open(message, 'Cerrar', {
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: [`toast-${panelClass}`],
      ...config,
    });
  }
}
