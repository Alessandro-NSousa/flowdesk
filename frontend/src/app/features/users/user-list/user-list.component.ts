import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { SectorService } from '../../../core/services/sector.service';
import { User, CreateUserPayload, UpdateUserPayload, Sector } from '../../../core/models';
import { ShellComponent } from '../../../shared/shell/shell.component';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'fd-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellComponent],
  template: `
    <fd-shell>
      <div class="page">
        <div class="page-header">
          <h2>Membros</h2>
          <button (click)="openCreate()" class="btn btn-primary">+ Novo membro</button>
        </div>

        <div *ngIf="loading()" class="loading">Carregando...</div>

        <table *ngIf="!loading() && users().length" class="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Admin</th>
              <th>Atribuir chamados</th>
              <th>Ativo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users()">
              <td>{{ u.first_name }} {{ u.last_name }}</td>
              <td>{{ u.email }}</td>
              <td>
                <button
                  class="badge"
                  [class]="u.is_admin ? 'badge-admin' : 'badge-member'"
                  (click)="toggleAdmin(u)"
                  title="Clique para alternar permissão de admin"
                >{{ u.is_admin ? 'Admin' : 'Membro' }}</button>
              </td>
              <td>
                <button
                  class="badge"
                  [class]="u.can_assign_tickets ? 'badge-can-assign' : 'badge-no-assign'"
                  (click)="toggleCanAssign(u)"
                  title="Clique para alternar permissão de atribuir chamados"
                >{{ u.can_assign_tickets ? 'Sim' : 'Não' }}</button>
              </td>
              <td>
                <span class="badge" [class]="u.is_active ? 'badge-active' : 'badge-inactive'">
                  {{ u.is_active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="actions">
                <button (click)="openEdit(u)" class="btn btn-outline btn-sm">Editar</button>
                <button (click)="confirmDelete(u)" class="btn btn-danger btn-sm">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>

        <p *ngIf="!loading() && !users().length" class="empty">Nenhum membro cadastrado.</p>
      </div>

      <!-- Modal Criar / Editar -->
      <div *ngIf="showModal()" class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ modalMode() === 'create' ? 'Novo membro' : 'Editar membro' }}</h3>

          <div class="field">
            <label>Nome</label>
            <input [(ngModel)]="form.first_name" placeholder="Nome" class="input" />
          </div>
          <div class="field">
            <label>Sobrenome</label>
            <input [(ngModel)]="form.last_name" placeholder="Sobrenome" class="input" />
          </div>
          <div class="field">
            <label>E-mail</label>
            <input [(ngModel)]="form.email" type="email" placeholder="E-mail" class="input" [disabled]="modalMode() === 'edit'" />
          </div>

          <div *ngIf="modalMode() === 'create'" class="field">
            <label>Setor (opcional)</label>
            <select [(ngModel)]="form.sector_id" class="input">
              <option [ngValue]="null">— Sem setor —</option>
              <option *ngFor="let s of sectors()" [value]="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div class="field field-row">
            <input [(ngModel)]="form.is_admin" type="checkbox" id="is_admin" />
            <label for="is_admin">Administrador</label>
          </div>

          <div class="field field-row">
            <input [(ngModel)]="form.can_assign_tickets" type="checkbox" id="can_assign_tickets" />
            <label for="can_assign_tickets">Pode atribuir chamados a outros membros</label>
          </div>

          <p *ngIf="modalMode() === 'create'" class="info-tip">
            Uma senha temporária será gerada e enviada por e-mail. O membro deverá alterá-la no primeiro acesso.
          </p>

          <div *ngIf="error()" class="error">{{ error() }}</div>

          <div class="modal-actions">
            <button (click)="closeModal()" class="btn btn-outline">Cancelar</button>
            <button (click)="save()" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Sucesso Cadastro -->
      <div *ngIf="createdEmail()" class="overlay" (click)="createdEmail.set(null)">
        <div class="modal modal-sm" (click)="$event.stopPropagation()">
          <div class="success-icon">✓</div>
          <h3>Cadastrado Finalizado!</h3>
          <p>O cadastro foi realizado com sucesso. Um e-mail foi enviado para <strong>{{ createdEmail() }}</strong>.</p>
          <div class="modal-actions">
            <button (click)="createdEmail.set(null)" class="btn btn-primary">OK</button>
          </div>
        </div>
      </div>

      <!-- Modal Confirmação Exclusão -->
      <div *ngIf="deleteTarget()" class="overlay" (click)="deleteTarget.set(null)">
        <div class="modal modal-sm" (click)="$event.stopPropagation()">
          <h3>Confirmar exclusão</h3>
          <p>Tem certeza que deseja excluir <strong>{{ deleteTarget()?.first_name }} {{ deleteTarget()?.last_name }}</strong>?</p>
          <div *ngIf="error()" class="error">{{ error() }}</div>
          <div class="modal-actions">
            <button (click)="deleteTarget.set(null)" class="btn btn-outline">Cancelar</button>
            <button (click)="deleteUser()" class="btn btn-danger" [disabled]="saving()">
              {{ saving() ? 'Excluindo...' : 'Excluir' }}
            </button>
          </div>
        </div>
      </div>
    </fd-shell>
  `,
  styles: [`
    .page { padding: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h2 { font-size: 1.5rem; font-weight: 700; }
    .btn { padding: .5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: .85rem; }
    .btn-primary { background: #4f46e5; color: #fff; }
    .btn-outline { background: #fff; border: 1px solid #d1d5db; color: #374151; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-sm { padding: .3rem .65rem; }
    .table { width: 100%; border-collapse: collapse; font-size: .85rem; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
    th { text-align: left; padding: .75rem 1rem; border-bottom: 2px solid #e5e7eb; font-weight: 600; background: #f9fafb; }
    td { padding: .65rem 1rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    .actions { display: flex; gap: .5rem; }
    .badge { display: inline-block; padding: .2rem .6rem; border-radius: 20px; font-size: .75rem; font-weight: 600; border: none; cursor: pointer; }
    .badge-admin { background: #ede9fe; color: #5b21b6; }
    .badge-member { background: #f3f4f6; color: #374151; }
    .badge-can-assign { background: #dbeafe; color: #1e40af; }
    .badge-no-assign { background: #f3f4f6; color: #374151; }
    .badge-active { background: #d1fae5; color: #065f46; cursor: default; }
    .badge-inactive { background: #fee2e2; color: #991b1b; cursor: default; }
    .loading, .empty { color: #6b7280; text-align: center; padding: 3rem; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #fff; border-radius: 12px; padding: 1.75rem; width: 420px; max-width: 95vw; display: flex; flex-direction: column; gap: 1rem; }
    .modal-sm { width: 340px; }
    .modal h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
    .field { display: flex; flex-direction: column; gap: .3rem; }
    .field-row { flex-direction: row; align-items: center; gap: .5rem; }
    .field label { font-size: .85rem; font-weight: 600; color: #374151; }
    .input { padding: .5rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
    .input:focus { outline: 2px solid #4f46e5; border-color: transparent; }
    .input:disabled { background: #f3f4f6; color: #6b7280; cursor: not-allowed; }
    .modal-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: .5rem; }
    .error { background: #fee2e2; color: #991b1b; padding: .5rem .75rem; border-radius: 6px; font-size: .85rem; }
    .info-tip { font-size: .8rem; color: #6b7280; background: #f0f9ff; border: 1px solid #bae6fd; padding: .5rem .75rem; border-radius: 6px; margin: 0; }
    .success-icon { width: 3rem; height: 3rem; background: #d1fae5; color: #065f46; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700; margin: 0 auto; }
  `],
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private sectorService = inject(SectorService);

  users = signal<User[]>([]);
  sectors = signal<Sector[]>([]);
  loading = signal(true);
  showModal = signal(false);
  modalMode = signal<ModalMode>('create');
  saving = signal(false);
  error = signal<string | null>(null);
  deleteTarget = signal<User | null>(null);
  createdEmail = signal<string | null>(null);

  private editingId: string | null = null;

  form: { first_name: string; last_name: string; email: string; is_admin: boolean; can_assign_tickets: boolean; sector_id: string | null } = {
    first_name: '',
    last_name: '',
    email: '',
    is_admin: false,
    can_assign_tickets: false,
    sector_id: null,
  };

  ngOnInit(): void {
    this.load();
    this.sectorService.getAll().subscribe({
      next: (res) => this.sectors.set(res.results),
    });
  }

  load(): void {
    this.loading.set(true);
    this.userService.list().subscribe({
      next: (users) => { this.users.set(users); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = { first_name: '', last_name: '', email: '', is_admin: false, can_assign_tickets: false, sector_id: null };
    this.error.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
  }

  openEdit(user: User): void {
    this.editingId = user.id;
    this.form = { first_name: user.first_name, last_name: user.last_name, email: user.email, is_admin: user.is_admin, can_assign_tickets: user.can_assign_tickets, sector_id: null };
    this.error.set(null);
    this.modalMode.set('edit');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.error.set(null);
  }

  save(): void {
    this.error.set(null);
    if (this.modalMode() === 'create') {
      const payload: CreateUserPayload = {
        email: this.form.email,
        first_name: this.form.first_name,
        last_name: this.form.last_name,
        is_admin: this.form.is_admin,
        can_assign_tickets: this.form.can_assign_tickets,
        sector_id: this.form.sector_id || null,
      };
      this.saving.set(true);
      this.userService.create(payload).subscribe({
        next: (u) => { this.users.update((list) => [...list, u]); this.closeModal(); this.saving.set(false); this.createdEmail.set(u.email); },
        error: (err) => { this.error.set(err.error?.detail ?? 'Erro ao criar membro.'); this.saving.set(false); },
      });
    } else {
      const payload: UpdateUserPayload = {
        first_name: this.form.first_name,
        last_name: this.form.last_name,
        is_admin: this.form.is_admin,
        can_assign_tickets: this.form.can_assign_tickets,
      };
      this.saving.set(true);
      this.userService.update(this.editingId!, payload).subscribe({
        next: (u) => {
          this.users.update((list) => list.map((x) => (x.id === u.id ? u : x)));
          this.closeModal();
          this.saving.set(false);
        },
        error: (err) => { this.error.set(err.error?.detail ?? 'Erro ao atualizar membro.'); this.saving.set(false); },
      });
    }
  }

  toggleAdmin(user: User): void {
    this.userService.update(user.id, { is_admin: !user.is_admin }).subscribe({
      next: (u) => this.users.update((list) => list.map((x) => (x.id === u.id ? u : x))),
    });
  }

  toggleCanAssign(user: User): void {
    this.userService.update(user.id, { can_assign_tickets: !user.can_assign_tickets }).subscribe({
      next: (u) => this.users.update((list) => list.map((x) => (x.id === u.id ? u : x))),
    });
  }

  confirmDelete(user: User): void {
    this.error.set(null);
    this.deleteTarget.set(user);
  }

  deleteUser(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.saving.set(true);
    this.userService.delete(target.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== target.id));
        this.deleteTarget.set(null);
        this.saving.set(false);
      },
      error: (err) => { this.error.set(err.error?.detail ?? 'Erro ao excluir membro.'); this.saving.set(false); },
    });
  }
}
