import type {
  BotStatus,
  ClientStatus,
  ContactChannel,
  PublicationPlatform,
  PublicationStatus,
  PublicationType,
  TaskPriority,
  TaskStatus,
} from '../types/database';

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: 'Ativo',
  onboarding: 'Em implantação',
  paused: 'Pausado',
  closed: 'Encerrado',
};

export const CLIENT_STATUS_BADGE: Record<ClientStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  onboarding: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paused: 'bg-slate-200 text-slate-700 border-slate-300',
  closed: 'bg-red-100 text-red-800 border-red-200',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluída',
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
};

export const PUBLICATION_STATUS_LABEL: Record<PublicationStatus, string> = {
  idea: 'Ideia',
  production: 'Em produção',
  scheduled: 'Agendada',
  published: 'Publicada',
};

export const PUBLICATION_PLATFORMS: PublicationPlatform[] = [
  'Instagram',
  'Facebook',
  'TikTok',
  'YouTube',
  'Google',
  'Blog',
  'Outro',
];

export const PUBLICATION_TYPES: PublicationType[] = [
  'Post',
  'Reels',
  'Story',
  'Vídeo',
  'Carrossel',
  'Artigo',
  'Anúncio',
  'Outro',
];

export const CONTACT_CHANNELS: ContactChannel[] = [
  'WhatsApp',
  'Telefone',
  'Instagram',
  'E-mail',
  'Reunião',
  'Outro',
];

export const CLIENT_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'onboarding', label: 'Em implantação' },
  { value: 'paused', label: 'Pausados' },
  { value: 'closed', label: 'Encerrados' },
] as const;

export const BOT_STATUS_LABEL: Record<BotStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  manutencao: 'Em manutenção',
};

export const BOT_STATUS_BADGE: Record<BotStatus, string> = {
  online: 'bg-green-100 text-green-800 border-green-200',
  offline: 'bg-red-100 text-red-800 border-red-200',
  manutencao: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};
