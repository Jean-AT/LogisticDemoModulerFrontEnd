import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { AprobacionDecisionRequest, Page, PdfHeaderData, Requerimiento } from '../models';
import { buildHeaderParams } from '../utils';

@Injectable({ providedIn: 'root' })
export class AprobacionesService {
  private readonly api = inject(ApiClient);

  list(filtros?: {
    id?: number;
    estado?: string;
    numero?: string;
    proveedorId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    size?: number;
  }): Observable<Page<Requerimiento>> {
    return this.api.get<Page<Requerimiento>>('/aprobaciones', {
      params: {
        id: filtros?.id,
        estado: filtros?.estado,
        numero: filtros?.numero,
        proveedorId: filtros?.proveedorId,
        fechaDesde: filtros?.fechaDesde,
        fechaHasta: filtros?.fechaHasta,
        page: filtros?.page,
        size: filtros?.size,
      },
    });
  }

  aprobar(id: number, request?: AprobacionDecisionRequest): Observable<Requerimiento> {
    return this.api.post<Requerimiento>(`/aprobaciones/${id}/aprobar`, request ?? {});
  }

  observar(id: number, request: AprobacionDecisionRequest): Observable<Requerimiento> {
    return this.api.post<Requerimiento>(`/aprobaciones/${id}/observar`, request);
  }

  rechazar(id: number, request: AprobacionDecisionRequest): Observable<Requerimiento> {
    return this.api.post<Requerimiento>(`/aprobaciones/${id}/rechazar`, request);
  }

  downloadPdf(id: number, header: PdfHeaderData): Observable<Blob> {
    return this.api.download(`/aprobaciones/${id}/pdf`, { params: buildHeaderParams(header) });
  }
}
