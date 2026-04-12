import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatrimonyService } from '../../../core/services/patrimony.service';
import { SectorService } from '../../../core/services/sector.service';
import { AuthService } from '../../../core/services/auth.service';
import { FeatureService } from '../../../core/services/feature.service';
import { Patrimony, PatrimonyCondition, PatrimonySituation, Sector, User } from '../../../core/models';
import { ShellComponent } from '../../../shared/shell/shell.component';

@Component({
  selector: 'fd-patrimony-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  template: `
    <fd-shell>
      <div class="page">
        <div class="page-header">
          <h2>Patrimônio</h2>
          <button *ngIf="canEdit()" (click)="openCreate()" class="btn btn-primary">+ Novo patrimônio</button>
        </div>

        <!-- Filtros -->
        <div class="filters">
          <select [(ngModel)]="filters.sector_id" (change)="load()" class="filter-control">
            <option value="">Todos os setores</option>
            <option *ngFor="let s of sectors()" [value]="s.id">{{ s.name }}</option>
          </select>
          <select [(ngModel)]="filters.situation" (change)="load()" class="filter-control">
            <option value="">Todas as situações</option>
            <option value="Disponível">Disponível</option>
            <option value="Em Uso">Em Uso</option>
            <option value="Depreciado">Depreciado</option>
          </select>
          <select [(ngModel)]="filters.condition" (change)="load()" class="filter-control">
            <option value="">Todos os estados</option>
            <option value="Novo">Novo</option>
            <option value="Usado">Usado</option>
          </select>
        </div>

        <div *ngIf="loading()" class="loading">Carregando...</div>

        <div class="table-wrapper" *ngIf="!loading()">
          <table class="table" *ngIf="items().length; else empty">
            <thead>
              <tr>
                <th>Nº Patrimônio</th>
                <th>Nome</th>
                <th>Setor</th>
                <th>Usuário</th>
                <th>Estado</th>
                <th>Situação</th>
                <th>Data Adesão</th>
                <th>Data Baixa</th>
                <th *ngIf="canEdit()">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of items()">
                <td><strong>{{ item.number }}</strong></td>
                <td>{{ item.name }}</td>
                <td>{{ item.sector.name }}</td>
                <td>{{ item.user ? (item.user.first_name + ' ' + item.user.last_name) : '—' }}</td>
                <td><span class="badge" [class.badge-novo]="item.condition === 'Novo'" [class.badge-usado]="item.condition === 'Usado'">{{ item.condition }}</span></td>
                <td><span class="badge" [class.badge-disponivel]="item.situation === 'Disponível'" [class.badge-em-uso]="item.situation === 'Em Uso'" [class.badge-depreciado]="item.situation === 'Depreciado'">{{ item.situation }}</span></td>
                <td>{{ item.adhesion_date | date:'dd/MM/yyyy' }}</td>
                <td>{{ item.write_off_date ? (item.write_off_date | date:'dd/MM/yyyy') : '—' }}</td>
                <td *ngIf="canEdit()" class="actions">
                  <button (click)="openEdit(item)" class="btn-action">Editar</button>
                  <button *ngIf="canEdit()" (click)="deleteItem(item)" class="btn-action btn-action-danger">Excluir</button>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #empty>
            <p class="empty">Nenhum patrimônio encontrado.</p>
          </ng-template>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editingId() ? 'Editar patrimônio' : 'Novo patrimônio' }}</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Nº Patrimônio *</label>
                <input type="text" [(ngModel)]="form.number" class="form-control" />
              </div>
              <div class="form-group">
                <label>Nome *</label>
                <input type="text" [(ngModel)]="form.name" class="form-control" />
              </div>
              <div class="form-group">
                <label>Setor *</label>
                <select [(ngModel)]="form.sector_id" (change)="onSectorChange()" class="form-control">
                  <option value="">Selecione...</option>
                  <option *ngFor="let s of formSectors()" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Usuário responsável</label>
                <select [(ngModel)]="form.user_id" class="form-control" [disabled]="!form.sector_id">
                  <option value="">{{ form.sector_id ? 'Nenhum (patrimônio do setor)' : 'Selecione um setor primeiro' }}</option>
                  <option *ngFor="let u of sectorMembers()" [value]="u.id">{{ u.first_name }} {{ u.last_name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Data de adesão *</label>
                <input type="date" [(ngModel)]="form.adhesion_date" class="form-control" />
              </div>
              <div class="form-group">
                <label>Estado *</label>
                <select [(ngModel)]="form.condition" class="form-control">
                  <option value="Novo">Novo</option>
                  <option value="Usado">Usado</option>
                </select>
              </div>
              <div class="form-group">
                <label>Situação *</label>
                <select [(ngModel)]="form.situation" class="form-control">
                  <option value="Disponível">Disponível</option>
                  <option value="Em Uso">Em Uso</option>
                  <option value="Depreciado">Depreciado</option>
                </select>
              </div>
              <div class="form-group">
                <label>Data da baixa</label>
                <input type="date" [(ngModel)]="form.write_off_date" class="form-control" />
              </div>
            </div>
            <div *ngIf="formError()" class="alert-error">{{ formError() }}</div>
            <div class="modal-actions">
              <button (click)="closeModal()" class="btn btn-outline">Cancelar</button>
              <button (click)="save()" class="btn btn-primary" [disabled]="saving()">
                {{ saving() ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
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
    .btn-primary:disabled { background:#a5b4fc;cursor:not-allowed; }
    .btn-outline { background:#fff;border:1px solid #d1d5db;color:#374151; }
    .filters { display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.25rem; }
    .filter-control { padding:.5rem .75rem;border:1px solid #d1d5db;border-radius:8px;font-size:.875rem; }
    .table-wrapper { background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:auto; }
    .table { width:100%;border-collapse:collapse;font-size:.875rem; }
    .table th { padding:.75rem 1rem;background:#f9fafb;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb; }
    .table td { padding:.7rem 1rem;border-bottom:1px solid #f3f4f6;color:#1f2937; }
    .badge { display:inline-block;padding:.15rem .5rem;border-radius:4px;font-size:.75rem;font-weight:600; }
    .badge-novo { background:#d1fae5;color:#065f46; }
    .badge-usado { background:#fef3c7;color:#92400e; }
    .badge-disponivel { background:#d1fae5;color:#065f46; }
    .badge-em-uso { background:#dbeafe;color:#1e40af; }
    .badge-depreciado { background:#fee2e2;color:#991b1b; }
    .actions { display:flex;gap:.4rem; }
    .btn-action { padding:.25rem .6rem;background:#fff;border:1px solid #d1d5db;border-radius:5px;cursor:pointer;font-size:.78rem; }
    .btn-action-danger { border-color:#fca5a5;color:#dc2626; }
    .btn-action-danger:hover { background:#fee2e2; }
    .empty,.loading { padding:3rem;text-align:center;color:#6b7280; }
    /* Modal */
    .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:100; }
    .modal { background:#fff;border-radius:12px;padding:2rem;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2); }
    .modal h3 { font-size:1.1rem;font-weight:700;margin-bottom:1.25rem; }
    .form-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    .form-group { display:flex;flex-direction:column;gap:.3rem; }
    label { font-size:.85rem;font-weight:500; }
    .form-control { padding:.55rem .8rem;border:1px solid #d1d5db;border-radius:8px;font-size:.9rem; }
    .alert-error { background:#fee2e2;color:#dc2626;padding:.5rem;border-radius:6px;font-size:.85rem;margin-top:.75rem; }
    .modal-actions { display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.25rem; }
  `],
})
export class PatrimonyListComponent implements OnInit {
  private patrimonyService = inject(PatrimonyService);
  private sectorService = inject(SectorService);
  private auth = inject(AuthService);
  private featureService = inject(FeatureService);

  items = signal<Patrimony[]>([]);
  sectors = signal<Sector[]>([]);
  mySectors = signal<Sector[]>([]);
  loading = signal(true);
  showModal = signal(false);
  saving = signal(false);
  formError = signal('');
  editingId = signal<string | null>(null);

  filters = { sector_id: '', situation: '', condition: '' };

  form: {
    number: string;
    name: string;
    sector_id: string;
    user_id: string;
    adhesion_date: string;
    condition: PatrimonyCondition;
    situation: PatrimonySituation;
    write_off_date: string;
  } = this.emptyForm();

  ngOnInit(): void {
    this.load();
    this.sectorService.getAll().subscribe({ next: (r) => this.sectors.set(r.results) });
    this.sectorService.getMine().subscribe({ next: (r) => this.mySectors.set(r.results) });
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  canEdit(): boolean {
    return this.isAdmin() || (this.featureService.hasFeature('patrimony') && this.auth.canManagePatrimony());
  }

  /** Retorna os membros do setor atualmente selecionado no formulário. */
  sectorMembers(): User[] {
    if (!this.form.sector_id) return [];
    const sector = this.sectors().find(s => s.id === this.form.sector_id);
    return sector?.members ?? [];
  }

  /** Ao trocar o setor, limpa o responsável para evitar inconsistência. */
  onSectorChange(): void {
    this.form.user_id = '';
  }

  /** Setores disponíveis no formulário: todos os setores para qualquer usuário */
  formSectors(): Sector[] {
    return this.sectors();
  }

  load(): void {
    this.loading.set(true);
    const f = {
      sector_id: this.filters.sector_id || undefined,
      situation: this.filters.situation || undefined,
      condition: this.filters.condition || undefined,
    };
    this.patrimonyService.list(f).subscribe({
      next: (r) => { this.items.set(r.results); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.formError.set('');
    this.showModal.set(true);
  }

  openEdit(item: Patrimony): void {
    this.editingId.set(item.id);
    this.form = {
      number: item.number,
      name: item.name,
      sector_id: item.sector.id,
      user_id: item.user?.id ?? '',
      adhesion_date: item.adhesion_date,
      condition: item.condition,
      situation: item.situation,
      write_off_date: item.write_off_date ?? '',
    };
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  save(): void {
    if (!this.form.number || !this.form.name || !this.form.sector_id || !this.form.adhesion_date) {
      this.formError.set('Preencha todos os campos obrigatórios.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const payload = {
      number: this.form.number,
      name: this.form.name,
      sector_id: this.form.sector_id,
      user_id: this.form.user_id || null,
      adhesion_date: this.form.adhesion_date,
      condition: this.form.condition,
      situation: this.form.situation,
      write_off_date: this.form.write_off_date || null,
    };
    const id = this.editingId();
    const req = id
      ? this.patrimonyService.update(id, payload)
      : this.patrimonyService.create(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.load();
      },
      error: (err) => {
        this.formError.set(err?.error?.detail ?? JSON.stringify(err?.error) ?? 'Erro ao salvar.');
        this.saving.set(false);
      },
    });
  }

  deleteItem(item: Patrimony): void {
    if (!confirm(`Excluir "${item.name}" (${item.number})?`)) return;
    this.patrimonyService.delete(item.id).subscribe({ next: () => this.load() });
  }

  private emptyForm() {
    return {
      number: '',
      name: '',
      sector_id: '',
      user_id: '',
      adhesion_date: '',
      condition: 'Novo' as PatrimonyCondition,
      situation: 'Disponível' as PatrimonySituation,
      write_off_date: '',
    };
  }
}
