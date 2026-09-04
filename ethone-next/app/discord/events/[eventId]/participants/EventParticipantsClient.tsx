"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  ArrowUpRight,
  Filter,
  Ticket,
  UserCheck,
  UserX,
  Trash2,
  Calendar,
} from "lucide-react";

interface Participant {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  rsvp: "GOING" | "MAYBE" | "NOT_GOING" | "WAITLIST";
  attendance: "REGISTERED" | "ATTENDED" | "NO_SHOW";
  ticketNumber: string;
  joinedAt: string;
  checkedInAt?: string;
  waitlistPosition?: number;
}

const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: "p1",
    userId: "usr-1",
    username: "Nocturne#4412",
    displayName: "Nocturne",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60",
    rsvp: "GOING",
    attendance: "ATTENDED",
    ticketNumber: "#EVT-1001",
    joinedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    checkedInAt: new Date().toISOString(),
  },
  {
    id: "p2",
    userId: "usr-2",
    username: "AlexDev#0001",
    displayName: "AlexDev",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60",
    rsvp: "GOING",
    attendance: "ATTENDED",
    ticketNumber: "#EVT-1002",
    joinedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    checkedInAt: new Date().toISOString(),
  },
  {
    id: "p3",
    userId: "usr-3",
    username: "ShadowGamer#1337",
    displayName: "Shadow",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60",
    rsvp: "GOING",
    attendance: "REGISTERED",
    ticketNumber: "#EVT-1003",
    joinedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "p4",
    userId: "usr-4",
    username: "Sarah_T#2048",
    displayName: "Sarah",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60",
    rsvp: "MAYBE",
    attendance: "REGISTERED",
    ticketNumber: "#EVT-1004",
    joinedAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "p5",
    userId: "usr-5",
    username: "Zephyr#0042",
    displayName: "Zephyr",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60",
    rsvp: "WAITLIST",
    attendance: "REGISTERED",
    ticketNumber: "#EVT-1005",
    joinedAt: new Date(Date.now() - 21600000).toISOString(),
    waitlistPosition: 1,
  },
];

export default function EventParticipantsClient() {
  const params = useParams();
  const eventId = (params?.eventId as string) || "evt-gaming-night";

  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [filterRsvp, setFilterRsvp] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredList = useMemo(() => {
    return participants.filter((p) => {
      const matchSearch =
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (filterRsvp === "ALL") return true;
      if (filterRsvp === "ATTENDED") return p.attendance === "ATTENDED";
      return p.rsvp === filterRsvp;
    });
  }, [participants, searchQuery, filterRsvp]);

  // Toggle Attendance
  const handleToggleAttendance = (userId: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.userId === userId) {
          const isAttended = p.attendance === "ATTENDED";
          return {
            ...p,
            attendance: isAttended ? "REGISTERED" : "ATTENDED",
            checkedInAt: isAttended ? undefined : new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  // Promote from waitlist
  const handlePromote = (userId: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.userId === userId) {
          return {
            ...p,
            rsvp: "GOING",
            waitlistPosition: undefined,
          };
        }
        return p;
      })
    );
  };

  // Delete participant
  const handleRemove = (userId: string) => {
    setParticipants((prev) => prev.filter((p) => p.userId !== userId));
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Ticket", "Pseudo", "Nom", "Statut RSVP", "Presence", "Inscrit le"];
    const rows = participants.map((p) => [
      p.ticketNumber,
      p.username,
      p.displayName,
      p.rsvp,
      p.attendance,
      p.joinedAt,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `participants-${eventId}.csv`;
    link.click();
  };

  // JSON Export
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(participants, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `participants-${eventId}.json`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              <Link href={`/discord/events/${eventId}`} className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour à l'événement
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-indigo-400" />
              Gestion des Participants & Pointages
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Consultez les inscrits, enregistrez les arrivées en direct et exportez la liste complète.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              CSV
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              JSON
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Chercher par nom ou ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "ALL", label: `Tous (${participants.length})` },
              { id: "GOING", label: `Confirmés (${participants.filter((p) => p.rsvp === "GOING").length})` },
              { id: "ATTENDED", label: `Pointés (${participants.filter((p) => p.attendance === "ATTENDED").length})` },
              { id: "WAITLIST", label: `File d'attente (${participants.filter((p) => p.rsvp === "WAITLIST").length})` },
              { id: "MAYBE", label: `Peut-être (${participants.filter((p) => p.rsvp === "MAYBE").length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRsvp(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterRsvp === tab.id
                    ? "bg-indigo-500 text-white shadow-sm shadow-indigo-500/30"
                    : "bg-white/5 hover:bg-white/10 text-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Participants Table */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.01] backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Participant</th>
                  <th className="p-4">Ticket</th>
                  <th className="p-4">Statut RSVP</th>
                  <th className="p-4">Présence (Check-in)</th>
                  <th className="p-4">Date Inscription</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredList.map((p) => {
                  const isAttended = p.attendance === "ATTENDED";
                  const isWaitlist = p.rsvp === "WAITLIST";

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* User Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.avatarUrl}
                            alt={p.username}
                            className="w-8 h-8 rounded-full object-cover border border-white/10"
                          />
                          <div>
                            <div className="font-bold text-white">{p.displayName}</div>
                            <div className="text-[11px] text-slate-500">{p.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Ticket */}
                      <td className="p-4 font-mono font-bold text-indigo-400">
                        {p.ticketNumber}
                      </td>

                      {/* RSVP Badge */}
                      <td className="p-4">
                        {p.rsvp === "GOING" && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Confirmé
                          </span>
                        )}
                        {p.rsvp === "MAYBE" && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Peut-être
                          </span>
                        )}
                        {p.rsvp === "WAITLIST" && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            File #{p.waitlistPosition}
                          </span>
                        )}
                        {p.rsvp === "NOT_GOING" && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            Refusé
                          </span>
                        )}
                      </td>

                      {/* Attendance */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleAttendance(p.userId)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                            isAttended
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10"
                          }`}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isAttended ? "text-emerald-400" : "text-slate-500"}`} />
                          {isAttended ? "Pointé (Présent)" : "Non pointé"}
                        </button>
                      </td>

                      {/* Registered Date */}
                      <td className="p-4 text-slate-400">
                        {new Date(p.joinedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-2">
                        {isWaitlist && (
                          <button
                            onClick={() => handlePromote(p.userId)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                            title="Promouvoir en confirmé"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleRemove(p.userId)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
