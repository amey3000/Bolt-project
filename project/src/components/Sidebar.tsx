import { useState } from 'react';
import { LayoutDashboard, KanbanSquare, CalendarClock, Target, Menu, X, Sparkles, LogOut, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export type View = 'dashboard' | 'tasks' | 'calendar' | 'habits';

interface SidebarProps {
  view: View;
  onChange: (v: View) => void;
}

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: KanbanSquare },
  { id: 'calendar', label: 'Schedule', icon: CalendarClock },
  { id: 'habits', label: 'Habits', icon: Target },
];

export function Sidebar({ view, onChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const email = user?.email ?? '';

  const handleSelect = (v: View) => {
    onChange(v);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-semibold text-slate-900">Dayflow</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-soft">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">Dayflow</div>
              <div className="text-[11px] text-slate-400 leading-tight">Day planner</div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  size={19}
                  className={active ? 'text-brand-600' : 'text-slate-400'}
                />
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0 space-y-3">
          <div className="rounded-xl bg-gradient-to-br from-brand-50 to-slate-50 p-3.5 border border-brand-100/60">
            <p className="text-xs font-semibold text-slate-700">Plan your day</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Stay focused with tasks, time blocks, and habits.
            </p>
          </div>
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
              {email ? email[0].toUpperCase() : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-700 truncate">{email || 'Signed in'}</p>
              <button
                onClick={() => signOut()}
                className="text-[11px] text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 transition-colors"
              >
                <LogOut size={11} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
