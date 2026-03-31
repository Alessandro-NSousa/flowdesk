import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import { AuthService } from '../../core/services/auth.service';
import { Ticket } from '../../core/models';
import { ShellComponent } from '../../shared/shell/shell.component';

@Component({
  selector: 'fd-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  template: `
    <fd-shell>
      <div class="dashboard">
        <h2 class="page-title">Dashboard</h2>
        <p class="greeting">Olá, {{ currentUser()?.full_name ?? 'Usuário' }}!</p>

        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">{{ totals().total }}</span>
            <span class="stat-label">Chamados totais</span>
          </div>
          <div class="stat-card pending">
            <span class="stat-number">{{ totals().pending }}</span>
            <span class="stat-label">Pendentes</span>
          </div>
          <div class="stat-card open">
            <span class="stat-number">{{ totals().open }}</span>
            <span class="stat-label">Em Aberto</span>
          </div>
          <div class="stat-card done">
            <span class="stat-number">{{ totals().done }}</span>
            <span class="stat-label">Concluídos</span>
          </div>
        </div>

        <div class="recent-tickets">
          <div class="section-header">
            <h3>Chamados recentes</h3>
            <a routerLink="/tickets" class="btn btn-outline">Ver todos</a>
          </div>

          <div *ngIf="loading()" class="loading">Carregando...</div>

          <table *ngIf="!loading() && tickets().length" class="table">
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Título</th>
                <th>Solicitante</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of tickets()" (click)="goToTicket(t.id)" class="clickable">
                <td>{{ t.protocol }}</td>
                <td>{{ t.title }}</td>
                <td>{{ t.requesting_sector.name }}</td>
                <td>{{ t.responsible_sector.name }}</td>
                <td><span class="badge" [class]="getBadgeClass(t.status.name)">{{ t.status.name }}</span></td>
                <td>{{ t.created_at | date:'dd/MM/yy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>

          <p *ngIf="!loading() && !tickets().length" class="empty">Nenhum chamado encontrado.</p>
        </div>
      </div>
    </fd-shell>
  `,
  styles: [`
    .dashboard { padding: 1.5rem; }
    .page-title { font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:.25rem; }
    .greeting { color:#6b7280;margin-bottom:1.5rem; }
    .stats-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:2rem; }
    .stat-card { background:#fff;border-radius:12px;padding:1.25rem;box-shadow:0 1px 4px rgba(0,0,0,.08);text-align:center; }
    .stat-card.pending { border-top:3px solid #f59e0b; }
    .stat-card.open { border-top:3px solid #3b82f6; }
    .stat-card.done { border-top:3px solid #10b981; }
    .stat-number { display:block;font-size:2rem;font-weight:700;color:#1f2937; }
    .stat-label { font-size:.8rem;color:#6b7280; }
    .recent-tickets { background:#fff;border-radius:12px;padding:1.25rem;box-shadow:0 1px 4px rgba(0,0,0,.08); }
    .section-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem; }
    .section-header h3 { font-size:1rem;font-weight:600; }
    .btn-outline { padding:.4rem .9rem;border:1px solid #4f46e5;border-radius:6px;color:#4f46e5;font-size:.8rem;background:transparent;cursor:pointer; }
    .table { width:100%;border-collapse:collapse;font-size:.85rem; }
    th { text-align:left;padding:.6rem;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600; }
    td { padding:.6rem;border-bottom:1px solid #f3f4f6; }
    .clickable { cursor:pointer; }
    .clickable:hover td { background:#f9fafb; }
    .badge { padding:.2rem .6rem;border-radius:20px;font-size:.75rem;font-weight:600; }
    .badge-pending { background:#fef3c7;color:#92400e; }
    .badge-open { background:#dbeafe;color:#1e40af; }
    .badge-done { background:#d1fae5;color:#065f46; }
    .badge-default { background:#f3f4f6;color:#374151; }
    .loading,.empty { color:#6b7280;text-align:center;padding:2rem; }
  `],
})
export class DashboardComponent implements OnInit {
  private ticketService = inject(TicketService);
  private auth = inject(AuthService);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  currentUser = signal(this.auth.getCurrentUser());

  totals = signal({ total: 0, pending: 0, open: 0, done: 0 });

  ngOnInit(): void {
    this.ticketService.getAll({ page: 1 }).subscribe({
      next: (res) => {
        this.tickets.set(res.results.slice(0, 10));
        const all = res.results;
        this.totals.set({
          total: res.count,
          pending: all.filter((t) => t.status.name === 'Pendente').length,
          open: all.filter((t) => t.status.name === 'Em Aberto').length,
          done: all.filter((t) => t.status.name === 'Concluído').length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getBadgeClass(statusName: string): string {
    const map: Record<string, string> = {
      'Pendente': 'badge badge-pending',
      'Em Aberto': 'badge badge-open',
      'Concluído': 'badge badge-done',
    };
    return map[statusName] ?? 'badge badge-default';
  }

  goToTicket(id: string): void {
    window.location.href = `/tickets/${id}`;
  }
}
