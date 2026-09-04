"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Award,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Search,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function InviteUserDetailClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = (params?.userId as string) || "usr_alex";
  const guildId = searchParams.get("guildId") || "1128633164290596884";

  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    if (!API_BASE) {
      setProfile({
        rank: 1,
        userId,
        userTag: "Alex#0001",
        totalInvites: 184,
        validInvites: 162,
        leftMembers: 14,
        suspiciousInvites: 8,
        retentionRate: 91,
        rewardsEarned: 3,
      });
      setReferrals([
        {
          id: "ref_1",
          invitedUserId: "usr_lucas",
          invitedUserTag: "Lucas#1234",
          inviteCode: "ethone-dev",
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          accountAgeDays: 120,
          status: "VALID",
          riskScore: 5,
          riskLevel: "Safe",
        },
        {
          id: "ref_2",
          invitedUserId: "usr_emma",
          invitedUserTag: "Emma#5678",
          inviteCode: "ethone-dev",
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          accountAgeDays: 350,
          status: "VALID",
          riskScore: 2,
          riskLevel: "Safe",
        },
        {
          id: "ref_3",
          invitedUserId: "usr_ghost",
          invitedUserTag: "GhostLeaver#7777",
          inviteCode: "ethone-dev",
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          accountAgeDays: 45,
          status: "LEFT",
          riskScore: 18,
          riskLevel: "Safe",
        },
      ]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/invites/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setReferrals(data.referrals || []);
      } else {
        throw new Error("Erreur serveur");
      }
    } catch {
      // Fallback demo data
      setProfile({
        rank: 1,
        userId,
        userTag: "Alex#0001",
        totalInvites: 184,
        validInvites: 162,
        leftMembers: 14,
        suspiciousInvites: 8,
        retentionRate: 91,
        rewardsEarned: 3,
      });
      setReferrals([
        {
          id: "ref_1",
          invitedUserId: "usr_lucas",
          invitedUserTag: "Lucas#1234",
          inviteCode: "ethone-dev",
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          accountAgeDays: 120,
          status: "VALID",
          riskScore: 5,
          riskLevel: "Safe",
        },
        {
          id: "ref_2",
          invitedUserId: "usr_emma",
          invitedUserTag: "Emma#5678",
          inviteCode: "ethone-dev",
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          accountAgeDays: 350,
          status: "VALID",
          riskScore: 2,
          riskLevel: "Safe",
        },
        {
          id: "ref_3",
          invitedUserId: "usr_ghost",
          invitedUserTag: "GhostLeaver#7777",
          inviteCode: "ethone-dev",
          joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          accountAgeDays: 45,
          status: "LEFT",
          riskScore: 18,
          riskLevel: "Safe",
        },
        {
          id: "ref_4",
          invitedUserId: "usr_bot",
          invitedUserTag: "SpamBot#0000",
          inviteCode: "ethone-dev",
          joinedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          accountAgeDays: 0,
          status: "SUSPICIOUS",
          suspiciousReason: "Compte créé il y a moins de 2 heures",
          riskScore: 88,
          riskLevel: "High Risk",
        },
      ]);
    } finally {
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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col p-4 sm:p-8 pb-36 max-w-6xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
        <Link
          href={`/discord/invites?guildId=${guildId}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Retour à l'Invite Tracker</span>
        </Link>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-pink-400" : ""}`} />
        </button>
      </div>

      {/* User Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-pink-500/20">
            {profile?.userTag ? profile.userTag.slice(0, 2).toUpperCase() : "U"}
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {profile?.userTag || "Utilisateur"}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold font-mono">
                Rang #{profile?.rank || 1}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">ID Discord : {userId}</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/discord/moderation/users/${userId}?guildId=${guildId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition"
            >
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              <span>Dossier Modération</span>
            </Link>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-zinc-800">
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Total Invites</div>
            <div className="text-xl font-bold text-white font-mono">{profile?.totalInvites || 0}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Invites Valides</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{profile?.validInvites || 0}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Membres Partis</div>
            <div className="text-xl font-bold text-zinc-400 font-mono">{profile?.leftMembers || 0}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Suspectes / Fakes</div>
            <div className="text-xl font-bold text-rose-400 font-mono">{profile?.suspiciousInvites || 0}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Taux de Rétention</div>
            <div className="text-xl font-bold text-pink-400 font-mono">{profile?.retentionRate || 0}%</div>
          </div>
        </div>
      </div>

      {/* Referral History Section */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Historique des Membres Invités</h3>
            <p className="text-xs text-zinc-400">
              Liste détaillée de chaque membre ayant rejoint le serveur via les invitations de cet utilisateur.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par pseudo ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {filteredReferrals.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            Aucun membre invité trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-mono">
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
              <tbody className="divide-y divide-zinc-800/60">
                {filteredReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-white text-xs">
                          {ref.invitedUserTag?.slice(0, 1) || "U"}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{ref.invitedUserTag}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{ref.invitedUserId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-300">
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                        {ref.inviteCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      {ref.accountAgeDays !== undefined ? `${ref.accountAgeDays} j` : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      {new Date(ref.joinedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          ref.status === "VALID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : ref.status === "SUSPICIOUS"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-zinc-800 text-zinc-400"
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
                        <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                          {ref.suspiciousReason || "Normal"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/discord/moderation/users/${ref.invitedUserId}?guildId=${guildId}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 inline-block transition"
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
