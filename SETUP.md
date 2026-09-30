# SETUP — Painel de Clientes (passo a passo, em linguagem simples)

Este guia coloca o sistema no ar. Você faz a parte manual (Supabase + Vercel); o código já está pronto.

## O que você precisa ter

- Uma conta no [Supabase](https://supabase.com) (gratuita).
- Uma conta no [GitHub](https://github.com) e na [Vercel](https://vercel.com) (gratuitas).
- Node.js 20+ instalado no seu computador.

## Passo 1 — Criar o projeto no Supabase

1. Acesse supabase.com → **New project**.
2. Escolha nome (ex.: `painel-clientes`), senha do banco (guarde bem) e região próxima (ex.: South America - São Paulo).
3. Aguarde a criação (1–2 minutos).

## Passo 2 — Rodar as migrations (criar as tabelas)

1. No Supabase, abra **SQL Editor** → **New query**.
2. Abra nesta ordem os arquivos da pasta `supabase/migrations/` do repositório e execute um por vez (cole o conteúdo e clique em **Run**):
   - `001_schema.sql` (tabelas + serviços padrão)
   - `002_rls.sql` (segurança: só usuário logado acessa)
   - `003_activity_triggers.sql` (histórico automático)
   - `004_views.sql` (visão agregada por cliente)
3. Confira em **Table Editor** se as tabelas `clients`, `services`, `tasks`, `publications`, `contacts` e `activity_logs` existem.

> Opcional (só para testar o visual): rode o arquivo `supabase/seed-demo.sql` no SQL Editor.
> Para apagar os dados de teste depois, rode: `delete from clients;`

## Passo 3 — Criar seu usuário e fechar cadastros

1. No Supabase, vá em **Authentication → Users → Add user → Create new user**.
2. Informe seu e-mail e uma senha forte. Marque **Auto Confirm user**.
3. Depois vá em **Authentication → Sign In / Providers** e **DESLIGUE** a opção **"Allow new users to sign up"**.
4. Pronto: só você entra, pela tela de login do painel. Não há botão de cadastro no sistema.

## Passo 4 — Copiar as chaves para o `.env.local`

1. No Supabase, vá em **Project Settings → API**.
2. Copie a **Project URL** e a chave **anon / public**.
3. Na raiz do projeto, crie o arquivo `.env.local` (não commite!) com:
   ```
   VITE_SUPABASE_URL=https://sua-url.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   ```
4. Rode localmente para testar:
   ```
   npm install
   npm run dev
   ```
5. Abra o endereço mostrado (geralmente http://localhost:5173), faça login e cadastre um cliente de teste.

> ⚠️ Nunca use a chave `service_role` no front-end. Ela fica só no servidor. Se a tela mostrar "Configuração pendente", é porque o `.env.local` está faltando.

## Passo 5 — Publicar na Vercel

1. Suba o código para um repositório no GitHub (sem o `.env.local` — o `.gitignore` já o bloqueia).
2. Na Vercel, clique **Add New → Project → Import** o repositório.
3. Configurações do projeto:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Em **Environment Variables**, adicione (em **Production** e **Preview**):
   - `VITE_SUPABASE_URL` = sua Project URL
   - `VITE_SUPABASE_ANON_KEY` = sua anon key
5. Clique **Deploy** e anote a URL final (ex.: `https://painel-clientes.vercel.app`).

## Passo 6 — Avisar o Supabase qual é a URL final

1. No Supabase, vá em **Authentication → URL Configuration**.
2. Em **Site URL**, coloque a URL da Vercel.
3. Em **Redirect URLs**, adicione a mesma URL (e `http://localhost:5173` para testes locais).
4. Salve. Recarregue o painel na Vercel e faça login — a sessão deve persistir.

## Evoluções futuras (não fazer agora)

- **Supabase Storage** (para anexos/prints): criar um bucket privado e referenciar por URL. Não implementado nesta versão.
- Novos módulos (Google Ads, Meta Ads, Bot WhatsApp, Leads, Financeiro, Relatórios): criar novas pastas em `src/features/<modulo>/` e novas abas na ficha do cliente.

## Checklist final

- [ ] Projeto criado no Supabase
- [ ] 4 migrations rodadas no SQL Editor (tabelas visíveis no Table Editor)
- [ ] Meu usuário criado em Authentication → Users
- [ ] "Allow new users to sign up" DESLIGADO
- [ ] `.env.local` criado localmente (sem commit) e login funcionando com `npm run dev`
- [ ] Repositório no GitHub importado na Vercel
- [ ] Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas na Vercel (Production + Preview)
- [ ] Deploy concluído e Site URL / Redirect URLs ajustadas no Supabase
- [ ] Login na URL da Vercel funcionando e dados persistindo após recarregar
