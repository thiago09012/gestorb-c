import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '../../lib/constants';
import { fetchClients } from '../clients/api';
import { createTask, updateTask } from './api';
import type { ClientOverview, Task } from '../../types/database';

const schema = z.object({
  client_id: z.string().min(1, 'Selecione o cliente.'),
  title: z.string().trim().min(1, 'Informe o título.'),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high']),
  status: z.enum(['pending', 'in_progress', 'done']),
  notes: z.string().optional().nullable(),
});

type Form = z.infer<typeof schema>;

export default function TaskModal({
  fixedClientId,
  task,
  onClose,
  onSaved,
}: {
  fixedClientId?: string;
  task?: (Task & { client_name?: string }) | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push, notifyError } = useToast();
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: task?.client_id ?? fixedClientId ?? '',
      title: task?.title ?? '',
      description: task?.description ?? '',
      due_date: task?.due_date ?? '',
      priority: task?.priority ?? 'normal',
      status: task?.status ?? 'pending',
      notes: task?.notes ?? '',
    },
  });

  useEffect(() => {
    if (fixedClientId) return;
    fetchClients().then(setClients).catch((e) => notifyError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(data: Form) {
    try {
      const payload = {
        client_id: data.client_id,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        priority: data.priority,
        status: data.status,
        notes: data.notes || null,
      };
      if (task) await updateTask(task.id, payload);
      else await createTask(payload);
      push(task ? 'Tarefa atualizada.' : 'Tarefa criada.', 'success');
      onSaved();
      onClose();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Modal title={task ? 'Editar tarefa' : 'Nova tarefa'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
        {!fixedClientId && (
          <Field label="Cliente *" error={errors.client_id?.message}>
            <Select {...register('client_id')}>
              <option value="">Selecione…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Título *" error={errors.title?.message}>
          <Input {...register('title')} placeholder="O que precisa ser feito?" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prazo">
            <Input type="date" {...register('due_date')} />
          </Field>
          <Field label="Prioridade">
            <Select {...register('priority')}>
              {(Object.keys(TASK_PRIORITY_LABEL) as Array<keyof typeof TASK_PRIORITY_LABEL>).map((k) => (
                <option key={k} value={k}>{TASK_PRIORITY_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Situação">
          <Select {...register('status')}>
            {(Object.keys(TASK_STATUS_LABEL) as Array<keyof typeof TASK_STATUS_LABEL>).map((k) => (
              <option key={k} value={k}>{TASK_STATUS_LABEL[k]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição">
          <Textarea rows={3} {...register('description')} />
        </Field>
        <Field label="Notas">
          <Textarea rows={2} {...register('notes')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
