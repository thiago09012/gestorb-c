import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { PUBLICATION_PLATFORMS, PUBLICATION_STATUS_LABEL, PUBLICATION_TYPES } from '../../lib/constants';
import { todayLocal } from '../../lib/dates';
import { createPublication, updatePublication } from './api';
import type { Publication } from '../../types/database';

const schema = z.object({
  published_at: z.string().min(1, 'Informe a data.'),
  platform: z.enum(['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Google', 'Blog', 'Outro']),
  type: z.enum(['Post', 'Reels', 'Story', 'Vídeo', 'Carrossel', 'Artigo', 'Anúncio', 'Outro']),
  title: z.string().trim().min(1, 'Informe o título.'),
  caption: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  status: z.enum(['idea', 'production', 'scheduled', 'published']),
  notes: z.string().optional().nullable(),
});

type Form = z.infer<typeof schema>;

export default function PublicationModal({
  clientId,
  publication,
  onClose,
  onSaved,
}: {
  clientId: string;
  publication?: Publication | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push, notifyError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      published_at: publication?.published_at ?? todayLocal(),
      platform: publication?.platform ?? 'Instagram',
      type: publication?.type ?? 'Post',
      title: publication?.title ?? '',
      caption: publication?.caption ?? '',
      url: publication?.url ?? '',
      status: publication?.status ?? 'idea',
      notes: publication?.notes ?? '',
    },
  });

  async function onSubmit(data: Form) {
    try {
      const payload = {
        client_id: clientId,
        published_at: data.published_at,
        platform: data.platform,
        type: data.type,
        title: data.title.trim(),
        caption: data.caption?.trim() || null,
        url: data.url?.trim() || null,
        status: data.status,
        notes: data.notes?.trim() || null,
      };
      if (publication) await updatePublication(publication.id, payload);
      else await createPublication(payload);
      push(publication ? 'Publicação atualizada.' : 'Publicação criada.', 'success');
      onSaved();
      onClose();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Modal title={publication ? 'Editar publicação' : 'Nova publicação'} onClose={onClose} wide>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
        <Field label="Data *" error={errors.published_at?.message}>
          <Input type="date" {...register('published_at')} />
        </Field>
        <Field label="Status">
          <Select {...register('status')}>
            {(Object.keys(PUBLICATION_STATUS_LABEL) as Array<keyof typeof PUBLICATION_STATUS_LABEL>).map((k) => (
              <option key={k} value={k}>{PUBLICATION_STATUS_LABEL[k]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Plataforma">
          <Select {...register('platform')}>
            {PUBLICATION_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Tipo">
          <Select {...register('type')}>
            {PUBLICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Título *" error={errors.title?.message}>
            <Input {...register('title')} placeholder="Título da publicação" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Legenda">
            <Textarea rows={3} {...register('caption')} placeholder="Legenda / texto" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Link">
            <Input {...register('url')} placeholder="https://…" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Observações">
            <Textarea rows={2} {...register('notes')} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
