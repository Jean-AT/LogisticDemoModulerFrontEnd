import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { getApiBaseUrl } from '../api.config';
import { Dashboard } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly base = `${getApiBaseUrl()}/dashboard`;

  constructor(private readonly http: HttpClient) {}

  resumen(): Observable<Dashboard> {
    return this.http.get<Dashboard>(this.base);
  }
}
