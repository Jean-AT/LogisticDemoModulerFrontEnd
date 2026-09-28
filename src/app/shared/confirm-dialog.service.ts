import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean | string | null>(ConfirmDialogComponent, {
        width: 'min(420px, calc(100vw - 32px))',
        data,
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }

  askComment(data: Omit<ConfirmDialogData, 'showComentario'>): Observable<string | null> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean | string | null>(ConfirmDialogComponent, {
        width: 'min(420px, calc(100vw - 32px))',
        data: { ...data, showComentario: true },
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(map((result) => (typeof result === 'string' && result.trim().length > 0 ? result : null)));
  }
}
