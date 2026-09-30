import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { CONTACT_CHANNELS } from '../../lib/constants';
import { todayLocal } from '../../lib/dates';
import { createContact } from './api';

const schema = z.object({
  contacted_at: z.string().min(1, 'Informe a data.'),
  channel: z.enum(['WhatsApp', 'Telefone', 'Instagram', 'E-mail', 'Reunião', 'Outro']),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type Form = z.infer<typeof schema>;

export default function ContactModal({
  clientId,
  onClose,
  onSaved,
}: {
  clientId: string;
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
    defaultValues: { contacted_at: todayLocal(), channel: 'WhatsApp', subject: '', notes: '' },
  });

  async function onSubmit(data: Form) {
    try {
      await createContact({ client_id: clientId, ...data });
      push('Contato registrado.', 'success');
      onSaved();
      onClose();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Modal title="Registrar contato" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data *" error={errors.contacted_at?.message}>
            <Input type="date" {...register('contacted_at')} />
          </Field>
          <Field label="Canal">
            <Select {...register('channel')}>
              {CONTACT_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Assunto">
          <Input {...register('subject')} placeholder="Sobre o que falaram?" />
        </Field>
        <Field label="Notas">
          <Textarea rows={3} {...register('notes')} placeholder="Resumo da conversa" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
