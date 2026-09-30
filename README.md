# Painel — Carteira de Clientes

Sistema web interno (uso exclusivo do administrador) para gestão de clientes de consultoria em marketing digital. Stack: Vite + React + TypeScript + Tailwind + Supabase, deploy na Vercel.

## Rodar localmente

```
npm install
cp .env.example .env.local   # preencha com Project URL e anon key
npm run dev
```

## Verificações

```
npx tsc --noEmit
npm run build
```

## Estrutura

- `src/features/<modulo>/` — auth, dashboard, clients, publications, tasks, contacts, activity, services, settings. Novos módulos futuros (Google Ads, Meta Ads, Bot WhatsApp, Leads, Financeiro, Relatórios) entram como novas pastas + novas abas na ficha do cliente.
- `src/lib/` — cliente Supabase, constantes de rótulos (EN→PT), datas (fuso America/Sao_Paulo, `YYYY-MM-DD` sem bug de UTC), busca sem acento, toast.
- `src/types/database.ts` — tipos das tabelas.
- `supabase/migrations/` — schema, RLS, triggers de histórico, view `client_overview`. `supabase/seed-demo.sql` é opcional.

## Segurança

RLS ativado em todas as tabelas, política `admin_all` só para `authenticated`. Nunca usar `service_role` no front. `.env.local` não é commitado.
