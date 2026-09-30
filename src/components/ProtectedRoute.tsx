import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Spinner } from './ui';

export function EnvMissingScreen() {
  return (
    <div className="mx-auto mt-20 max-w-xl rounded-xl border border-red-300 bg-white p-8 text-center shadow">
      <h1 className="text-xl font-bold text-red-700">Configuração pendente</h1>
      <p className="mt-3 text-sm text-slate-600">
        As variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> não foram
        encontradas. Crie o arquivo <code>.env.local</code> na raiz do projeto (veja{' '}
        <code>.env.example</code> e o <code>SETUP.md</code>) com a Project URL e a anon key do seu
        projeto Supabase, depois reinicie o servidor. Na Vercel, configure as mesmas variáveis em
        Production e Preview.
      </p>
    </div>
  );
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? 'ok' : 'denied');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? 'ok' : 'denied');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === 'loading') return <Spinner />;
  if (state === 'denied') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
