import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useGuild } from './context/GuildContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { GuildSelectPage } from './pages/GuildSelectPage';
import { OverviewPage } from './pages/OverviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { CommandsPage } from './pages/CommandsPage';
import { ModulesPage } from './pages/ModulesPage';
import { ModerationPage } from './pages/ModerationPage';
import { WelcomePage } from './pages/WelcomePage';
import { TicketsPage } from './pages/TicketsPage';
import { LogsPage } from './pages/LogsPage';
import { RolePanelsPage } from './pages/RolePanelsPage';
import { SecurityPage } from './pages/SecurityPage';
import { LevelingPage } from './pages/LevelingPage';
import { GiveawaysPage } from './pages/GiveawaysPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { CustomCommandsPage } from './pages/CustomCommandsPage';
import { AccountPage } from './pages/AccountPage';
import { ToastMessage } from './types';

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedGuild, selectGuild } = useGuild();

  const [currentPath, setCurrentPath] = useState<string>('/overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Écran de chargement initial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-ethone-bg flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-ethone-accent to-ethone-cyan p-0.5 shadow-glow animate-pulse">
          <div className="w-full h-full bg-[#08090C] rounded-[14px] flex items-center justify-center text-xl">
            ⚡
          </div>
        </div>
        <p className="text-xs font-mono text-slate-400">Chargement de la session ETHONE...</p>
      </div>
    );
  }

  // 2. Utilisateur non connecté -> Page de Login
  if (!user) {
    return <LoginPage />;
  }

  // 3. Utilisateur sans serveur sélectionné ou sur la page de choix des serveurs
  if (!selectedGuild || currentPath === '/guilds') {
    return (
      <div className="min-h-screen bg-ethone-bg">
        <Navbar
          onToggleMobileSidebar={() => {}}
          isMobileSidebarOpen={false}
        />
        <GuildSelectPage
          onSelectGuild={(id) => {
            selectGuild(id);
            setCurrentPath('/overview');
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // 4. Dashboard connecté sur un serveur actif
  return (
    <div className="min-h-screen bg-ethone-bg text-slate-200">
      <Navbar
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      <div className="flex">
        <Sidebar
          currentPath={currentPath}
          onNavigate={(path) => setCurrentPath(path)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full min-w-0">
          {currentPath === '/overview' && (
            <OverviewPage
              guildId={selectedGuild.id}
              onNavigate={(path) => setCurrentPath(path)}
            />
          )}

          {currentPath === '/settings/appearance' && (
            <SettingsPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/settings/commands' && (
            <CommandsPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/modules' && (
            <ModulesPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/moderation' && (
            <ModerationPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/welcome' && (
            <WelcomePage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/tickets' && (
            <TicketsPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/logs' && (
            <LogsPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/roles' && (
            <RolePanelsPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/security' && (
            <SecurityPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/leveling' && (
            <LevelingPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/giveaways' && (
            <GiveawaysPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/analytics' && (
            <AnalyticsPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/suggestions' && (
            <SuggestionsPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/commands' && (
            <CustomCommandsPage guildId={selectedGuild.id} onShowToast={showToast} />
          )}

          {currentPath === '/account' && <AccountPage />}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
