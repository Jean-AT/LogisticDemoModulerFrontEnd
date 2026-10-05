import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { Almacen, Item, Proveedor } from '../models';

@Injectable({ providedIn: 'root' })
export class MaestrosService {
  private readonly api = inject(ApiClient);

  getItems(): Observable<Item[]> {
    return this.api.get<Item[]>('/items');
  }

  createItem(payload: { code: string; name: string; unitMeasure: string }): Observable<Item> {
    return this.api.post<Item>('/items', payload);
  }

  getAlmacenes(): Observable<Almacen[]> {
    return this.api.get<Almacen[]>('/almacenes');
  }

  createAlmacen(payload: { code: string; name: string }): Observable<Almacen> {
    return this.api.post<Almacen>('/almacenes', payload);
  }

  getProveedores(): Observable<Proveedor[]> {
    return this.api.get<Proveedor[]>('/proveedores');
  }

  createProveedor(payload: { code: string; name: string }): Observable<Proveedor> {
    return this.api.post<Proveedor>('/proveedores', payload);
  }
}
