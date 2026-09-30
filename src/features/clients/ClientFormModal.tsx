import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabaseClient';
import { friendlyError } from '../../lib/search';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { CLIENT_STATUS_LABEL } from '../../lib/constants';
import { createClient, fetchClientServiceIds, fetchServices, updateClient } from './api';
import { clientSchema } from './schema';
import type { ClientOverview, Service } from '../../types/database';

type Form = z.infer<typeof clientSchema>;

export default function ClientFormModal({
  client,
  onClose,
  onSaved,
}: {
  client?: ClientOverview | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push, notifyError } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(clientSchema) as any,
    defaultValues: {
      name: client?.name ?? '',
      company_name: client?.company_name ?? '',
      phone: client?.phone ?? '',
      whatsapp: client?.whatsapp ?? '',
      email: client?.email ?? '',
      city: client?.city ?? '',
      instagram: client?.instagram ?? '',
      website: client?.website ?? '',
      notes: client?.notes ?? '',
      status: client?.status ?? 'onboarding',
      next_contact_at: client?.next_contact_at ?? '',
      service_ids: [],
    },
  });

  const selected = watch('service_ids');

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchServices();
        setServices(s);
        if (client) {
          const ids = await fetchClientServiceIds(client.id);
          setValue('service_ids', ids);
        }
      } catch (e) {
        notifyError(e instanceof Error ? e.message : String(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleService(id: string) {
    const cur = new Set(selected ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    setValue('service_ids', [...cur]);
  }

  async function handleAddService() {
    const name = newService.trim();
    if (!name) return;
    if (services.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      push('Este serviço já existe.', 'info');
      return;
    }
    const { data, error } = await supabase
      .from('services')
      .insert({ name, is_custom: true })
      .select('*')
      .single();
    if (error) {
      notifyError(friendlyError(error.message));
      return;
    }
    const created = data as Service;
    setServices((s) => [...s, created].sort((a, b) => a.name.localeCompare(b.name)));
    setValue('service_ids', [...(selected ?? []), created.id]);
    setNewService('');
    push('Serviço personalizado adicionado.', 'success');
  }

  async function onSubmit(data: Form) {
    try {
      const ids = data.service_ids ?? [];
      if (client) await updateClient(client.id, { ...data, service_ids: ids, status: data.status });
      else await createClient({ ...data, service_ids: ids, status: data.status });
      push(client ? 'Cliente atualizado.' : 'Cliente criado.', 'success');
      onSaved();
      onClose();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Modal title={client ? 'Editar cliente' : 'Novo cliente'} onClose={onClose} wide>
      <form onSubmit={handleSubmit((d) => onSubmit(d as Form))} className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="Nome *" error={errors.name?.message}>
            <Input {...register('name')} placeholder="Nome do cliente" />
          </Field>
        </div>
        <Field label="Empresa">
          <Input {...register('company_name')} placeholder="Empresa / negócio" />
        </Field>
        <Field label="Status">
          <Select {...register('status')}>
            {(Object.keys(CLIENT_STATUS_LABEL) as Array<keyof typeof CLIENT_STATUS_LABEL>).map((k) => (
              <option key={k} value={k}>
                {CLIENT_STATUS_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Telefone">
          <Input {...register('phone')} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="WhatsApp">
          <Input {...register('whatsapp')} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <Input {...register('email')} placeholder="cliente@email.com" />
        </Field>
        <Field label="Cidade">
          <Input {...register('city')} placeholder="Cidade" />
        </Field>
        <Field label="Instagram">
          <Input {...register('instagram')} placeholder="@usuario ou usuario" />
        </Field>
        <Field label="Site">
          <Input {...register('website')} placeholder="site.com ou https://site.com" />
        </Field>
        <Field label="Próximo contato">
          <Input type="date" {...register('next_contact_at')} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Observações">
            <Textarea rows={3} {...register('notes')} placeholder="Observações gerais" />
          </Field>
        </div>

        <div className="md:col-span-2 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-700">Serviços contratados</p>
          {services.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((s) => (
                <label
                  key={s.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                    (selected ?? []).includes(s.id)
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-300 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={(selected ?? []).includes(s.id)}
                    onChange={() => toggleService(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Novo serviço personalizado"
            />
            <Button type="button" variant="secondary" onClick={handleAddService}>
              Adicionar
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : client ? 'Salvar' : 'Criar cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
