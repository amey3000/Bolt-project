import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import type { View } from '@/components/Sidebar';
import { DashboardView } from '@/views/DashboardView';
import { TasksView } from '@/views/TasksView';
import { CalendarView } from '@/views/CalendarView';
import { HabitsView } from '@/views/HabitsView';
import { AuthPage } from '@/views/AuthPage';
import { useAuth } from '@/lib/auth';

function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar view={view} onChange={setView} />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
          {view === 'dashboard' && <DashboardView onNavigate={setView} />}
          {view === 'tasks' && <TasksView />}
          {view === 'calendar' && <CalendarView />}
          {view === 'habits' && <HabitsView />}
        </div>
      </main>
    </div>
  );
}

export default App;
