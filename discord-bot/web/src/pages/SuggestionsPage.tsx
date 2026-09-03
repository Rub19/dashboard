import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ChannelItem,
  Suggestion,
  SuggestionConfig,
  SuggestionOverview,
  SuggestionPriority,
  SuggestionStatus,
} from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  HelpCircle,
  History,
  Layers,
  Lightbulb,
  Link,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface SuggestionsPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SuggestionsPage: React.FC<SuggestionsPageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'settings'>('list');
  const [loading, setLoading] = useState(true);

  // Données
  const [overview, setOverview] = useState<SuggestionOverview | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [config, setConfig] = useState<SuggestionConfig | null>(null);
  const [channels, setChannels] = useState<ChannelItem[]>([]);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal Détail
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [staffResponseInput, setStaffResponseInput] = useState('');
  const [newStatusSelect, setNewStatusSelect] = useState<SuggestionStatus>('under_review');
  const [newCommentInput, setNewCommentInput] = useState('');
  const [duplicateInput, setDuplicateInput] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  // Formulaire Création
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategory, setCreateCategory] = useState('Général');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Formulaire Paramètres
  const [settingsForm, setSettingsForm] = useState<SuggestionConfig | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, listRes, confRes, chansRes] = await Promise.all([
        api.getSuggestionsOverview(guildId),
        api.getSuggestionsList(guildId),
        api.getSuggestionConfig(guildId),
        api.getChannels(guildId),
      ]);

      setOverview(ovRes);
      setSuggestions(listRes.suggestions);
      setConfig(confRes);
      setSettingsForm(confRes);
      setChannels(chansRes.channels);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement des suggestions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle || !createDescription) {
      onShowToast('Veuillez renseigner un titre et une description.', 'error');
      return;
    }

    setSubmittingCreate(true);
    try {
      await api.createSuggestion(guildId, {
        title: createTitle,
        description: createDescription,
        category: createCategory,
      });

      onShowToast('Suggestion soumise et publiée avec succès sur Discord !', 'success');
      setCreateTitle('');
      setCreateDescription('');
      setActiveTab('list');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors de la création', 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleUpdateStatus = async (status: SuggestionStatus) => {
    if (!selectedSuggestion) return;
    setSavingAction(true);
    try {
      const res = await api.updateSuggestionStatus(
        guildId,
        selectedSuggestion.id,
        status,
        staffResponseInput || undefined
      );
      setSelectedSuggestion(res.suggestion);
      setStaffResponseInput('');
      onShowToast(`Statut mis à jour en "${status}".`, 'success');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur mise à jour statut', 'error');
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuggestion || !newCommentInput.trim()) return;

    try {
      const res = await api.addSuggestionComment(guildId, selectedSuggestion.id, newCommentInput.trim());
      setSelectedSuggestion(res.suggestion);
      setNewCommentInput('');
      onShowToast('Commentaire ajouté.', 'success');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur ajout commentaire', 'error');
    }
  };

  const handleMarkDuplicate = async () => {
    if (!selectedSuggestion || !duplicateInput.trim()) return;
    try {
      await api.markSuggestionDuplicate(guildId, selectedSuggestion.id, duplicateInput.trim());
      onShowToast(`Marqué comme doublon de #${duplicateInput}.`, 'info');
      setDuplicateInput('');
      loadData();
      setSelectedSuggestion(null);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur doublon', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;

    setSavingSettings(true);
    try {
      const res = await api.saveSuggestionConfig(guildId, settingsForm);
      setConfig(res.config);
      onShowToast('Paramètres de suggestions enregistrés !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur sauvegarde paramètres', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (status: SuggestionStatus) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">🟡 EN ATTENTE</span>;
      case 'under_review':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">🔵 EN ÉTUDE</span>;
      case 'planned':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">🟣 PLANIFIÉE</span>;
      case 'accepted':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 ACCEPTÉE</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-600/10 text-amber-500 border border-amber-600/20">🚧 EN COURS</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">✅ RÉALISÉE</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">🔴 REFUSÉE</span>;
      case 'duplicate':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">⚫ DOUBLON</span>;
      case 'on_hold':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">🟠 EN PAUSE</span>;
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

  // Filtrage des suggestions
  const filteredSuggestions = suggestions.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.authorTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.numericId.toString().includes(searchQuery);

    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchCategory = categoryFilter === 'all' || s.category === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Communauté</span>
            <span>/</span>
            <span className="text-slate-200">Suggestions & Feedback</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Suggestions & Retours Communautaires
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Collecte d'idées, votes des membres, réponses officielles et gestion des statuts d'évolution.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('create')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Proposer une Idée</span>
        </button>
      </div>

      {/* Navigation sous-onglets */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'list'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Suggestions ({overview.totalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle Proposition</span>
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
          <span>Configuration & Preview</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ONGLET LISTE DES SUGGESTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Cartes Métriques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Total Idées</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{overview.totalCount}</div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">En Attente / Étude</div>
              <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                {overview.pendingCount + overview.underReviewCount}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Acceptées / Réalisées</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                {overview.acceptedCount + overview.completedCount}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Votes & Retours</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1 font-mono">
                {overview.totalVotes} votes ({overview.totalComments} avis)
              </div>
            </div>
          </div>

          {/* Filtres & Recherche */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par titre, description, auteur ou #numéro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#101217] border border-white/[0.06] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#101217] border border-white/[0.06] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">🟡 En attente</option>
              <option value="under_review">🔵 En cours d'étude</option>
              <option value="planned">🟣 Planifiée</option>
              <option value="accepted">🟢 Acceptée</option>
              <option value="in_progress">🚧 En développement</option>
              <option value="completed">✅ Réalisée</option>
              <option value="rejected">🔴 Refusée</option>
              <option value="duplicate">⚫ Doublon</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#101217] border border-white/[0.06] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
            >
              <option value="all">Toutes les catégories</option>
              {config.categories.map((c) => (
                <option key={c} value={c}>
                  📁 {c}
                </option>
              ))}
            </select>
          </div>

          {/* Liste des Suggestions */}
          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden divide-y divide-white/[0.04]">
            {filteredSuggestions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono">
                Aucune suggestion ne correspond aux filtres actuels.
              </div>
            ) : (
              filteredSuggestions.map((sugg) => (
                <div
                  key={sugg.id}
                  onClick={() => setSelectedSuggestion(sugg)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        #{sugg.numericId}
                      </span>
                      <h4 className="text-sm font-semibold text-white truncate">{sugg.title}</h4>
                      {getStatusBadge(sugg.status)}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">
                        {sugg.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{sugg.description}</p>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3 pt-1">
                      <span>Proposé par {sugg.authorTag}</span>
                      <span>•</span>
                      <span>{new Date(sugg.createdAt).toLocaleDateString('fr-FR')}</span>
                      {sugg.staffResponse && (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Réponse staff incluse
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:self-center">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ThumbsUp className="w-3.5 h-3.5" /> {sugg.upvotesCount}
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <ThumbsDown className="w-3.5 h-3.5" /> {sugg.downvotesCount}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 font-bold">
                        {sugg.score >= 0 ? `+${sugg.score}` : sugg.score}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <MessageSquare className="w-3.5 h-3.5" /> {sugg.comments.length}
                    </span>

                    <button className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-slate-300 text-xs hover:bg-white/[0.08] transition-colors">
                      Détails ➔
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGLET NOUVELLE PROPOSITION (CRÉATION WEB) */}
      {/* ========================================================================= */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleCreateSuggestion} className="lg:col-span-7 space-y-4">
            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-white">Soumettre une Suggestion</h3>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Titre Court de l'Idée *</label>
                  <input
                    type="text"
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="Ex: Ajouter un salon vocal pour les tournois"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Description Complète & Utilité *</label>
                  <textarea
                    rows={4}
                    required
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Expliquez en détail votre idée, son utilité pour la communauté et comment elle devrait fonctionner..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Catégorie</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                  >
                    {config.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingCreate}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
            >
              {submittingCreate ? 'Publication en cours...' : '💡 Publier la Suggestion sur Discord'}
            </button>
          </form>

          {/* Live Preview Discord */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Aperçu Discord en Direct
            </h3>

            <div className="bg-[#2B2D31] border border-white/[0.08] rounded-xl p-4 space-y-3 shadow-xl">
              <div className="border-l-4 border-amber-400 pl-3.5 space-y-2 py-0.5">
                <div className="text-[11px] text-slate-400 font-mono">
                  Suggestion #42 • Par Vous
                </div>
                <div className="text-xs font-bold text-white">
                  {createTitle || 'Titre de votre suggestion'}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {createDescription || 'Description détaillée de l’idée proposée...'}
                </p>

                <div className="text-[11px] text-slate-400 pt-2 grid grid-cols-2 gap-2 border-t border-white/[0.06] font-mono">
                  <div>Statut : <strong className="text-amber-400">🟡 En attente</strong></div>
                  <div>Catégorie : <strong className="text-white">{createCategory}</strong></div>
                  <div>Score : <strong className="text-indigo-300">👍 0 • 👎 0</strong></div>
                </div>
              </div>

              {/* Boutons d'interaction */}
              <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white text-[11px] font-semibold opacity-90 cursor-not-allowed"
                >
                  👍 Upvote (0)
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded bg-rose-600 text-white text-[11px] font-semibold opacity-90 cursor-not-allowed"
                >
                  👎 Downvote (0)
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded bg-slate-700 text-white text-[11px] font-semibold opacity-90 cursor-not-allowed"
                >
                  💬 Commenter (0)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ONGLET CONFIGURATION & PARAMÈTRES */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && settingsForm && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-white">Paramètres des Suggestions</h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Module Activé</div>
                  <div className="text-[11px] text-slate-400">Autoriser les membres à utiliser /suggest</div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.enabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, enabled: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Salon Discord de Publication</label>
                <select
                  value={settingsForm.channelId || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, channelId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                >
                  <option value="">-- Sélectionner un salon textuel --</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Fils de Discussion Automatiques (Threads)</div>
                  <div className="text-[11px] text-slate-400">
                    Créer automatiquement un fil sous chaque suggestion pour les échanges
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.autoThread}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoThread: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Notifications Privées (DM)</div>
                  <div className="text-[11px] text-slate-400">
                    Avertir l'auteur et les followers lors d'une mise à jour de statut
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.dmNotifications}
                  onChange={(e) => setSettingsForm({ ...settingsForm, dmNotifications: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Cooldown entre deux suggestions (minutes)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={settingsForm.cooldownMinutes}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      cooldownMinutes: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
          >
            {savingSettings ? 'Enregistrement...' : 'Enregistrer la Configuration'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* MODAL / TIROIR DÉTAIL D'UNE SUGGESTION (AVEC WORKFLOW STAFF) */}
      {/* ========================================================================= */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/[0.06] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    #{selectedSuggestion.numericId}
                  </span>
                  <h3 className="text-base font-semibold text-white">{selectedSuggestion.title}</h3>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Par {selectedSuggestion.authorTag} • Catégorie : {selectedSuggestion.category}
                </div>
              </div>
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps de la suggestion */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedSuggestion.status)}
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300">
                  Priorité : {selectedSuggestion.priority}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                  Score : {selectedSuggestion.score >= 0 ? `+${selectedSuggestion.score}` : selectedSuggestion.score}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-3.5 rounded-lg border border-white/[0.04]">
                {selectedSuggestion.description}
              </p>

              {selectedSuggestion.staffResponse && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Réponse Officielle du Staff ({selectedSuggestion.staffResponderTag}) :</span>
                  </div>
                  <p className="text-slate-200 italic">"{selectedSuggestion.staffResponse}"</p>
                </div>
              )}
            </div>

            {/* Actions Staff : Changer de Statut */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Actions de Modération Staff</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Réponse officielle à joindre (optionnel)</label>
                  <input
                    type="text"
                    value={staffResponseInput}
                    onChange={(e) => setStaffResponseInput(e.target.value)}
                    placeholder="Ex: Prévu dans la prochaine mise à jour..."
                    className="w-full px-3 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    onClick={() => handleUpdateStatus('under_review')}
                    disabled={savingAction}
                    className="px-2.5 py-1.5 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 text-xs border border-blue-500/30"
                  >
                    🔵 Mettre en étude
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('accepted')}
                    disabled={savingAction}
                    className="px-2.5 py-1.5 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs border border-emerald-500/30"
                  >
                    🟢 Accepter
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={savingAction}
                    className="px-2.5 py-1.5 rounded bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 text-xs border border-teal-500/30"
                  >
                    ✅ Réalisée
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={savingAction}
                    className="px-2.5 py-1.5 rounded bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs border border-rose-500/30"
                  >
                    🔴 Refuser
                  </button>
                </div>
              </div>
            </div>

            {/* Fil des commentaires */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Commentaires & Avis ({selectedSuggestion.comments.length})</span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-white/[0.04] space-y-2">
                {selectedSuggestion.comments.length === 0 ? (
                  <div className="text-xs text-slate-500 font-mono py-2">
                    Aucun commentaire pour le moment.
                  </div>
                ) : (
                  selectedSuggestion.comments.map((comm) => (
                    <div key={comm.id} className="pt-2 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{comm.userTag}</span>
                        {comm.isStaff && (
                          <span className="text-[9px] font-mono px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            STAFF
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(comm.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{comm.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Formulaire ajout commentaire */}
              <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Écrire un commentaire..."
                  value={newCommentInput}
                  onChange={(e) => setNewCommentInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                >
                  Envoyer
                </button>
              </form>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="px-4 py-1.5 rounded-lg bg-white/[0.04] text-white text-xs font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
