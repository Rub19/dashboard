import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ChannelItem,
  DiscordCategoryItem,
  RoleItem,
  Ticket,
  TicketCategory,
  TicketGlobalConfig,
  TicketOverview,
  TicketPanel,
} from '../types';
import { DiscordPanelPreview } from '../components/DiscordPanelPreview';
import { Skeleton } from '../components/Skeleton';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  FolderTree,
  Hash,
  Layers,
  Layout,
  MessageSquare,
  PanelTop,
  Plus,
  Radio,
  Save,
  Send,
  Settings,
  Shield,
  Tag,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface TicketsPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const TicketsPage: React.FC<TicketsPageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'panels' | 'categories' | 'transcripts' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Données serveur Discord
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [discordCategories, setDiscordCategories] = useState<DiscordCategoryItem[]>([]);
  const [serverName, setServerName] = useState('Mon Serveur');
  const [botName, setBotName] = useState('Ethone Bot');

  // Données Tickets
  const [overview, setOverview] = useState<TicketOverview | null>(null);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [config, setConfig] = useState<TicketGlobalConfig | null>(null);

  // Éditeur de Panel
  const [selectedPanel, setSelectedPanel] = useState<TicketPanel | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingPanel, setSavingPanel] = useState(false);

  // Éditeur de Catégorie (Modal)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<TicketCategory>>({
    name: '',
    emoji: '🎫',
    color: '#5865F2',
    description: '',
    discordCategoryId: null,
    supportRoleIds: [],
    formFields: [],
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ovRes, catsRes, pnlRes, cfgRes, chanRes, roleRes, dCatsRes, ovGlobal] =
        await Promise.all([
          api.getTicketOverview(guildId),
          api.getTicketCategories(guildId),
          api.getTicketPanels(guildId),
          api.getTicketConfig(guildId),
          api.getChannels(guildId),
          api.getRoles(guildId),
          api.getDiscordCategories(guildId),
          api.getOverview(guildId).catch(() => null),
        ]);

      setOverview(ovRes);
      setCategories(catsRes.categories);
      setPanels(pnlRes.panels);
      setConfig(cfgRes.config);
      setChannels(chanRes.channels);
      setRoles(roleRes.roles);
      setDiscordCategories(dCatsRes.categories);

      if (ovGlobal) {
        setServerName(ovGlobal.guild.name);
        setBotName(ovGlobal.config.botName || 'Ethone Bot');
      }

      // Initialiser le panel sélectionné s'il existe
      if (pnlRes.panels.length > 0) {
        setSelectedPanel(pnlRes.panels[0]);
      } else {
        setSelectedPanel({
          id: `panel_${Date.now()}`,
          guildId,
          channelId: null,
          messageId: null,
          title: '🎫 Centre d’Assistance & Support',
          description:
            'Besoin d’aide, d’une question ou d’un renseignement ?\nCliquez sur le bouton ci-dessous pour ouvrir un ticket auprès de notre équipe.',
          color: '#5865F2',
          buttonLabel: 'Ouvrir un ticket',
          buttonEmoji: '🎫',
          categoryIds: catsRes.categories.map((c) => c.id),
        });
      }
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement des tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [guildId]);

  // Sauvegarder Panel
  const handleSavePanel = async () => {
    if (!selectedPanel) return;
    setSavingPanel(true);
    try {
      const res = await api.saveTicketPanel(guildId, selectedPanel);
      setSelectedPanel(res.panel);
      setPanels((prev) => {
        const index = prev.findIndex((p) => p.id === res.panel.id);
        if (index >= 0) {
          const copy = [...prev];
          copy[index] = res.panel;
          return copy;
        }
        return [...prev, res.panel];
      });
      onShowToast('Panel de tickets enregistré avec succès !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur sauvegarde panel', 'error');
    } finally {
      setSavingPanel(false);
    }
  };

  // Publier Panel sur Discord
  const handlePublishPanel = async () => {
    if (!selectedPanel || !selectedPanel.channelId) {
      onShowToast('Veuillez sélectionner un salon textuel de destination.', 'error');
      return;
    }
    setPublishing(true);
    try {
      const res = await api.publishTicketPanel(guildId, selectedPanel.id, selectedPanel.channelId);
      onShowToast(`Panel publié avec succès dans #${res.channelName} !`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Échec de la publication sur Discord', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Sauvegarder Catégorie
  const handleSaveCategory = async () => {
    if (!editingCategory.name) {
      onShowToast('Veuillez renseigner le nom de la catégorie.', 'error');
      return;
    }
    try {
      const res = await api.saveTicketCategory(guildId, editingCategory);
      setCategories((prev) => {
        const idx = prev.findIndex((c) => c.id === res.category.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = res.category;
          return copy;
        }
        return [...prev, res.category];
      });
      setIsCategoryModalOpen(false);
      onShowToast(`Catégorie "${res.category.name}" enregistrée !`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur sauvegarde catégorie', 'error');
    }
  };

  // Supprimer Catégorie
  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Supprimer cette catégorie de tickets ?')) return;
    try {
      await api.deleteTicketCategory(guildId, catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      onShowToast('Catégorie supprimée.', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur suppression', 'error');
    }
  };

  if (loading || !overview || !config) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Système</span>
            <span>/</span>
            <span className="text-slate-200">Support Tickets</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Système de Tickets & Assistance
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Panels interactifs, support multi-catégories, formulaires modals et transcripts HTML.
          </p>
        </div>
      </div>

      {/* Navigation sous-onglets */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Vue d'ensemble</span>
        </button>

        <button
          onClick={() => setActiveTab('panels')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'panels'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PanelTop className="w-3.5 h-3.5" />
          <span>Panels Builder</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Catégories</span>
        </button>

        <button
          onClick={() => setActiveTab('transcripts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'transcripts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Transcripts</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Paramètres</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ONGLET VUE D'ENSEMBLE */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cartes Métriques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Tickets Ouverts</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{overview.openCount}</div>
            </div>
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Tickets Fermés</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{overview.closedCount}</div>
            </div>
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Total Tickets</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.totalCount}</div>
            </div>
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Staff Actif</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {overview.staffLeaderboard.length}
              </div>
            </div>
          </div>

          {/* Tableau des tickets récents */}
          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Activité Récente des Tickets
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {overview.recentTickets.length} affichés
              </span>
            </div>

            {overview.recentTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Aucun ticket n'a encore été créé sur ce serveur.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Créateur</th>
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Prise en charge</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Transcript</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {overview.recentTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-white">#{t.id}</td>
                        <td className="px-4 py-3 text-slate-300">{t.userTag}</td>
                        <td className="px-4 py-3 text-slate-300">{t.categoryName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                              t.status === 'open'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : t.status === 'claimed'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          {t.claimedBy ? `@${t.claimedBy.tag}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {t.status === 'closed' ? (
                            <a
                              href={`/api/guilds/${guildId}/tickets/transcripts/${t.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              <span>HTML</span>
                            </a>
                          ) : (
                            <span className="text-slate-600 font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGLET PANELS BUILDER */}
      {/* ========================================================================= */}
      {activeTab === 'panels' && selectedPanel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulaire de configuration du Panel (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Éditeur de Panel Discord</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePublishPanel}
                    disabled={publishing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{publishing ? 'Publication...' : 'Publier sur Discord'}</span>
                  </button>
                  <button
                    onClick={handleSavePanel}
                    disabled={savingPanel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium text-xs border border-white/[0.08] transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>

              {/* Salon cible de publication */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Salon Discord où publier le panel</span>
                </label>
                <select
                  value={selectedPanel.channelId || ''}
                  onChange={(e) =>
                    setSelectedPanel({ ...selectedPanel, channelId: e.target.value || null })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choisir un salon textuel --</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Titre & Couleur */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] text-slate-400">Titre de l'embed</label>
                  <input
                    type="text"
                    value={selectedPanel.title}
                    onChange={(e) =>
                      setSelectedPanel({ ...selectedPanel, title: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Couleur d'accent (HEX)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedPanel.color || '#5865F2'}
                      onChange={(e) =>
                        setSelectedPanel({ ...selectedPanel, color: e.target.value })
                      }
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedPanel.color}
                      onChange={(e) =>
                        setSelectedPanel({ ...selectedPanel, color: e.target.value })
                      }
                      className="w-full px-2 py-1.5 rounded bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Description du panel</label>
                <textarea
                  rows={3}
                  value={selectedPanel.description}
                  onChange={(e) =>
                    setSelectedPanel({ ...selectedPanel, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs resize-none"
                />
              </div>

              {/* Catégories associées aux boutons du panel */}
              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                <label className="text-xs font-medium text-slate-300">
                  Catégories affichées sur ce panel :
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const isSelected = selectedPanel.categoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? selectedPanel.categoryIds.filter((id) => id !== c.id)
                            : [...selectedPanel.categoryIds, c.id];
                          setSelectedPanel({ ...selectedPanel, categoryIds: updated });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{c.emoji || '🎫'}</span>
                        <span>{c.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Discord (5 cols) */}
          <div className="lg:col-span-5 space-y-3 sticky top-20">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Aperçu du Panel Discord
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Preview
              </span>
            </div>

            <DiscordPanelPreview
              botName={botName}
              serverName={serverName}
              panel={selectedPanel}
              categories={categories}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ONGLET CATÉGORIES */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Catégories de Support ({categories.length})
            </h3>
            <button
              onClick={() => {
                setEditingCategory({
                  name: '',
                  emoji: '🎫',
                  color: '#5865F2',
                  description: '',
                  discordCategoryId: null,
                  supportRoleIds: [],
                  formFields: [],
                });
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Catégorie</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      {cat.emoji || '🎫'}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{cat.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{cat.description || '—'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-white/[0.04] space-y-1 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Catégorie Discord :</span>
                    <span className="font-mono text-slate-200">
                      {discordCategories.find((dc) => dc.id === cat.discordCategoryId)?.name || 'Aucune'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rôles Support :</span>
                    <span className="font-mono text-slate-200">
                      {cat.supportRoleIds?.length || 0} rôle(s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Formulaire modal :</span>
                    <span className="font-mono text-slate-200">
                      {cat.formFields?.length ? `${cat.formFields.length} champ(s)` : 'Non'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingCategory(cat);
                    setIsCategoryModalOpen(true);
                  }}
                  className="w-full py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-colors"
                >
                  Modifier la catégorie
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ONGLET TRANSCRIPTS */}
      {/* ========================================================================= */}
      {activeTab === 'transcripts' && (
        <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Archives des Transcripts HTML
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {overview.recentTickets.filter((t) => t.status === 'closed').length} archivés
            </span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {overview.recentTickets
              .filter((t) => t.status === 'closed')
              .map((t) => (
                <div
                  key={t.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">#{t.id}</span>
                      <span className="text-xs text-slate-300">• {t.categoryName}</span>
                      <span className="text-xs text-slate-400">({t.userTag})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Fermé le {t.closedAt ? new Date(t.closedAt).toLocaleString('fr-FR') : '—'}
                      {t.closedBy && ` par @${t.closedBy.tag}`}
                    </div>
                  </div>

                  <a
                    href={`/api/guilds/${guildId}/tickets/transcripts/${t.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-colors w-fit"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visualiser Transcript HTML</span>
                  </a>
                </div>
              ))}

            {overview.recentTickets.filter((t) => t.status === 'closed').length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Aucun transcript disponible pour le moment.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ONGLET PARAMÈTRES */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Paramètres Globaux des Tickets</h3>

          <div className="space-y-3 pt-2 border-t border-white/[0.04]">
            {/* Limite de tickets par utilisateur */}
            <div className="space-y-1">
              <label className="text-xs text-slate-300">
                Nombre maximum de tickets ouverts par utilisateur
              </label>
              <select
                value={config.maxOpenTicketsPerUser}
                onChange={(e) =>
                  setConfig({ ...config, maxOpenTicketsPerUser: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
              >
                <option value="1">1 ticket simultané</option>
                <option value="2">2 tickets simultanés</option>
                <option value="3">3 tickets simultanés</option>
                <option value="5">5 tickets simultanés</option>
              </select>
            </div>

            {/* Salon des logs */}
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Salon de logs d'audit des tickets</label>
              <select
                value={config.logChannelId || ''}
                onChange={(e) => setConfig({ ...config, logChannelId: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
              >
                <option value="">-- Recherche automatique (#ticket-log, #mod-log) --</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={async () => {
                try {
                  await api.updateTicketConfig(guildId, config);
                  onShowToast('Paramètres des tickets sauvegardés !', 'success');
                } catch (err: any) {
                  onShowToast(err.message || 'Erreur sauvegarde', 'error');
                }
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors mt-2"
            >
              Enregistrer les paramètres
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CRÉATION / ÉDITION DE CATÉGORIE */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-white">Catégorie de Ticket</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-slate-400">Emoji</label>
                  <input
                    type="text"
                    value={editingCategory.emoji}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, emoji: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-center text-lg"
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <label className="text-slate-400">Nom de la catégorie</label>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, name: e.target.value })
                    }
                    placeholder="Ex: Facturation & Commandes"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Description</label>
                <input
                  type="text"
                  value={editingCategory.description}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  }
                  placeholder="Brève description..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Catégorie Discord Parent</label>
                <select
                  value={editingCategory.discordCategoryId || ''}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      discordCategoryId: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                >
                  <option value="">-- Créer à la racine du serveur --</option>
                  {discordCategories.map((dc) => (
                    <option key={dc.id} value={dc.id}>
                      📁 {dc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rôles support */}
              <div className="space-y-1">
                <label className="text-slate-400">Rôles Staff autorisés à voir les tickets</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  {roles.map((r) => {
                    const isSelected = editingCategory.supportRoleIds?.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          const cur = editingCategory.supportRoleIds || [];
                          const updated = isSelected
                            ? cur.filter((id) => id !== r.id)
                            : [...cur, r.id];
                          setEditingCategory({ ...editingCategory, supportRoleIds: updated });
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>@{r.name}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
