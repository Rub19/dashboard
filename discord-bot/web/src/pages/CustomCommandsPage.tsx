import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  CommandAction,
  CommandArgument,
  CommandConditionBlock,
  CommandResponseBlock,
  CustomCommand,
  TriggerType,
} from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Eye,
  FileCode2,
  Layers,
  Loader2,
  Pencil,
  Play,
  Plus,
  Settings,
  Slash,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const TEMPLATES = [
  { name: 'rules', emoji: '📜', label: 'Règlement' },
  { name: 'socials', emoji: '🌐', label: 'Réseaux Sociaux' },
  { name: 'support', emoji: '🎫', label: 'Support' },
  { name: 'serverinfo', emoji: '🏠', label: 'Infos Serveur' },
  { name: 'userinfo', emoji: '👤', label: 'Infos Utilisateur' },
  { name: 'welcome', emoji: '👋', label: 'Bienvenue' },
  { name: 'announce', emoji: '📢', label: 'Annonce' },
];

const TRIGGER_LABELS: Record<TriggerType, string> = {
  slash: '/ Slash uniquement',
  prefix: '! Prefix uniquement',
  both: '/ + ! Les deux',
};

const VARIABLES_REFERENCE = [
  '{user}', '{username}', '{display_name}', '{user_id}',
  '{server}', '{server_id}', '{member_count}',
  '{channel}', '{channel_id}', '{channel_name}',
  '{date}', '{time}', '{timestamp}',
];

function defaultCommand(guildId: string): Partial<CustomCommand> {
  return {
    guildId,
    name: '',
    description: 'Ma commande personnalisée',
    category: 'Personnalisé',
    triggerType: 'both',
    enabled: true,
    cooldownSeconds: 0,
    requiredRoleIds: [],
    arguments: [],
    conditions: [],
    defaultActions: [
      {
        type: 'send_response',
        response: {
          content: 'Hello, {user} !',
          embed: undefined,
          buttons: [],
        },
      },
    ],
  };
}

export const CustomCommandsPage: React.FC<Props> = ({ guildId, onShowToast }) => {
  const [view, setView] = useState<'list' | 'builder' | 'templates'>('list');
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCmd, setEditingCmd] = useState<Partial<CustomCommand>>(defaultCommand(guildId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [previewContent, setPreviewContent] = useState('Hello, {user} !');

  // Live preview variables substitution (mock)
  const mockReplace = (text: string) =>
    text
      .replace(/{user}/g, '@ExampleUser')
      .replace(/{username}/g, 'ExampleUser')
      .replace(/{display_name}/g, 'Example User')
      .replace(/{user_id}/g, '123456789')
      .replace(/{server}/g, 'Mon Serveur')
      .replace(/{server_id}/g, guildId)
      .replace(/{member_count}/g, '128')
      .replace(/{channel}/g, '#général')
      .replace(/{channel_id}/g, '000000000')
      .replace(/{channel_name}/g, 'général')
      .replace(/{date}/g, new Date().toLocaleDateString('fr-FR'))
      .replace(/{time}/g, new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
      .replace(/{args\.\w+}/g, '[argument]');

  const loadCommands = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomCommands(guildId);
      setCommands(res.commands);
    } catch (e: any) {
      onShowToast(e.message || 'Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCommands(); }, [guildId]);

  const openNewBuilder = () => {
    setEditingCmd(defaultCommand(guildId));
    setEditingId(null);
    setTestResults(null);
    setView('builder');
  };

  const openEditBuilder = (cmd: CustomCommand) => {
    setEditingCmd({ ...cmd });
    setEditingId(cmd.id);
    setTestResults(null);
    setView('builder');
  };

  const handleSave = async () => {
    if (!editingCmd.name) {
      onShowToast('Le nom de la commande est obligatoire.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateCustomCommand(guildId, editingId, editingCmd);
        onShowToast(`Commande /${editingCmd.name} mise à jour !`, 'success');
      } else {
        await api.createCustomCommand(guildId, editingCmd);
        onShowToast(`Commande /${editingCmd.name} créée et active !`, 'success');
      }
      await loadCommands();
      setView('list');
    } catch (e: any) {
      onShowToast(e.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!editingId) {
      onShowToast('Sauvegardez d\'abord la commande pour la tester.', 'info');
      return;
    }
    setTesting(true);
    try {
      const res = await api.testCustomCommand(guildId, editingId);
      setTestResults(res.previews);
    } catch (e: any) {
      onShowToast(e.message || 'Erreur de test', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleCustomCommand(guildId, id);
      await loadCommands();
    } catch (e: any) {
      onShowToast(e.message || 'Erreur', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.duplicateCustomCommand(guildId, id);
      await loadCommands();
      onShowToast('Commande dupliquée !', 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Erreur duplication', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCustomCommand(guildId, id);
      await loadCommands();
      onShowToast('Commande supprimée.', 'info');
    } catch (e: any) {
      onShowToast(e.message || 'Erreur suppression', 'error');
    }
  };

  const handleCreateFromTemplate = async (name: string) => {
    try {
      const res = await api.createFromTemplate(guildId, name);
      openEditBuilder(res.command);
      onShowToast(`Template "${name}" chargé dans le builder !`, 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Erreur chargement template', 'error');
    }
  };

  // ---- Action helpers ----
  const updateDefaultActionContent = (content: string) => {
    const acts = [...(editingCmd.defaultActions || [])];
    if (!acts[0]) {
      acts[0] = { type: 'send_response', response: { content, buttons: [] } };
    } else if (acts[0].type === 'send_response' && acts[0].response) {
      acts[0] = { ...acts[0], response: { ...acts[0].response, content } };
    }
    setEditingCmd({ ...editingCmd, defaultActions: acts });
    setPreviewContent(content);
  };

  const updateEmbedField = (field: string, value: string) => {
    const acts = [...(editingCmd.defaultActions || [])];
    if (!acts[0] || acts[0].type !== 'send_response') return;
    const embed = { ...(acts[0].response?.embed || { color: '#6366F1', fields: [] }), [field]: value };
    acts[0] = { ...acts[0], response: { ...acts[0].response!, embed } };
    setEditingCmd({ ...editingCmd, defaultActions: acts });
  };

  const firstResponse: CommandResponseBlock | undefined =
    editingCmd.defaultActions?.[0]?.type === 'send_response'
      ? editingCmd.defaultActions[0].response
      : undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Outils</span><span>/</span>
            <span className="text-slate-200">Command Builder</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Custom Command Builder
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Créez vos propres commandes Discord sans modifier le code du bot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('templates')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium border border-white/[0.06] transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5" /> Templates
          </button>
          <button
            onClick={openNewBuilder}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nouvelle Commande
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TEMPLATES VIEW */}
      {/* ==================================================================== */}
      {view === 'templates' && (
        <div className="space-y-5">
          <button onClick={() => setView('list')} className="text-xs text-slate-400 hover:text-white font-mono flex items-center gap-1">
            ← Retour à la liste
          </button>

          <h2 className="text-sm font-semibold text-white">📦 Templates Prêts à l'Emploi</h2>
          <p className="text-xs text-slate-400">Sélectionnez un template pour le charger directement dans le builder et le personnaliser.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => handleCreateFromTemplate(tpl.name)}
                className="text-left p-4 bg-[#101217] border border-white/[0.06] rounded-xl hover:border-indigo-500/40 hover:bg-white/[0.02] transition-all group"
              >
                <div className="text-2xl mb-2">{tpl.emoji}</div>
                <div className="font-semibold text-white text-sm">{tpl.label}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">/{tpl.name}</div>
                <div className="text-[10px] text-indigo-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Charger dans le builder →
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LIST VIEW */}
      {/* ==================================================================== */}
      {view === 'list' && (
        <div className="space-y-4">
          {commands.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs font-mono space-y-3">
              <Code2 className="w-10 h-10 mx-auto opacity-30" />
              <p>Aucune commande personnalisée créée.</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={openNewBuilder} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500">
                  ✨ Créer ma première commande
                </button>
                <button onClick={() => setView('templates')} className="px-4 py-2 rounded-lg bg-white/[0.04] text-slate-300 text-xs font-medium border border-white/[0.06]">
                  Utiliser un template
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden divide-y divide-white/[0.04]">
              {/* Header row */}
              <div className="px-4 py-2.5 grid grid-cols-12 gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                <div className="col-span-3">Commande</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Statut</div>
                <div className="col-span-2">Utilisations</div>
                <div className="col-span-3">Actions</div>
              </div>

              {commands.map((cmd) => (
                <div key={cmd.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-white/[0.02]">
                  <div className="col-span-3">
                    <div className="text-sm font-semibold text-white font-mono">/{cmd.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{cmd.description}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">
                      {cmd.triggerType === 'both' ? '/ + !' : cmd.triggerType === 'slash' ? '/slash' : '!prefix'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      cmd.enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                    }`}>
                      {cmd.enabled ? '● ACTIVE' : '○ INACTIVE'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-mono text-slate-400">{cmd.usageCount.toLocaleString()}</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5">
                    <button
                      onClick={() => openEditBuilder(cmd)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(cmd.id)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 transition-colors"
                      title="Dupliquer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggle(cmd.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        cmd.enabled
                          ? 'bg-white/[0.04] hover:bg-amber-500/20 text-slate-400 hover:text-amber-400'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                      }`}
                      title={cmd.enabled ? 'Désactiver' : 'Activer'}
                    >
                      {cmd.enabled ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(cmd.id)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* BUILDER VIEW */}
      {/* ==================================================================== */}
      {view === 'builder' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setView('list')} className="text-xs text-slate-400 hover:text-white font-mono flex items-center gap-1">
              ← Retour à la liste
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTest}
                disabled={!editingId || testing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 text-xs font-medium border border-white/[0.06] transition-colors disabled:opacity-40"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Tester
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editingId ? 'Mettre à jour' : 'Créer la Commande'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* ---- LEFT PANEL: Command Editor ---- */}
            <div className="lg:col-span-7 space-y-4">

              {/* ━━ Bloc 1: Informations ━━ */}
              <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Settings className="w-3.5 h-3.5 text-indigo-400" />
                  <span>1 · Informations Générales</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[11px] text-slate-400">Nom de la commande *</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-mono">/</span>
                      <input
                        type="text"
                        value={editingCmd.name || ''}
                        onChange={(e) => setEditingCmd({ ...editingCmd, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                        placeholder="macommande"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[11px] text-slate-400">Catégorie</label>
                    <input
                      type="text"
                      value={editingCmd.category || 'Personnalisé'}
                      onChange={(e) => setEditingCmd({ ...editingCmd, category: e.target.value })}
                      placeholder="Personnalisé"
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] text-slate-400">Description</label>
                    <input
                      type="text"
                      value={editingCmd.description || ''}
                      onChange={(e) => setEditingCmd({ ...editingCmd, description: e.target.value })}
                      placeholder="Description courte de la commande"
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* ━━ Bloc 2: Déclenchement ━━ */}
              <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>2 · Déclenchement & Permissions</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Type de déclencheur</label>
                    <select
                      value={editingCmd.triggerType || 'both'}
                      onChange={(e) => setEditingCmd({ ...editingCmd, triggerType: e.target.value as TriggerType })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                    >
                      {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Cooldown (secondes)</label>
                    <input
                      type="number"
                      min={0}
                      max={3600}
                      value={editingCmd.cooldownSeconds ?? 0}
                      onChange={(e) => setEditingCmd({ ...editingCmd, cooldownSeconds: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Permission Discord requise</label>
                    <select
                      value={editingCmd.requiredPermission || ''}
                      onChange={(e) => setEditingCmd({ ...editingCmd, requiredPermission: e.target.value || undefined })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                    >
                      <option value="">Aucune (tout le monde)</option>
                      <option value="ManageGuild">Gérer le serveur</option>
                      <option value="ManageMessages">Gérer les messages</option>
                      <option value="ManageRoles">Gérer les rôles</option>
                      <option value="BanMembers">Bannir des membres</option>
                      <option value="KickMembers">Expulser des membres</option>
                      <option value="Administrator">Administrateur</option>
                    </select>
                  </div>

                  <div className="space-y-1 flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCmd.enabled ?? true}
                        onChange={(e) => setEditingCmd({ ...editingCmd, enabled: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span className="text-xs text-white">Commande activée</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ━━ Bloc 3: Arguments ━━ */}
              <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                    <span>3 · Arguments ({(editingCmd.arguments || []).length})</span>
                  </div>
                  <button
                    onClick={() => {
                      const args = [...(editingCmd.arguments || [])];
                      args.push({ name: `arg${args.length + 1}`, description: '', type: 'string', required: false });
                      setEditingCmd({ ...editingCmd, arguments: args });
                    }}
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30"
                  >
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>

                {(editingCmd.arguments || []).length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono">Aucun argument. Utilisez {`{args.nom}`} dans vos réponses.</p>
                ) : (
                  <div className="space-y-2">
                    {(editingCmd.arguments || []).map((arg, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center text-xs">
                        <input
                          value={arg.name}
                          onChange={(e) => {
                            const args = [...(editingCmd.arguments || [])];
                            args[i] = { ...args[i], name: e.target.value.toLowerCase() };
                            setEditingCmd({ ...editingCmd, arguments: args });
                          }}
                          placeholder="nom"
                          className="col-span-3 px-2 py-1.5 rounded bg-white/[0.03] border border-white/[0.08] text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                        <select
                          value={arg.type}
                          onChange={(e) => {
                            const args = [...(editingCmd.arguments || [])];
                            args[i] = { ...args[i], type: e.target.value as any };
                            setEditingCmd({ ...editingCmd, arguments: args });
                          }}
                          className="col-span-3 px-2 py-1.5 rounded bg-[#141620] border border-white/[0.08] text-white"
                        >
                          <option value="string">Texte</option>
                          <option value="number">Nombre</option>
                          <option value="boolean">Booléen</option>
                          <option value="user">Utilisateur</option>
                          <option value="role">Rôle</option>
                          <option value="channel">Salon</option>
                        </select>
                        <input
                          value={arg.description}
                          onChange={(e) => {
                            const args = [...(editingCmd.arguments || [])];
                            args[i] = { ...args[i], description: e.target.value };
                            setEditingCmd({ ...editingCmd, arguments: args });
                          }}
                          placeholder="description"
                          className="col-span-4 px-2 py-1.5 rounded bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                        />
                        <label className="col-span-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={arg.required}
                            onChange={(e) => {
                              const args = [...(editingCmd.arguments || [])];
                              args[i] = { ...args[i], required: e.target.checked };
                              setEditingCmd({ ...editingCmd, arguments: args });
                            }}
                            className="accent-indigo-600"
                            title="Obligatoire"
                          />
                        </label>
                        <button
                          onClick={() => {
                            const args = [...(editingCmd.arguments || [])];
                            args.splice(i, 1);
                            setEditingCmd({ ...editingCmd, arguments: args });
                          }}
                          className="col-span-1 p-1 text-slate-500 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ━━ Bloc 4: Response Builder ━━ */}
              <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4 · Réponse par Défaut</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Contenu textuel (optionnel)</label>
                    <textarea
                      rows={2}
                      value={firstResponse?.content || ''}
                      onChange={(e) => updateDefaultActionContent(e.target.value)}
                      placeholder="Réponse texte simple. Supports les variables : {user}, {server}..."
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white resize-none focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* Embed Builder inline */}
                  <div className="border border-dashed border-white/[0.08] rounded-xl p-4 space-y-3">
                    <div className="text-[11px] text-slate-400 font-semibold">Embed Discord (optionnel)</div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">Titre</label>
                        <input
                          value={firstResponse?.embed?.title || ''}
                          onChange={(e) => updateEmbedField('title', e.target.value)}
                          placeholder="Titre de l'embed"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">Couleur de bordure</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={firstResponse?.embed?.color || '#6366F1'}
                            onChange={(e) => updateEmbedField('color', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <input
                            value={firstResponse?.embed?.color || '#6366F1'}
                            onChange={(e) => updateEmbedField('color', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Description de l'embed</label>
                      <textarea
                        rows={3}
                        value={firstResponse?.embed?.description || ''}
                        onChange={(e) => updateEmbedField('description', e.target.value)}
                        placeholder="Contenu principal de l'embed. Supporte les variables et le **markdown**."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white resize-none focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">Footer</label>
                        <input
                          value={firstResponse?.embed?.footerText || ''}
                          onChange={(e) => updateEmbedField('footerText', e.target.value)}
                          placeholder="Texte footer"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">URL Image / Thumbnail</label>
                        <input
                          value={firstResponse?.embed?.imageUrl || ''}
                          onChange={(e) => updateEmbedField('imageUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- RIGHT PANEL: Live Preview + Variables Reference ---- */}
            <div className="lg:col-span-5 space-y-4">
              {/* Live Discord Preview */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Aperçu Discord en Direct
                </h3>

                <div className="bg-[#2B2D31] rounded-xl p-4 shadow-xl space-y-2 border border-white/[0.06]">
                  {/* Mock Discord message */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      E
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">Ethone Bot</span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1 rounded font-mono">APP</span>
                        <span className="text-[10px] text-slate-500 font-mono">Aujourd'hui à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {firstResponse?.content && (
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {mockReplace(firstResponse.content)}
                        </p>
                      )}

                      {firstResponse?.embed && (
                        <div
                          className="rounded-lg border-l-4 p-3 space-y-1.5 text-xs"
                          style={{ borderColor: firstResponse.embed.color || '#6366F1', background: 'rgba(255,255,255,0.03)' }}
                        >
                          {firstResponse.embed.title && (
                            <div className="font-bold text-white text-sm">
                              {mockReplace(firstResponse.embed.title)}
                            </div>
                          )}
                          {firstResponse.embed.description && (
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {mockReplace(firstResponse.embed.description)}
                            </p>
                          )}
                          {firstResponse.embed.footerText && (
                            <div className="text-[10px] text-slate-500 pt-1 border-t border-white/[0.06]">
                              {mockReplace(firstResponse.embed.footerText)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Variables Reference */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Variables disponibles
                </h3>
                <div className="bg-[#101217] border border-white/[0.06] rounded-xl p-3 flex flex-wrap gap-1.5">
                  {VARIABLES_REFERENCE.map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        navigator.clipboard.writeText(v);
                        onShowToast(`${v} copié !`, 'info');
                      }}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                  {(editingCmd.arguments || []).map((arg) => (
                    <button
                      key={arg.name}
                      onClick={() => {
                        navigator.clipboard.writeText(`{args.${arg.name}}`);
                        onShowToast(`{args.${arg.name}} copié !`, 'info');
                      }}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                    >
                      {`{args.${arg.name}}`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 font-mono">Cliquez sur une variable pour la copier.</p>
              </div>

              {/* Test Results */}
              {testResults !== null && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Résultats du Test
                  </h3>
                  <div className="bg-[#101217] border border-emerald-500/20 rounded-xl p-3 space-y-2">
                    {testResults.length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono">Aucune réponse générée.</p>
                    ) : testResults.map((r, i) => (
                      <div key={i} className="text-xs font-mono text-emerald-300 space-y-1">
                        {r.content && <div>💬 {r.content}</div>}
                        {r.embed && <div>📦 Embed : {r.embed.title || r.embed.description?.substring(0, 60) || '(sans titre)'}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
