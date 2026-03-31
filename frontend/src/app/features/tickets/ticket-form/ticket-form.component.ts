import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SectorService } from '../../../core/services/sector.service';
import { TicketService } from '../../../core/services/ticket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Sector, Ticket, User } from '../../../core/models';
import { ShellComponent } from '../../../shared/shell/shell.component';

@Component({
  selector: 'fd-ticket-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  template: `
    <fd-shell>
      <div class="page">
        <h2 class="page-title">Novo Chamado</h2>

        <div class="form-card">
          <form (ngSubmit)="onSubmit()" novalidate>
            <div class="form-group">
              <label>Título *</label>
              <input type="text" [(ngModel)]="form.title" name="title" required maxlength="200" class="form-control" />
            </div>

            <div class="form-group">
              <label>Descrição *</label>
              <textarea [(ngModel)]="form.description" name="description" required rows="5" class="form-control"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Setor solicitante *</label>
                <select [(ngModel)]="form.requesting_sector_id" name="requestingSector" required class="form-control">
                  <option value="">Selecione...</option>
                  <option *ngFor="let s of mySectors()" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Setor responsável *</label>
                <select [(ngModel)]="form.responsible_sector_id" name="responsibleSector" required class="form-control" (ngModelChange)="onResponsibleSectorChange($event)">
                  <option value="">Selecione...</option>
                  <option *ngFor="let s of allSectors()" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>

            <div class="form-group" *ngIf="responsibleSectorMembers().length && canAssignOther()">
              <label>Atribuir para (opcional)</label>
              <select [(ngModel)]="form.assigned_to_id" name="assignedTo" class="form-control">
                <option value="">Sem atribuição</option>
                <option *ngFor="let m of responsibleSectorMembers()" [value]="m.id">{{ m.first_name }} {{ m.last_name }}</option>
              </select>
            </div>

            <div *ngIf="error()" class="alert alert-error">{{ error() }}</div>

            <div class="form-actions">
              <button type="button" (click)="cancel()" class="btn btn-outline">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading()">
                {{ loading() ? 'Criando...' : 'Criar Chamado' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal de sucesso -->
      <div *ngIf="successTicket()" class="modal-overlay">
        <div class="modal">
          <div class="modal-icon">✓</div>
          <h3>Chamado aberto com sucesso!</h3>
          <p class="modal-info">
            <strong>{{ successTicket()!.title }}</strong><br>
            Protocolo: <span class="protocol">{{ successTicket()!.protocol }}</span>
          </p>
          <div class="modal-actions">
            <button (click)="goToTickets()" class="btn btn-primary">Ver chamados</button>
            <button (click)="newTicket()" class="btn btn-outline">Abrir outro</button>
          </div>
        </div>
      </div>
    </fd-shell>
  `,
  styles: [`
    .page { padding:1.5rem;max-width:720px; }
    .page-title { font-size:1.5rem;font-weight:700;margin-bottom:1.5rem; }
    .form-card { background:#fff;border-radius:12px;padding:2rem;box-shadow:0 1px 4px rgba(0,0,0,.08); }
    .form-group { margin-bottom:1.25rem; }
    .form-row { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    label { display:block;margin-bottom:.4rem;font-weight:500;color:#374151; }
    .form-control { width:100%;padding:.6rem .9rem;border:1px solid #d1d5db;border-radius:8px;font-size:.9rem; }
    .form-control:focus { outline:none;border-color:#4f46e5; }
    textarea.form-control { resize:vertical; }
    .form-actions { display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.5rem; }
    .btn { padding:.6rem 1.25rem;border:none;border-radius:8px;cursor:pointer;font-weight:600; }
    .btn-primary { background:#4f46e5;color:#fff; }
    .btn-primary:disabled { background:#a5b4fc;cursor:not-allowed; }
    .btn-outline { background:#fff;border:1px solid #d1d5db;color:#374151; }
    .alert-error { background:#fee2e2;color:#dc2626;padding:.6rem;border-radius:6px;margin-bottom:.75rem;font-size:.85rem; }
    /* Modal */
    .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000; }
    .modal { background:#fff;border-radius:16px;padding:2.5rem 2rem;max-width:420px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.18); }
    .modal-icon { width:56px;height:56px;border-radius:50%;background:#d1fae5;color:#059669;font-size:1.75rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem; }
    .modal h3 { font-size:1.2rem;font-weight:700;color:#111827;margin-bottom:.75rem; }
    .modal-info { color:#6b7280;font-size:.9rem;margin-bottom:1.5rem;line-height:1.6; }
    .protocol { font-family:monospace;background:#f3f4f6;padding:.15rem .4rem;border-radius:4px;color:#374151; }
    .protocol { font-family:monospace;font-weight:700;background:#f3f4f6;padding:.15rem .4rem;border-radius:4px;color:#374151;letter-spacing:.05em; }
    .modal-actions { display:flex;gap:.75rem;justify-content:center; }
  `],
})
export class TicketFormComponent implements OnInit {
  private sectorService = inject(SectorService);
  private ticketService = inject(TicketService);
  private router = inject(Router);
  private auth = inject(AuthService);

  mySectors = signal<Sector[]>([]);
  allSectors = signal<Sector[]>([]);
  responsibleSectorMembers = signal<User[]>([]);
  loading = signal(false);
  error = signal('');
  successTicket = signal<Ticket | null>(null);

  form: {
    title: string;
    description: string;
    requesting_sector_id: string;
    responsible_sector_id: string;
    assigned_to_id: string;
  } = {
    title: '',
    description: '',
    requesting_sector_id: '',
    responsible_sector_id: '',
    assigned_to_id: '',
  };

  ngOnInit(): void {
    this.sectorService.getMine().subscribe({
      next: (res) => this.mySectors.set(res.results),
    });
    this.sectorService.getAll().subscribe({
      next: (res) => this.allSectors.set(res.results),
    });
  }

  onResponsibleSectorChange(sectorId: string): void {
    this.form.assigned_to_id = '';
    if (!sectorId) {
      this.responsibleSectorMembers.set([]);
      return;
    }
    const sector = this.allSectors().find(s => s.id === sectorId);
    this.responsibleSectorMembers.set(sector?.members ?? []);
  }

  onSubmit(): void {
    if (!this.form.title || !this.form.description || !this.form.requesting_sector_id || !this.form.responsible_sector_id) {
      this.error.set('Preencha todos os campos obrigatórios.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const payload: Parameters<typeof this.ticketService.create>[0] = {
      title: this.form.title,
      description: this.form.description,
      requesting_sector_id: this.form.requesting_sector_id,
      responsible_sector_id: this.form.responsible_sector_id,
    };
    if (this.form.assigned_to_id) {
      payload.assigned_to_id = this.form.assigned_to_id;
    }

    this.ticketService.create(payload).subscribe({
      next: (ticket) => {
        this.loading.set(false);
        this.successTicket.set(ticket);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status;
        if (status === 0) {
          this.error.set('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
        } else if (status === 403) {
          this.error.set('Você não tem permissão para abrir um chamado para este setor.');
        } else if (status >= 500) {
          this.error.set('Erro interno no servidor. Tente novamente em instantes.');
        } else {
          this.error.set(err?.error?.detail ?? 'Não foi possível criar o chamado. Verifique os dados e tente novamente.');
        }
      },
    });
  }

  goToTickets(): void {
    const ticket = this.successTicket();
    if (ticket) this.router.navigate(['/tickets']);
  }

  newTicket(): void {
    this.successTicket.set(null);
    this.form = { title: '', description: '', requesting_sector_id: '', responsible_sector_id: '', assigned_to_id: '' };
    this.responsibleSectorMembers.set([]);
    this.error.set('');
  }

  cancel(): void {
    this.router.navigate(['/tickets']);
  }

  canAssignOther(): boolean {
    const user = this.auth.getCurrentUser();
    if (!user) return false;
    return user.is_admin || this.auth.canAssignTickets();
  }
}

