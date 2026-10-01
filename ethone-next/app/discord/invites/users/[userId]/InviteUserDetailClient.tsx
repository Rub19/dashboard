"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathSegment } from "@/lib/hooks/usePathSegment";
import {
  ChevronLeft,
  Shield,
  ExternalLink,
  RefreshCw,
  Search,
} from "@/components/icons/ph";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";

const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function InviteUserDetailClient() {
  const searchParams = useSearchParams();
  const userId = usePathSegment("users");
  const { profile: oauthProfile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), oauthProfile?.guilds);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    if (!userId || !API_BASE) {
      setProfile(null);
      setReferrals([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/invites/users/${userId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setReferrals(data.referrals || []);
      } else {
        throw new Error("Erreur serveur");
      }
    } catch {
      // Bot injoignable : aucun profil inventé.
      setProfile(null);
      setReferrals([]);    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, guildId]);

  const filteredReferrals = referrals.filter((r) =>
    (r.invitedUserTag || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.invitedUserId || "").includes(search)
  );

  return (
    <div className="w-full px-4 py-6 sm:px-6 text-[var(--text-primary)] flex flex-col max-w-6xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--panel-border)]">
        <Link
          href={`/discord/invites?guildId=${guildId}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Retour à l'Invite Tracker</span>
        </Link>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-xl bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--panel-border)] transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-pink-400" : ""}`} />
        </button>
      </div>

      {/* User Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-pink-600 flex items-center justify-center text-2xl font-bold text-white">
            {profile?.userTag ? profile.userTag.slice(0, 2).toUpperCase() : "U"}
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                {profile?.userTag || "Utilisateur"}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold font-mono">
                {profile?.rank ? `Rang #${profile.rank}` : "Rang —"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono">ID Discord : {userId}</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/discord/moderation/users/${userId}?guildId=${guildId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 text-[var(--text-muted)] text-xs font-medium border border-[var(--panel-border)] transition"
            >
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              <span>Dossier Modération</span>
            </Link>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-[var(--panel-border)]">
          <div className="p-3 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Total Invites</div>
            <div className="text-xl font-bold text-[var(--text-primary)] font-mono">{profile?.totalInvites || 0}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Invites Valides</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{profile?.validInvites || 0}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Membres Partis</div>
            <div className="text-xl font-bold text-[var(--text-muted)] font-mono">{profile?.leftMembers || 0}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Suspectes / Fakes</div>
            <div className="text-xl font-bold text-rose-400 font-mono">{profile?.suspiciousInvites || 0}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Taux de Rétention</div>
            <div className="text-xl font-bold text-pink-400 font-mono">{profile?.retentionRate || 0}%</div>
          </div>
        </div>
      </div>

      {/* Referral History Section */}
      <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Historique des Membres Invités</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Liste détaillée de chaque membre ayant rejoint le serveur via les invitations de cet utilisateur.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par pseudo ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {filteredReferrals.length === 0 ? (
          <div className="pop-in py-12 text-center text-[var(--text-muted)] text-xs">
            Aucun membre invité trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--panel-border)] text-[var(--text-muted)] uppercase text-xs font-mono">
                <tr>
                  <th className="py-3 px-3">Membre Référé</th>
                  <th className="py-3 px-3">Code Invite</th>
                  <th className="py-3 px-3">Âge Compte</th>
                  <th className="py-3 px-3">Date Join</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3">Risk Score</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="stagger-children divide-y divide-[var(--panel-border)]">
                {filteredReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-[var(--surface-raised)]/70 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--surface-raised)]/40 flex items-center justify-center font-bold text-[var(--text-primary)] text-xs">
                          {ref.invitedUserTag?.slice(0, 1) || "U"}
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">{ref.invitedUserTag}</div>
                          <div className="text-xs text-[var(--text-muted)] font-mono">{ref.invitedUserId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">
                      <span className="px-2 py-0.5 rounded bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]">
                        {ref.inviteCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">
                      {ref.accountAgeDays !== undefined ? `${ref.accountAgeDays} j` : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">
                      {new Date(ref.joinedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                          ref.status === "VALID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : ref.status === "SUSPICIOUS"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-[var(--surface-raised)]/40 text-[var(--text-muted)]"
                        }`}
                      >
                        {ref.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-xs ${
                            ref.riskScore >= 60
                              ? "text-rose-400"
                              : ref.riskScore >= 35
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {ref.riskScore || 0}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] truncate max-w-[120px]">
                          {ref.suspiciousReason || "Normal"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/discord/moderation/users/${ref.invitedUserId}?guildId=${guildId}`}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 inline-block transition"
                        title="Voir profil membre"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
