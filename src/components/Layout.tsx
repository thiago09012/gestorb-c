import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CalendarCheck, LayoutDashboard, LogOut, Megaphone, Menu, Settings, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../lib/toast';
import { friendlyError } from '../lib/search';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/tarefas', label: 'Tarefas', icon: CalendarCheck, end: false },
  { to: '/publicacoes', label: 'Publicações', icon: Megaphone, end: false },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, end: false },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { push } = useToast();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) push(friendlyError(error.message), 'error');
    navigate('/login');
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {LINKS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
      <button
        onClick={handleLogout}
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <LogOut size={18} />
        Sair
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* Topbar mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-bold">Gestor B&C</span>
        <button onClick={() => setOpen(!open)} aria-label="Abrir menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden min-h-screen w-60 shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="px-5 py-4 font-bold text-lg">Gestor B&C</div>
          {nav}
        </aside>

        {/* Drawer mobile */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
              <div className="px-5 py-4 font-bold">Gestor B&C</div>
              {nav}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
