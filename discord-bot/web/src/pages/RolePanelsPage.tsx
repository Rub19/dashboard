import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  AutoRoleConfig,
  ChannelItem,
  RoleItem,
  RoleItemStyle,
  RolePanel,
  RolePanelItem,
} from '../types';
import { DiscordRolePanelPreview } from '../components/DiscordRolePanelPreview';
import { Skeleton } from '../components/Skeleton';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hash,
  Layers,
  Layout,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface RolePanelsPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const RolePanelsPage: React.FC<RolePanelsPageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'autorole' | 'panels' | 'builder'>('autorole');
  const [loading, setLoading] = useState(true);

  // Données
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [serverName, setServerName] = useState('Mon Serveur');
  const [botName, setBotName] = useState('Ethone Bot');

  // Auto Roles
  const [autoRoleConfig, setAutoRoleConfig] = useState<AutoRoleConfig | null>(null);
  const [savingAutoRole, setSavingAutoRole] = useState(false);

  // Role Panels
  const [panels, setPanels] = useState<RolePanel[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<RolePanel | null>(null);
  const [savingPanel, setSavingPanel] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Suppression
  const [panelToDelete, setPanelToDelete] = useState<RolePanel | null>(null);
  const [deleteDiscordMsg, setDeleteDiscordMsg] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [arRes, pnlRes, chanRes, roleRes, ovRes] = await Promise.all([
        api.getAutoRoleConfig(guildId),
        api.getRolePanels(guildId),
        api.getChannels(guildId),
        api.getRoles(guildId),
        api.getOverview(guildId).catch(() => null),
      ]);

      setAutoRoleConfig(arRes.config);
      setPanels(pnlRes.panels);
      setChannels(chanRes.channels);
      setRoles(roleRes.roles);

      if (ovRes) {
        setServerName(ovRes.guild.name);
        setBotName(ovRes.config.botName || 'Ethone Bot');
      }

      if (pnlRes.panels.length > 0) {
        setSelectedPanel(pnlRes.panels[0]);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  // Sauvegarder Auto-Roles
  const handleSaveAutoRoles = async () => {
    if (!autoRoleConfig) return;
    setSavingAutoRole(true);
    try {
      const res = await api.updateAutoRoleConfig(guildId, autoRoleConfig);
      setAutoRoleConfig(res.config);
      onShowToast('Configuration des Auto-Rôles sauvegardée avec succès !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur sauvegarde Auto-Rôles', 'error');
    } finally {
      setSavingAutoRole(false);
    }
  };

  // Sauvegarder Role Panel
  const handleSavePanel = async () => {
    if (!selectedPanel) return;
    setSavingPanel(true);
    try {
      const res = await api.saveRolePanel(guildId, selectedPanel);
      setSelectedPanel(res.panel);
      setPanels((prev) => {
        const idx = prev.findIndex((p) => p.id === res.panel.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = res.panel;
          return copy;
        }
        return [...prev, res.panel];
      });
      onShowToast('Panneau de rôles enregistré avec succès !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur enregistrement panel', 'error');
    } finally {
      setSavingPanel(false);
    }
  };

  // Publier Role Panel sur Discord
  const handlePublishPanel = async () => {
    if (!selectedPanel || !selectedPanel.channelId) {
      onShowToast('Veuillez sélectionner un salon textuel de destination.', 'error');
      return;
    }
    setPublishing(true);
    try {
      const res = await api.publishRolePanel(guildId, selectedPanel.id, selectedPanel.channelId);
      onShowToast(`Panneau de rôles publié avec succès dans #${res.channelName} !`, 'success');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Échec de la publication sur Discord', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Synchroniser Role Panel
  const handleSyncPanel = async (panelId: string) => {
    setSyncing(true);
    try {
      const res = await api.syncRolePanel(guildId, panelId);
      if (res.valid) {
        onShowToast('Panneau synchronisé : tout est parfaitement valide !', 'success');
      } else {
        onShowToast(`Erreurs détectées : ${res.errors.join(', ')}`, 'error');
      }
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur de synchronisation', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Dupliquer Role Panel
  const handleDuplicatePanel = async (panelId: string) => {
    try {
      const res = await api.duplicateRolePanel(guildId, panelId);
      setPanels((prev) => [...prev, res.panel]);
      setSelectedPanel(res.panel);
      setActiveTab('builder');
      onShowToast('Panneau dupliqué avec succès !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur duplication', 'error');
    }
  };

  // Supprimer Role Panel
  const confirmDeletePanel = async () => {
    if (!panelToDelete) return;
    try {
      await api.deleteRolePanel(guildId, panelToDelete.id, deleteDiscordMsg);
      setPanels((prev) => prev.filter((p) => p.id !== panelToDelete.id));
      if (selectedPanel?.id === panelToDelete.id) {
        setSelectedPanel(null);
      }
      setPanelToDelete(null);
      onShowToast('Panneau de rôles supprimé.', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur suppression', 'error');
    }
  };

  // Créer un nouveau panel
  const handleCreateNewPanel = () => {
    const newPanel: RolePanel = {
      id: `panel_${Date.now()}`,
      guildId,
      name: 'Nouveau Panneau de Rôles',
      channelId: null,
      messageId: null,
      componentType: 'buttons',
      placeholder: 'Sélectionnez vos rôles...',
      title: '🎭 Choisissez vos Rôles',
      description: 'Cliquez sur les boutons pour vous attribuer ou retirer des rôles.',
      color: '#5865F2',
      thumbnail: null,
      image: null,
      footer: 'Système de Rôles',
      items: [],
      groups: [],
      status: 'draft',
      lastSyncAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedPanel(newPanel);
    setActiveTab('builder');
  };

  if (loading || !autoRoleConfig) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Système</span>
            <span>/</span>
            <span className="text-slate-200">Rôles & Auto-Roles</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Auto-Rôles & Role Panels
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Rôles automatiques à l'arrivée, panneaux interactifs avec boutons et menus déroulants.
          </p>
        </div>

        {activeTab === 'autorole' && (
          <button
            onClick={handleSaveAutoRoles}
            disabled={savingAutoRole}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors w-fit"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingAutoRole ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        )}

        {activeTab === 'panels' && (
          <button
            onClick={handleCreateNewPanel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Panneau de Rôles</span>
          </button>
        )}

        {activeTab === 'builder' && selectedPanel && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePublishPanel}
              disabled={publishing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{publishing ? 'Publication...' : 'Publier sur Discord'}</span>
            </button>
            <button
              onClick={handleSavePanel}
              disabled={savingPanel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium text-xs border border-white/[0.08] transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation sous-onglets */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit text-xs">
        <button
          onClick={() => setActiveTab('autorole')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
            activeTab === 'autorole'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Auto-Rôles (Arrivée)</span>
        </button>

        <button
          onClick={() => setActiveTab('panels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
            activeTab === 'panels'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Role Panels ({panels.length})</span>
        </button>

        {selectedPanel && (
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
              activeTab === 'builder'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>Panel Builder</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. ONGLET AUTO-RÔLES À L'ARRIVÉE */}
      {/* ========================================================================= */}
      {activeTab === 'autorole' && (
        <div className="space-y-5 max-w-3xl">
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Attribution Automatique des Rôles</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Attribue automatiquement des rôles dès qu'un nouveau membre rejoint le serveur.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAutoRoleConfig({ ...autoRoleConfig, enabled: !autoRoleConfig.enabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoRoleConfig.enabled ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoRoleConfig.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Filtres d'application */}
            <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRoleConfig.applyToHumans}
                  onChange={(e) =>
                    setAutoRoleConfig({ ...autoRoleConfig, applyToHumans: e.target.checked })
                  }
                  className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0"
                />
                <span>Appliquer aux membres humains</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRoleConfig.applyToBots}
                  onChange={(e) =>
                    setAutoRoleConfig({ ...autoRoleConfig, applyToBots: e.target.checked })
                  }
                  className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0"
                />
                <span>Appliquer également aux bots</span>
              </label>
            </div>

            {/* Sélecteur de rôles */}
            <div className="space-y-2 pt-2 border-t border-white/[0.04]">
              <label className="text-xs font-medium text-slate-300">
                Rôles automatiquement attribués ({autoRoleConfig.roleIds.length}) :
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {roles.map((r) => {
                  const isSelected = autoRoleConfig.roleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        const cur = autoRoleConfig.roleIds;
                        const updated = isSelected
                          ? cur.filter((id) => id !== r.id)
                          : [...cur, r.id];
                        setAutoRoleConfig({ ...autoRoleConfig, roleIds: updated });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: r.color !== '#000000' ? r.color : '#818CF8' }}
                      />
                      <span>@{r.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGLET ROLE PANELS (LISTE) */}
      {/* ========================================================================= */}
      {activeTab === 'panels' && (
        <div className="space-y-4">
          {panels.length === 0 ? (
            <div className="bg-[#101217] border border-white/[0.06] rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">Aucun Panneau de Rôles</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Créez votre premier panneau interactif pour permettre à vos membres de choisir leurs rôles.
              </p>
              <button
                onClick={handleCreateNewPanel}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer un panneau</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {panels.map((p) => {
                const targetChannel = channels.find((c) => c.id === p.channelId);
                return (
                  <div
                    key={p.id}
                    className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-3 relative group flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                          <span
                            className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase mt-1 ${
                              p.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : p.status === 'error'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDuplicatePanel(p.id)}
                            title="Dupliquer"
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSyncPanel(p.id)}
                            disabled={syncing}
                            title="Synchroniser / Vérifier"
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => setPanelToDelete(p)}
                            title="Supprimer"
                            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-white/[0.05] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/[0.04] space-y-1 text-xs text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>Salon :</span>
                          <span className="font-mono text-slate-200">
                            {targetChannel ? `#${targetChannel.name}` : 'Non publié'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Type :</span>
                          <span className="font-mono text-slate-200">
                            {p.componentType === 'buttons' ? 'Boutons' : 'Select Menu'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Rôles inclus :</span>
                          <span className="font-mono text-slate-200">{p.items.length} rôle(s)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPanel(p);
                        setActiveTab('builder');
                      }}
                      className="w-full py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-colors mt-2"
                    >
                      Éditer le panneau
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ONGLET PANEL BUILDER */}
      {/* ========================================================================= */}
      {activeTab === 'builder' && selectedPanel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Configuration à gauche (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Carte Infos Générales */}
            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Informations du Panneau
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Nom interne</label>
                  <input
                    type="text"
                    value={selectedPanel.name}
                    onChange={(e) => setSelectedPanel({ ...selectedPanel, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Salon Discord</label>
                  <select
                    value={selectedPanel.channelId || ''}
                    onChange={(e) =>
                      setSelectedPanel({ ...selectedPanel, channelId: e.target.value || null })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
                  >
                    <option value="">-- Sélectionner un salon textuel --</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Carte Apparence de l'Embed */}
            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Apparence de l'Embed
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] text-slate-400">Titre</label>
                  <input
                    type="text"
                    value={selectedPanel.title}
                    onChange={(e) => setSelectedPanel({ ...selectedPanel, title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Couleur d'accent (HEX)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedPanel.color || '#5865F2'}
                      onChange={(e) => setSelectedPanel({ ...selectedPanel, color: e.target.value })}
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedPanel.color}
                      onChange={(e) => setSelectedPanel({ ...selectedPanel, color: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Description</label>
                <textarea
                  rows={2}
                  value={selectedPanel.description}
                  onChange={(e) =>
                    setSelectedPanel({ ...selectedPanel, description: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Type de composant</label>
                  <select
                    value={selectedPanel.componentType}
                    onChange={(e) =>
                      setSelectedPanel({
                        ...selectedPanel,
                        componentType: e.target.value as 'buttons' | 'select_menu',
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
                  >
                    <option value="buttons">Boutons</option>
                    <option value="select_menu">Menu Déroulant (Select Menu)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Pied de page (Footer)</label>
                  <input
                    type="text"
                    value={selectedPanel.footer}
                    onChange={(e) => setSelectedPanel({ ...selectedPanel, footer: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Carte Gestion des Rôles du Panel */}
            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Rôles Configurés ({selectedPanel.items.length}/25)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const firstAvailable = roles[0]?.id || '';
                    const newItem: RolePanelItem = {
                      id: `item_${Date.now()}`,
                      roleId: firstAvailable,
                      label: roles[0]?.name || 'Nouveau Rôle',
                      emoji: '🎮',
                      description: 'Rôle de notification ou profil',
                      style: 'Secondary',
                      prerequisiteRoleId: null,
                      mutuallyExclusiveRoleIds: [],
                    };
                    setSelectedPanel({
                      ...selectedPanel,
                      items: [...selectedPanel.items, newItem],
                    });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un rôle</span>
                </button>
              </div>

              <div className="space-y-3">
                {selectedPanel.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={item.emoji || ''}
                          onChange={(e) => {
                            const copy = [...selectedPanel.items];
                            copy[index] = { ...item, emoji: e.target.value || null };
                            setSelectedPanel({ ...selectedPanel, items: copy });
                          }}
                          placeholder="🎮"
                          className="w-10 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-white text-center text-xs"
                        />
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const copy = [...selectedPanel.items];
                            copy[index] = { ...item, label: e.target.value };
                            setSelectedPanel({ ...selectedPanel, items: copy });
                          }}
                          placeholder="Label affiché"
                          className="flex-1 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const copy = selectedPanel.items.filter((_, i) => i !== index);
                          setSelectedPanel({ ...selectedPanel, items: copy });
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {/* Rôle Discord */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-mono">Rôle Discord</label>
                        <select
                          value={item.roleId}
                          onChange={(e) => {
                            const found = roles.find((r) => r.id === e.target.value);
                            const copy = [...selectedPanel.items];
                            copy[index] = {
                              ...item,
                              roleId: e.target.value,
                              label: found ? found.name : item.label,
                            };
                            setSelectedPanel({ ...selectedPanel, items: copy });
                          }}
                          className="w-full px-2 py-1 rounded bg-[#141620] border border-white/[0.08] text-white text-[11px]"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              @{r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Style de bouton */}
                      {selectedPanel.componentType === 'buttons' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-mono">Style</label>
                          <select
                            value={item.style}
                            onChange={(e) => {
                              const copy = [...selectedPanel.items];
                              copy[index] = { ...item, style: e.target.value as RoleItemStyle };
                              setSelectedPanel({ ...selectedPanel, items: copy });
                            }}
                            className="w-full px-2 py-1 rounded bg-[#141620] border border-white/[0.08] text-white text-[11px]"
                          >
                            <option value="Secondary">Gris (Secondary)</option>
                            <option value="Primary">Bleu (Primary)</option>
                            <option value="Success">Vert (Success)</option>
                            <option value="Danger">Rouge (Danger)</option>
                          </select>
                        </div>
                      )}

                      {/* Rôle prérequis */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-mono">Prérequis (Optionnel)</label>
                        <select
                          value={item.prerequisiteRoleId || ''}
                          onChange={(e) => {
                            const copy = [...selectedPanel.items];
                            copy[index] = { ...item, prerequisiteRoleId: e.target.value || null };
                            setSelectedPanel({ ...selectedPanel, items: copy });
                          }}
                          className="w-full px-2 py-1 rounded bg-[#141620] border border-white/[0.08] text-white text-[11px]"
                        >
                          <option value="">-- Aucun prérequis --</option>
                          {roles
                            .filter((r) => r.id !== item.roleId)
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                Requis : @{r.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedPanel.items.length === 0 && (
                  <div className="p-6 text-center text-slate-500 text-xs font-mono">
                    Aucun rôle ajouté à ce panneau. Cliquez sur "+ Ajouter un rôle" ci-dessus.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Preview Discord à droite (5 cols) */}
          <div className="lg:col-span-5 space-y-3 sticky top-20">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Aperçu du Panneau Discord
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Preview
              </span>
            </div>

            <DiscordRolePanelPreview
              botName={botName}
              serverName={serverName}
              panel={selectedPanel}
            />
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION CONFIRMATION */}
      {panelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Supprimer ce Role Panel ?</h3>
            <p className="text-xs text-slate-400">
              Vous êtes sur le point de supprimer la configuration du panneau **{panelToDelete.name}**.
            </p>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={deleteDiscordMsg}
                onChange={(e) => setDeleteDiscordMsg(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-rose-600 focus:ring-0"
              />
              <span>Supprimer également le message sur Discord s'il existe</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setPanelToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeletePanel}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
