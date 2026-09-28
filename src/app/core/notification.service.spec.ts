import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const snack = { open: vi.fn() };

  beforeEach(() => {
    snack.open.mockClear();
    TestBed.configureTestingModule({
      providers: [NotificationService, { provide: MatSnackBar, useValue: snack }],
    });
  });

  it('deduplicates repeated messages in a short window', () => {
    const service = TestBed.inject(NotificationService);

    service.success('Guardado');
    service.success('Guardado');

    expect(snack.open).toHaveBeenCalledTimes(1);
  });

  it('shows normalized API errors and returns them', () => {
    const service = TestBed.inject(NotificationService);
    const apiError = service.error(
      new HttpErrorResponse({ status: 500, error: { detail: 'Fallo controlado', traceId: 'trace-9' } }),
    );

    expect(apiError.kind).toBe('server');
    expect(snack.open).toHaveBeenCalledWith(
      'Fallo controlado Código de seguimiento: trace-9',
      'Cerrar',
      expect.objectContaining({ panelClass: ['toast-error'] }),
    );
  });
});
