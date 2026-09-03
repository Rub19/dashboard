import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ChannelItem,
  FullWelcomeConfig,
  GoodbyeMessageConfig,
  RoleItem,
  WelcomeMessageConfig,
} from '../types';
import { DiscordWelcomePreview } from '../components/DiscordWelcomePreview';
import { Skeleton } from '../components/Skeleton';
import {
  Bell,
  Bot,
  Check,
  ChevronDown,
  Hash,
  Image as ImageIcon,
  Layers,
  Layout,
  MessageSquare,
  Palette,
  Play,
  Plus,
  Save,
  Send,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface WelcomePageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const VARIABLE_PILLS = [
  { tag: '{user}', label: 'Mention Membre' },
  { tag: '{username}', label: 'Nom Discord' },
  { tag: '{server}', label: 'Nom Serveur' },
  { tag: '{membercount}', label: 'Compteur Membres' },
  { tag: '{displayname}', label: 'Surnom' },
  { tag: '{createdat}', label: 'Date Création' },
];

export const WelcomePage: React.FC<WelcomePageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'welcome' | 'goodbye'>('welcome');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [serverName, setServerName] = useState('Mon Serveur');
  const [memberCount, setMemberCount] = useState(1245);
  const [botName, setBotName] = useState('Ethone Bot');

  // Configuration locale
  const [welcomeConfig, setWelcomeConfig] = useState<WelcomeMessageConfig | null>(null);
  const [goodbyeConfig, setGoodbyeConfig] = useState<GoodbyeMessageConfig | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, chanRes, roleRes, ovRes] = await Promise.all([
        api.getWelcomeConfig(guildId),
        api.getChannels(guildId),
        api.getRoles(guildId),
        api.getOverview(guildId).catch(() => null),
      ]);

      setWelcomeConfig(cfgRes.config.welcome);
      setGoodbyeConfig(cfgRes.config.goodbye);
      setChannels(chanRes.channels);
      setRoles(roleRes.roles);

      if (ovRes) {
        setServerName(ovRes.guild.name);
        setMemberCount(ovRes.guild.memberCount || 1245);
        setBotName(ovRes.config.botName || 'Ethone Bot');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement de la configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  // Sauvegarder
  const handleSave = async () => {
    if (!welcomeConfig || !goodbyeConfig) return;
    setSaving(true);
    try {
      await api.updateWelcomeConfig(guildId, {
        welcome: welcomeConfig,
        goodbye: goodbyeConfig,
      });
      onShowToast('Configuration de bienvenue et départ sauvegardée avec succès !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur de sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Tester sur Discord
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.testWelcomeMessage(guildId, activeTab);
      onShowToast(`Message test envoyé avec succès dans #${res.channelName} !`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Échec de l’envoi du test', 'error');
    } finally {
      setTesting(false);
    }
  };

  // Insérer une variable dans le texte
  const insertVariable = (variableTag: string) => {
    if (activeTab === 'welcome' && welcomeConfig) {
      setWelcomeConfig({
        ...welcomeConfig,
        messageContent: welcomeConfig.messageContent + ' ' + variableTag,
      });
    } else if (activeTab === 'goodbye' && goodbyeConfig) {
      setGoodbyeConfig({
        ...goodbyeConfig,
        messageContent: goodbyeConfig.messageContent + ' ' + variableTag,
      });
    }
  };

  // Auto-role toggle
  const toggleAutoRole = (roleId: string) => {
    if (!welcomeConfig) return;
    const current = welcomeConfig.autoRoleIds || [];
    const exists = current.includes(roleId);
    const updated = exists ? current.filter((id) => id !== roleId) : [...current, roleId];
    setWelcomeConfig({
      ...welcomeConfig,
      autoRoleIds: updated,
    });
  };

  if (loading || !welcomeConfig || !goodbyeConfig) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const currentConf = activeTab === 'welcome' ? welcomeConfig : goodbyeConfig;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Système</span>
            <span>/</span>
            <span className="text-slate-200">Welcome & Goodbye</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Messages de Bienvenue & Départ
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Messages personnalisés, embeds, cartes graphiques dynamiques et attribution d'auto-rôles.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium text-xs border border-white/[0.08] transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>{testing ? 'Envoi...' : 'Tester sur Discord'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        </div>
      </div>

      {/* Onglets Welcome / Goodbye */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit text-xs">
        <button
          onClick={() => setActiveTab('welcome')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
            activeTab === 'welcome'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Arrivées (Welcome)</span>
        </button>

        <button
          onClick={() => setActiveTab('goodbye')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
            activeTab === 'goodbye'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserMinus className="w-4 h-4" />
          <span>Départs (Goodbye)</span>
        </button>
      </div>

      {/* Grid avec éditeur à gauche et live preview à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* COLONNE GAUCHE : ÉDITEUR & PARAMÈTRES (7 colonnes) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Carte 1 : Activation & Salon */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {activeTab === 'welcome' ? 'Système de Bienvenue' : 'Système de Départ'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Active ou désactive l'envoi automatique lors d'un événement.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'welcome') {
                    setWelcomeConfig({ ...welcomeConfig, enabled: !welcomeConfig.enabled });
                  } else {
                    setGoodbyeConfig({ ...goodbyeConfig, enabled: !goodbyeConfig.enabled });
                  }
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentConf.enabled ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    currentConf.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sélecteur de salon */}
            <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
                <span>Salon de destination</span>
              </label>
              <select
                value={currentConf.channelId || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  if (activeTab === 'welcome') {
                    setWelcomeConfig({ ...welcomeConfig, channelId: val });
                  } else {
                    setGoodbyeConfig({ ...goodbyeConfig, channelId: val });
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Sélectionner un salon (Recherche auto #bienvenue) --</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Options secondaires */}
            <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-3 text-xs">
              {activeTab === 'welcome' && (
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={welcomeConfig.mentionUser}
                    onChange={(e) =>
                      setWelcomeConfig({ ...welcomeConfig, mentionUser: e.target.checked })
                    }
                    className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0"
                  />
                  <span>Mentionner le membre</span>
                </label>
              )}

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConf.sendForBots}
                  onChange={(e) => {
                    if (activeTab === 'welcome') {
                      setWelcomeConfig({ ...welcomeConfig, sendForBots: e.target.checked });
                    } else {
                      setGoodbyeConfig({ ...goodbyeConfig, sendForBots: e.target.checked });
                    }
                  }}
                  className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0"
                />
                <span>Envoyer aussi pour les Bots</span>
              </label>
            </div>
          </div>

          {/* Carte 2 : Message Textuel & Puces de Variables */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Message Textuel
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentConf.messageContent.length} caractères
              </span>
            </div>

            <textarea
              rows={3}
              value={currentConf.messageContent}
              onChange={(e) => {
                const val = e.target.value;
                if (activeTab === 'welcome') {
                  setWelcomeConfig({ ...welcomeConfig, messageContent: val });
                } else {
                  setGoodbyeConfig({ ...goodbyeConfig, messageContent: val });
                }
              }}
              placeholder="Écrivez votre message..."
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs leading-relaxed focus:outline-none focus:border-indigo-500 resize-none font-mono"
            />

            {/* Puces de variables cliquables */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                Insérer une variable au clic :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_PILLS.map((p) => (
                  <button
                    key={p.tag}
                    type="button"
                    onClick={() => insertVariable(p.tag)}
                    className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-indigo-600/30 border border-white/[0.06] text-[10px] font-mono text-indigo-300 transition-colors"
                  >
                    {p.tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Carte 3 : Embed Discord */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Embed Discord
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'welcome') {
                    setWelcomeConfig({
                      ...welcomeConfig,
                      embed: { ...welcomeConfig.embed, enabled: !welcomeConfig.embed.enabled },
                    });
                  } else {
                    setGoodbyeConfig({
                      ...goodbyeConfig,
                      embed: { ...goodbyeConfig.embed, enabled: !goodbyeConfig.embed.enabled },
                    });
                  }
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentConf.embed.enabled ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    currentConf.embed.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {currentConf.embed.enabled && (
              <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                {/* Titre & Couleur */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] text-slate-400">Titre de l'embed</label>
                    <input
                      type="text"
                      value={currentConf.embed.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'welcome') {
                          setWelcomeConfig({
                            ...welcomeConfig,
                            embed: { ...welcomeConfig.embed, title: val },
                          });
                        } else {
                          setGoodbyeConfig({
                            ...goodbyeConfig,
                            embed: { ...goodbyeConfig.embed, title: val },
                          });
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Couleur (HEX)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentConf.embed.color || '#5865F2'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTab === 'welcome') {
                            setWelcomeConfig({
                              ...welcomeConfig,
                              embed: { ...welcomeConfig.embed, color: val },
                            });
                          } else {
                            setGoodbyeConfig({
                              ...goodbyeConfig,
                              embed: { ...goodbyeConfig.embed, color: val },
                            });
                          }
                        }}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentConf.embed.color}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTab === 'welcome') {
                            setWelcomeConfig({
                              ...welcomeConfig,
                              embed: { ...welcomeConfig.embed, color: val },
                            });
                          } else {
                            setGoodbyeConfig({
                              ...goodbyeConfig,
                              embed: { ...goodbyeConfig.embed, color: val },
                            });
                          }
                        }}
                        className="w-full px-2 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Description</label>
                  <textarea
                    rows={2}
                    value={currentConf.embed.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (activeTab === 'welcome') {
                        setWelcomeConfig({
                          ...welcomeConfig,
                          embed: { ...welcomeConfig.embed, description: val },
                        });
                      } else {
                        setGoodbyeConfig({
                          ...goodbyeConfig,
                          embed: { ...goodbyeConfig.embed, description: val },
                        });
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs resize-none"
                  />
                </div>

                {/* Auteur & Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Texte de l'auteur</label>
                    <input
                      type="text"
                      value={currentConf.embed.authorName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'welcome') {
                          setWelcomeConfig({
                            ...welcomeConfig,
                            embed: { ...welcomeConfig.embed, authorName: val },
                          });
                        } else {
                          setGoodbyeConfig({
                            ...goodbyeConfig,
                            embed: { ...goodbyeConfig.embed, authorName: val },
                          });
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Pied de page (Footer)</label>
                    <input
                      type="text"
                      value={currentConf.embed.footer}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'welcome') {
                          setWelcomeConfig({
                            ...welcomeConfig,
                            embed: { ...welcomeConfig.embed, footer: val },
                          });
                        } else {
                          setGoodbyeConfig({
                            ...goodbyeConfig,
                            embed: { ...goodbyeConfig.embed, footer: val },
                          });
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Carte 4 : Carte Graphique Image Dynamique */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Carte Graphique Dynamique (Canvas)
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'welcome') {
                    setWelcomeConfig({
                      ...welcomeConfig,
                      image: { ...welcomeConfig.image, enabled: !welcomeConfig.image.enabled },
                    });
                  } else {
                    setGoodbyeConfig({
                      ...goodbyeConfig,
                      image: { ...goodbyeConfig.image, enabled: !goodbyeConfig.image.enabled },
                    });
                  }
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentConf.image.enabled ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    currentConf.image.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {currentConf.image.enabled && (
              <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Titre Carte</label>
                    <input
                      type="text"
                      value={currentConf.image.titleText}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'welcome') {
                          setWelcomeConfig({
                            ...welcomeConfig,
                            image: { ...welcomeConfig.image, titleText: val },
                          });
                        } else {
                          setGoodbyeConfig({
                            ...goodbyeConfig,
                            image: { ...goodbyeConfig.image, titleText: val },
                          });
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Texte Tag / Compteur</label>
                    <input
                      type="text"
                      value={currentConf.image.tagText}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'welcome') {
                          setWelcomeConfig({
                            ...welcomeConfig,
                            image: { ...welcomeConfig.image, tagText: val },
                          });
                        } else {
                          setGoodbyeConfig({
                            ...goodbyeConfig,
                            image: { ...goodbyeConfig.image, tagText: val },
                          });
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Couleur d'accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentConf.image.accentColor || '#8B5CF6'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTab === 'welcome') {
                            setWelcomeConfig({
                              ...welcomeConfig,
                              image: { ...welcomeConfig.image, accentColor: val },
                            });
                          } else {
                            setGoodbyeConfig({
                              ...goodbyeConfig,
                              image: { ...goodbyeConfig.image, accentColor: val },
                            });
                          }
                        }}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentConf.image.accentColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTab === 'welcome') {
                            setWelcomeConfig({
                              ...welcomeConfig,
                              image: { ...welcomeConfig.image, accentColor: val },
                            });
                          } else {
                            setGoodbyeConfig({
                              ...goodbyeConfig,
                              image: { ...goodbyeConfig.image, accentColor: val },
                            });
                          }
                        }}
                        className="w-full px-2 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Carte 5 : Auto-Rôles (Uniquement pour Welcome) */}
          {activeTab === 'welcome' && (
            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Rôles Automatiques (Auto-Roles)
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Ces rôles seront automatiquement attribués aux nouveaux membres dès leur arrivée.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {roles.map((r) => {
                  const isSelected = welcomeConfig.autoRoleIds?.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleAutoRole(r.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
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
                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* COLONNE DROITE : DISCORD LIVE PREVIEW (5 colonnes) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-3 sticky top-20">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Aperçu en direct (Live Preview)
            </span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Temps réel
            </span>
          </div>

          <DiscordWelcomePreview
            botName={botName}
            messageContent={currentConf.messageContent}
            embed={currentConf.embed}
            image={currentConf.image}
            serverName={serverName}
            memberCount={memberCount}
          />
        </div>
      </div>
    </div>
  );
};
