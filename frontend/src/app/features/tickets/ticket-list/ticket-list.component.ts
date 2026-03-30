import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TicketService, TicketFilters } from '../../../core/services/ticket.service';
import { Ticket, TicketStatus } from '../../../core/models';
import { ShellComponent } from '../../../shared/shell/shell.component';

@Component({
  selector: 'fd-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  template: `
    <fd-shell>
      <div class="page">
        <div class="page-header">
          <h2>Chamados</h2>
          <a routerLink="/tickets/new" class="btn btn-primary">+ Novo chamado</a>
        </div>

        <!-- Filtros RF24 -->
        <div class="filters">
          <select [(ngModel)]="filters.status" (ngModelChange)="applyFilters()" class="filter-control">
            <option value="">Todos os status</option>
            <option *ngFor="let s of statuses()" [value]="s.id">{{ s.name }}</option>
          </select>
          <input
            type="text"
            [(ngModel)]="filters.search"
            (input)="applyFilters()"
            placeholder="Buscar..."
            class="filter-control"
          />
          <input type="date" [(ngModel)]="filters.created_after" (ngModelChange)="applyFilters()" class="filter-control" />
          <input type="date" [(ngModel)]="filters.created_before" (ngModelChange)="applyFilters()" class="filter-control" />
        </div>

        <div *ngIf="loading()" class="loading">Carregando...</div>

        <table *ngIf="!loading() && tickets().length" class="table">
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Título</th>
              <th>Solicitante</th>
              <th>Responsável</th>
              <th>Atribuído a</th>
              <th>Status</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of tickets()" [class.unassigned-row]="!t.assigned_to">
              <td><span class="protocol-badge">{{ t.protocol }}</span></td>
              <td><a [routerLink]="['/tickets', t.id]">{{ t.title }}</a></td>
              <td>{{ t.requesting_sector.name }}</td>
              <td>{{ t.responsible_sector.name }}</td>
              <td>
                <span *ngIf="t.assigned_to">{{ t.assigned_to.first_name }} {{ t.assigned_to.last_name }}</span>
                <span *ngIf="!t.assigned_to" class="badge-unassigned">Livre</span>
              </td>
              <td><span class="badge" [class]="getBadge(t.status.name)">{{ t.status.name }}</span></td>
              <td>{{ t.created_at | date:'dd/MM/yy' }}</td>
            </tr>
          </tbody>
        </table>

        <p *ngIf="!loading() && !tickets().length" class="empty">Nenhum chamado encontrado.</p>

        <div class="pagination" *ngIf="totalPages() > 1">
          <button (click)="prevPage()" [disabled]="currentPage() === 1" class="btn btn-outline">Anterior</button>
          <span>{{ currentPage() }} / {{ totalPages() }}</span>
          <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" class="btn btn-outline">Próxima</button>
        </div>
      </div>
    </fd-shell>
  `,
  styles: [`
    .page { padding:1.5rem; }
    .page-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem; }
    .page-header h2 { font-size:1.5rem;font-weight:700; }
    .btn { padding:.5rem 1rem;border:none;border-radius:6px;cursor:pointer;font-weight:600; }
    .btn-primary { background:#4f46e5;color:#fff; }
    .btn-outline { padding:.4rem .9rem;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer; }
    .filters { display:flex;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap; }
    .filter-control { padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:6px;font-size:.85rem;min-width:140px; }
    .table { width:100%;border-collapse:collapse;font-size:.85rem;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07); }
    .unassigned-row { background:#fffbeb; }
    .badge-unassigned { background:#fee2e2;color:#b91c1c;padding:.15rem .5rem;border-radius:12px;font-size:.75rem;font-weight:600; }
    th { text-align:left;padding:.75rem 1rem;border-bottom:2px solid #e5e7eb;font-weight:600;background:#f9fafb; }
    td { padding:.65rem 1rem;border-bottom:1px solid #f3f4f6; }
    td a { color:#4f46e5;font-weight:500; }
    .badge { padding:.2rem .6rem;border-radius:20px;font-size:.75rem;font-weight:600; }
    .badge-pending { background:#fef3c7;color:#92400e; }
    .badge-open { background:#dbeafe;color:#1e40af; }
    .badge-done { background:#d1fae5;color:#065f46; }
    .badge-default { background:#f3f4f6;color:#374151; }
    .pagination { display:flex;justify-content:center;align-items:center;gap:1rem;margin-top:1.5rem; }
    .loading,.empty { color:#6b7280;text-align:center;padding:3rem; }
    .protocol-badge { font-family:monospace;background:#f3f4f6;padding:.15rem .5rem;border-radius:4px;font-size:.8rem;color:#374151;letter-spacing:.05em;font-weight:600; }
  `],
})
export class TicketListComponent implements OnInit {
  private ticketService = inject(TicketService);

  tickets = signal<Ticket[]>([]);
  statuses = signal<TicketStatus[]>([]);
  loading = signal(true);
  currentPage = signal(1);
  totalPages = signal(1);

  filters: TicketFilters = {};

  ngOnInit(): void {
    this.loadStatuses();
    this.loadTickets();
  }

  private loadStatuses(): void {
    this.ticketService.getStatuses().subscribe({
      next: (res) => this.statuses.set(res.results),
    });
  }

  loadTickets(): void {
    this.loading.set(true);
    this.ticketService.getAll({ ...this.filters, page: this.currentPage() }).subscribe({
      next: (res) => {
        this.tickets.set(res.results);
        this.totalPages.set(Math.ceil(res.count / 20));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadTickets();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadTickets();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadTickets();
    }
  }

  getBadge(name: string): string {
    const map: Record<string, string> = {
      'Pendente': 'badge badge-pending',
      'Em Aberto': 'badge badge-open',
      'Concluído': 'badge badge-done',
    };
    return map[name] ?? 'badge badge-default';
  }
}
