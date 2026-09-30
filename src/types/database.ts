// Tipos espelhando o schema do Supabase (snake_case do banco).

export type ClientStatus = 'active' | 'onboarding' | 'paused' | 'closed';
export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';
export type PublicationStatus = 'idea' | 'production' | 'scheduled' | 'published';
export type PublicationPlatform =
  | 'Instagram'
  | 'Facebook'
  | 'TikTok'
  | 'YouTube'
  | 'Google'
  | 'Blog'
  | 'Outro';
export type PublicationType =
  | 'Post'
  | 'Reels'
  | 'Story'
  | 'Vídeo'
  | 'Carrossel'
  | 'Artigo'
  | 'Anúncio'
  | 'Outro';
export type ContactChannel =
  | 'WhatsApp'
  | 'Telefone'
  | 'Instagram'
  | 'E-mail'
  | 'Reunião'
  | 'Outro';

export interface Client {
  id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  instagram: string | null;
  website: string | null;
  notes: string | null;
  status: ClientStatus;
  next_contact_at: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  is_custom: boolean;
  created_at: string;
}

export interface ClientService {
  id: string;
  client_id: string;
  service_id: string;
  created_at: string;
}

export interface Publication {
  id: string;
  client_id: string;
  published_at: string; // YYYY-MM-DD
  platform: PublicationPlatform;
  type: PublicationType;
  title: string;
  caption: string | null;
  url: string | null;
  status: PublicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  due_date: string | null; // YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_id: string;
  contacted_at: string; // YYYY-MM-DD
  channel: ContactChannel;
  subject: string | null;
  notes: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  client_id: string;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type BotStatus = 'online' | 'offline' | 'manutencao';

export interface Bot {
  id: string;
  client_id: string;
  name: string;
  provider: string;
  instance_id: string | null;
  status: BotStatus;
  last_seen_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  qr_code?: string | null;
  qr_updated_at?: string | null;
  connection_status?: string | null;
  pending_command?: string | null;
  command_requested_at?: string | null;
}

// Linha da view client_overview
export interface ClientOverview extends Client {
  services: string[];
  last_contact_at: string | null;
  last_contact_channel: ContactChannel | null;
  last_contact_subject: string | null;
  next_task_title: string | null;
  next_task_due: string | null;
  last_activity_at: string | null;
  bots_total?: number | null;
  bots_online?: number | null;
  bots_offline?: number | null;
  last_bot_seen_at?: string | null;
}
