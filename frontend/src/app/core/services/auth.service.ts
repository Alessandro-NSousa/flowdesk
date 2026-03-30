import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { TokenPair, ChangePasswordPayload } from '../models';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  user_id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  must_change_password: boolean;
  can_assign_tickets: boolean;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly API = `${environment.apiUrl}/auth`;

  login(email: string, password: string): Observable<TokenPair> {
    return this.http.post<TokenPair>(`${this.API}/token/`, { email, password }).pipe(
      tap((tokens) => this.saveTokens(tokens))
    );
  }

  refreshToken(): Observable<TokenPair> {
    const refresh = localStorage.getItem('refresh_token');
    return this.http
      .post<TokenPair>(`${this.API}/token/refresh/`, { refresh })
      .pipe(tap((tokens) => this.saveTokens(tokens)));
  }

  logout(): void {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      this.http.post(`${this.API}/token/logout/`, { refresh }).subscribe();
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    try {
      const payload = jwtDecode<JwtPayload>(token);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  mustChangePassword(): boolean {
    return this.getCurrentUser()?.must_change_password ?? false;
  }

  getCurrentUser(): Partial<JwtPayload> | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.is_admin ?? false;
  }

  canAssignTickets(): boolean {
    return this.getCurrentUser()?.can_assign_tickets ?? false;
  }

  changePassword(payload: ChangePasswordPayload): Observable<unknown> {
    return this.http.post(`${this.API}/password/change/`, payload);
  }

  acceptInvite(token: string, password: string, firstName: string, lastName: string): Observable<unknown> {
    return this.http.post(`${this.API}/accept-invite/`, {
      token,
      password,
      first_name: firstName,
      last_name: lastName,
    });
  }

  requestPasswordReset(email: string): Observable<unknown> {
    return this.http.post(`${this.API}/password-reset/`, { email });
  }

  confirmPasswordReset(token: string, newPassword: string): Observable<unknown> {
    return this.http.post(`${this.API}/password-reset/confirm/`, { token, new_password: newPassword });
  }

  private saveTokens(tokens: TokenPair): void {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
  }
}
