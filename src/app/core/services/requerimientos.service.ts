import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { buildHeaderParams } from '../utils';
import {
  EstadoRequerimiento,
  OrdenCompraResumen,
  Page,
  PdfHeaderData,
  Requerimiento,
  RequerimientoCreateRequest,
  RequerimientoDesdeCuadroRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class RequerimientosService {
  private readonly api = inject(ApiClient);

  list(filtros?: {
    estado?: EstadoRequerimiento;
    numero?: string;
    proveedorId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    size?: number;
  }): Observable<Page<Requerimiento>> {
    return this.api.get<Page<Requerimiento>>('/requerimientos', { params: filtros });
  }

  getById(id: number): Observable<Requerimiento> {
    return this.api.get<Requerimiento>(`/requerimientos/${id}`);
  }

  create(request: RequerimientoCreateRequest): Observable<Requerimiento> {
    return this.api.post<Requerimiento>('/requerimientos', request);
  }

  createFromNeedsLine(request: RequerimientoDesdeCuadroRequest): Observable<Requerimiento> {
    return this.api.post<Requerimiento>('/requerimientos/desde-cuadro', request);
  }

  update(id: number, request: RequerimientoCreateRequest): Observable<Requerimiento> {
    return this.api.put<Requerimiento>(`/requerimientos/${id}`, request);
  }

  enviar(id: number): Observable<Requerimiento> {
    return this.api.post<Requerimiento>(`/requerimientos/${id}/enviar`, {});
  }

  downloadPdf(id: number, header: PdfHeaderData): Observable<Blob> {
    return this.api.download(`/requerimientos/${id}/pdf`, { params: buildHeaderParams(header) });
  }
}
