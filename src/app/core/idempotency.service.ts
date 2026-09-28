import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IdempotencyService {
  createKey(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
