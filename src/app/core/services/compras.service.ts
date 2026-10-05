import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../api-client.service';
import { buildHeaderParams } from '../utils';
import {
  CotizacionAdjudicarRequest,
  CotizacionOfertaRequest,
  CotizacionOperacionResult,
  CotizacionProceso,
  Moneda,
  OrdenCompra,
  Page,
  PdfHeaderData,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly api = inject(ApiClient);

  abrirCotizacion(requerimientoId: number): Observable<CotizacionOperacionResult> {
    return this.api
      .post<unknown>(`/cotizaciones/procesos/requerimientos/${requerimientoId}`, {})
      .pipe(map((raw) => toCotizacionResult(raw)));
  }

  getCotizacion(procesoId: number): Observable<CotizacionProceso> {
    return this.api.get<unknown>(`/cotizaciones/procesos/${procesoId}`).pipe(map((raw) => toCotizacionProceso(raw)));
  }

  registrarOferta(procesoId: number, request: CotizacionOfertaRequest): Observable<CotizacionOperacionResult> {
    return this.api
      .post<unknown>(`/cotizaciones/procesos/${procesoId}/ofertas`, request)
      .pipe(map((raw) => toCotizacionResult(raw)));
  }

  cerrarCotizacion(procesoId: number): Observable<CotizacionOperacionResult> {
    return this.api
      .post<unknown>(`/cotizaciones/procesos/${procesoId}/cerrar`, {})
      .pipe(map((raw) => toCotizacionResult(raw)));
  }

  adjudicarCotizacion(procesoId: number, request: CotizacionAdjudicarRequest): Observable<CotizacionOperacionResult> {
    return this.api
      .post<unknown>(`/cotizaciones/procesos/${procesoId}/adjudicar`, request)
      .pipe(map((raw) => toCotizacionResult(raw)));
  }

  generarDesdeRequerimiento(requerimientoId: number): Observable<OrdenCompra> {
    return this.api.post<OrdenCompra>(`/ordenes-compra/desde-requerimiento/${requerimientoId}`, {});
  }

  generarDesdeAdjudicacion(adjudicacionId: number): Observable<OrdenCompra> {
    return this.api.post<OrdenCompra>(`/ordenes-compra/desde-adjudicacion/${adjudicacionId}`, {});
  }

  aprobarOrden(id: number): Observable<OrdenCompra> {
    return this.api.post<OrdenCompra>(`/ordenes-compra/${id}/aprobar`, {});
  }

  list(filtros?: {
    numero?: string;
    proveedorId?: number;
    moneda?: Moneda;
    requerimientoId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    size?: number;
  }): Observable<Page<OrdenCompra>> {
    return this.api.get<Page<OrdenCompra>>('/ordenes-compra', { params: filtros });
  }

  getById(id: number): Observable<OrdenCompra> {
    return this.api.get<OrdenCompra>(`/ordenes-compra/${id}`);
  }

  downloadPdf(id: number, header: PdfHeaderData): Observable<Blob> {
    return this.api.download(`/ordenes-compra/${id}/pdf`, { params: buildHeaderParams(header) });
  }
}

function toCotizacionProceso(raw: unknown): CotizacionProceso {
  const record = asRecord(raw);
  return {
    id: readNumber(record['id'] ?? record['procesoId']) ?? 0,
    requerimientoId: readNumber(record['requerimientoId']),
    requerimientoNumero: readString(record['requerimientoNumero'] ?? record['numeroRequerimiento']),
    status: readString(record['status'] ?? record['estado']),
    ofertas: Array.isArray(record['ofertas']) ? record['ofertas'] : [],
    raw,
  };
}

function toCotizacionResult(raw: unknown): CotizacionOperacionResult {
  const record = asRecord(raw);
  return {
    id: readNumber(record['id']),
    procesoId: readNumber(record['procesoId'] ?? record['processId'] ?? record['id']),
    adjudicacionId: readNumber(record['adjudicacionId'] ?? record['awardId'] ?? record['id']),
    status: readString(record['status'] ?? record['estado']),
    raw,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
