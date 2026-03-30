// Models
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  can_assign_tickets: boolean;
  created_at: string;
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  can_assign_tickets?: boolean;
  sector_id?: string | null;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  is_admin?: boolean;
  can_assign_tickets?: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface Sector {
  id: string;
  name: string;
  description: string;
  members: User[];
  member_count: number;
  created_at: string;
}

export interface TicketStatus {
  id: string;
  name: string;
  sector: Sector | null;
  is_default: boolean;
  order: number;
}

export interface TicketObservation {
  id: string;
  content: string;
  created_by: User;
  created_at: string;
}

export interface Ticket {
  id: string;
  protocol: string;
  title: string;
  description: string;
  requesting_sector: Sector;
  responsible_sector: Sector;
  status: TicketStatus;
  created_by: User;
  updated_by: User | null;
  assigned_to: User | null;
  created_at: string;
  updated_at: string;
  observations: TicketObservation[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TokenPair {
  access: string;
  refresh: string;
}

// Auth state stored in localStorage
export interface AuthState {
  access: string;
  refresh: string;
  user?: Partial<User>;
}
