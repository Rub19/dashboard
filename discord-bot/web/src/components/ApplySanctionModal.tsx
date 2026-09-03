import React, { useState } from 'react';
import { SanctionType } from '../types';
import { AlertTriangle, Clock, Shield, UserX, X } from 'lucide-react';

interface ApplySanctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    userId: string;
    type: SanctionType;
    reason: string;
    durationSeconds?: number;
  }) => Promise<void>;
}

export const ApplySanctionModal: React.FC<ApplySanctionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<SanctionType>('warn');
  const [reason, setReason] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(600); // 10m
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((type === 'ban' || type === 'kick') && !confirmed) return;

    setSubmitting(true);
    try {
      await onSubmit({
        userId: userId.trim(),
        type,
        reason: reason.trim() || 'Sanction appliquée depuis le Dashboard',
        durationSeconds: type === 'timeout' ? durationSeconds : undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isCritical = type === 'ban' || type === 'kick';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#101217] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
        {/* Entête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Appliquer une sanction</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Identifiant du membre */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Identifiant Discord (User ID)</label>
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Ex: 1128633164290596884"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type de Sanction */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Type de Sanction</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['warn', 'timeout', 'kick', 'ban'] as SanctionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                    type === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Durée (uniquement si timeout) */}
          {type === 'timeout' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Durée de la sourdine</span>
              </label>
              <select
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
                <option value={3600}>1 heure</option>
                <option value={86400}>1 jour</option>
                <option value={604800}>7 jours</option>
              </select>
            </div>
          )}

          {/* Raison */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Raison</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Spam répété dans le salon général"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Confirmation pour actions sensibles (Kick / Ban) */}
          {isCritical && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Action irréversible requise</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-rose-600 focus:ring-0"
                />
                <span>Je confirme vouloir {type === 'ban' ? 'bannir' : 'expulser'} ce membre.</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || (isCritical && !confirmed)}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs transition-colors shadow-sm"
            >
              {submitting ? 'Application...' : 'Confirmer la sanction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
