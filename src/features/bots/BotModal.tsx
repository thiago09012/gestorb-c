import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { BOT_STATUS_LABEL } from '../../lib/constants';
import { fetchClients } from '../clients/api';
import { createBot, updateBot } from './api';
import type { Bot, ClientOverview } from '../../types/database';

const schema = z.object({
  client_id: z.string().min(1, 'Selecione o cliente.'),
  name: z.string().trim().min(1, 'Informe o nome do bot.'),
  provider: z.string().trim().optional().nullable(),
  instance_id: z.string().trim().optional().nullable(),
  status: z.enum(['online', 'offline', 'manutencao']),
  notes: z.string().optional().nullable(),
});

type Form = z.infer<typeof schema>;

export default function BotModal({
  fixedClientId,
  bot,
  onClose,
  onSaved,
}: {
  fixedClientId?: string;
  bot?: Bot | null;
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
      client_id: bot?.client_id ?? fixedClientId ?? '',
      name: bot?.name ?? '',
      provider: bot?.provider ?? 'whatsapp',
      instance_id: bot?.instance_id ?? '',
      status: bot?.status ?? 'online',
      notes: bot?.notes ?? '',
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
        name: data.name,
        provider: data.provider || 'whatsapp',
        instance_id: data.instance_id || null,
        status: data.status,
        notes: data.notes || null,
      };
      if (bot) await updateBot(bot.id, payload);
      else await createBot(payload);
      push(bot ? 'Bot atualizado.' : 'Bot cadastrado.', 'success');
      onSaved();
      onClose();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Modal title={bot ? 'Editar bot' : 'Novo bot'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
        {!fixedClientId && (
          <Field label="Cliente *" error={errors.client_id?.message}>
            <Select {...register('client_id')}>
              <option value="">Selecione…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Nome do bot *" error={errors.name?.message}>
          <Input {...register('name')} placeholder="Ex: Bot Atendimento Loja" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Provedor">
            <Input {...register('provider')} placeholder="whatsapp" />
          </Field>
          <Field label="ID da instância">
            <Input {...register('instance_id')} placeholder="Ex: teste-01" />
          </Field>
        </div>
        <Field label="Situação">
          <Select {...register('status')}>
            {(Object.keys(BOT_STATUS_LABEL) as Array<keyof typeof BOT_STATUS_LABEL>).map((k) => (
              <option key={k} value={k}>{BOT_STATUS_LABEL[k]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Observações">
          <Textarea rows={2} {...register('notes')} placeholder="Ex: número, servidor, link do provedor…" />
        </Field>
        <p className="text-xs text-slate-500">
          Depois de salvar, o bot precisa avisar a cada 2 min via POST em /rest/v1/rpc/report_bot_heartbeat com o id dele. Sem aviso por 5 min ele fica vermelho como Offline.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
