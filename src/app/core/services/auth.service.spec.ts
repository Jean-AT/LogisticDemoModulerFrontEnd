import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { getLegacyApiBaseUrl } from '../api.config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('normalizes legacy token responses', () => {
    service.login('admin', 'demo123').subscribe((response) => {
      expect(response.token).toBe('legacy-token');
      expect(response.user.role).toBe('ADMIN');
    });

    const req = http.expectOne(`${getLegacyApiBaseUrl()}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({
      token: 'legacy-token',
      tokenType: 'Bearer',
      user: { id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN', active: true },
    });
  });

  it('normalizes V2 accessToken responses with roles', () => {
    service.login('aprobador', 'demo123').subscribe((response) => {
      expect(response.token).toBe('v2-token');
      expect(response.tokenType).toBe('Bearer');
      expect(response.user.username).toBe('aprobador');
      expect(response.user.role).toBe('APROBADOR');
    });

    const req = http.expectOne(`${getLegacyApiBaseUrl()}/auth/login`);
    expect(req.request.body).toEqual({ username: 'aprobador', password: 'demo123' });
    req.flush({
      accessToken: 'v2-token',
      user: { username: 'aprobador', roles: ['ROLE_APROBADOR'], active: true },
    });
  });
});
