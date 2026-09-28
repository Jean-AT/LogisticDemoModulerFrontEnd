import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { isApiRequest, isLoginRequest } from './api.config';
import { SessionService } from './session.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const session = inject(SessionService);
  const router = inject(Router);

  const token = session.token();
  const authReq = token && isApiRequest(req.url) && !isLoginRequest(req.url)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    tap({
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 && !isLoginRequest(req.url)) {
          session.logout();
          router.navigateByUrl('/login');
        }
      },
    }),
  );
};
