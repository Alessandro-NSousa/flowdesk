import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { User, CreateUserPayload, UpdateUserPayload, PaginatedResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/auth/users/`;

  list(): Observable<User[]> {
    return this.http.get<PaginatedResponse<User>>(this.API).pipe(map((res) => res.results));
  }

  listAvailable(): Observable<User[]> {
    return this.http.get<PaginatedResponse<User>>(this.API, { params: { available: 'true' } }).pipe(map((res) => res.results));
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.API, payload);
  }

  get(id: string): Observable<User> {
    return this.http.get<User>(`${this.API}${id}/`);
  }

  update(id: string, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`${this.API}${id}/`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}${id}/`);
  }
}
