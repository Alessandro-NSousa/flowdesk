import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TicketService } from '../../../core/services/ticket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Ticket, TicketStatus } from '../../../core/models';
import { ShellComponent } from '../../../shared/shell/shell.component';

@Component({
  selector: 'fd-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  template: `
    <fd-shell>
      <div class="page" *ngIf="ticket(); else loading">
        <div class="breadcrumb">
          <a routerLink="/tickets">Chamados</a> / {{ ticket()!.title }}
        </div>

        <div class="ticket-card">
          <div class="ticket-header">
            <h2>{{ ticket()!.title }}</h2>
            <span class="badge" [class]="getBadge(ticket()!.status.name)">{{ ticket()!.status.name }}</span>
          </div>

          <div class="ticket-meta">
            <div class="meta-item">
              <span class="meta-label">Solicitante</span>
              <span>{{ ticket()!.requesting_sector.name }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Responsável</span>
              <span>{{ ticket()!.responsible_sector.name }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Criado por</span>
              <span>{{ ticket()!.created_by.first_name }} {{ ticket()!.created_by.last_name }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Criado em</span>
              <span>{{ ticket()!.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>

          <div class="ticket-description">
            <h4>Descrição</h4>
            <p>{{ ticket()!.description }}</p>
          </div>

          <!-- Observações registradas -->
          <div class="ticket-observations" *ngIf="ticket()!.observations.length">
            <h4>Observações</h4>
            <div class="observation-item" *ngFor="let obs of ticket()!.observations">
              <div class="obs-meta">
                <span class="obs-author">{{ obs.created_by.first_name }} {{ obs.created_by.last_name }}</span>
                <span class="obs-date">{{ obs.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <p class="obs-content">{{ obs.content }}</p>
            </div>
          </div>

          <!-- Chamado concluído: bloqueado -->
          <div class="ticket-done-notice" *ngIf="isDone()">
            <span>&#10003; Chamadohamado finalizado.</span>
          </div>

          <!-- Atualização (RF15 – apenas setor responsável) -->
          <div class="ticket-update" *ngIf="canEdit() && !isDone()">
            <h4>Atualizar chamado</h4>
            <div class="form-group">
              <label>Alterar status</label>
              <select [(ngModel)]="selectedStatus" class="form-control" (ngModelChange)="onStatusChange()">
                <option value="">Manter atual</option>
                <option *ngFor="let s of statuses()" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="form-group" *ngIf="isSelectingDone()">
              <label>Observação de conclusão <span class="required">*</span></label>
              <textarea
                [(ngModel)]="observation"
                class="form-control"
                rows="4"
                placeholder="Descreva a resolução ou observação final do chamado..."
              ></textarea>
            </div>
            <div *ngIf="updateError()" class="alert-error">{{ updateError() }}</div>
            <button (click)="updateTicket()" class="btn btn-primary" [disabled]="updating()">
              {{ updating() ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
      <ng-template #loading>
        <div class="loading" style="padding:3rem;text-align:center;color:#6b7280">Carregando...</div>
      </ng-template>
    </fd-shell>
  `,
  styles: [`
    .page { padding:1.5rem;max-width:800px; }
    .breadcrumb { font-size:.85rem;color:#6b7280;margin-bottom:1.5rem; }
    .breadcrumb a { color:#4f46e5; }
    .ticket-card { background:#fff;border-radius:12px;padding:2rem;box-shadow:0 1px 4px rgba(0,0,0,.08); }
    .ticket-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem; }
    .ticket-header h2 { font-size:1.3rem;font-weight:700;color:#1f2937; }
    .badge { padding:.3rem .8rem;border-radius:20px;font-size:.8rem;font-weight:600; }
    .badge-pending { background:#fef3c7;color:#92400e; }
    .badge-open { background:#dbeafe;color:#1e40af; }
    .badge-done { background:#d1fae5;color:#065f46; }
    .badge-default { background:#f3f4f6;color:#374151; }
    .ticket-meta { display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid #f3f4f6; }
    .meta-item { display:flex;flex-direction:column;gap:.25rem; }
    .meta-label { font-size:.75rem;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.05em; }
    .ticket-description h4 { font-size:.95rem;font-weight:600;margin-bottom:.5rem; }
    .ticket-description p { color:#4b5563;line-height:1.6; }
    .ticket-observations { margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #f3f4f6; }
    .ticket-observations h4 { font-size:.95rem;font-weight:600;margin-bottom:1rem; }
    .observation-item { background:#f9fafb;border-left:3px solid #4f46e5;border-radius:0 8px 8px 0;padding:.75rem 1rem;margin-bottom:.75rem; }
    .obs-meta { display:flex;gap:1rem;margin-bottom:.35rem; }
    .obs-author { font-size:.8rem;font-weight:600;color:#374151; }
    .obs-date { font-size:.8rem;color:#9ca3af; }
    .obs-content { color:#4b5563;font-size:.9rem;line-height:1.5;margin:0; }
    .ticket-done-notice { margin-top:1.5rem;padding:.75rem 1rem;background:#d1fae5;color:#065f46;border-radius:8px;font-weight:600;font-size:.9rem; }
    .ticket-update { margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #f3f4f6; }
    .ticket-update h4 { font-size:.95rem;font-weight:600;margin-bottom:1rem; }
    .form-group { margin-bottom:1rem; }
    label { display:block;margin-bottom:.35rem;font-weight:500;font-size:.85rem; }
    .required { color:#dc2626; }
    .form-control { padding:.55rem .8rem;border:1px solid #d1d5db;border-radius:8px;font-size:.9rem;min-width:200px; }
    textarea.form-control { width:100%;box-sizing:border-box;resize:vertical; }
    .btn { padding:.55rem 1.25rem;border:none;border-radius:8px;cursor:pointer;font-weight:600; }
    .btn-primary { background:#4f46e5;color:#fff; }
    .alert-error { background:#fee2e2;color:#dc2626;padding:.5rem;border-radius:6px;margin-bottom:.75rem;font-size:.8rem; }
  `],
})
export class TicketDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ticketService = inject(TicketService);
  private auth = inject(AuthService);

  ticket = signal<Ticket | null>(null);
  statuses = signal<TicketStatus[]>([]);
  selectedStatus = '';
  observation = '';
  updating = signal(false);
  updateError = signal('');

  private readonly DONE_STATUS_NAME = 'Concluído';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ticketService.getById(id).subscribe({ next: (t) => this.ticket.set(t) });
    this.ticketService.getStatuses().subscribe({ next: (r) => this.statuses.set(r.results) });
  }

  isDone(): boolean {
    return this.ticket()?.status.name === this.DONE_STATUS_NAME;
  }

  isSelectingDone(): boolean {
    if (!this.selectedStatus) return false;
    const s = this.statuses().find(st => st.id === this.selectedStatus);
    return s?.name === this.DONE_STATUS_NAME;
  }

  onStatusChange(): void {
    if (!this.isSelectingDone()) {
      this.observation = '';
    }
  }

  canEdit(): boolean {
    const user = this.auth.getCurrentUser();
    const t = this.ticket();
    if (!user || !t) return false;
    if (user.is_admin) return true;
    return true;
  }

  updateTicket(): void {
    const t = this.ticket();
    if (!t) return;

    if (this.isSelectingDone() && !this.observation.trim()) {
      this.updateError.set('É obrigatório adicionar uma observação ao concluir o chamado.');
      return;
    }

    this.updating.set(true);
    this.updateError.set('');

    const payload: { status_id?: string; observation?: string } = {};
    if (this.selectedStatus) payload.status_id = this.selectedStatus;
    if (this.observation.trim()) payload.observation = this.observation.trim();

    this.ticketService.update(t.id, payload).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.selectedStatus = '';
        this.observation = '';
        this.updating.set(false);
      },
      error: (err) => {
        this.updateError.set(err?.error?.detail ?? 'Erro ao atualizar chamado.');
        this.updating.set(false);
      },
    });
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
