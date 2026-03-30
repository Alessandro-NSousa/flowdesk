import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PaginatedResponse, Ticket, TicketStatus } from '../models';

export interface TicketFilters {
  status?: string;
  requesting_sector?: string;
  responsible_sector?: string;
  created_after?: string;
  created_before?: string;
  search?: string;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/tickets`;

  getAll(filters: TicketFilters = {}): Observable<PaginatedResponse<Ticket>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PaginatedResponse<Ticket>>(this.BASE + '/', { params });
  }

  getById(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.BASE}/${id}/`);
  }

  create(data: {
    title: string;
    description: string;
    requesting_sector_id: string;
    responsible_sector_id: string;
    assigned_to_id?: string | null;
  }): Observable<Ticket> {
    return this.http.post<Ticket>(this.BASE + '/', data);
  }

  update(
    id: string,
    data: { title?: string; description?: string; status_id?: string; assigned_to_id?: string | null; observation?: string }
  ): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.BASE}/${id}/`, data);
  }

  assign(id: string, userId?: string): Observable<Ticket> {
    const body = userId ? { user_id: userId } : {};
    return this.http.post<Ticket>(`${this.BASE}/${id}/assign/`, body);
  }

  getStatuses(): Observable<PaginatedResponse<TicketStatus>> {
    return this.http.get<PaginatedResponse<TicketStatus>>(`${this.BASE}/statuses/`);
  }

  createStatus(data: {
    name: string;
    sector_id: string;
    order?: number;
  }): Observable<TicketStatus> {
    return this.http.post<TicketStatus>(`${this.BASE}/statuses/`, data);
  }
}
