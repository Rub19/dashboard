import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Guild } from '../types';
import { useAuth } from './AuthContext';

interface GuildContextType {
  guilds: Guild[];
  selectedGuild: Guild | null;
  loading: boolean;
  selectGuild: (id: string) => void;
  refreshGuilds: () => Promise<void>;
}

const GuildContext = createContext<GuildContextType | undefined>(undefined);

export const GuildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshGuilds = async () => {
    if (!user) {
      setGuilds([]);
      setSelectedGuild(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getGuilds();
      setGuilds(res.guilds);

      // Restaurer le serveur sélectionné sauvegardé
      const savedId = localStorage.getItem('ethone_selected_guild_id');
      if (savedId) {
        const found = res.guilds.find((g) => g.id === savedId);
        if (found) {
          setSelectedGuild(found);
          return;
        }
      }

      // Par défaut, sélectionner le premier où le bot est présent
      const firstWithBot = res.guilds.find((g) => g.botPresent);
      if (firstWithBot) {
        setSelectedGuild(firstWithBot);
        localStorage.setItem('ethone_selected_guild_id', firstWithBot.id);
      } else if (res.guilds.length > 0) {
        setSelectedGuild(res.guilds[0]);
      }
    } catch {
      setGuilds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshGuilds();
  }, [user]);

  const selectGuild = (id: string) => {
    const found = guilds.find((g) => g.id === id);
    if (found) {
      setSelectedGuild(found);
      localStorage.setItem('ethone_selected_guild_id', found.id);
    }
  };

  return (
    <GuildContext.Provider
      value={{
        guilds,
        selectedGuild,
        loading,
        selectGuild,
        refreshGuilds,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
};

export const useGuild = () => {
  const context = useContext(GuildContext);
  if (!context) throw new Error('useGuild doit être utilisé dans un GuildProvider');
  return context;
};
