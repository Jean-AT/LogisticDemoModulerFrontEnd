import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { getLegacyApiBaseUrl } from '../api.config';
import { Dashboard } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly base = `${getLegacyApiBaseUrl()}/dashboard`;

  constructor(private readonly http: HttpClient) {}

  resumen(): Observable<Dashboard> {
    return this.http.get<Dashboard>(this.base);
  }
}
