"use client";

import { type TaskPriority } from "@/components/TasksWidget";

export interface GeneratedTask {
  title: string;
  category: string;
  priority: TaskPriority;
  estimatedMinutes?: number;
}

export interface TaskSuggestionPack {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  gradient: string;
  tasks: GeneratedTask[];
}

export const PRESET_TASK_PACKS: TaskSuggestionPack[] = [
  {
    id: "dev-sprint",
    title: "Sprint Dev & Déploiement",
    description: "Cycle complet de dev, tests, lint et déploiement Cloudflare",
    icon: "code",
    badge: "DEV & CLOUD",
    gradient: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
    tasks: [
      { title: "Vérifier le statut git et les modifications en cours", category: "Dev", priority: "high", estimatedMinutes: 10 },
      { title: "Lancer les tests de build Next.js et TypeScript (0 erreur)", category: "Dev", priority: "urgent", estimatedMinutes: 15 },
      { title: "Mettre à jour le changelog et incrémenter la version", category: "Release", priority: "medium", estimatedMinutes: 5 },
      { title: "Déployer sur Cloudflare Pages et vérifier la santé de l'API", category: "Cloud", priority: "high", estimatedMinutes: 10 },
    ],
  },
  {
    id: "focus-productivity",
    title: "Session Deep Work & Focus",
    description: "Bloc de concentration intense sans distraction pour avancer sur l'essentiel",
    icon: "zap",
    badge: "FOCUS",
    gradient: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
    tasks: [
      { title: "Définir l'unique objectif prioritaire du bloc", category: "Focus", priority: "urgent", estimatedMinutes: 5 },
      { title: "Activer le mode Zen et couper les notifications", category: "Organisation", priority: "medium", estimatedMinutes: 2 },
      { title: "Sprint de 45 minutes de travail ininterrompu", category: "Travail", priority: "high", estimatedMinutes: 45 },
      { title: "Bilan rapide et pause café de 5 minutes", category: "Bien-être", priority: "low", estimatedMinutes: 5 },
    ],
  },
  {
    id: "ui-polish",
    title: "Refonte & Polish UI 2026",
    description: "Amélioration des animations, contrastes et composants Obsidian Glass",
    icon: "sparkles",
    badge: "DESIGN",
    gradient: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
    tasks: [
      { title: "Auditer les contrastes et les flous de fond backdrop-blur", category: "Design", priority: "medium", estimatedMinutes: 20 },
      { title: "Affiner les micro-animations d'entrée et sortie Framer Motion", category: "Design", priority: "high", estimatedMinutes: 25 },
      { title: "Tester la réactivité mobile et les safe areas", category: "UX", priority: "high", estimatedMinutes: 15 },
    ],
  },
  {
    id: "security-audit",
    title: "Audit Sécurité & Secrets",
    description: "Revue des variables d'environnement, clés API et règles CORS",
    icon: "shield",
    badge: "SÉCURITÉ",
    gradient: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
    tasks: [
      { title: "Vérifier que toutes les clés API sont masquées en Secret", category: "Sécurité", priority: "urgent", estimatedMinutes: 10 },
      { title: "Vérifier l'absence de tokens hardcodés dans le code source", category: "Sécurité", priority: "high", estimatedMinutes: 15 },
      { title: "Tester les fallbacks IA et la résistance aux coupures réseau", category: "Architecture", priority: "medium", estimatedMinutes: 20 },
    ],
  },
];

export async function generateAITasks(prompt: string): Promise<GeneratedTask[]> {
  if (!prompt.trim()) return [];

  try {
    const response = await fetch("/api/brain/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Génère une liste de 3 à 5 tâches concrètes, précises et directement actionnables à partir de cet objectif : "${prompt}".
Réponds STRICTEMENT au format JSON pur sans texte avant ou après, sous cette structure :
[
  {
    "title": "Titre précis de la tâche",
    "category": "Dev" ou "Design" ou "Organisation" ou "Personnel" ou "Projet",
    "priority": "urgent" ou "high" ou "medium" ou "low",
    "estimatedMinutes": 15
  }
]`,
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data?.response || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            title: String(item.title || "Tâche sans titre"),
            category: String(item.category || "Général"),
            priority: ["urgent", "high", "medium", "low"].includes(item.priority)
              ? item.priority
              : "medium",
            estimatedMinutes: Number(item.estimatedMinutes) || 15,
          }));
        }
      }
    }
  } catch (err) {
    console.warn("AI Task Generation error, using fallback template:", err);
  }

  // Fallback intelligent
  return [
    { title: `Analyser et préparer : ${prompt}`, category: "Projet", priority: "high", estimatedMinutes: 15 },
    { title: `Exécuter le plan d'action principal`, category: "Travail", priority: "urgent", estimatedMinutes: 30 },
    { title: `Vérifier, tester et finaliser les livrables`, category: "Contrôle", priority: "medium", estimatedMinutes: 15 },
  ];
}
