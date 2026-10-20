"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  api,
  ModelRegistryItem,
  AnalyticsOverview,
  LiveTrafficResponse,
  LiveTrafficEvent,
  RoleItem,
} from "@/lib/api";
import {
  Sparkles,
  Zap,
  Cpu,
  Server,
  DollarSign,
  Maximize2,
  Tv,
  CheckCircle2,
  Compass,
  Users,
  Coffee,
  Sun,
  Moon,
  Dumbbell,
  Gamepad2,
  PhoneCall,
  Crown,
  Briefcase,
  Waves,
  Laptop,
  RotateCcw,
  Footprints,
  Layers,
  Building,
  Monitor,
  Terminal,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelPanel } from "@/components/pixel/PixelPanel";
import { PixelDialogueBox } from "@/components/pixel/PixelDialogueBox";
import { useI18n, Language } from "@/lib/i18n";

// =====================================================================
// Types & Interfaces
// =====================================================================

export interface ModelWorkstationPC {
  id: string;
  modelId: string;
  internalName: string;
  adapter: string;
  category: "coding" | "reasoning" | "speed" | "flagship" | "gateway";
  inputPrice: string;
  outputPrice: string;
  context: string;
  ttft: string;
  capabilities: string[];
  gx: number;
  gy: number;
  deskLabel: string;
  status: "online" | "active" | "offline";
  screenGlow: string;
  isOccupied: boolean;
  occupyingAgentName?: string;
}

export interface DialogueBubble {
  agentId: string;
  agentRole: string;
  modelName: string;
  reasonText: string;
  ticksRemaining: number;
}

export interface CampusAgent {
  id: string;
  name: string;
  role: string;
  department: string;
  contextBehavior?: string;
  preferredModelId?: string;
  hairColor: string;
  shirtColor: string;
  tieColor?: string;
  hasGlasses?: boolean;
  hasHeadset?: boolean;
  isDefault?: boolean;
  gx: number;
  gy: number;
  targetGx: number;
  targetGy: number;
  state: "idle" | "walking" | "using_pc" | "cafe" | "gym" | "arcade" | "meeting" | "focus" | "reception";
  stateTicks: number;
  targetPcId?: string;
  currentRoom: string;
  currentActivity?: string;
  dialogue?: DialogueBubble;
  facing: "left" | "right";
  walkFrame: number;
}

interface OfficeSimulationProps {
  models: ModelRegistryItem[];
  overview: AnalyticsOverview | null;
  onSelectModel?: (modelId: string) => void;
  onOpenRecommendQuest?: () => void;
}

// Isometric Projection Math Constants
const TILE_W = 44;
const TILE_H = 22;
const TILE_HALF_W = 22;
const TILE_HALF_H = 11;

// Grid Dimensions: 28 cols x 20 rows
const GRID_COLS = 28;
const GRID_ROWS = 20;

// High-Contrast Room Partition Definitions
export interface RoomZone {
  id: string;
  name: string;
  code: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  darkFloorA: string;
  darkFloorB: string;
  lightFloorA: string;
  lightFloorB: string;
  accentColor: string;
  accentGlow: string;
}

const ROOM_ZONES: RoomZone[] = [
  {
    id: "lobby",
    name: "Reception & Welcome Lobby",
    code: "01: LOBBY",
    x1: 1,
    y1: 15,
    x2: 7,
    y2: 19,
    darkFloorA: "#2E263B",
    darkFloorB: "#382F47",
    lightFloorA: "#EDE2D0",
    lightFloorB: "#E2D5C1",
    accentColor: "#FFB71B",
    accentGlow: "rgba(255, 183, 27, 0.4)",
  },
  {
    id: "server-vault",
    name: "Ingress Router & Server Vault",
    code: "02: SERVER VAULT",
    x1: 1,
    y1: 1,
    x2: 7,
    y2: 6,
    darkFloorA: "#1A2B3C",
    darkFloorB: "#21364A",
    lightFloorA: "#E4DCCF",
    lightFloorB: "#DACFBE",
    accentColor: "#00E5FF",
    accentGlow: "rgba(0, 229, 255, 0.45)",
  },
  {
    id: "director-suite",
    name: "Executive Director Suite",
    code: "03: DIRECTOR SUITE",
    x1: 8,
    y1: 1,
    x2: 15,
    y2: 6,
    darkFloorA: "#45281F",
    darkFloorB: "#543226",
    lightFloorA: "#E8D3BF",
    lightFloorB: "#DFC5AF",
    accentColor: "#F59E0B",
    accentGlow: "rgba(245, 158, 11, 0.4)",
  },
  {
    id: "workstations",
    name: "AI Model Workstation Cubicles",
    code: "04: AI WORKSTATIONS",
    x1: 16,
    y1: 1,
    x2: 27,
    y2: 10,
    darkFloorA: "#222B3D",
    darkFloorB: "#2C374D",
    lightFloorA: "#E2DCD2",
    lightFloorB: "#D5CEC2",
    accentColor: "#34D399",
    accentGlow: "rgba(52, 211, 153, 0.45)",
  },
  {
    id: "boardroom",
    name: "Boardroom & Strategy Conference",
    code: "05: BOARDROOM",
    x1: 1,
    y1: 7,
    x2: 7,
    y2: 14,
    darkFloorA: "#312347",
    darkFloorB: "#3D2B57",
    lightFloorA: "#E2D8CD",
    lightFloorB: "#D5C8BA",
    accentColor: "#C084FC",
    accentGlow: "rgba(192, 132, 252, 0.4)",
  },
  {
    id: "focus-pods",
    name: "Soundproof Focus & Phone Pods",
    code: "06: FOCUS PODS",
    x1: 8,
    y1: 7,
    x2: 15,
    y2: 10,
    darkFloorA: "#1F3447",
    darkFloorB: "#28435C",
    lightFloorA: "#DCE3EB",
    lightFloorB: "#CFD8E2",
    accentColor: "#60A5FA",
    accentGlow: "rgba(96, 165, 250, 0.4)",
  },
  {
    id: "pantry-cafeteria",
    name: "Pantry, Cafeteria & Espresso Bar",
    code: "07: PANTRY & BISTRO",
    x1: 8,
    y1: 11,
    x2: 17,
    y2: 19,
    darkFloorA: "#4A2D1B",
    darkFloorB: "#5A3822",
    lightFloorA: "#EDD9C4",
    lightFloorB: "#DFC6AD",
    accentColor: "#FB923C",
    accentGlow: "rgba(251, 146, 60, 0.4)",
  },
  {
    id: "recreation-gym",
    name: "Arcade, Recreation & Wellness Gym",
    code: "08: ARCADE & GYM",
    x1: 18,
    y1: 11,
    x2: 27,
    y2: 19,
    darkFloorA: "#1A3B2E",
    darkFloorB: "#224A3B",
    lightFloorA: "#D4E8DC",
    lightFloorB: "#C5DCCE",
    accentColor: "#2DD4BF",
    accentGlow: "rgba(45, 212, 191, 0.4)",
  },
];

export const RELAXATION_SPOTS = [
  { gx: 12, gy: 14, state: "cafe" as const, room: "pantry-cafeteria", activity: "Ngopi di Pantry (Santai)" },
  { gx: 20, gy: 14, state: "arcade" as const, room: "recreation-gym", activity: "Santai Main Arcade" },
  { gx: 25, gy: 14, state: "gym" as const, room: "recreation-gym", activity: "Olahraga di Gym" },
  { gx: 4, gy: 17, state: "reception" as const, room: "lobby", activity: "Santai di Sofa Lobby" },
  { gx: 11, gy: 8, state: "focus" as const, room: "focus-pods", activity: "Meditasi di Focus Pod" },
  { gx: 4, gy: 10, state: "meeting" as const, room: "boardroom", activity: "Santai di Boardroom" },
  { gx: 11, gy: 3, state: "idle" as const, room: "director-suite", activity: "Duduk di Director Suite" },
];

export const DEFAULT_FALLBACK_AGENT: CampusAgent = {
  id: "lead-fullstack-architect",
  name: "Lead Fullstack Engineer",
  role: "Lead Fullstack Engineer",
  department: "Core Systems & Fullstack Architecture",
  contextBehavior:
    "Experienced, pragmatic Fullstack Systems Architect who builds robust, end-to-end architectures from scratch without AI fluff, hallucinations, or unverified shortcuts. Highly intolerant to fake simulations, unauthenticated bypasses, or broken contracts. Prioritizes real live telemetry, privacy-by-default, and auditable metrics. When selecting models: prefers ultra-fast, high-context workhorses (like Gemini 3.8 Flash High with 1,048k token window) for deep AST analysis and multi-file refactoring; switches to deep reasoning models only when resolving critical CVE security audits or complex state machines. Cost, latency, and TTFT conscious—never burns tokens on wasteful prompts.",
  preferredModelId: "ag/gemini-3.8-flash-high",
  hairColor: "#4B2E1E",
  shirtColor: "#2B5278",
  tieColor: "#E53E3E",
  hasGlasses: true,
  hasHeadset: false,
  isDefault: true,
  gx: 12,
  gy: 14,
  targetGx: 12,
  targetGy: 14,
  currentRoom: "pantry-cafeteria",
  currentActivity: "Ngopi di Pantry (Santai)",
  state: "cafe",
  stateTicks: 0,
  walkFrame: 0,
  facing: "right",
};

export function getActivityLabel(activity: string | undefined, lang: Language): string {
  if (!activity) return lang === "en" ? "Resting" : "Santai";

  const map: Record<string, { en: string; id: string }> = {
    "cafe": { en: "Having Coffee at Pantry (Relaxing)", id: "Ngopi di Pantry (Santai)" },
    "arcade": { en: "Playing Arcade Games (Relaxing)", id: "Santai Main Arcade" },
    "gym": { en: "Working Out at Gym", id: "Olahraga di Gym" },
    "reception": { en: "Relaxing on Lobby Couch", id: "Santai di Sofa Lobby" },
    "focus": { en: "Focusing in Soundproof Pod", id: "Meditasi di Focus Pod" },
    "meeting": { en: "Chilling in Boardroom", id: "Santai di Boardroom" },
    "idle": { en: "Resting in Director Suite", id: "Duduk di Director Suite" },
    "Ngopi di Pantry (Santai)": { en: "Having Coffee at Pantry (Relaxing)", id: "Ngopi di Pantry (Santai)" },
    "Santai Main Arcade": { en: "Playing Arcade Games (Relaxing)", id: "Santai Main Arcade" },
    "Olahraga di Gym": { en: "Working Out at Gym", id: "Olahraga di Gym" },
    "Santai di Sofa Lobby": { en: "Relaxing on Lobby Couch", id: "Santai di Sofa Lobby" },
    "Meditasi di Focus Pod": { en: "Focusing in Soundproof Pod", id: "Meditasi di Focus Pod" },
    "Santai di Boardroom": { en: "Chilling in Boardroom", id: "Santai di Boardroom" },
    "Duduk di Director Suite": { en: "Resting in Director Suite", id: "Duduk di Director Suite" },
  };

  if (map[activity]) {
    return map[activity][lang];
  }

  if (activity.startsWith("Selesai routing. Menuju ") || activity.startsWith("Routing completed. Heading to ")) {
    const room = activity.replace("Selesai routing. Menuju ", "").replace("Routing completed. Heading to ", "");
    return lang === "en" ? `Routing completed. Heading to ${room}` : `Selesai routing. Menuju ${room}`;
  }

  if (activity.startsWith("Memproses request di ") || activity.startsWith("Processing request on ")) {
    const pc = activity.replace("Memproses request di ", "").replace("Processing request on ", "");
    return lang === "en" ? `Processing request on ${pc}` : `Memproses request di ${pc}`;
  }

  if (activity.startsWith("Memproses benchmark di ") || activity.startsWith("Running benchmark on ")) {
    const pc = activity.replace("Memproses benchmark di ", "").replace("Running benchmark on ", "");
    return lang === "en" ? `Running benchmark on ${pc}` : `Memproses benchmark di ${pc}`;
  }

  if (activity.startsWith("Manual route ke ") || activity.startsWith("Manual route to ")) {
    const pc = activity.replace("Manual route ke ", "").replace("Manual route to ", "");
    return lang === "en" ? `Manual route to ${pc}` : `Manual route ke ${pc}`;
  }

  return activity;
}

export function formatDialogueText(agent: CampusAgent, lang: Language): string {
  const isEn = lang === "en";

  if (agent.dialogue) {
    let reason = agent.dialogue.reasonText;

    if (isEn) {
      if (reason.startsWith("Memilih ")) {
        reason = reason
          .replace(/^Memilih\s+/, "Selected ")
          .replace("Latency super cepat", "Ultra-fast latency")
          .replace("tanpa fluff", "without fluff")
          .replace("Eksekusi AST diff & refactor real-time!", "Real-time AST diff & refactoring execution!")
          .replace("Benchmark akurasi deterministik tinggi untuk validasi arsitektur modular & zero-fake contracts.", "High deterministic accuracy benchmark for modular architecture validation & zero-fake contracts.")
          .replace("sangat penting untuk streaming response UI mobile tanpa jank.", "is critical for stutter-free mobile UI streaming.")
          .replace("optimal untuk sintesis backlog & spesifikasi PRD konsisten.", "optimal for backlog synthesis & consistent PRD specs.")
          .replace("Vocabulary reach tinggi untuk copy persuasif dan positioning messaging produk.", "High vocabulary reach for persuasive copywriting and product messaging.")
          .replace("Konsistensi output deterministik tinggi untuk autogenerate test case pytest tanpa false positives.", "High deterministic output consistency for autogenerating pytest test cases without false positives.")
          .replace("Zero-hallucination guarantee untuk audit payload security & contract compliance check.", "Zero-hallucination guarantee for payload security audit & contract compliance check.")
          .replace("Route optimal sesuai target latency", "Optimal route matching target latency")
          .replace("dan budget", "and budget");
      } else if (reason.includes("⚡ REAL INGRESS SELESAI")) {
        reason = reason
          .replace("⚡ REAL INGRESS SELESAI: 9Router Antigravity merespons", "⚡ REAL INGRESS COMPLETED: 9Router Antigravity responded with")
          .replace("dalam", "in");
      } else if (reason.includes("Prompt berhasil dieksekusi dengan verifikasi kontrak. Kembali istirahat & santai...")) {
        reason = "Prompt executed successfully with verified contract. Returning to rest & recharge...";
      }
    } else {
      if (reason.startsWith("Selected ")) {
        reason = reason
          .replace(/^Selected\s+/, "Memilih ")
          .replace("Ultra-fast latency", "Latency super cepat")
          .replace("without fluff", "tanpa fluff")
          .replace("Real-time AST diff & refactoring execution!", "Eksekusi AST diff & refactor real-time!")
          .replace("High deterministic accuracy benchmark for modular architecture validation & zero-fake contracts.", "Benchmark akurasi deterministik tinggi untuk validasi arsitektur modular & zero-fake contracts.")
          .replace("is critical for stutter-free mobile UI streaming.", "sangat penting untuk streaming response UI mobile tanpa jank.")
          .replace("optimal for backlog synthesis & consistent PRD specs.", "optimal untuk sintesis backlog & spesifikasi PRD konsisten.")
          .replace("High vocabulary reach for persuasive copywriting and product messaging.", "Vocabulary reach tinggi untuk copy persuasif dan positioning messaging produk.")
          .replace("High deterministic output consistency for autogenerating pytest test cases without false positives.", "Konsistensi output deterministik tinggi untuk autogenerate test case pytest tanpa false positives.")
          .replace("Zero-hallucination guarantee for payload security audit & contract compliance check.", "Zero-hallucination guarantee untuk audit payload security & contract compliance check.")
          .replace("Optimal route matching target latency", "Route optimal sesuai target latency")
          .replace("and budget", "dan budget");
      } else if (reason.includes("⚡ REAL INGRESS COMPLETED")) {
        reason = reason
          .replace("⚡ REAL INGRESS COMPLETED: 9Router Antigravity responded with", "⚡ REAL INGRESS SELESAI: 9Router Antigravity merespons")
          .replace("in", "dalam");
      } else if (reason.includes("Prompt executed successfully with verified contract. Returning to rest & recharge...")) {
        reason = "Prompt berhasil dieksekusi dengan verifikasi kontrak. Kembali istirahat & santai...";
      }
    }

    return `"${reason}"`;
  }

  if (agent.state === "using_pc") {
    return isEn
      ? `"Actively executing prompt on workstation cubicle. Streaming token response..."`
      : `"Sedang aktif mengeksekusi prompt pada workstation cubicle. Streaming token response..."`;
  }

  if (agent.currentActivity) {
    const act = getActivityLabel(agent.currentActivity, lang);
    const room = agent.currentRoom.toUpperCase();
    return isEn
      ? `"${act} in [${room}]. Standby waiting for 9Router requests. Once a task arrives, I will head straight to the workstation PC!"`
      : `"${act} di [${room}]. Standby menunggu request 9Router. Begitu ada task masuk, saya langsung ke workstation PC!"`;
  }

  return isEn
    ? `"Relaxing in [${agent.currentRoom.toUpperCase()}]. Standby waiting for 9Router requests."`
    : `"Sedang santai di [${agent.currentRoom.toUpperCase()}]. Standby menunggu request 9Router."`;
}

export function OfficeSimulation({
  models,
  overview,
  onSelectModel,
  onOpenRecommendQuest,
}: OfficeSimulationProps) {
  const { language, t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport & Simulation Controls
  const [activeRoomFocus, setActiveRoomFocus] = useState<string>("all");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [scanlines, setScanlines] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [animationTick, setAnimationTick] = useState<number>(0);
  const [allowRoaming, setAllowRoaming] = useState<boolean>(true);

  // Selection & Telemetry State
  const [selectedPcId, setSelectedPcId] = useState<string>("pc-0");
  const [hoveredPcId, setHoveredPcId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(DEFAULT_FALLBACK_AGENT.id);

  // Real Ingress Telemetry & Live Traffic State
  const [liveTraffic, setLiveTraffic] = useState<LiveTrafficResponse | null>(null);
  const [lastHandledEventId, setLastHandledEventId] = useState<string | null>(null);
  const [isTestPromptSending, setIsTestPromptSending] = useState<boolean>(false);
  const [ingressToast, setIngressToast] = useState<string | null>(null);

  // Live Database Roles (Strict 1-to-1 NPC Coupling)
  const [dbRoles, setDbRoles] = useState<RoleItem[]>([]);

  // Periodically fetch roles directly from database
  useEffect(() => {
    let isMounted = true;
    const fetchRoles = async () => {
      try {
        const data = await api.getRoles();
        if (isMounted && data && data.length > 0) {
          setDbRoles(data);
        }
      } catch {}
    };
    fetchRoles();
    const interval = setInterval(fetchRoles, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const hasRealModels = (models && models.length > 0) || (liveTraffic && liveTraffic.recent_requests.length > 0);

  // Poll real-time live traffic every 1.8 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchLiveTraffic = async () => {
      try {
        const data = await api.getLiveTraffic();
        if (isMounted) {
          setLiveTraffic(data);
        }
      } catch {}
    };
    fetchLiveTraffic();
    const interval = setInterval(fetchLiveTraffic, 1800);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync theme with document class (TheGate Retro Theme)
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    };
    checkTheme();
    window.addEventListener("themechange", checkTheme);
    return () => window.removeEventListener("themechange", checkTheme);
  }, []);

  const toggleDayNight = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("thegate-theme-mode", "dark");
      } catch {}
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("thegate-theme-mode", "light");
      } catch {}
    }
    window.dispatchEvent(
      new CustomEvent("themechange", { detail: { theme: nextDark ? "dark" : "light" } })
    );
  };

  // -------------------------------------------------------------------
  // 1. Dynamic Workstation PCs Mapping (Antigravity First at BAY 1A)
  // -------------------------------------------------------------------
  const workstationPCs = useMemo<ModelWorkstationPC[]>(() => {
    const cubicleSlots = [
      { gx: 18, gy: 2, label: "BAY 1A (ANTIGRAVITY)" },
      { gx: 22, gy: 2, label: "BAY 1B" },
      { gx: 25, gy: 2, label: "BAY 1C" },
      { gx: 18, gy: 5, label: "BAY 2A" },
      { gx: 22, gy: 5, label: "BAY 2B" },
      { gx: 25, gy: 5, label: "BAY 2C" },
      { gx: 20, gy: 8, label: "BAY 3A" },
      { gx: 24, gy: 8, label: "BAY 3B" },
    ];

    if (!models || models.length === 0) {
      return cubicleSlots.map((slot, idx) => {
        if (idx === 0) {
          return {
            id: `pc-0`,
            modelId: "ag/gemini-3.8-flash-high",
            internalName: "ag/gemini-3.8-flash-high",
            adapter: "antigravity",
            category: "speed" as const,
            inputPrice: "$0.10",
            outputPrice: "$0.40",
            context: "1,048k tok",
            ttft: "118ms",
            capabilities: ["Antigravity", "Streaming", "Flash-High", "Tools"],
            gx: slot.gx,
            gy: slot.gy,
            deskLabel: slot.label,
            status: "online" as const,
            screenGlow: "#00E5FF",
            isOccupied: false,
          };
        }
        return {
          id: `pc-standby-${idx}`,
          modelId: "offline",
          internalName: `Workstation ${slot.label} (Standby)`,
          adapter: "none",
          category: "speed" as const,
          inputPrice: "$0.00",
          outputPrice: "$0.00",
          context: "Standby",
          ttft: "-",
          capabilities: ["Standby"],
          gx: slot.gx,
          gy: slot.gy,
          deskLabel: slot.label,
          status: "offline" as const,
          screenGlow: "#EF4444",
          isOccupied: false,
        };
      });
    }

    const formatPrice = (m: ModelRegistryItem, type: "in" | "out") => {
      const entry = m.pricing_entries?.[0];
      if (!entry) return type === "in" ? "$0.10" : "$0.40";
      const val = parseFloat(type === "in" ? entry.input_price_per_million : entry.output_price_per_million);
      return `$${val.toFixed(2)}`;
    };

    const getCategory = (name: string): ModelWorkstationPC["category"] => {
      const lower = name.toLowerCase();
      if (lower.includes("coder") || lower.includes("deepseek") || lower.includes("claude")) return "coding";
      if (lower.includes("o1") || lower.includes("qwen") || lower.includes("glm") || lower.includes("gpt-4o")) return "reasoning";
      if (lower.includes("mini") || lower.includes("flash") || lower.includes("haiku")) return "speed";
      return "flagship";
    };

    const getGlow = (cat: ModelWorkstationPC["category"]): string => {
      switch (cat) {
        case "coding":
          return "#38BDF8";
        case "reasoning":
          return "#A855F7";
        case "speed":
          return "#34D399";
        case "flagship":
          return "#FB923C";
        default:
          return "#FFB71B";
      }
    };

    // Sort to ensure Antigravity (gemini-3.8-flash-high) is ALWAYS first at BAY 1A
    const sorted = [...models].sort((a, b) => {
      const aLower = a.internal_name.toLowerCase();
      const bLower = b.internal_name.toLowerCase();
      const aIsAg = aLower.includes("gemini-3.8-flash-high") || aLower.includes("antigravity");
      const bIsAg = bLower.includes("gemini-3.8-flash-high") || bLower.includes("antigravity");
      if (aIsAg && !bIsAg) return -1;
      if (!aIsAg && bIsAg) return 1;
      return 0;
    });

    const agModel = sorted.find((m) => m.internal_name.toLowerCase().includes("gemini-3.8-flash-high"));
    const finalModelsList: ModelRegistryItem[] = [];

    if (agModel) {
      finalModelsList.push(agModel);
      sorted.filter((m) => m.id !== agModel.id).forEach((m) => finalModelsList.push(m));
    } else {
      finalModelsList.push(...sorted);
    }

    if (finalModelsList.length === 0) {
      return cubicleSlots.map((slot, idx) => ({
        id: `pc-${idx}`,
        modelId: idx === 0 ? "ag/gemini-3.8-flash-high" : "offline",
        internalName: idx === 0 ? "ag/gemini-3.8-flash-high" : `Workstation ${slot.label} (Standby)`,
        adapter: idx === 0 ? "antigravity" : "none",
        category: "speed" as const,
        inputPrice: "$0.10",
        outputPrice: "$0.40",
        context: "1,048k tok",
        ttft: "118ms",
        capabilities: ["Antigravity", "Streaming"],
        gx: slot.gx,
        gy: slot.gy,
        deskLabel: slot.label,
        status: idx === 0 ? ("online" as const) : ("offline" as const),
        screenGlow: idx === 0 ? "#00E5FF" : "#EF4444",
        isOccupied: false,
      }));
    }

    return finalModelsList.slice(0, cubicleSlots.length).map((m, idx) => {
      const slot = cubicleSlots[idx];
      const isAntigravity = idx === 0 || m.internal_name.toLowerCase().includes("gemini-3.8-flash-high");
      const cat = isAntigravity ? "speed" : getCategory(m.internal_name);

      return {
        id: `pc-${idx}`,
        modelId: isAntigravity ? "ag/gemini-3.8-flash-high" : m.internal_name,
        internalName: isAntigravity ? "ag/gemini-3.8-flash-high" : m.internal_name,
        adapter: isAntigravity ? "antigravity" : m.provider_adapter,
        category: cat,
        inputPrice: isAntigravity ? "$0.10" : formatPrice(m, "in"),
        outputPrice: isAntigravity ? "$0.40" : formatPrice(m, "out"),
        context: isAntigravity ? "1,048k tok" : (m.context_limit ? `${(m.context_limit / 1000).toFixed(0)}k tok` : "128k tok"),
        ttft: isAntigravity ? "118ms" : (cat === "speed" ? "170ms" : "290ms"),
        capabilities: isAntigravity ? ["Antigravity", "Streaming", "Flash-High", "Tools"] : Object.keys(m.capabilities || {}),
        gx: slot.gx,
        gy: slot.gy,
        deskLabel: slot.label,
        status: "online",
        screenGlow: isAntigravity ? "#00E5FF" : getGlow(cat),
        isOccupied: false,
      };
    });
  }, [models, hasRealModels]);

  const fallbackPc: ModelWorkstationPC = useMemo(
    () => ({
      id: "pc-0",
      modelId: "ag/gemini-3.8-flash-high",
      internalName: "ag/gemini-3.8-flash-high",
      adapter: "antigravity",
      category: "speed" as const,
      inputPrice: "$0.10",
      outputPrice: "$0.40",
      context: "1,048k tok",
      ttft: "118ms",
      capabilities: ["Antigravity", "Streaming", "Flash-High", "Tools"],
      gx: 18,
      gy: 2,
      deskLabel: "BAY 1A (ANTIGRAVITY)",
      status: "online" as const,
      screenGlow: "#00E5FF",
      isOccupied: false,
    }),
    []
  );

  const selectedPc: ModelWorkstationPC =
    (workstationPCs && workstationPCs.length > 0
      ? workstationPCs.find((w) => w.id === selectedPcId) || workstationPCs[0]
      : fallbackPc) || fallbackPc;

  // -------------------------------------------------------------------
  // 2. Autonomous Agents State (1-to-1 Coupling with Database Roles)
  // -------------------------------------------------------------------
  const [agents, setAgents] = useState<CampusAgent[]>([DEFAULT_FALLBACK_AGENT]);

  // Synchronize agents strictly with dbRoles (Exact 1 Role = 1 NPC Invariant)
  useEffect(() => {
    if (!dbRoles.length) return;

    setAgents((prevAgents) => {
      return dbRoles.map((role, idx) => {
        const existing = prevAgents.find((a) => a.id === role.id || (role.is_default && a.isDefault));
        const defaultSpot = RELAXATION_SPOTS[idx % RELAXATION_SPOTS.length];

        if (existing) {
          return {
            ...existing,
            id: role.id,
            name: role.name,
            role: role.name,
            department: role.department,
            contextBehavior: role.context_behavior,
            preferredModelId: role.preferred_model_id || undefined,
            hairColor: role.hair_color || "#4B2E1E",
            shirtColor: role.shirt_color || "#2B5278",
            tieColor: role.tie_color || undefined,
            hasGlasses: role.has_glasses,
            hasHeadset: role.has_headset,
            isDefault: role.is_default,
          };
        }

        // New NPC dynamically spawned
        return {
          id: role.id,
          name: role.name,
          role: role.name,
          department: role.department,
          contextBehavior: role.context_behavior,
          preferredModelId: role.preferred_model_id || undefined,
          hairColor: role.hair_color || "#4B2E1E",
          shirtColor: role.shirt_color || "#2B5278",
          tieColor: role.tie_color || undefined,
          hasGlasses: role.has_glasses,
          hasHeadset: role.has_headset,
          isDefault: role.is_default,
          gx: defaultSpot.gx,
          gy: defaultSpot.gy,
          targetGx: defaultSpot.gx,
          targetGy: defaultSpot.gy,
          currentRoom: defaultSpot.room,
          currentActivity: defaultSpot.activity,
          state: defaultSpot.state,
          stateTicks: 0,
          walkFrame: 0,
          facing: "right",
        };
      });
    });
  }, [dbRoles]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0] || DEFAULT_FALLBACK_AGENT;

  // Helper to generate model rationale based on authentic context behavior
  const generateRationale = useCallback(
    (agent: CampusAgent, pc: ModelWorkstationPC, liveEvent?: LiveTrafficEvent, targetLang: Language = language): string => {
      const mName = pc.internalName;
      const isAntigravity = mName.includes("gemini-3.8-flash") || pc.adapter === "antigravity";
      const rName = agent.role.toLowerCase();
      const cb = agent.contextBehavior?.toLowerCase() || "";
      const isEn = targetLang === "en";

      if (rName.includes("fullstack") || rName.includes("architect") || cb.includes("fullstack")) {
        if (isAntigravity) {
          return isEn
            ? `Selected ${mName}: Ultra-fast 118ms latency & 1M token context without fluff. Real-time AST diff & refactoring execution!`
            : `Memilih ${mName}: Latency super cepat 118ms & context 1M tok tanpa fluff. Eksekusi AST diff & refactor real-time!`;
        }
        return isEn
          ? `Selected ${mName}: High deterministic accuracy benchmark for modular architecture validation & zero-fake contracts.`
          : `Memilih ${mName}: Benchmark akurasi deterministik tinggi untuk validasi arsitektur modular & zero-fake contracts.`;
      }

      if (rName.includes("mobile") || cb.includes("mobile") || cb.includes("offline")) {
        return isEn
          ? `Selected ${mName}: Sub-200ms TTFT (${pc.ttft}) is critical for stutter-free mobile UI response streaming.`
          : `Memilih ${mName}: TTFT ${pc.ttft} sub-200ms sangat penting untuk streaming response UI mobile tanpa jank.`;
      }

      if (rName.includes("product") || rName.includes("pm") || cb.includes("tradeoff")) {
        return isEn
          ? `Selected ${mName}: Unit cost ${pc.inputPrice}/1M tok is optimal for backlog synthesis & consistent PRD specs.`
          : `Memilih ${mName}: Unit cost ${pc.inputPrice}/1M tok optimal untuk sintesis backlog & spesifikasi PRD konsisten.`;
      }

      if (rName.includes("market") || cb.includes("copy") || cb.includes("brand")) {
        return isEn
          ? `Selected ${mName}: High vocabulary breadth for persuasive copywriting and product messaging.`
          : `Memilih ${mName}: Vocabulary reach tinggi untuk copy persuasif dan positioning messaging produk.`;
      }

      if (rName.includes("qa") || rName.includes("test") || cb.includes("test")) {
        return isEn
          ? `Selected ${mName}: High deterministic output consistency for autogenerating pytest test cases without false positives.`
          : `Memilih ${mName}: Konsistensi output deterministik tinggi untuk autogenerate test case pytest tanpa false positives.`;
      }

      if (rName.includes("sec") || rName.includes("sre") || cb.includes("security")) {
        return isEn
          ? `Selected ${mName}: Zero-hallucination guarantee for payload security audit & contract compliance check.`
          : `Memilih ${mName}: Zero-hallucination guarantee untuk audit payload security & contract compliance check.`;
      }

      return isEn
        ? `Selected ${mName}: Optimal route matching target latency (${pc.ttft}) and budget (${pc.inputPrice}/1M tok).`
        : `Memilih ${mName}: Route optimal sesuai target latency (${pc.ttft}) dan budget (${pc.inputPrice}/1M tok).`;
    },
    [language]
  );

  // Dispatch real-time live traffic event to NPCs
  useEffect(() => {
    if (!liveTraffic || !liveTraffic.recent_requests.length || !agents.length) return;
    const latest = liveTraffic.recent_requests[0];
    if (latest.id === lastHandledEventId) return;

    setLastHandledEventId(latest.id);

    // Alert toast
    setIngressToast(
      `⚡ LIVE INGRESS: ${latest.model} via ${latest.provider.toUpperCase()} (${latest.prompt_tokens} in / ${latest.completion_tokens} out)`
    );
    setTimeout(() => setIngressToast(null), 5000);

    // Find the workstation PC that hosts this model
    let targetPc = workstationPCs.find(
      (pc) =>
        pc.modelId.toLowerCase() === latest.model.toLowerCase() ||
        pc.internalName.toLowerCase() === latest.raw_model.toLowerCase() ||
        (latest.provider === "antigravity" && pc.id === "pc-0")
    );
    if (!targetPc) {
      targetPc = workstationPCs[0];
    }

    // Pick agent whose preferredModelId matches or who is currently relaxing/idle
    let chosenAgent = agents.find(
      (a) => a.preferredModelId && a.preferredModelId.toLowerCase().includes(latest.model.toLowerCase())
    );
    if (!chosenAgent) {
      chosenAgent = agents.find((a) => a.state !== "walking" && a.state !== "using_pc") || agents[0];
    }

    if (!chosenAgent) return;

    const targetPcRef = targetPc;
    const targetAgentId = chosenAgent.id;

    setSelectedAgentId(targetAgentId);
    setSelectedPcId(targetPcRef.id);

    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === targetAgentId) {
          const rationale = generateRationale(a, targetPcRef, latest, language);
          return {
            ...a,
            targetGx: targetPcRef.gx,
            targetGy: targetPcRef.gy + 1,
            targetPcId: targetPcRef.id,
            state: "walking",
            stateTicks: 0,
            currentActivity: language === "en" ? `Processing request on ${targetPcRef.internalName}` : `Memproses request di ${targetPcRef.internalName}`,
            dialogue: {
              agentId: a.id,
              agentRole: a.role,
              modelName: targetPcRef.internalName,
              reasonText: rationale,
              ticksRemaining: 95,
            },
          };
        }
        return a;
      })
    );
  }, [liveTraffic, lastHandledEventId, agents, workstationPCs, generateRationale, language]);

  // Handler for manual Test Ingress to Antigravity
  const handleSendTestToAntigravity = async () => {
    setIsTestPromptSending(true);
    setIngressToast(language === "en" ? "⚡ Routing live test prompt to Antigravity (gemini-3.8-flash-high)..." : "⚡ Routing live test prompt ke Antigravity (gemini-3.8-flash-high)...");
    try {
      const res = await api.sendTestIngress("ag/gemini-3.8-flash-high");
      setIngressToast(language === "en" ? `✓ Antigravity responded with ${res.output_tokens} tokens in ${res.duration_ms}ms!` : `✓ Antigravity merespons ${res.output_tokens} token dalam ${res.duration_ms}ms!`);

      const targetPc = workstationPCs[0];
      const targetAgent = agents.find((a) => a.isDefault) || agents[0];

      if (targetAgent && targetPc) {
        setSelectedAgentId(targetAgent.id);
        setSelectedPcId(targetPc.id);

        setAgents((prev) =>
          prev.map((a) => {
            if (a.id === targetAgent.id) {
              return {
                ...a,
                targetGx: targetPc.gx,
                targetGy: targetPc.gy + 1,
                targetPcId: targetPc.id,
                state: "walking",
                stateTicks: 0,
                currentActivity: language === "en" ? `Running benchmark on ${targetPc.internalName}` : `Memproses benchmark di ${targetPc.internalName}`,
                dialogue: {
                  agentId: a.id,
                  agentRole: a.role,
                  modelName: "ag/gemini-3.8-flash-high (Antigravity)",
                  reasonText: language === "en"
                    ? `⚡ REAL INGRESS COMPLETED: 9Router Antigravity responded with ${res.output_tokens} tokens in ${res.duration_ms}ms! Unit cost ${targetPc.inputPrice} / TTFT ${targetPc.ttft}.`
                    : `⚡ REAL INGRESS SELESAI: 9Router Antigravity merespons ${res.output_tokens} token dalam ${res.duration_ms}ms! Unit cost ${targetPc.inputPrice} / TTFT ${targetPc.ttft}.`,
                  ticksRemaining: 95,
                },
              };
            }
            return a;
          })
        );
      }
    } catch (err: any) {
      setIngressToast(`Ingress error: ${err.message}`);
    } finally {
      setIsTestPromptSending(false);
      setTimeout(() => setIngressToast(null), 5000);
    }
  };

  // -------------------------------------------------------------------
  // 3. Autonomous Simulation Loop
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!allowRoaming) return;

    const interval = setInterval(() => {
      setAnimationTick((t) => (t + 1) % 1000);

      setAgents((prevAgents) => {
        return prevAgents.map((agent) => {
          let currentDialogue = agent.dialogue;
          if (currentDialogue) {
            if (currentDialogue.ticksRemaining > 1) {
              currentDialogue = {
                ...currentDialogue,
                ticksRemaining: currentDialogue.ticksRemaining - 1,
              };
            } else {
              currentDialogue = undefined;
            }
          }

          // Case A: WALKING
          if (agent.state === "walking") {
            const dx = agent.targetGx - agent.gx;
            const dy = agent.targetGy - agent.gy;
            const dist = Math.hypot(dx, dy);

            if (dist < 0.22) {
              const targetPc = workstationPCs.find((w) => w.id === agent.targetPcId);

              if (targetPc && targetPc.status === "online") {
                const rationale = generateRationale(agent, targetPc, undefined, language);
                return {
                  ...agent,
                  gx: agent.targetGx,
                  gy: agent.targetGy,
                  state: "using_pc",
                  currentRoom: "workstations",
                  stateTicks: 0,
                  dialogue: {
                    agentId: agent.id,
                    agentRole: agent.role,
                    modelName: targetPc.internalName,
                    reasonText: rationale,
                    ticksRemaining: 70,
                  },
                };
              }

              const spot = RELAXATION_SPOTS.find(
                (s) => Math.hypot(s.gx - agent.targetGx, s.gy - agent.targetGy) < 1.5
              );
              const nextState = spot ? spot.state : "idle";
              const room = spot ? spot.room : "hallway";
              const activity = spot
                ? (language === "en" ? getActivityLabel(spot.activity, "en") : spot.activity)
                : (language === "en" ? "Resting" : "Santai");

              return {
                ...agent,
                gx: agent.targetGx,
                gy: agent.targetGy,
                state: nextState,
                currentRoom: room,
                currentActivity: activity,
                stateTicks: 0,
                dialogue: currentDialogue,
              };
            }

            const speed = 0.12;
            const stepX = (dx / dist) * speed;
            const stepY = (dy / dist) * speed;
            return {
              ...agent,
              gx: agent.gx + stepX,
              gy: agent.gy + stepY,
              walkFrame: (agent.walkFrame + 1) % 4,
              facing: stepX >= 0 ? "right" : "left",
              dialogue: currentDialogue,
            };
          }

          // Case B: USING WORKSTATION PC
          if (agent.state === "using_pc") {
            const ticks = agent.stateTicks + 1;
            if (ticks > 80) {
              const nextDest = RELAXATION_SPOTS[Math.floor(Math.random() * RELAXATION_SPOTS.length)];

              return {
                ...agent,
                targetGx: nextDest.gx,
                targetGy: nextDest.gy,
                targetPcId: undefined,
                state: "walking",
                stateTicks: 0,
                currentActivity: language === "en" ? `Routing completed. Heading to ${nextDest.room}` : `Selesai routing. Menuju ${nextDest.room}`,
                dialogue: {
                  agentId: agent.id,
                  agentRole: agent.role,
                  modelName: language === "en" ? "Execution Completed" : "Eksekusi Selesai",
                  reasonText: language === "en"
                    ? "Prompt executed successfully with verified contract. Returning to rest & recharge..."
                    : "Prompt berhasil dieksekusi dengan verifikasi kontrak. Kembali istirahat & santai...",
                  ticksRemaining: 25,
                },
              };
            }
            return { ...agent, stateTicks: ticks, dialogue: currentDialogue };
          }

          // Case C: IDLE IN ROOM (SANTAI)
          const newTicks = agent.stateTicks + 1;
          const maxStay = 130 + ((agent.name.charCodeAt(0) || 10) % 50);

          if (newTicks > maxStay) {
            // Roam between RELAXATION spots when idle.
            // NEVER jump to workstation PCs unless real ingress arrives!
            const spots = RELAXATION_SPOTS.filter(
              (s) => Math.hypot(s.gx - agent.gx, s.gy - agent.gy) > 2
            );
            const dest = spots[Math.floor(Math.random() * spots.length)] || RELAXATION_SPOTS[0];

            return {
              ...agent,
              targetGx: dest.gx,
              targetGy: dest.gy,
              targetPcId: undefined,
              state: "walking",
              stateTicks: 0,
              currentActivity: language === "en" ? getActivityLabel(dest.activity, "en") : dest.activity,
              dialogue: undefined,
            };
          }

          return { ...agent, stateTicks: newTicks, dialogue: currentDialogue };
        });
      });
    }, 75);

    return () => clearInterval(interval);
  }, [allowRoaming, hasRealModels, workstationPCs, generateRationale, language]);

  // -------------------------------------------------------------------
  // 4. Isometric Math Helpers
  // -------------------------------------------------------------------
  const toIso = useCallback(
    (gx: number, gy: number, originX: number, originY: number): { x: number; y: number } => {
      const isoX = originX + (gx - gy) * TILE_HALF_W;
      const isoY = originY + (gx + gy) * TILE_HALF_H;
      return { x: isoX, y: isoY };
    },
    []
  );

  // -------------------------------------------------------------------
  // 5. Canvas Render Engine (Solid 3D Walls & High-Contrast Illuminated Floor)
  // -------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const displayW = canvas.clientWidth || 1200;
    const displayH = Math.min(900, Math.max(700, Math.round(displayW * 0.62)));

    if (canvas.width !== Math.round(displayW * dpr) || canvas.height !== Math.round(displayH * dpr)) {
      canvas.width = Math.round(displayW * dpr);
      canvas.height = Math.round(displayH * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Apply pan & zoom
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);

    const W = displayW;
    const H = displayH;
    const isDark = isDarkMode;

    // HIGH CONTRAST VOID BACKGROUND:
    // In dark mode: Crisp deep indigo-slate (#0B0E14) with cyan-dot blueprint matrix
    // In light mode: Crisp warm parchment cream (#F5EFE6)
    ctx.fillStyle = isDark ? "#0B0E14" : "#F5EFE6";
    ctx.fillRect(-W * 3, -H * 3, W * 7, H * 7);

    // Subtle blueprint dot grid in the void
    ctx.fillStyle = isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(100, 116, 139, 0.15)";
    for (let x = -W; x < W * 2; x += 36) {
      for (let y = -H; y < H * 2; y += 36) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Origin Coordinates: Centered at top of 28x20 isometric diamond
    const originX = W / 2 + 10;
    const originY = 85;

    // -----------------------------------------------------------------
    // A. Outer Perimeter Back Walls (Architectural Enclosure)
    // -----------------------------------------------------------------
    const wallH = 74;
    const topPt = toIso(0, 0, originX, originY);
    const rightPt = toIso(GRID_COLS, 0, originX, originY);
    const leftPt = toIso(0, GRID_ROWS, originX, originY);

    // North-West Wall (Facing South-East)
    ctx.fillStyle = isDark ? "#1C2434" : "#D4C7B0";
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(rightPt.x, rightPt.y);
    ctx.lineTo(rightPt.x, rightPt.y - wallH);
    ctx.lineTo(topPt.x, topPt.y - wallH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isDark ? "#2A364E" : "#B8A992";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // South-West Wall (Facing North-East)
    ctx.fillStyle = isDark ? "#151C2A" : "#C4B59D";
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(leftPt.x, leftPt.y);
    ctx.lineTo(leftPt.x, leftPt.y - wallH);
    ctx.lineTo(topPt.x, topPt.y - wallH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isDark ? "#222D42" : "#A6987E";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crown Moldings (High-Contrast Amber & Cyan trim)
    ctx.strokeStyle = isDark ? "#FFB71B" : "#B45309";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y - wallH);
    ctx.lineTo(rightPt.x, rightPt.y - wallH);
    ctx.stroke();

    ctx.strokeStyle = isDark ? "#38BDF8" : "#1D4ED8";
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y - wallH);
    ctx.lineTo(leftPt.x, leftPt.y - wallH);
    ctx.stroke();

    // Master Signage Banner
    ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
    ctx.font = "bold 11px 'Silkscreen', monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚡ THEGATE AI OPERATIONS HEADQUARTERS — MASTER FLOORPLAN", topPt.x + 160, topPt.y - wallH + 26);

    // -----------------------------------------------------------------
    // B. Floor Foundation & Tile Textures (High-Contrast Illuminated Rooms)
    // -----------------------------------------------------------------
    const defaultHallA = isDark ? "#1B2230" : "#FAF4E8";
    const defaultHallB = isDark ? "#161D2A" : "#F4ECE0";

    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        const pt = toIso(gx, gy, originX, originY);
        const isAlt = (gx + gy) % 2 === 0;

        let tileColor = isAlt ? defaultHallA : defaultHallB;
        for (const zone of ROOM_ZONES) {
          if (gx >= zone.x1 && gx <= zone.x2 && gy >= zone.y1 && gy <= zone.y2) {
            tileColor = isDark
              ? (isAlt ? zone.darkFloorA : zone.darkFloorB)
              : (isAlt ? zone.lightFloorA : zone.lightFloorB);
            break;
          }
        }

        ctx.fillStyle = tileColor;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + TILE_HALF_W, pt.y + TILE_HALF_H);
        ctx.lineTo(pt.x, pt.y + TILE_H);
        ctx.lineTo(pt.x - TILE_HALF_W, pt.y + TILE_HALF_H);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(61, 49, 38, 0.12)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // -----------------------------------------------------------------
    // C. 2.5D Slab Foundation Thickness (Illuminated Platform Edge)
    // -----------------------------------------------------------------
    const bottomPt = toIso(GRID_COLS, GRID_ROWS, originX, originY);
    const slabDepth = 22;

    // Left Foundation Facet
    ctx.fillStyle = isDark ? "#111622" : "#8C7B65";
    ctx.beginPath();
    ctx.moveTo(leftPt.x - TILE_HALF_W, leftPt.y + TILE_HALF_H);
    ctx.lineTo(bottomPt.x, bottomPt.y + TILE_H);
    ctx.lineTo(bottomPt.x, bottomPt.y + TILE_H + slabDepth);
    ctx.lineTo(leftPt.x - TILE_HALF_W, leftPt.y + TILE_HALF_H + slabDepth);
    ctx.closePath();
    ctx.fill();

    // Right Foundation Facet
    ctx.fillStyle = isDark ? "#182030" : "#A6957E";
    ctx.beginPath();
    ctx.moveTo(rightPt.x + TILE_HALF_W, rightPt.y + TILE_HALF_H);
    ctx.lineTo(bottomPt.x, bottomPt.y + TILE_H);
    ctx.lineTo(bottomPt.x, bottomPt.y + TILE_H + slabDepth);
    ctx.lineTo(rightPt.x + TILE_HALF_W, rightPt.y + TILE_HALF_H + slabDepth);
    ctx.closePath();
    ctx.fill();

    // Glowing Platform Edge Rim
    ctx.strokeStyle = isDark ? "#38BDF8" : "#B45309";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftPt.x - TILE_HALF_W, leftPt.y + TILE_HALF_H);
    ctx.lineTo(bottomPt.x, bottomPt.y + TILE_H);
    ctx.lineTo(rightPt.x + TILE_HALF_W, rightPt.y + TILE_HALF_H);
    ctx.stroke();

    // -----------------------------------------------------------------
    // D. True Solid 3D Partition Walls (Bilik-Bilik Pembatas Berdimensi)
    // -----------------------------------------------------------------
    const drawSolid3DWall = (
      gx1: number,
      gy1: number,
      gx2: number,
      gy2: number,
      orientation: "x" | "y",
      height: number = 32,
      accentColor: string = "#FFB71B"
    ) => {
      const thickness = 0.28;
      const p1A = toIso(gx1, gy1, originX, originY);
      const p2A = toIso(gx2, gy2, originX, originY);

      let p1B: { x: number; y: number };
      let p2B: { x: number; y: number };

      if (orientation === "x") {
        p1B = toIso(gx1, gy1 + thickness, originX, originY);
        p2B = toIso(gx2, gy2 + thickness, originX, originY);
      } else {
        p1B = toIso(gx1 + thickness, gy1, originX, originY);
        p2B = toIso(gx2 + thickness, gy2, originX, originY);
      }

      // 1. Front Vertical Face
      ctx.fillStyle = isDark ? "#28344A" : "#C4B69E";
      ctx.beginPath();
      ctx.moveTo(p1B.x, p1B.y);
      ctx.lineTo(p2B.x, p2B.y);
      ctx.lineTo(p2B.x, p2B.y - height);
      ctx.lineTo(p1B.x, p1B.y - height);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isDark ? "#151B27" : "#8A7D69";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. Side Vertical Face
      ctx.fillStyle = isDark ? "#1E2738" : "#B2A48D";
      ctx.beginPath();
      ctx.moveTo(p2A.x, p2A.y);
      ctx.lineTo(p2B.x, p2B.y);
      ctx.lineTo(p2B.x, p2B.y - height);
      ctx.lineTo(p2A.x, p2A.y - height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Top Surface Cap
      ctx.fillStyle = isDark ? "#3E4E6B" : "#E2D7C3";
      ctx.beginPath();
      ctx.moveTo(p1A.x, p1A.y - height);
      ctx.lineTo(p2A.x, p2A.y - height);
      ctx.lineTo(p2B.x, p2B.y - height);
      ctx.lineTo(p1B.x, p1B.y - height);
      ctx.closePath();
      ctx.fill();

      // Top Illuminated Rail Trim
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p1B.x, p1B.y - height);
      ctx.lineTo(p2B.x, p2B.y - height);
      ctx.stroke();

      // Glass Inset Stripe
      ctx.strokeStyle = isDark ? "rgba(0, 229, 255, 0.45)" : "rgba(29, 78, 216, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p1B.x, p1B.y - height * 0.55);
      ctx.lineTo(p2B.x, p2B.y - height * 0.55);
      ctx.stroke();
    };

    // Partition 1: Server Vault (Room 02) & Boardroom (Room 05) - Along X-axis
    drawSolid3DWall(1, 6.5, 4.2, 6.5, "x", 32, "#00E5FF");
    drawSolid3DWall(5.6, 6.5, 7.5, 6.5, "x", 32, "#00E5FF");

    // Partition 2: Server Vault & Director Suite (Room 03) - Along Y-axis
    drawSolid3DWall(7.5, 1, 7.5, 3.2, "y", 32, "#38BDF8");
    drawSolid3DWall(7.5, 4.6, 7.5, 6.5, "y", 32, "#38BDF8");

    // Partition 3: Director Suite & AI Workstations (Room 04) - Along Y-axis
    drawSolid3DWall(15.5, 1, 15.5, 3.5, "y", 32, "#F59E0B");
    drawSolid3DWall(15.5, 5.0, 15.5, 6.5, "y", 32, "#F59E0B");

    // Partition 4: Boardroom (Room 05) & Lobby (Room 01) - Along X-axis
    drawSolid3DWall(1, 14.5, 4.2, 14.5, "x", 32, "#C084FC");
    drawSolid3DWall(5.6, 14.5, 7.5, 14.5, "x", 32, "#C084FC");

    // Partition 5: Focus Pods (Room 06) & Pantry (Room 07) - Along X-axis
    drawSolid3DWall(8, 10.5, 11.2, 10.5, "x", 32, "#60A5FA");
    drawSolid3DWall(12.6, 10.5, 15.5, 10.5, "x", 32, "#60A5FA");

    // Partition 6: AI Workstations (Room 04) & Recreation/Gym (Room 08) - Along X-axis
    drawSolid3DWall(17.5, 10.5, 22.0, 10.5, "x", 30, "#34D399");
    drawSolid3DWall(23.8, 10.5, 27.5, 10.5, "x", 30, "#34D399");

    // Partition 7: Pantry (Room 07) & Recreation (Room 08) - Along Y-axis
    drawSolid3DWall(17.5, 11.5, 17.5, 15.0, "y", 30, "#FB923C");
    drawSolid3DWall(17.5, 16.5, 17.5, 19.5, "y", 30, "#FB923C");

    // Doorway floor threshold plates
    const drawDoorThreshold = (gx: number, gy: number, color: string) => {
      const pt = toIso(gx, gy, originX, originY);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + TILE_HALF_W, pt.y + TILE_HALF_H);
      ctx.lineTo(pt.x, pt.y + TILE_H);
      ctx.lineTo(pt.x - TILE_HALF_W, pt.y + TILE_HALF_H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    drawDoorThreshold(5, 6, isDark ? "#00E5FF" : "#1D4ED8");
    drawDoorThreshold(7, 4, isDark ? "#38BDF8" : "#0284C7");
    drawDoorThreshold(15, 4, isDark ? "#F59E0B" : "#D97706");
    drawDoorThreshold(5, 14, isDark ? "#C084FC" : "#7C3AED");
    drawDoorThreshold(12, 10, isDark ? "#60A5FA" : "#2563EB");
    drawDoorThreshold(23, 10, isDark ? "#34D399" : "#059669");
    drawDoorThreshold(17, 16, isDark ? "#FB923C" : "#EA580C");

    // -----------------------------------------------------------------
    // E. Room Header Signage Badges (Distinct Illuminated Signs)
    // -----------------------------------------------------------------
    ROOM_ZONES.forEach((zone) => {
      const centerPt = toIso((zone.x1 + zone.x2) / 2, zone.y1, originX, originY);

      // Badge Backing
      ctx.fillStyle = isDark ? "#0B0E14" : "#FFFFFF";
      ctx.fillRect(centerPt.x - 48, centerPt.y - 20, 96, 14);
      ctx.strokeStyle = zone.accentColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(centerPt.x - 48, centerPt.y - 20, 96, 14);

      ctx.fillStyle = zone.accentColor;
      ctx.font = "bold 8px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`▶ [${zone.code}]`, centerPt.x, centerPt.y - 10);
    });

    // -----------------------------------------------------------------
    // F. Detailed Office Furniture & Props
    // -----------------------------------------------------------------

    // ROOM 01: RECEPTION LOBBY
    const recepDeskPt = toIso(4, 17, originX, originY);
    ctx.fillStyle = isDark ? "#4B3B28" : "#8C7B65";
    ctx.fillRect(recepDeskPt.x - 24, recepDeskPt.y - 10, 48, 16);
    ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FRONT DESK", recepDeskPt.x, recepDeskPt.y - 14);

    const sofaPt = toIso(2, 18, originX, originY);
    ctx.fillStyle = isDark ? "#5C3A24" : "#A67C52";
    ctx.fillRect(sofaPt.x - 16, sofaPt.y - 8, 32, 14);

    // ROOM 02: INGRESS SERVER VAULT
    const serverPt = toIso(4, 2, originX, originY);
    ctx.fillStyle = isDark ? "#0A1017" : "#2D3748";
    ctx.fillRect(serverPt.x - 24, serverPt.y - 48, 48, 54);
    ctx.strokeStyle = "#00E5FF";
    ctx.lineWidth = 2;
    ctx.strokeRect(serverPt.x - 24, serverPt.y - 48, 48, 54);

    for (let ly = serverPt.y - 42; ly < serverPt.y - 4; ly += 6) {
      ctx.fillStyle = "#00E5FF";
      ctx.fillRect(serverPt.x - 18, ly, 8, 2.5);
      ctx.fillStyle = animationTick % 4 < 2 ? "#34D399" : "#FFB71B";
      ctx.fillRect(serverPt.x - 6, ly, 10, 2.5);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(serverPt.x + 8, ly, 8, 2.5);
    }
    ctx.fillStyle = "#00E5FF";
    ctx.font = "bold 7px 'Silkscreen', monospace";
    ctx.textAlign = "center";
    ctx.fillText("INGRESS RACK", serverPt.x, serverPt.y - 52);

    // ROOM 03: EXECUTIVE DIRECTOR SUITE
    const execDeskPt = toIso(11, 3, originX, originY);
    ctx.fillStyle = isDark ? "#5C3622" : "#8B5A3C";
    ctx.fillRect(execDeskPt.x - 28, execDeskPt.y - 12, 56, 18);
    ctx.fillStyle = isDark ? "#FFB71B" : "#FAF4E8";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DIRECTOR SUITE", execDeskPt.x, execDeskPt.y - 16);

    const shelfPt = toIso(9, 1.5, originX, originY);
    ctx.fillStyle = isDark ? "#3D2012" : "#6E452B";
    ctx.fillRect(shelfPt.x - 14, shelfPt.y - 28, 28, 30);

    // ROOM 05: BOARDROOM CONFERENCE SUITE
    const boardTablePt = toIso(4, 10, originX, originY);
    ctx.fillStyle = isDark ? "#382952" : "#64748B";
    ctx.fillRect(boardTablePt.x - 34, boardTablePt.y - 16, 68, 28);
    ctx.strokeStyle = isDark ? "#C084FC" : "#475569";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boardTablePt.x - 34, boardTablePt.y - 16, 68, 28);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("BOARDROOM MATRIX", boardTablePt.x, boardTablePt.y - 4);

    for (let c = -20; c <= 20; c += 14) {
      ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
      ctx.fillRect(boardTablePt.x + c - 3, boardTablePt.y - 20, 6, 4);
      ctx.fillRect(boardTablePt.x + c - 3, boardTablePt.y + 13, 6, 4);
    }

    // ROOM 06: SOUNDPROOF FOCUS PODS
    const pod1Pt = toIso(10, 8, originX, originY);
    const pod2Pt = toIso(13, 8, originX, originY);
    [pod1Pt, pod2Pt].forEach((pt, idx) => {
      ctx.fillStyle = isDark ? "rgba(30, 58, 138, 0.45)" : "rgba(96, 165, 250, 0.25)";
      ctx.fillRect(pt.x - 16, pt.y - 28, 32, 34);
      ctx.strokeStyle = "#60A5FA";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pt.x - 16, pt.y - 28, 32, 34);
      ctx.fillStyle = "#60A5FA";
      ctx.font = "bold 6px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`POD #${idx + 1}`, pt.x, pt.y - 31);
    });

    // ROOM 07: KITCHEN, PANTRY & CAFETERIA
    const cafeBarPt = toIso(11, 13, originX, originY);
    ctx.fillStyle = isDark ? "#8C4318" : "#B45309";
    ctx.fillRect(cafeBarPt.x - 36, cafeBarPt.y - 12, 72, 18);
    ctx.fillStyle = isDark ? "#EA580C" : "#D97706";
    ctx.fillRect(cafeBarPt.x - 36, cafeBarPt.y - 12, 72, 3);

    ctx.fillStyle = "#D97706";
    ctx.fillRect(cafeBarPt.x - 24, cafeBarPt.y - 26, 16, 14);
    ctx.fillStyle = isDark ? "#FEF3C7" : "#FFFBEB";
    ctx.font = "bold 7px monospace";
    ctx.fillText("☕ ESPRESSO", cafeBarPt.x - 14, cafeBarPt.y - 29);

    const fridgePt = toIso(15, 12, originX, originY);
    ctx.fillStyle = isDark ? "#64748B" : "#CBD5E1";
    ctx.fillRect(fridgePt.x - 12, fridgePt.y - 34, 24, 36);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(fridgePt.x - 12, fridgePt.y - 34, 24, 36);

    const diningPt = toIso(13, 17, originX, originY);
    ctx.fillStyle = isDark ? "#9A6340" : "#A67C52";
    ctx.beginPath();
    ctx.ellipse(diningPt.x, diningPt.y, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? "#FB923C" : "#B45309";
    ctx.stroke();

    // ROOM 08: ARCADE & WELLNESS GYM
    const arcadePt = toIso(20, 14, originX, originY);
    ctx.fillStyle = "#2E1065";
    ctx.fillRect(arcadePt.x - 14, arcadePt.y - 32, 28, 36);
    ctx.strokeStyle = "#A855F7";
    ctx.strokeRect(arcadePt.x - 14, arcadePt.y - 32, 28, 36);
    ctx.fillStyle = animationTick % 6 < 3 ? "#F43F5E" : "#38BDF8";
    ctx.fillRect(arcadePt.x - 10, arcadePt.y - 26, 20, 14);
    ctx.fillStyle = "#FDE047";
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "center";
    ctx.fillText("THEGATE 16b", arcadePt.x, arcadePt.y - 35);

    const treadmillPt = toIso(25, 14, originX, originY);
    ctx.fillStyle = "#334155";
    ctx.fillRect(treadmillPt.x - 18, treadmillPt.y - 10, 36, 16);
    ctx.fillStyle = "#EF4444";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚡ TREADMILL", treadmillPt.x, treadmillPt.y - 14);

    const plant1Pt = toIso(7, 19, originX, originY);
    const plant2Pt = toIso(18, 19, originX, originY);
    [plant1Pt, plant2Pt].forEach((pt) => {
      ctx.fillStyle = isDark ? "#15803D" : "#166534";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#78350F";
      ctx.fillRect(pt.x - 4, pt.y, 8, 6);
    });

    // -----------------------------------------------------------------
    // G. ROOM 04: Render Workstation PC Desks in Cubicle Bays
    // -----------------------------------------------------------------
    const drawModelPC = (pc: ModelWorkstationPC) => {
      const pt = toIso(pc.gx, pc.gy, originX, originY);
      const isSelected = selectedPcId === pc.id;
      const isHovered = hoveredPcId === pc.id;

      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? "#FFB71B" : "#38BDF8";
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + TILE_HALF_H, 28, 14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const deskW = 24;
      const deskH = 12;
      const elevation = 12;

      ctx.fillStyle = isDark ? "#0F172A" : "#334155";
      ctx.fillRect(pt.x - deskW + 4, pt.y + TILE_HALF_H, 2.5, elevation);
      ctx.fillRect(pt.x + deskW - 6, pt.y + TILE_HALF_H, 2.5, elevation);

      ctx.fillStyle = isDark ? "#374151" : "#F4ECE0";
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - elevation);
      ctx.lineTo(pt.x + deskW, pt.y - elevation + deskH);
      ctx.lineTo(pt.x, pt.y - elevation + deskH * 2);
      ctx.lineTo(pt.x - deskW, pt.y - elevation + deskH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isDark ? "#111827" : "#3D3126";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isDark ? "#111827" : "#475569";
      ctx.fillRect(pt.x + deskW - 4, pt.y - elevation - 6, 8, 16);
      ctx.fillStyle = pc.status === "online" ? pc.screenGlow : "#EF4444";
      ctx.fillRect(pt.x + deskW - 2, pt.y - elevation - 4, 3, 2);

      const monX = pt.x - 12;
      const monY = pt.y - elevation - 18;

      ctx.fillStyle = isDark ? "#111827" : "#1E293B";
      ctx.fillRect(monX + 10, monY + 16, 4, 5);

      ctx.fillStyle = isDark ? "#1F2937" : "#334155";
      ctx.fillRect(monX, monY, 24, 17);
      ctx.strokeStyle = isSelected ? "#FFB71B" : (isDark ? "#4B5563" : "#475569");
      ctx.lineWidth = 1;
      ctx.strokeRect(monX, monY, 24, 17);

      if (pc.status === "online") {
        ctx.fillStyle = pc.screenGlow;
        ctx.fillRect(monX + 2, monY + 2, 20, 13);

        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        for (let ly = monY + 4; ly < monY + 14; ly += 3) {
          ctx.fillRect(monX + 4, ly, 12, 1);
        }
      } else {
        ctx.fillStyle = "#7F1D1D";
        ctx.fillRect(monX + 2, monY + 2, 20, 13);
        ctx.fillStyle = "#FEE2E2";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("OFF", monX + 12, monY + 11);
      }

      const chairPt = toIso(pc.gx, pc.gy + 1, originX, originY);
      ctx.fillStyle = isDark ? "#4B5563" : "#718096";
      ctx.beginPath();
      ctx.ellipse(chairPt.x, chairPt.y, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Model Identification Tag Banner
      ctx.fillStyle = isDark ? "#0F172A" : "#FFFFFF";
      ctx.strokeStyle = pc.screenGlow;
      ctx.lineWidth = 1.5;
      const tag = pc.internalName.length > 15 ? pc.internalName.slice(0, 14) + "…" : pc.internalName;
      ctx.strokeRect(pt.x - 34, monY - 14, 68, 12);
      ctx.fillRect(pt.x - 34, monY - 14, 68, 12);

      ctx.fillStyle = isDark ? "#F9FAFB" : "#1A1423";
      ctx.font = "bold 7px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillText(tag, pt.x, monY - 5);
    };

    workstationPCs.forEach((pc) => {
      drawModelPC(pc);
    });

    // -----------------------------------------------------------------
    // H. Render Agents with Depth Sorting (Clean Non-Overlapping Dialogue)
    // -----------------------------------------------------------------
    // Find the currently speaking agent to prioritize ONLY 1 active bubble on canvas!
    const activeSpeaker = agents.find((a) => a.dialogue && a.id === selectedAgentId) ||
                          agents.find((a) => a.dialogue);

    const drawAgent = (agent: CampusAgent) => {
      const pt = toIso(agent.gx, agent.gy, originX, originY);
      const isSelected = selectedAgentId === agent.id;

      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y + 11, 9, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      const bob = agent.state === "walking" ? (agent.walkFrame % 2 === 0 ? -2 : 0) : 0;
      const cy = pt.y - 12 + bob;

      ctx.fillStyle = isDark ? "#0F172A" : "#334155";
      ctx.fillRect(pt.x - 4, cy + 12, 3, 6);
      ctx.fillRect(pt.x + 1, cy + 12, 3, 6);

      ctx.fillStyle = agent.shirtColor;
      ctx.fillRect(pt.x - 6, cy + 4, 12, 9);
      ctx.strokeStyle = isDark ? "#0F172A" : "#1E293B";
      ctx.lineWidth = 1;
      ctx.strokeRect(pt.x - 6, cy + 4, 12, 9);

      if (agent.tieColor) {
        ctx.fillStyle = agent.tieColor;
        ctx.fillRect(pt.x - 1, cy + 5, 2, 6);
      }

      ctx.fillStyle = "#F6D5B8";
      ctx.fillRect(pt.x - 5, cy - 6, 10, 10);

      ctx.fillStyle = isDark ? "#0F172A" : "#1E293B";
      if (agent.facing === "right") {
        ctx.fillRect(pt.x, cy - 2, 2, 2);
        ctx.fillRect(pt.x + 3, cy - 2, 2, 2);
      } else {
        ctx.fillRect(pt.x - 4, cy - 2, 2, 2);
        ctx.fillRect(pt.x - 1, cy - 2, 2, 2);
      }

      if (agent.hasGlasses) {
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 1;
        ctx.strokeRect(pt.x - 5, cy - 3, 10, 3);
      }

      ctx.fillStyle = agent.hairColor;
      ctx.fillRect(pt.x - 6, cy - 9, 12, 4);

      if (isSelected) {
        ctx.strokeStyle = "#FFB71B";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pt.x - 9, cy - 11, 18, 30);
      }

      // If agent has dialogue but is NOT the chosen active speaker, render subtle 💬 icon
      if (agent.dialogue && activeSpeaker && activeSpeaker.id !== agent.id) {
        ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
        ctx.font = "bold 9px monospace";
        ctx.fillText("💬", pt.x - 5, cy - 16);
      }
    };

    const sortedAgents = [...agents].sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
    sortedAgents.forEach((agent) => {
      drawAgent(agent);
    });

    // -----------------------------------------------------------------
    // I. Render ONLY the Top Active Speech Bubble (Prevents Screen Clutter)
    // -----------------------------------------------------------------
    if (activeSpeaker && activeSpeaker.dialogue) {
      const bubble = activeSpeaker.dialogue;
      const pt = toIso(activeSpeaker.gx, activeSpeaker.gy, originX, originY);
      const cy = pt.y - 12;

      const bW = 240;
      const bH = 54;
      const bX = pt.x - bW / 2;
      const bY = cy - bH - 18;

      ctx.fillStyle = isDark ? "#111827" : "#FAF4E8";
      ctx.fillRect(bX, bY, bW, bH);
      ctx.strokeStyle = isDark ? "#FFB71B" : "#B45309";
      ctx.lineWidth = 2;
      ctx.strokeRect(bX, bY, bW, bH);

      ctx.fillStyle = isDark ? "#111827" : "#FAF4E8";
      ctx.beginPath();
      ctx.moveTo(pt.x - 6, bY + bH);
      ctx.lineTo(pt.x + 6, bY + bH);
      ctx.lineTo(pt.x, bY + bH + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isDark ? "#FFB71B" : "#B45309";
      ctx.beginPath();
      ctx.moveTo(pt.x - 6, bY + bH);
      ctx.lineTo(pt.x, bY + bH + 6);
      ctx.lineTo(pt.x + 6, bY + bH);
      ctx.stroke();

      ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
      ctx.font = "bold 8px 'Silkscreen', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`⚡ ${bubble.agentRole.toUpperCase()} ❯ ${bubble.modelName}`, bX + 8, bY + 13);

      ctx.fillStyle = isDark ? "#F9FAFB" : "#1A1423";
      ctx.font = "bold 8px monospace";
      const maxChar = 42;
      const words = bubble.reasonText.split(" ");
      let line1 = "";
      let line2 = "";
      let lineIndex = 1;

      for (const w of words) {
        if (lineIndex === 1) {
          if ((line1 + " " + w).length <= maxChar) {
            line1 += (line1 ? " " : "") + w;
          } else {
            lineIndex = 2;
            line2 = w;
          }
        } else {
          if ((line2 + " " + w).length <= maxChar) {
            line2 += (line2 ? " " : "") + w;
          } else {
            line2 += "…";
            break;
          }
        }
      }

      ctx.fillText(`"${line1}`, bX + 8, bY + 27);
      if (line2) {
        ctx.fillText(`${line2}"`, bX + 8, bY + 41);
      } else {
        ctx.fillText(`"`, bX + 8 + ctx.measureText(`"${line1}`).width, bY + 27);
      }
    }

    ctx.restore();
  }, [
    activeRoomFocus,
    isDarkMode,
    zoomLevel,
    panOffset,
    animationTick,
    workstationPCs,
    agents,
    selectedPcId,
    hoveredPcId,
    selectedAgentId,
    toIso,
  ]);

  // -------------------------------------------------------------------
  // 6. Interactive Mouse Events
  // -------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
    const mouseY = (e.clientY - rect.top - panOffset.y) / zoomLevel;

    const W = canvas.clientWidth;
    const originX = W / 2 + 10;
    const originY = 85;

    let foundPc: string | null = null;
    workstationPCs.forEach((ws) => {
      const pt = toIso(ws.gx, ws.gy, originX, originY);
      if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 28) {
        foundPc = ws.id;
      }
    });
    setHoveredPcId(foundPc);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch gesture handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPanOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = (touch.clientX - rect.left - panOffset.x) / zoomLevel;
      const clickY = (touch.clientY - rect.top - panOffset.y) / zoomLevel;

      const W = canvas.clientWidth;
      const originX = W / 2 + 10;
      const originY = 85;

      workstationPCs.forEach((ws) => {
        const pt = toIso(ws.gx, ws.gy, originX, originY);
        if (Math.hypot(clickX - pt.x, clickY - pt.y) < 32) {
          setSelectedPcId(ws.id);
          if (onSelectModel && ws.modelId !== "offline") {
            onSelectModel(ws.modelId);
          }
        }
      });

      agents.forEach((ag) => {
        const pt = toIso(ag.gx, ag.gy, originX, originY);
        if (Math.hypot(clickX - pt.x, clickY - (pt.y - 12)) < 30) {
          setSelectedAgentId(ag.id);
        }
      });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
    const clickY = (e.clientY - rect.top - panOffset.y) / zoomLevel;

    const W = canvas.clientWidth;
    const originX = W / 2 + 10;
    const originY = 85;

    workstationPCs.forEach((ws) => {
      const pt = toIso(ws.gx, ws.gy, originX, originY);
      if (Math.hypot(clickX - pt.x, clickY - pt.y) < 28) {
        setSelectedPcId(ws.id);
        if (onSelectModel && ws.modelId !== "offline") {
          onSelectModel(ws.modelId);
        }
      }
    });

    agents.forEach((ag) => {
      const pt = toIso(ag.gx, ag.gy, originX, originY);
      if (Math.hypot(clickX - pt.x, clickY - pt.y) < 24) {
        setSelectedAgentId(ag.id);
      }
    });
  };

  const resetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1.0);
    setActiveRoomFocus("all");
  };

  const focusRoom = (roomId: string) => {
    setActiveRoomFocus(roomId);
    if (roomId === "all") {
      resetView();
      return;
    }
    const zone = ROOM_ZONES.find((z) => z.id === roomId);
    if (!zone || !canvasRef.current) return;

    const W = canvasRef.current.clientWidth;
    const originX = W / 2 + 10;
    const originY = 85;
    const centerPt = toIso((zone.x1 + zone.x2) / 2, (zone.y1 + zone.y2) / 2, originX, originY);

    setPanOffset({
      x: W / 2 - centerPt.x,
      y: 360 - centerPt.y,
    });
    setZoomLevel(1.25);
  };

  return (
    <div className="space-y-4">
      {/* Simulation Top Brand & Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-retro-plum p-3 shadow-pixel">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="TheGate Official Logo"
            className="h-12 w-12 object-contain select-none shrink-0 filter drop-shadow"
            style={{ imageRendering: "pixelated" }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-sm tracking-wider text-white">
                THEGATE <span className="text-retro-amber">CAMPUS</span>
              </span>
              <PixelBadge variant="mint" size="xs">
                ISOMETRIC 16-BIT
              </PixelBadge>
            </div>
            <p className="text-[10px] font-mono text-slate-300 mt-0.5">
              Live AI Operations & Routing Headquarters • Top-Down 3D Perspective
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-retro-paper">
          <img
            src="/icon.png"
            alt="TheGate Meta Icon"
            className="h-7 w-7 object-contain border border-black shadow-pixel-xs"
            style={{ imageRendering: "pixelated" }}
          />
          <span>Sentinel Protocol: <strong className="text-retro-mint">ARMED</strong></span>
        </div>
      </div>

      {/* Simulation Command Strip & Room Bilik Selector */}
      <div className="flex flex-col gap-2.5 border-2 border-black bg-retro-night p-2.5 sm:p-3 shadow-pixel">
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap max-w-full pb-1 no-scrollbar">
          <span className="font-pixel text-[10px] text-retro-paper uppercase mr-1 shrink-0">
            Bilik:
          </span>
          <button
            onClick={() => focusRoom("all")}
            className={`shrink-0 px-2.5 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "all"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            🏢 ALL ROOMS
          </button>
          <button
            onClick={() => focusRoom("lobby")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "lobby"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            01: LOBBY
          </button>
          <button
            onClick={() => focusRoom("server-vault")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "server-vault"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            02: SERVER
          </button>
          <button
            onClick={() => focusRoom("director-suite")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "director-suite"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            03: DIRECTOR
          </button>
          <button
            onClick={() => focusRoom("workstations")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "workstations"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            04: WORKSTATIONS
          </button>
          <button
            onClick={() => focusRoom("boardroom")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "boardroom"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            05: BOARDROOM
          </button>
          <button
            onClick={() => focusRoom("focus-pods")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "focus-pods"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            06: FOCUS PODS
          </button>
          <button
            onClick={() => focusRoom("pantry-cafeteria")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "pantry-cafeteria"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            07: BISTRO
          </button>
          <button
            onClick={() => focusRoom("recreation-gym")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "recreation-gym"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            08: ARCADE & GYM
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap max-w-full pb-1 no-scrollbar pt-2 border-t border-retro-ink/50">
          <button
            onClick={handleSendTestToAntigravity}
            disabled={isTestPromptSending}
            className={`shrink-0 flex items-center gap-1.5 border-2 border-black px-2.5 py-1 font-pixel text-xs shadow-pixel-sm transition-none cursor-pointer ${
              isTestPromptSending
                ? "bg-retro-sand text-black animate-pulse cursor-wait"
                : "bg-retro-amber hover:bg-amber-400 text-black font-bold"
            }`}
            title="Trigger real API call to 9Router Antigravity (gemini-3.8-flash-high)"
          >
            <Zap className={`h-3.5 w-3.5 ${isTestPromptSending ? "animate-spin" : "fill-black"}`} />
            <span>{isTestPromptSending ? t("office.routing_test", "ROUTING...") : t("office.test_antigravity", "⚡ TEST ANTIGRAVITY")}</span>
          </button>

          <button
            onClick={toggleDayNight}
            className="shrink-0 flex items-center gap-1 border-2 border-black bg-retro-coal text-retro-cream px-2 py-1 font-pixel text-xs shadow-pixel-sm hover:bg-retro-sand hover:text-black transition-none cursor-pointer"
          >
            {isDarkMode ? <Moon className="h-3.5 w-3.5 text-retro-amber" /> : <Sun className="h-3.5 w-3.5 text-yellow-500" />}
            <span>{isDarkMode ? t("office.night_shift", "NIGHT SHIFT") : t("office.day_shift", "DAY SHIFT")}</span>
          </button>

          <button
            onClick={() => setAllowRoaming(!allowRoaming)}
            className={`shrink-0 flex items-center gap-1 border-2 border-black px-2 py-1 font-pixel text-xs shadow-pixel-sm transition-none cursor-pointer ${
              allowRoaming ? "bg-retro-mint text-black font-bold" : "bg-retro-coal text-retro-paper"
            }`}
          >
            <Footprints className="h-3.5 w-3.5" />
            <span>{allowRoaming ? t("office.roam_active", "ROAM: ACTIVE") : t("office.roam_paused", "ROAM: PAUSED")}</span>
          </button>

          <button
            onClick={() => setScanlines(!scanlines)}
            className={`shrink-0 border-2 border-black px-2 py-1 font-pixel text-xs shadow-pixel-sm transition-none cursor-pointer ${
              scanlines ? "bg-retro-mint text-black font-bold" : "bg-retro-coal text-retro-paper"
            }`}
          >
            CRT {scanlines ? t("office.crt_on", "ON") : t("office.crt_off", "OFF")}
          </button>

          <button
            onClick={resetView}
            className="shrink-0 flex items-center gap-1 border-2 border-black bg-retro-coal text-retro-cream px-2 py-1 font-pixel text-xs shadow-pixel-sm hover:bg-retro-sand hover:text-black transition-none cursor-pointer"
            title="Reset Pan and Zoom"
          >
            <RotateCcw className="h-3 w-3 text-retro-amber" />
            <span>{t("office.reset", "RESET")}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="relative overflow-hidden border-2 border-black bg-retro-night shadow-pixel-lg">
        {/* Live Ingress Alert Toast */}
        {ingressToast && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-retro-night/95 border-2 border-retro-amber px-3 py-1.5 shadow-pixel-md backdrop-blur-xs animate-bounce">
            <Zap className="h-4 w-4 text-retro-amber fill-retro-amber animate-pulse" />
            <span className="font-mono text-xs font-bold text-retro-cream">
              {ingressToast}
            </span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-auto block select-none cursor-grab active:cursor-grabbing pixelated min-h-[440px] sm:min-h-[580px] lg:min-h-[680px]"
          style={{ maxHeight: "900px" }}
        />

        {scanlines && <div className="absolute inset-0 pointer-events-none crt-overlay" />}

        {/* Viewport Zoom Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-retro-night/95 border-2 border-black p-1 shadow-pixel-sm">
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
            className="px-2 py-0.5 font-pixel text-xs font-bold text-retro-cream hover:text-retro-amber cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <span className="font-mono text-[10px] text-retro-paper font-bold px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.65, z - 0.15))}
            className="px-2 py-0.5 font-pixel text-xs font-bold text-retro-cream hover:text-retro-amber cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>
        </div>

        {/* Legend Status Bar (Desktop & Tablets) */}
        <div className="hidden sm:flex absolute bottom-2 left-3 right-3 flex-wrap items-center justify-between pointer-events-none text-xs font-mono text-retro-paper bg-retro-night/95 px-3 py-1.5 border-2 border-black backdrop-blur-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-retro-cream">🏢 {t("office.campus_strip", "AI Campus:")}</span>
            <span className="text-retro-amber font-bold">01: Lobby</span>
            <span>•</span>
            <span className="text-retro-blue font-bold">02: Server</span>
            <span>•</span>
            <span className="text-yellow-600 font-bold">03: Director</span>
            <span>•</span>
            <span className="text-retro-mint font-bold">
              04: Workstations ({hasRealModels ? `${models.length} ${t("office.online", "Online")}` : t("office.offline", "Offline")})
            </span>
            <span>•</span>
            <span className="text-purple-400 font-bold">05: Boardroom</span>
            <span>•</span>
            <span className="text-blue-400 font-bold">06: Pods</span>
            <span>•</span>
            <span className="text-orange-400 font-bold">07: Bistro</span>
            <span>•</span>
            <span className="text-teal-400 font-bold">08: Arcade & Gym</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-retro-mint font-bold">
              {t("office.active_focus", "Active Focus")}: [{selectedPc?.internalName || "BAY 1A (ANTIGRAVITY)"}]
            </span>
          </div>
        </div>
      </div>

      {/* Interactive RPG Dialogue Box & Model Workstation Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <PixelDialogueBox
            speakerName={selectedAgent.name}
            speakerRole={`${selectedAgent.department} • ${selectedAgent.role}`}
            speakerAvatar={
              <div
                className="relative flex h-full w-full items-center justify-center overflow-hidden border border-black"
                style={{ backgroundColor: selectedAgent.shirtColor }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="h-4 w-7 rounded-t-sm"
                    style={{ backgroundColor: selectedAgent.hairColor }}
                  />
                  <div className="relative h-6 w-6 bg-[#F6D5B8] flex items-center justify-around px-1">
                    <div className="h-1.5 w-1 bg-black" />
                    <div className="h-1.5 w-1 bg-black" />
                    {selectedAgent.hasGlasses && (
                      <div className="absolute inset-0 border border-blue-600 top-1 h-3" />
                    )}
                  </div>
                  <div
                    className="h-4 w-8 flex items-center justify-center text-[7px] font-bold text-white uppercase"
                    style={{ backgroundColor: selectedAgent.shirtColor }}
                  >
                    {selectedAgent.role.slice(0, 3)}
                  </div>
                </div>
              </div>
            }
            dialogueText={formatDialogueText(selectedAgent, language)}
            isStreaming={true}
            actions={[
              {
                label: `${t("office.route_via", "Route via")} ${selectedPc?.internalName || "BAY 1A"}`,
                variant: "amber",
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                onClick: () => {
                  if (onSelectModel && selectedPc?.modelId && selectedPc.modelId !== "offline") {
                    onSelectModel(selectedPc.modelId);
                  }
                  if (selectedAgent && selectedPc) {
                    const rationale = generateRationale(selectedAgent, selectedPc, undefined, language);
                    setAgents((prev) =>
                      prev.map((a) => {
                        if (a.id === selectedAgent.id) {
                          return {
                            ...a,
                            targetGx: selectedPc.gx,
                            targetGy: selectedPc.gy + 1,
                            targetPcId: selectedPc.id,
                            state: "walking",
                            stateTicks: 0,
                            currentActivity: language === "en" ? `Manual route to ${selectedPc.internalName}` : `Manual route ke ${selectedPc.internalName}`,
                            dialogue: {
                              agentId: a.id,
                              agentRole: a.role,
                              modelName: selectedPc.internalName,
                              reasonText: rationale,
                              ticksRemaining: 90,
                            },
                          };
                        }
                        return a;
                      })
                    );
                  }
                },
              },
              {
                label: t("office.ask_recommendation", "Ask for Recommendation"),
                variant: "mint",
                icon: <Compass className="h-3.5 w-3.5" />,
                onClick: () => {
                  if (onOpenRecommendQuest) onOpenRecommendQuest();
                },
              },
            ]}
          />
        </div>

        <div className="lg:col-span-5">
          <PixelPanel
            title={`${t("office.workstation_title", "WORKSTATION")} [${(selectedPc?.internalName || "BAY 1A").toUpperCase()}]`}
            variant="dark"
            badge={
              <PixelBadge
                variant={selectedPc?.status === "online" ? "mint" : "coral"}
                size="xs"
              >
                {selectedPc?.status === "online" ? t("office.online", "ONLINE") : t("office.offline", "OFFLINE")}
              </PixelBadge>
            }
          >
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-retro-ink pb-2">
                <span className="text-retro-paper">{t("office.assigned_model", "Assigned Model:")}</span>
                <span className="font-bold text-retro-amber truncate max-w-[190px]">
                  {selectedPc?.modelId || "ag/gemini-3.8-flash-high"}
                </span>
              </div>
              <div className="flex justify-between border-b border-retro-ink pb-2">
                <span className="text-retro-paper">{t("office.adapter_driver", "Adapter / Driver:")}</span>
                <span className="font-bold text-retro-cream">
                  {selectedPc?.adapter || "antigravity"}
                </span>
              </div>
              <div className="flex justify-between border-b border-retro-ink pb-2">
                <span className="text-retro-paper">{t("office.unit_price", "Unit Price (/1M tok):")}</span>
                <span className="font-bold text-retro-mint">
                  {selectedPc?.inputPrice || "$0.10"} In / {selectedPc?.outputPrice || "$0.40"} Out
                </span>
              </div>
              <div className="flex justify-between border-b border-retro-ink pb-2">
                <span className="text-retro-paper">{t("office.context_window", "Context Window:")}</span>
                <span className="font-bold text-retro-cream">
                  {selectedPc?.context || "1,048k tok"}
                </span>
              </div>
              <div className="flex justify-between border-b border-retro-ink pb-2">
                <span className="text-retro-paper">{t("office.location", "Location:")}</span>
                <span className="font-bold text-retro-cream">
                  {t("office.location_cubicle", "Cubicle 04: AI Workstations")} ({selectedPc?.deskLabel || "BAY 1A"})
                </span>
              </div>
              <div>
                <span className="text-retro-paper block mb-1">{t("office.capabilities", "Capabilities:")}</span>
                <div className="flex flex-wrap gap-1">
                  {(selectedPc?.capabilities || ["Antigravity", "Streaming"]).map((cap) => (
                    <span
                      key={cap}
                      className="border border-black bg-retro-night px-1.5 py-0.5 text-[9px] text-retro-paper font-bold shadow-pixel-sm"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </PixelPanel>
        </div>
      </div>
    </div>
  );
}
