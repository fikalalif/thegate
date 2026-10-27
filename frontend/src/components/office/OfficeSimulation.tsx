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
  Settings2,
  Edit3,
  Save,
  Workflow,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelPanel } from "@/components/pixel/PixelPanel";
import { PixelDialogueBox } from "@/components/pixel/PixelDialogueBox";
import { useI18n, Language } from "@/lib/i18n";

// =====================================================================
// Types & Interfaces
// =====================================================================

export interface PipelineHUDStep {
  title: string;
  roleName: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  durationMs?: number;
  tokens?: number;
  outputPreview?: string;
}

export interface PipelineHUDState {
  pipelineId: string;
  title: string;
  status: "PLANNING" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED";
  stepIndex: number;
  totalSteps: number;
  stepTitle?: string;
  stepProgress?: string;
  dialogue?: string;
  activeRole?: string;
  stepsHistory: PipelineHUDStep[];
}

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
  state: "idle" | "walking" | "using_pc" | "cafe" | "gym" | "arcade" | "meeting" | "focus" | "reception" | "swimming" | "sunbathing" | "garden";
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

// Isometric Projection Math Constants (Expanded Scale for High-DPI Clarity & Breathing Room)
const TILE_W = 50;
const TILE_H = 25;
const TILE_HALF_W = 25;
const TILE_HALF_H = 12.5;

// Grid Dimensions: 28 cols x 22 rows (Expanded with Urban Estate Grounds)
const GRID_COLS = 28;
const GRID_ROWS = 22;

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
    name: "Grand Reception & Visitor Lounge",
    code: "01: LOBBY",
    x1: 10,
    y1: 9,
    x2: 15,
    y2: 13,
    darkFloorA: "#241E2F",
    darkFloorB: "#2C2538",
    lightFloorA: "#F8F4EC",
    lightFloorB: "#EFE8DA",
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
    y2: 5,
    darkFloorA: "#0F172A",
    darkFloorB: "#020617",
    lightFloorA: "#334155",
    lightFloorB: "#1E293B",
    accentColor: "#00E5FF",
    accentGlow: "rgba(0, 229, 255, 0.45)",
  },
  {
    id: "director-suite",
    name: "Executive Director Suite & Library",
    code: "03: DIRECTOR SUITE",
    x1: 8,
    y1: 1,
    x2: 15,
    y2: 5,
    darkFloorA: "#4D2612",
    darkFloorB: "#3B1C0B",
    lightFloorA: "#9A5B32",
    lightFloorB: "#874D28",
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
    y2: 8,
    darkFloorA: "#1E293B",
    darkFloorB: "#162030",
    lightFloorA: "#E2E8F0",
    lightFloorB: "#CBD5E1",
    accentColor: "#34D399",
    accentGlow: "rgba(52, 211, 153, 0.45)",
  },
  {
    id: "boardroom",
    name: "Boardroom & Strategy War Room",
    code: "05: BOARDROOM",
    x1: 1,
    y1: 6,
    x2: 9,
    y2: 9,
    darkFloorA: "#2E2452",
    darkFloorB: "#231B3E",
    lightFloorA: "#E0E7FF",
    lightFloorB: "#C7D2FE",
    accentColor: "#C084FC",
    accentGlow: "rgba(192, 132, 252, 0.4)",
  },
  {
    id: "focus-pods",
    name: "Soundproof Focus & Phone Pods",
    code: "06: FOCUS PODS",
    x1: 10,
    y1: 6,
    x2: 15,
    y2: 8,
    darkFloorA: "#1E3A5F",
    darkFloorB: "#172E4C",
    lightFloorA: "#DBEAFE",
    lightFloorB: "#BFDBFE",
    accentColor: "#60A5FA",
    accentGlow: "rgba(96, 165, 250, 0.4)",
  },
  {
    id: "pantry-cafeteria",
    name: "Barista Pantry, Kitchen & Bistro",
    code: "07: PANTRY & BISTRO",
    x1: 1,
    y1: 10,
    x2: 9,
    y2: 13,
    darkFloorA: "#334155",
    darkFloorB: "#0F172A",
    lightFloorA: "#FFFFFF",
    lightFloorB: "#1E293B",
    accentColor: "#FB923C",
    accentGlow: "rgba(251, 146, 60, 0.4)",
  },
  {
    id: "resort-pool",
    name: "Outdoor Resort Pool & Tropical Garden",
    code: "08: POOL & GARDEN",
    x1: 0,
    y1: 14,
    x2: 27,
    y2: 21,
    darkFloorA: "#0891B2",
    darkFloorB: "#0E7490",
    lightFloorA: "#06B6D4",
    lightFloorB: "#22D3EE",
    accentColor: "#38BDF8",
    accentGlow: "rgba(56, 189, 248, 0.5)",
  },
];

export const RELAXATION_SPOTS = [
  { gx: 6, gy: 12, state: "cafe" as const, room: "pantry-cafeteria", activity: "Ngopi di Bistro (Santai)" },
  { gx: 22, gy: 18, state: "swimming" as const, room: "resort-pool", activity: "Berenang di Kolam Renang Depan" },
  { gx: 18, gy: 17, state: "sunbathing" as const, room: "resort-pool", activity: "Berjemur di Kursi Tepi Kolam" },
  { gx: 5, gy: 18, state: "garden" as const, room: "resort-pool", activity: "Duduk di Taman Bunga Depan" },
  { gx: 12, gy: 12, state: "reception" as const, room: "lobby", activity: "Santai di Sofa Lobby" },
  { gx: 11, gy: 7, state: "focus" as const, room: "focus-pods", activity: "Meditasi di Focus Pod" },
  { gx: 5, gy: 7.5, state: "meeting" as const, room: "boardroom", activity: "Diskusi di Boardroom" },
  { gx: 11.5, gy: 3, state: "idle" as const, room: "director-suite", activity: "Membaca di Director Suite" },
];

export interface InteractivePropAction {
  label: string;
  icon: string;
  agentState: CampusAgent["state"];
  activity: string;
  thoughtEmoji: string;
  dialogueText: string;
}

export interface InteractiveProp {
  id: string;
  name: string;
  room: string;
  gx: number;
  gy: number;
  radius: number;
  icon: string;
  description: string;
  actions: InteractivePropAction[];
}

export const INTERACTIVE_PROPS: InteractiveProp[] = [
  {
    id: "prop-pool",
    name: "Luxury Resort Pool",
    room: "08: Outdoor Pool & Garden",
    gx: 22,
    gy: 18,
    radius: 42,
    icon: "🏊",
    description: "Turquoise heated pool with floating duck, chrome entry ladder, and fresh water caustics.",
    actions: [
      {
        label: "Berenang di Kolam",
        icon: "🏊",
        agentState: "swimming",
        activity: "Berenang di Kolam Renang Depan",
        thoughtEmoji: "🏊",
        dialogueText: "Splashing into the crystal blue pool to recharge thermal capacity after intensive LLM inference runs!",
      },
      {
        label: "Main dengan Bebek Pelampung",
        icon: "🦆",
        agentState: "swimming",
        activity: "Main dengan Bebek Pelampung",
        thoughtEmoji: "🦆",
        dialogueText: "Floating alongside the iconic 16-bit yellow duck. Fun meter restored to 100%!",
      },
    ],
  },
  {
    id: "prop-lounger",
    name: "Poolside Sun Lounger & Parasol",
    room: "08: Outdoor Pool & Garden",
    gx: 17,
    gy: 17.5,
    radius: 30,
    icon: "🏖️",
    description: "Travertine pool deck equipped with striped beach towels, sun shades, and iced fruit drinks.",
    actions: [
      {
        label: "Berjemur dengan Kacamata Hitam",
        icon: "🕶️",
        agentState: "sunbathing",
        activity: "Berjemur di Kursi Tepi Kolam",
        thoughtEmoji: "🏖️",
        dialogueText: "Putting on shades and soaking in the sun while monitoring token burn rate in complete luxury.",
      },
      {
        label: "Minum Jus Tropis Dingin",
        icon: "🍹",
        agentState: "sunbathing",
        activity: "Minum Jus Tropis Dingin",
        thoughtEmoji: "🍹",
        dialogueText: "Chilling out with cold tropical juice under the striped umbrella.",
      },
    ],
  },
  {
    id: "prop-garden",
    name: "Botanical Garden & Park Bench",
    room: "08: Outdoor Pool & Garden",
    gx: 5,
    gy: 18,
    radius: 32,
    icon: "🌸",
    description: "Lush green grass courtyard with blooming flowers, tropical palm trees, and hand-carved teak bench.",
    actions: [
      {
        label: "Duduk di Bangku Taman",
        icon: "🌳",
        agentState: "garden",
        activity: "Duduk di Taman Bunga Depan",
        thoughtEmoji: "🌸",
        dialogueText: "Resting peacefully surrounded by tropical greenery and blooming flowers in the courtyard.",
      },
      {
        label: "Baca Buku di Bawah Pohon",
        icon: "📖",
        agentState: "garden",
        activity: "Membaca Buku di Bawah Pohon",
        thoughtEmoji: "📖",
        dialogueText: "Reading 'Designing High-Throughput Routing Gateways' under the shade of the monstera palm.",
      },
    ],
  },
  {
    id: "prop-bbq",
    name: "Charcoal Stone BBQ Grill",
    room: "08: Outdoor Pool & Garden",
    gx: 8,
    gy: 16.5,
    radius: 28,
    icon: "🥩",
    description: "Outdoor granite masonry barbecue station with live woodsmoke, grilling skewers, and burgers.",
    actions: [
      {
        label: "Panggang Burger & Sosis",
        icon: "🍔",
        agentState: "garden",
        activity: "Panggang Burger & Sosis",
        thoughtEmoji: "🍔",
        dialogueText: "Flipping gourmet burgers on the stone grill! Nothing beats the aroma of charcoal BBQ in the courtyard.",
      },
    ],
  },
  {
    id: "prop-espresso",
    name: "Barista Espresso Bar",
    room: "07: Pantry & Bistro",
    gx: 4,
    gy: 10.5,
    radius: 30,
    icon: "☕",
    description: "Commercial multi-group Italian espresso maker pulling dark roast crema into ceramic demitasse cups.",
    actions: [
      {
        label: "Seduh Double Shot Espresso",
        icon: "☕",
        agentState: "cafe",
        activity: "Ngopi di Bistro (Santai)",
        thoughtEmoji: "☕",
        dialogueText: "Pulling a rich double-shot espresso to supercharge cognitive throughput for the next prompt wave!",
      },
      {
        label: "Ambil Croissant Hangat",
        icon: "🥐",
        agentState: "cafe",
        activity: "Makan Croissant Hangat",
        thoughtEmoji: "🥐",
        dialogueText: "Enjoying a buttery bakery croissant at the black-and-white checkered bistro counter.",
      },
    ],
  },
  {
    id: "prop-arcade",
    name: "Retro 16-Bit Arcade Cabinet",
    room: "08: Patio Arcade",
    gx: 20,
    gy: 11.5,
    radius: 26,
    icon: "🕹️",
    description: "Classic CRT arcade cabinet running custom 16-bit retro games with illuminated joystick controls.",
    actions: [
      {
        label: "Main Game Arcade Retro",
        icon: "🎮",
        agentState: "arcade",
        activity: "Main Game Arcade Retro",
        thoughtEmoji: "🕹️",
        dialogueText: "Mashing arcade buttons and setting the all-time high score on TheGate 16b retro cabinet!",
      },
    ],
  },
  {
    id: "prop-server",
    name: "Ingress Router Server Vault",
    room: "02: Server Vault",
    gx: 4,
    gy: 2.2,
    radius: 34,
    icon: "⚡",
    description: "High-density server racks hosting encrypted 9Router proxy nodes, SSE streaming buffers, and LED arrays.",
    actions: [
      {
        label: "Diagnostik Server 9Router",
        icon: "⚡",
        agentState: "using_pc",
        activity: "Cek Status Server Vault 9Router",
        thoughtEmoji: "⚡",
        dialogueText: "Querying rack telemetry: 121 models active, 0.00% 5xx error budget, sub-millisecond edge latency confirmed!",
      },
    ],
  },
  {
    id: "prop-director",
    name: "Meja Direktur & Perpustakaan",
    room: "03: Director Suite",
    gx: 11.5,
    gy: 3.2,
    radius: 30,
    icon: "📚",
    description: "Executive desk with banker's lamp, dark walnut bookshelves, and signed autonomous AI governance charters.",
    actions: [
      {
        label: "Baca Rencana Strategis AI",
        icon: "📜",
        agentState: "idle",
        activity: "Membaca di Director Suite",
        thoughtEmoji: "📜",
        dialogueText: "Reviewing executive FinOps arbitration charters: -77.3% cost reduction verified across enterprise tenants.",
      },
    ],
  },
  {
    id: "prop-warroom",
    name: "AI Arbitrage War Room Table",
    room: "05: Boardroom",
    gx: 5,
    gy: 7.5,
    radius: 36,
    icon: "🎯",
    description: "Long conference table equipped with executive swivel chairs and projection displays for tactical routing.",
    actions: [
      {
        label: "Kumpulkan Rapat Strategi",
        icon: "📢",
        agentState: "meeting",
        activity: "Diskusi di Boardroom",
        thoughtEmoji: "📢",
        dialogueText: "Calling all agents to the boardroom table: reviewing speculative routing thresholds and fallback cascades!",
      },
    ],
  },
  {
    id: "prop-pod",
    name: "Soundproof Acoustic Focus Pod",
    room: "06: Focus Pods",
    gx: 11,
    gy: 7,
    radius: 26,
    icon: "🎧",
    description: "Isolated acoustic booth with active noise cancellation glass for deep uninterrupted architecture work.",
    actions: [
      {
        label: "Masuk Mode Deep Focus",
        icon: "🎧",
        agentState: "focus",
        activity: "Meditasi di Focus Pod",
        thoughtEmoji: "🎧",
        dialogueText: "Noise cancellation engaged. Zero distraction mode: analyzing complex AST token representations.",
      },
    ],
  },
  {
    id: "prop-fireplace",
    name: "Perapian & Ruang Tamu",
    room: "01: Reception Lounge",
    gx: 1.5,
    gy: 16.5,
    radius: 28,
    icon: "🔥",
    description: "Warm stone hearth with dancing wood embers, brick chimney, and deep leather lounge armchair.",
    actions: [
      {
        label: "Hangatkan Diri di Perapian",
        icon: "🔥",
        agentState: "reception",
        activity: "Santai di Sofa Ruang Tamu",
        thoughtEmoji: "🔥",
        dialogueText: "Relaxing on the leather armchair enjoying the crackling warmth of the brick fireplace.",
      },
    ],
  },
  {
    id: "prop-gate",
    name: "⛩️ Gerbang Utama TheGate",
    room: "Front Yard Entrance",
    gx: 13.5,
    gy: 21.5,
    radius: 34,
    icon: "⛩️",
    description: "Ornate ironwork security gate with brick pillars, stone walkway, and illuminated gold crest.",
    actions: [
      {
        label: "Inspeksi Gerbang Keamanan",
        icon: "🛡️",
        agentState: "reception",
        activity: "Cek Keamanan Gerbang Depan",
        thoughtEmoji: "🛡️",
        dialogueText: "Perimeter check: Wrought-iron fences locked, zero unauthenticated intrusion detected at the gate.",
      },
    ],
  },
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
    "arcade": { en: "Playing Arcade on Patio (Relaxing)", id: "Santai Main Arcade Patio" },
    "gym": { en: "Relaxing by the Garden", id: "Duduk di Taman Bunga" },
    "swimming": { en: "Swimming in Resort Pool (Relaxing)", id: "Berenang di Kolam Renang (Santai)" },
    "sunbathing": { en: "Sunbathing on Poolside Lounger", id: "Berjemur di Kursi Pantai" },
    "garden": { en: "Resting on Garden Park Bench", id: "Duduk di Bangku Taman Bunga" },
    "reception": { en: "Relaxing on Living Room Couch", id: "Santai di Sofa Ruang Tamu" },
    "focus": { en: "Focusing in Soundproof Pod", id: "Meditasi di Focus Pod" },
    "meeting": { en: "Chilling in Boardroom", id: "Santai di Boardroom" },
    "idle": { en: "Reading in Master Study", id: "Membaca di Master Study" },
    "Ngopi di Pantry (Santai)": { en: "Having Coffee at Pantry (Relaxing)", id: "Ngopi di Pantry (Santai)" },
    "Berenang di Kolam Renang (Santai)": { en: "Swimming in Resort Pool (Relaxing)", id: "Berenang di Kolam Renang (Santai)" },
    "Berjemur di Kursi Pantai": { en: "Sunbathing on Poolside Lounger", id: "Berjemur di Kursi Pantai" },
    "Duduk di Bangku Taman Bunga": { en: "Resting on Garden Park Bench", id: "Duduk di Bangku Taman Bunga" },
    "Santai Main Arcade Patio": { en: "Playing Arcade on Patio (Relaxing)", id: "Santai Main Arcade Patio" },
    "Santai di Sofa Ruang Tamu": { en: "Relaxing on Living Room Couch", id: "Santai di Sofa Ruang Tamu" },
    "Meditasi di Focus Pod": { en: "Focusing in Soundproof Pod", id: "Meditasi di Focus Pod" },
    "Santai di Boardroom": { en: "Chilling in Boardroom", id: "Santai di Boardroom" },
    "Membaca di Master Study": { en: "Reading in Master Study", id: "Membaca di Master Study" },
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
  const [selectedPcId, setSelectedPcId] = useState<string | null>("pc-0");
  const [hoveredPcId, setHoveredPcId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(DEFAULT_FALLBACK_AGENT.id);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Real Ingress Telemetry & Live Traffic State
  const [liveTraffic, setLiveTraffic] = useState<LiveTrafficResponse | null>(null);
  const [lastHandledEventId, setLastHandledEventId] = useState<string | null>(null);
  const [isTestPromptSending, setIsTestPromptSending] = useState<boolean>(false);
  const [ingressToast, setIngressToast] = useState<string | null>(null);

  // Multi-Agent Pipeline Orchestration State (PRD 5.3 & 5.4)
  const [pipelineHud, setPipelineHud] = useState<PipelineHUDState | null>(null);
  const [isDispatchingPipeline, setIsDispatchingPipeline] = useState<boolean>(false);
  const [inspectingStepArtifact, setInspectingStepArtifact] = useState<{ title: string; role: string; content: string } | null>(null);

  // User Custom Desk Assignments & Dynamic Hot-Swap State
  const [customDesks, setCustomDesks] = useState<Record<string, { modelId: string }>>({});
  const [hotSwappedDesks, setHotSwappedDesks] = useState<Record<string, { modelId: string; timestamp: number }>>({});
  const [editingDeskModel, setEditingDeskModel] = useState<string>("");
  const [isEditingDesk, setIsEditingDesk] = useState<boolean>(false);

  // Load custom desks from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("thegate_custom_desks");
      if (saved) {
        setCustomDesks(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleAssignModelToDesk = (deskId: string, newModelId: string) => {
    const trimmed = newModelId.trim();
    if (!trimmed) return;
    setCustomDesks((prev) => {
      const next = { ...prev, [deskId]: { modelId: trimmed } };
      try {
        localStorage.setItem("thegate_custom_desks", JSON.stringify(next));
      } catch {}
      return next;
    });
    setHotSwappedDesks((prev) => {
      const next = { ...prev };
      delete next[deskId];
      return next;
    });
    setIsEditingDesk(false);
  };

  const handleResetDesk = (deskId: string) => {
    setCustomDesks((prev) => {
      const next = { ...prev };
      delete next[deskId];
      try {
        localStorage.setItem("thegate_custom_desks", JSON.stringify(next));
      } catch {}
      return next;
    });
    setHotSwappedDesks((prev) => {
      const next = { ...prev };
      delete next[deskId];
      return next;
    });
    setIsEditingDesk(false);
  };

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

  // Initial traffic overview metrics fetch (PRD v2.0: Event-driven via SSE)
  useEffect(() => {
    let isMounted = true;
    api.getLiveTraffic().then((data) => {
      if (isMounted) setLiveTraffic(data);
    }).catch(() => {});
    return () => {
      isMounted = false;
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
  // 1. Dynamic Workstation PCs Mapping (Diverse Multi-Provider Representation)
  // -------------------------------------------------------------------
  const baseWorkstationPCs = useMemo<ModelWorkstationPC[]>(() => {
    const cubicleSlots = [
      { gx: 18, gy: 2, label: "BAY 1 (ANTIGRAVITY)" },
      { gx: 21, gy: 2, label: "BAY 2 (KIRO AI)" },
      { gx: 24, gy: 2, label: "BAY 3 (GROQ LLAMA)" },
      { gx: 27, gy: 2, label: "BAY 4 (DEEPSEEK V4)" },
      { gx: 18, gy: 5, label: "BAY 5 (NVIDIA AI)" },
      { gx: 21, gy: 5, label: "BAY 6 (GLM FRONTIER)" },
      { gx: 24, gy: 5, label: "BAY 7 (GEMINI NATIVE)" },
      { gx: 27, gy: 5, label: "BAY 8 (CLOUDFLARE AI)" },
      { gx: 20, gy: 8, label: "BAY 9 (MIMO PRO)" },
      { gx: 24, gy: 8, label: "BAY 10 (CLAUDE OPUS)" },
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
          id: `pc-${idx}`,
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
      if (lower.includes("coder") || lower.includes("deepseek") || lower.includes("claude") || lower.includes("qwen")) return "coding";
      if (lower.includes("o1") || lower.includes("glm") || lower.includes("gpt-4o") || lower.includes("thinking") || lower.includes("reasoning")) return "reasoning";
      if (lower.includes("mini") || lower.includes("flash") || lower.includes("haiku") || lower.includes("fast")) return "speed";
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

    // Multi-Provider Diversification Algorithm (Representing Full 9Router Armada)
    const targetProviders = ["ag", "kr", "groq", "ds", "nvidia", "glm", "gemini", "cf", "mimo", "openrouter", "oc"];
    const providerGroups: Record<string, ModelRegistryItem[]> = {};

    for (const m of models) {
      const p = m.internal_name.includes("/") ? m.internal_name.split("/")[0] : "other";
      if (!providerGroups[p]) providerGroups[p] = [];
      providerGroups[p].push(m);
    }

    const diverseSelection: ModelRegistryItem[] = [];

    // Slot 1: Primary Antigravity Gemini 3.8 Flash High
    const agFlash = (providerGroups["ag"] || []).find((m) => m.internal_name.includes("gemini-3.8-flash-high"));
    if (agFlash) diverseSelection.push(agFlash);

    // Pick top representative model from each provider
    for (const p of targetProviders) {
      if (diverseSelection.length >= cubicleSlots.length) break;
      const list = providerGroups[p] || [];
      const candidate =
        list.find((m) => {
          const lower = m.internal_name.toLowerCase();
          return (
            m.id !== agFlash?.id &&
            !diverseSelection.some((s) => s.id === m.id) &&
            (lower.includes("sonnet") ||
              lower.includes("llama-3.3") ||
              lower.includes("deepseek") ||
              lower.includes("glm") ||
              lower.includes("flash") ||
              lower.includes("pro") ||
              lower.includes("opus") ||
              lower.includes("m2") ||
              lower.includes("m3") ||
              lower.includes("auto"))
          );
        }) || list.find((m) => m.id !== agFlash?.id && !diverseSelection.some((s) => s.id === m.id));

      if (candidate) {
        diverseSelection.push(candidate);
      }
    }

    // Fill remaining slots with any unused models from the registry
    for (const m of models) {
      if (diverseSelection.length >= cubicleSlots.length) break;
      if (!diverseSelection.some((s) => s.id === m.id)) {
        diverseSelection.push(m);
      }
    }

    const finalModelsList = diverseSelection;

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

  // Combined Workstation PCs with Custom User Overrides & Dynamic Ingress Hot-Swaps
  const workstationPCs = useMemo<ModelWorkstationPC[]>(() => {
    const formatCustomPrice = (cat: string, type: "in" | "out") => {
      if (cat === "reasoning") return type === "in" ? "$0.55" : "$2.19";
      if (cat === "coding") return type === "in" ? "$0.30" : "$1.20";
      if (cat === "speed") return type === "in" ? "$0.08" : "$0.30";
      return type === "in" ? "$0.15" : "$0.60";
    };

    const getCategory = (name: string): ModelWorkstationPC["category"] => {
      const lower = name.toLowerCase();
      if (lower.includes("coder") || lower.includes("deepseek") || lower.includes("claude") || lower.includes("qwen")) return "coding";
      if (lower.includes("o1") || lower.includes("glm") || lower.includes("gpt-4o") || lower.includes("thinking") || lower.includes("reasoning") || lower.includes("r1")) return "reasoning";
      if (lower.includes("mini") || lower.includes("flash") || lower.includes("haiku") || lower.includes("fast")) return "speed";
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

    return baseWorkstationPCs.map((pc) => {
      // 1. Explicit Custom Assignment by User
      if (customDesks[pc.id]) {
        const customModel = customDesks[pc.id].modelId;
        const cat = getCategory(customModel);
        const shortName = customModel.includes("/") ? customModel.split("/").pop()! : customModel;
        return {
          ...pc,
          modelId: customModel,
          internalName: customModel,
          category: cat,
          status: "online" as const,
          screenGlow: getGlow(cat),
          deskLabel: `${pc.deskLabel.split(" ")[0]} (${shortName.slice(0, 10).toUpperCase()})`,
          adapter: customModel.includes("/") ? customModel.split("/")[0] : "custom",
          inputPrice: formatCustomPrice(cat, "in"),
          outputPrice: formatCustomPrice(cat, "out"),
          capabilities: ["Custom Assigned", "Active", "Dynamic Ingress"],
        };
      }

      // 2. Dynamic Hot-Swap from Live Ingress Traffic
      if (hotSwappedDesks[pc.id]) {
        const hotModel = hotSwappedDesks[pc.id].modelId;
        const cat = getCategory(hotModel);
        const shortName = hotModel.includes("/") ? hotModel.split("/").pop()! : hotModel;
        return {
          ...pc,
          modelId: hotModel,
          internalName: hotModel,
          category: cat,
          status: "online" as const,
          screenGlow: getGlow(cat),
          deskLabel: `${pc.deskLabel.split(" ")[0]} (${shortName.slice(0, 10).toUpperCase()})`,
          adapter: hotModel.includes("/") ? hotModel.split("/")[0] : "dynamic-router",
          inputPrice: formatCustomPrice(cat, "in"),
          outputPrice: formatCustomPrice(cat, "out"),
          capabilities: ["Hot-Swapped", "Live Ingress", "Streaming"],
        };
      }

      return pc;
    });
  }, [baseWorkstationPCs, customDesks, hotSwappedDesks]);

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

  const selectedPc: ModelWorkstationPC | null =
    selectedObjectId
      ? null
      : ((workstationPCs && workstationPCs.length > 0
          ? workstationPCs.find((w) => w.id === selectedPcId) || workstationPCs[0]
          : fallbackPc) || fallbackPc);

  const selectedProp = INTERACTIVE_PROPS.find((p) => p.id === selectedObjectId);

  const handleTriggerPropAction = (prop: InteractiveProp, action: InteractivePropAction) => {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === selectedAgent.id) {
          return {
            ...a,
            targetGx: prop.gx,
            targetGy: prop.gy,
            targetPcId: undefined,
            state: action.agentState,
            currentActivity: action.activity,
            currentRoom: prop.room,
            dialogue: {
              agentId: a.id,
              agentRole: a.role,
              modelName: prop.name,
              reasonText: action.dialogueText,
              ticksRemaining: 110,
            },
          };
        }
        return a;
      })
    );
  };

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

  // Single Ingress Event Handler (PRD v2.0: Event-driven via SSE)
  const handleLiveIngress = useCallback(
    (latest: any) => {
      if (!latest || !agents.length) return;
      if (latest.id === lastHandledEventId) return;

      setLastHandledEventId(latest.id);

      setIngressToast(
        `⚡ LIVE INGRESS: ${latest.model} via ${(latest.provider || "9ROUTER").toUpperCase()} (${latest.prompt_tokens || 0} in / ${latest.completion_tokens || 0} out)`
      );
      setTimeout(() => setIngressToast(null), 5000);

      // Find the workstation PC that hosts this model
      let targetPc = workstationPCs.find(
        (pc) =>
          pc.modelId.toLowerCase() === (latest.model || "").toLowerCase() ||
          pc.internalName.toLowerCase() === (latest.raw_model || "").toLowerCase() ||
          (latest.provider === "antigravity" && pc.id === "pc-0")
      );

      // Dynamic Desk Hot-Swap
      if (!targetPc) {
        const busyPcIds = new Set(agents.filter((a) => a.state === "using_pc").map((a) => a.targetPcId));
        const candidateDesks = workstationPCs.slice(1).filter((pc) => !busyPcIds.has(pc.id) && !customDesks[pc.id]);
        const swapVictim = candidateDesks[0] || workstationPCs[1] || workstationPCs[0];

        if (swapVictim) {
          setHotSwappedDesks((prev) => ({
            ...prev,
            [swapVictim.id]: { modelId: latest.model, timestamp: Date.now() },
          }));
          targetPc = {
            ...swapVictim,
            modelId: latest.model,
            internalName: latest.model,
          };
        } else {
          targetPc = workstationPCs[0];
        }
      }

      let chosenAgent = agents.find(
        (a) => a.preferredModelId && a.preferredModelId.toLowerCase().includes((latest.model || "").toLowerCase())
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
                ticksRemaining: 120,
              },
            };
          }
          return a;
        })
      );
    },
    [agents, workstationPCs, customDesks, lastHandledEventId, generateRationale, language]
  );

  // Multi-Agent Pipeline Telemetry Handler (PRD 5.2 & 5.3)
  const handleAgentCoordination = useCallback(
    (data: any) => {
      if (!data) return;

      if (data.type === "PIPELINE_INIT") {
        setPipelineHud({
          pipelineId: data.pipelineId,
          title: data.title || "Multi-Agent Pipeline",
          status: "RUNNING",
          stepIndex: 0,
          totalSteps: data.totalSteps || 3,
          stepTitle: "Memulai DAG Pipeline...",
          stepProgress: data.stepProgress || `0/${data.totalSteps || 3}`,
          dialogue: data.dialogue,
          stepsHistory: Array.from({ length: data.totalSteps || 3 }).map((_, idx) => ({
            title: `Step ${idx + 1}`,
            roleName: idx === 0 ? "Systems Architect" : (idx === 1 ? "Academic Specialist" : "Security Auditor"),
            status: idx === 0 ? "IN_PROGRESS" : "PENDING",
          })),
        });

        setIngressToast(`⚡ ${data.dialogue}`);
        setTimeout(() => setIngressToast(null), 5000);
      }

      if (data.type === "HANDOFF_TRANSFER") {
        const fromRole = data.fromAgent?.roleId || "";
        const toRole = data.toAgent?.roleId || "";
        const toCoord = data.toAgent?.deskCoord || [18, 2];

        setPipelineHud((prev) => {
          if (!prev) return prev;
          const updatedSteps = [...prev.stepsHistory];
          if (updatedSteps[data.stepIndex]) {
            updatedSteps[data.stepIndex] = {
              ...updatedSteps[data.stepIndex],
              title: data.stepTitle || updatedSteps[data.stepIndex].title,
              roleName: data.toAgent?.roleName || updatedSteps[data.stepIndex].roleName,
              status: "IN_PROGRESS",
            };
          }
          return {
            ...prev,
            stepIndex: data.stepIndex || 0,
            stepTitle: data.stepTitle || prev.stepTitle,
            stepProgress: data.stepProgress || prev.stepProgress,
            dialogue: data.dialogue,
            activeRole: data.toAgent?.roleName,
            stepsHistory: updatedSteps,
          };
        });

        setIngressToast(`🤝 HANDOFF: ${data.fromAgent?.roleName || "Lead"} ➔ ${data.toAgent?.roleName || "Specialist"}`);
        setTimeout(() => setIngressToast(null), 6000);

        setAgents((prevAgents) => {
          const sender = prevAgents.find((a) => a.role === data.fromAgent?.roleName || a.id.includes(fromRole));
          const receiver = prevAgents.find((a) => a.role === data.toAgent?.roleName || a.id.includes(toRole)) || prevAgents[0];

          return prevAgents.map((a) => {
            if (sender && a.id === sender.id) {
              return {
                ...a,
                targetGx: toCoord[0] - 1,
                targetGy: toCoord[1] + 1,
                state: "walking" as const,
                stateTicks: 0,
                currentActivity: `Handoff ke ${data.toAgent?.roleName}`,
                dialogue: {
                  agentId: a.id,
                  agentRole: a.role,
                  modelName: "Handoff Packet",
                  reasonText: data.dialogue,
                  ticksRemaining: 140,
                },
              };
            }
            if (receiver && a.id === receiver.id) {
              return {
                ...a,
                targetGx: toCoord[0],
                targetGy: toCoord[1] + 1,
                state: "walking" as const,
                stateTicks: 0,
                currentActivity: `Menerima tugas: ${data.stepTitle}`,
              };
            }
            return a;
          });
        });
      }

      if (data.type === "COMPUTING") {
        const targetDeskCoord = data.agent?.deskCoord || [18, 2];
        const targetRoleName = data.agent?.roleName;

        const matchingPc = workstationPCs.find(
          (pc) => Math.hypot(pc.gx - targetDeskCoord[0], pc.gy - targetDeskCoord[1]) < 2.5
        ) || workstationPCs[0];

        if (matchingPc) {
          setSelectedPcId(matchingPc.id);
        }

        setAgents((prevAgents) => {
          const targetAgent = prevAgents.find((a) => a.role === targetRoleName) || prevAgents[0];
          if (!targetAgent) return prevAgents;
          setSelectedAgentId(targetAgent.id);

          return prevAgents.map((a) => {
            if (a.id === targetAgent.id) {
              return {
                ...a,
                gx: targetDeskCoord[0],
                gy: targetDeskCoord[1] + 1,
                targetGx: targetDeskCoord[0],
                targetGy: targetDeskCoord[1] + 1,
                targetPcId: matchingPc ? matchingPc.id : undefined,
                state: "using_pc" as const,
                stateTicks: 0,
                currentRoom: "workstations",
                currentActivity: `Memproses ${data.stepTitle || "Step"} via ${data.model}`,
                dialogue: {
                  agentId: a.id,
                  agentRole: a.role,
                  modelName: data.model || matchingPc.internalName,
                  reasonText: data.dialogue || `Mengeksekusi inferensi pada ${data.model}...`,
                  ticksRemaining: 180,
                },
              };
            }
            return a;
          });
        });
      }

      if (data.type === "STEP_COMPLETED") {
        setPipelineHud((prev) => {
          if (!prev) return prev;
          const updatedSteps = [...prev.stepsHistory];
          if (updatedSteps[data.stepIndex]) {
            updatedSteps[data.stepIndex] = {
              ...updatedSteps[data.stepIndex],
              status: "DONE",
              durationMs: data.durationMs,
              tokens: data.tokens,
              outputPreview: data.outputPreview,
            };
          }
          return {
            ...prev,
            stepsHistory: updatedSteps,
          };
        });

        setIngressToast(`✓ Step ${data.stepIndex + 1} Selesai (${data.durationMs}ms, ${data.tokens} tok)`);
        setTimeout(() => setIngressToast(null), 4000);
      }

      if (data.type === "PIPELINE_COMPLETED") {
        setPipelineHud((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: "COMPLETED",
            dialogue: data.dialogue,
            stepsHistory: prev.stepsHistory.map((s) => ({ ...s, status: "DONE" })),
          };
        });

        setIngressToast(`🎉 ${data.dialogue || "DAG PIPELINE BERHASIL 100%!"}`);
        setTimeout(() => setIngressToast(null), 8000);
      }
    },
    [workstationPCs]
  );

  // Connect Real-Time SSE Stream (PRD 5.2)
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: any = null;

    const connect = () => {
      try {
        es = new EventSource("/api/v1/events/stream");

        es.addEventListener("AGENT_COORDINATION", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            handleAgentCoordination(data);
          } catch {}
        });

        es.addEventListener("REQUEST_DISPATCH", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            handleLiveIngress(data);
          } catch {}
        });

        es.onerror = () => {
          if (es) es.close();
          reconnectTimer = setTimeout(connect, 3000);
        };
      } catch {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (es) es.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [handleAgentCoordination, handleLiveIngress]);

  // Dispatch Multi-Agent Pipeline Task to Fastify Core Runner
  const handleDispatchPipeline = async () => {
    setIsDispatchingPipeline(true);
    setIngressToast(language === "en" ? "⚡ Initializing Multi-Agent Pipeline..." : "⚡ Menginisiasi Pipeline Multi-Agen...");
    try {
      await api.dispatchPipeline({
        goal: "Rancang arsitektur sistem terdistribusi, pemodelan 4 UML, dan spesifikasi teknis.",
        title: "Orkestrasi Arsitektur & Spesifikasi Sistem",
      });
    } catch (err: any) {
      setIngressToast(`❌ Dispatch Error: ${err.message}`);
      setTimeout(() => setIngressToast(null), 5000);
    } finally {
      setIsDispatchingPipeline(false);
    }
  };

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
            if (ticks > 140) {
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

          // Case C: IDLE IN ROOM (SANTAI / ROUTINE WORK)
          const newTicks = agent.stateTicks + 1;
          const maxStay = 130 + ((agent.name.charCodeAt(0) || 10) % 50);

          if (newTicks > maxStay) {
            // During Day Shift: 35% chance to do routine engineering / audit work at workstation PC
            const shouldWorkRoutine = Math.random() < 0.35 && workstationPCs.length > 0;
            if (shouldWorkRoutine) {
              const myPreferredPc = workstationPCs.find(
                (pc) => agent.preferredModelId && agent.preferredModelId.toLowerCase().includes(pc.modelId.toLowerCase())
              ) || workstationPCs[Math.floor(Math.random() * workstationPCs.length)];

              if (myPreferredPc && myPreferredPc.status === "online") {
                const routineActivity = language === "en"
                  ? `Routine checks & maintenance on ${myPreferredPc.internalName}`
                  : `Pemeriksaan rutin & coding di ${myPreferredPc.internalName}`;
                return {
                  ...agent,
                  targetGx: myPreferredPc.gx,
                  targetGy: myPreferredPc.gy + 1,
                  targetPcId: myPreferredPc.id,
                  state: "walking",
                  stateTicks: 0,
                  currentActivity: routineActivity,
                  dialogue: undefined,
                };
              }
            }

            // Otherwise roam to relaxation spots
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
    // A. Outer Perimeter Building Walls (Indoor Enclosure: gy <= 13.5)
    // -----------------------------------------------------------------
    const wallH = 68;
    const topPt = toIso(0, 0, originX, originY);
    const rightPt = toIso(GRID_COLS, 0, originX, originY);
    const leftPt = toIso(0, GRID_ROWS, originX, originY);
    const bldgLeftPt = toIso(0, 13.5, originX, originY);
    const bldgRightPt = toIso(GRID_COLS, 13.5, originX, originY);

    // North-West Wall (Facing South-East) - Across the entire back from top to right
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

    // South-West Wall (Facing North-East) - Only down to the building front (gy = 13.5)
    ctx.fillStyle = isDark ? "#151C2A" : "#C4B59D";
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(bldgLeftPt.x, bldgLeftPt.y);
    ctx.lineTo(bldgLeftPt.x, bldgLeftPt.y - wallH);
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
    ctx.lineTo(bldgLeftPt.x, bldgLeftPt.y - wallH);
    ctx.stroke();

    // Master Signage Banner on Back Wall
    ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
    ctx.font = "bold 11px 'Silkscreen', monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚡ THEGATE AI URBAN TECH HEADQUARTERS & RESORT (THE SIMS EDITION)", topPt.x + 160, topPt.y - wallH + 26);

    // -----------------------------------------------------------------
    // B. Floor Foundation & Tile Textures (Indoor Office vs Outdoor Front Yard)
    // -----------------------------------------------------------------
    const defaultHallA = isDark ? "#1B2230" : "#FAF4E8";
    const defaultHallB = isDark ? "#161D2A" : "#F4ECE0";

    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        const pt = toIso(gx, gy, originX, originY);
        const isAlt = (gx + gy) % 2 === 0;

        // OUTDOOR FRONT YARD (gy >= 14) vs INDOOR OFFICE (gy < 14)
        const isOutdoor = gy >= 14;

        // 1. City Street & Sidewalk at the front perimeter
        const isCityStreet = gy >= 21;
        // 2. Grand Entrance Paved Flagstone Walkway (leading to front doors)
        const isMainWalkway = isOutdoor && !isCityStreet && gx >= 12 && gx <= 15;
        // 3. Luxury Resort Swimming Pool (Front Right)
        const isPoolWater = isOutdoor && !isCityStreet && gx >= 18 && gx <= 26 && gy >= 16 && gy <= 20;
        // 4. Travertine Stone Pool Deck
        const isPoolDeck = isOutdoor && !isCityStreet && gx >= 16 && gx <= 27 && !isPoolWater && !isMainWalkway;
        // 5. Lush Green Tropical Garden Lawn (Front Left)
        const isGardenGrass = isOutdoor && !isCityStreet && gx < 12;

        let tileColor = isAlt ? defaultHallA : defaultHallB;

        if (isCityStreet) {
          tileColor = isAlt ? "#1E293B" : "#0F172A";
        } else if (isPoolWater) {
          tileColor = isDark
            ? (isAlt ? "#0284C7" : "#0369A1")
            : (isAlt ? "#38BDF8" : "#0EA5E9");
        } else if (isPoolDeck) {
          tileColor = isDark
            ? (isAlt ? "#334155" : "#1E293B")
            : (isAlt ? "#F8FAFC" : "#E2E8F0");
        } else if (isMainWalkway) {
          tileColor = isDark
            ? (isAlt ? "#475569" : "#334155")
            : (isAlt ? "#E2E8F0" : "#CBD5E1");
        } else if (isGardenGrass) {
          tileColor = isDark
            ? (isAlt ? "#15803D" : "#166534")
            : (isAlt ? "#22C55E" : "#16A34A");
        } else {
          // Indoor Rooms
          for (const zone of ROOM_ZONES) {
            if (gx >= zone.x1 && gx <= zone.x2 && gy >= zone.y1 && gy <= zone.y2) {
              tileColor = isDark
                ? (isAlt ? zone.darkFloorA : zone.darkFloorB)
                : (isAlt ? zone.lightFloorA : zone.lightFloorB);
              break;
            }
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

        // Shimmering Pool Waves
        if (isPoolWater) {
          const waveShift = ((animationTick * 0.35) + gx * 2 + gy * 3) % 8;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pt.x - 7, pt.y + 11 + (waveShift > 4 ? 1 : -1));
          ctx.lineTo(pt.x + 7, pt.y + 11 + (waveShift > 4 ? -1 : 1));
          ctx.stroke();
        } else if (isGardenGrass) {
          // Scattered Pixel Garden Flowers
          if ((gx * 7 + gy * 13) % 4 === 0) {
            ctx.fillStyle = (gx + gy) % 2 === 0 ? "#EF4444" : "#FACC15";
            ctx.fillRect(pt.x - 2, pt.y + 9, 3, 3);
          } else if ((gx * 11 + gy * 3) % 6 === 0) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(pt.x + 1, pt.y + 8, 2, 2);
          }
          ctx.strokeStyle = isDark ? "rgba(20, 83, 45, 0.4)" : "rgba(22, 101, 52, 0.3)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else if (isCityStreet) {
          // Yellow dashed road center divider
          if (gx % 3 === 0 && gy === 21) {
            ctx.fillStyle = "#FACC15";
            ctx.fillRect(pt.x - 4, pt.y + 10, 8, 2);
          }
          ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(61, 49, 38, 0.12)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
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
    // D. True Solid 3D Partition Walls Inside the Building (gy <= 13)
    // -----------------------------------------------------------------
    const drawSolid3DWall = (
      gx1: number,
      gy1: number,
      gx2: number,
      gy2: number,
      orientation: "x" | "y",
      height: number = 28,
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

    // Partition 1: Server Vault (Room 02) & Boardroom (Room 05) - Along X at gy = 5.5
    drawSolid3DWall(1, 5.5, 4.2, 5.5, "x", 28, "#00E5FF");
    drawSolid3DWall(5.5, 5.5, 7.5, 5.5, "x", 28, "#00E5FF");

    // Partition 2: Server Vault & Director Suite (Room 03) - Along Y at gx = 7.5
    drawSolid3DWall(7.5, 1, 7.5, 3.2, "y", 28, "#38BDF8");
    drawSolid3DWall(7.5, 4.5, 7.5, 5.5, "y", 28, "#38BDF8");

    // Partition 3: Director Suite & AI Workstations (Room 04) - Along Y at gx = 15.5
    drawSolid3DWall(15.5, 1, 15.5, 3.2, "y", 28, "#F59E0B");
    drawSolid3DWall(15.5, 4.5, 15.5, 5.5, "y", 28, "#F59E0B");

    // Partition 4: Boardroom (Room 05) & Bistro (Room 07) - Along X at gy = 9.5
    drawSolid3DWall(1, 9.5, 4.5, 9.5, "x", 28, "#C084FC");
    drawSolid3DWall(6.0, 9.5, 9.5, 9.5, "x", 28, "#C084FC");

    // Partition 5: Boardroom/Bistro & Focus Pods/Lobby along Y at gx = 9.5
    drawSolid3DWall(9.5, 6, 9.5, 7.8, "y", 28, "#60A5FA");
    drawSolid3DWall(9.5, 11, 9.5, 13.5, "y", 28, "#FB923C");

    // Partition 6: Focus Pods & Workstations along Y at gx = 15.5
    drawSolid3DWall(15.5, 6, 15.5, 8.5, "y", 28, "#60A5FA");

    // Partition 7: Lobby & Workstations along Y at gx = 15.5
    drawSolid3DWall(15.5, 9.5, 15.5, 11.2, "y", 28, "#34D399");

    // Building Front Glass Facade at gy = 13.8 (Separating Inside from Front Yard)
    const facadeH = 34;
    const drawGlassFacade = (x1: number, x2: number) => {
      const p1 = toIso(x1, 13.8, originX, originY);
      const p2 = toIso(x2, 13.8, originX, originY);

      ctx.fillStyle = isDark ? "rgba(30, 58, 138, 0.4)" : "rgba(186, 230, 253, 0.4)";
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p2.x, p2.y - facadeH);
      ctx.lineTo(p1.x, p1.y - facadeH);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isDark ? "#38BDF8" : "#0284C7";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const panes = Math.floor((x2 - x1) * 1.5);
      for (let i = 1; i < panes; i++) {
        const fx = x1 + (x2 - x1) * (i / panes);
        const pt = toIso(fx, 13.8, originX, originY);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x, pt.y - facadeH);
        ctx.stroke();
      }
    };

    drawGlassFacade(0.5, 12.0);
    drawGlassFacade(15.0, 27.5);

    // Automatic Sliding Glass Entrance Door at gx: 12.0 .. 15.0
    const doorCenter = toIso(13.5, 13.8, originX, originY);
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 2;
    ctx.strokeRect(doorCenter.x - 22, doorCenter.y - 32, 44, 32);
    ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
    ctx.fillRect(doorCenter.x - 18, doorCenter.y - 2, 36, 4);

    // Entrance Marquee Sign
    ctx.fillStyle = isDark ? "#0F172A" : "#FFFFFF";
    ctx.fillRect(doorCenter.x - 46, doorCenter.y - 44, 92, 11);
    ctx.strokeStyle = isDark ? "#38BDF8" : "#0284C7";
    ctx.lineWidth = 1;
    ctx.strokeRect(doorCenter.x - 46, doorCenter.y - 44, 92, 11);
    ctx.fillStyle = isDark ? "#38BDF8" : "#0369A1";
    ctx.font = "bold 6px 'Silkscreen', monospace";
    ctx.textAlign = "center";
    ctx.fillText("🏢 THEGATE TECH HEADQUARTERS", doorCenter.x, doorCenter.y - 36);

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

    drawDoorThreshold(5, 5, isDark ? "#00E5FF" : "#1D4ED8");
    drawDoorThreshold(7.5, 4, isDark ? "#38BDF8" : "#0284C7");
    drawDoorThreshold(15.5, 4, isDark ? "#F59E0B" : "#D97706");
    drawDoorThreshold(6, 9.5, isDark ? "#C084FC" : "#7C3AED");
    drawDoorThreshold(12, 9.5, isDark ? "#60A5FA" : "#2563EB");
    drawDoorThreshold(15.5, 9, isDark ? "#34D399" : "#059669");
    drawDoorThreshold(13.5, 14, isDark ? "#FFB71B" : "#B45309");

    // The Sims Urban Estate Perimeter Wrought-Iron Fence with Brick Pillars
    const drawFence = (x1: number, x2: number, gy: number) => {
      const p1 = toIso(x1, gy, originX, originY);
      const p2 = toIso(x2, gy, originX, originY);
      const fH = 18;

      ctx.strokeStyle = isDark ? "#64748B" : "#1E293B";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y - fH);
      ctx.lineTo(p2.x, p2.y - fH);
      ctx.moveTo(p1.x, p1.y - 3);
      ctx.lineTo(p2.x, p2.y - 3);
      ctx.stroke();

      ctx.lineWidth = 1;
      const count = Math.floor((x2 - x1) * 3);
      for (let i = 0; i <= count; i++) {
        const fx = x1 + (x2 - x1) * (i / count);
        const pt = toIso(fx, gy, originX, originY);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x, pt.y - fH - (i % 2 === 0 ? 3 : 1));
        ctx.stroke();
      }
    };

    drawFence(0.5, 12.0, 21.5);
    drawFence(15.0, 27.5, 21.5);

    // Brick Pillars at regular posts
    const pillarGXs = [0.5, 4.0, 8.0, 12.0, 15.0, 19.0, 23.0, 27.5];
    pillarGXs.forEach((gx) => {
      const pt = toIso(gx, 21.5, originX, originY);
      const pilW = 8;
      const pilH = 24;
      ctx.fillStyle = isDark ? "#78350F" : "#B45309";
      ctx.fillRect(pt.x - pilW / 2, pt.y - pilH, pilW, pilH);
      ctx.strokeStyle = "#451A03";
      ctx.lineWidth = 1;
      ctx.strokeRect(pt.x - pilW / 2, pt.y - pilH, pilW, pilH);
      ctx.fillStyle = isDark ? "#CBD5E1" : "#E2E8F0";
      ctx.fillRect(pt.x - (pilW + 2) / 2, pt.y - pilH - 3, pilW + 2, 3);
      ctx.fillStyle = "#FFB71B";
      ctx.fillRect(pt.x - 1, pt.y - pilH - 6, 2, 3);
    });

    // Grand Entrance Security Gate & Arch
    const gatePt = toIso(13.5, 21.5, originX, originY);
    ctx.fillStyle = isDark ? "#0F172A" : "#FFFFFF";
    ctx.fillRect(gatePt.x - 30, gatePt.y - 40, 60, 14);
    ctx.strokeStyle = "#FFB71B";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gatePt.x - 30, gatePt.y - 40, 60, 14);
    ctx.fillStyle = "#FFB71B";
    ctx.font = "bold 7px 'Silkscreen', monospace";
    ctx.textAlign = "center";
    ctx.fillText("⛩️ THEGATE ESTATE", gatePt.x, gatePt.y - 30);

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

    // ROOM 01: GRAND RECEPTION LOBBY & VISITOR LOUNGE (gx: 10..15, gy: 9..13)
    const recepDeskPt = toIso(12.5, 11, originX, originY);
    ctx.fillStyle = isDark ? "#3E2616" : "#8C7B65";
    ctx.fillRect(recepDeskPt.x - 26, recepDeskPt.y - 10, 52, 18);
    ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FRONT RECEPTION", recepDeskPt.x, recepDeskPt.y - 14);

    const sofaPt = toIso(14, 12.5, originX, originY);
    ctx.fillStyle = isDark ? "#5C3A24" : "#A67C52";
    ctx.fillRect(sofaPt.x - 22, sofaPt.y - 8, 44, 16);
    ctx.fillRect(sofaPt.x - 22, sofaPt.y - 15, 10, 15);
    ctx.strokeStyle = "#2D1B10";
    ctx.lineWidth = 1;
    ctx.strokeRect(sofaPt.x - 22, sofaPt.y - 8, 44, 16);

    const coffeeTablePt = toIso(11, 12.5, originX, originY);
    ctx.fillStyle = isDark ? "#1E293B" : "#E2E8F0";
    ctx.fillRect(coffeeTablePt.x - 12, coffeeTablePt.y - 6, 24, 12);
    ctx.strokeStyle = "#38BDF8";
    ctx.strokeRect(coffeeTablePt.x - 12, coffeeTablePt.y - 6, 24, 12);

    // ROOM 02: INGRESS SERVER VAULT (gx: 1..7, gy: 1..5)
    [toIso(2.5, 2.2, originX, originY), toIso(4.5, 2.2, originX, originY), toIso(6.5, 2.2, originX, originY)].forEach((sPt, idx) => {
      ctx.fillStyle = isDark ? "#0A1017" : "#1E293B";
      ctx.fillRect(sPt.x - 14, sPt.y - 42, 28, 46);
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sPt.x - 14, sPt.y - 42, 28, 46);

      for (let ly = sPt.y - 36; ly < sPt.y - 4; ly += 6) {
        ctx.fillStyle = idx === 0 ? "#00E5FF" : (idx === 1 ? "#34D399" : "#C084FC");
        ctx.fillRect(sPt.x - 10, ly, 6, 2.5);
        ctx.fillStyle = (animationTick + idx) % 4 < 2 ? "#34D399" : "#FFB71B";
        ctx.fillRect(sPt.x - 2, ly, 8, 2.5);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(sPt.x + 8, ly, 4, 2.5);
      }
      ctx.fillStyle = "#00E5FF";
      ctx.font = "bold 6px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`RACK 0${idx + 1}`, sPt.x, sPt.y - 45);
    });

    // ROOM 03: EXECUTIVE DIRECTOR SUITE (gx: 8..15, gy: 1..5)
    const execDeskPt = toIso(11.5, 3.2, originX, originY);
    ctx.fillStyle = isDark ? "#5C3622" : "#8B5A3C";
    ctx.fillRect(execDeskPt.x - 28, execDeskPt.y - 12, 56, 18);
    ctx.fillStyle = isDark ? "#FFB71B" : "#FAF4E8";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DIRECTOR SUITE", execDeskPt.x, execDeskPt.y - 16);

    const shelfPt = toIso(9.5, 1.8, originX, originY);
    ctx.fillStyle = isDark ? "#3D2012" : "#6E452B";
    ctx.fillRect(shelfPt.x - 18, shelfPt.y - 32, 36, 34);
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(shelfPt.x - 14, shelfPt.y - 28, 28, 2);
    ctx.fillRect(shelfPt.x - 14, shelfPt.y - 18, 28, 2);
    ctx.fillRect(shelfPt.x - 14, shelfPt.y - 8, 28, 2);

    // ROOM 05: BOARDROOM CONFERENCE SUITE (gx: 1..9, gy: 6..9)
    const boardTablePt = toIso(5, 7.5, originX, originY);
    ctx.fillStyle = isDark ? "#382952" : "#64748B";
    ctx.fillRect(boardTablePt.x - 38, boardTablePt.y - 16, 76, 28);
    ctx.strokeStyle = isDark ? "#C084FC" : "#475569";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boardTablePt.x - 38, boardTablePt.y - 16, 76, 28);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("AI ARBITRAGE WAR ROOM", boardTablePt.x, boardTablePt.y - 4);

    for (let c = -24; c <= 24; c += 12) {
      ctx.fillStyle = isDark ? "#FFB71B" : "#B45309";
      ctx.fillRect(boardTablePt.x + c - 3, boardTablePt.y - 20, 6, 4);
      ctx.fillRect(boardTablePt.x + c - 3, boardTablePt.y + 13, 6, 4);
    }

    // ROOM 06: SOUNDPROOF FOCUS PODS (gx: 10..15, gy: 6..8)
    const pod1Pt = toIso(11, 7, originX, originY);
    const pod2Pt = toIso(13.5, 7, originX, originY);
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

    // ROOM 07: KITCHEN, PANTRY & BISTRO (gx: 1..9, gy: 10..13)
    const cafeBarPt = toIso(4, 10.5, originX, originY);
    ctx.fillStyle = isDark ? "#8C4318" : "#B45309";
    ctx.fillRect(cafeBarPt.x - 34, cafeBarPt.y - 10, 68, 16);
    ctx.fillStyle = "#D97706";
    ctx.fillRect(cafeBarPt.x - 22, cafeBarPt.y - 24, 16, 14);
    ctx.fillStyle = isDark ? "#FEF3C7" : "#FFFBEB";
    ctx.font = "bold 7px monospace";
    ctx.fillText("☕ ESPRESSO BAR", cafeBarPt.x - 14, cafeBarPt.y - 27);

    const fridgePt = toIso(2, 10.5, originX, originY);
    ctx.fillStyle = isDark ? "#64748B" : "#CBD5E1";
    ctx.fillRect(fridgePt.x - 10, fridgePt.y - 30, 20, 32);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(fridgePt.x - 10, fridgePt.y - 30, 20, 32);

    const diningPt = toIso(6, 12, originX, originY);
    ctx.fillStyle = isDark ? "#9A6340" : "#A67C52";
    ctx.beginPath();
    ctx.ellipse(diningPt.x, diningPt.y, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? "#FB923C" : "#B45309";
    ctx.stroke();

    const vendingPt = toIso(8.5, 10.5, originX, originY);
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(vendingPt.x - 10, vendingPt.y - 30, 20, 32);
    ctx.strokeStyle = "#F59E0B";
    ctx.strokeRect(vendingPt.x - 10, vendingPt.y - 30, 20, 32);
    ctx.fillStyle = animationTick % 4 < 2 ? "#34D399" : "#38BDF8";
    ctx.fillRect(vendingPt.x - 7, vendingPt.y - 24, 14, 12);

    // OUTDOOR FRONT YARD (gy >= 14): THE SIMS LUXURY RESORT POOL & TROPICAL GARDEN
    // 1. Chrome Pool Ladder at (18.5, 15)
    const ladderPt = toIso(18.5, 15, originX, originY);
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ladderPt.x - 6, ladderPt.y - 10);
    ctx.lineTo(ladderPt.x - 6, ladderPt.y + 6);
    ctx.moveTo(ladderPt.x + 6, ladderPt.y - 10);
    ctx.lineTo(ladderPt.x + 6, ladderPt.y + 6);
    ctx.moveTo(ladderPt.x - 6, ladderPt.y - 3);
    ctx.lineTo(ladderPt.x + 6, ladderPt.y - 3);
    ctx.moveTo(ladderPt.x - 6, ladderPt.y + 2);
    ctx.lineTo(ladderPt.x + 6, ladderPt.y + 2);
    ctx.stroke();

    // 2. Cute Inflatable Floating Duck on Pool Water
    const floatBob = Math.sin(animationTick * 0.12) * 2;
    const floatPt = toIso(21.5, 17.5, originX, originY);
    const floatY = floatPt.y + 6 + floatBob;
    ctx.fillStyle = "#FDE047";
    ctx.beginPath();
    ctx.ellipse(floatPt.x, floatY, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#CA8A04";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isDark ? "#0284C7" : "#0EA5E9";
    ctx.beginPath();
    ctx.ellipse(floatPt.x, floatY, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FDE047";
    ctx.beginPath();
    ctx.arc(floatPt.x + 9, floatY - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#EA580C";
    ctx.fillRect(floatPt.x + 12, floatY - 6, 4, 2.5);

    // 3. Poolside Sun Loungers (Kursi Santai Jemur)
    const lounger1Pt = toIso(17, 16.5, originX, originY);
    const lounger2Pt = toIso(17, 18.5, originX, originY);
    [lounger1Pt, lounger2Pt].forEach((lPt, idx) => {
      ctx.fillStyle = isDark ? "#E2E8F0" : "#FFFFFF";
      ctx.fillRect(lPt.x - 13, lPt.y - 4, 26, 9);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      ctx.strokeRect(lPt.x - 13, lPt.y - 4, 26, 9);
      ctx.fillStyle = idx === 0 ? "#38BDF8" : "#FB923C";
      ctx.fillRect(lPt.x - 13, lPt.y - 7, 8, 7);
      ctx.strokeRect(lPt.x - 13, lPt.y - 7, 8, 7);
    });

    // 4. Striped Beach Parasol Umbrella (Payung Pantai)
    const umbrellaPt = toIso(16.5, 15, originX, originY);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(umbrellaPt.x + 6, umbrellaPt.y + 4, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(umbrellaPt.x, umbrellaPt.y + 4);
    ctx.lineTo(umbrellaPt.x, umbrellaPt.y - 32);
    ctx.stroke();
    const uY = umbrellaPt.y - 32;
    ctx.fillStyle = "#F97316";
    ctx.beginPath();
    ctx.arc(umbrellaPt.x, uY, 22, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#C2410C";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(umbrellaPt.x - 7, uY);
    ctx.lineTo(umbrellaPt.x, uY - 22);
    ctx.lineTo(umbrellaPt.x + 7, uY);
    ctx.closePath();
    ctx.fill();

    // 5. Potted Tropical Palm / Monstera Trees in Garden
    [toIso(2, 19, originX, originY), toIso(10, 19, originX, originY)].forEach((palmPt) => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.ellipse(palmPt.x + 4, palmPt.y + 4, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#78350F";
      ctx.fillRect(palmPt.x - 3, palmPt.y - 24, 6, 26);
      ctx.fillStyle = isDark ? "#15803D" : "#22C55E";
      ctx.beginPath();
      ctx.arc(palmPt.x, palmPt.y - 28, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isDark ? "#16A34A" : "#4ADE80";
      ctx.beginPath();
      ctx.arc(palmPt.x - 5, palmPt.y - 34, 10, 0, Math.PI * 2);
      ctx.arc(palmPt.x + 5, palmPt.y - 34, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Wooden Garden Park Bench at (5, 18)
    const benchPt = toIso(5, 18, originX, originY);
    ctx.fillStyle = "#92400E";
    ctx.fillRect(benchPt.x - 14, benchPt.y - 7, 28, 10);
    ctx.strokeStyle = "#451A03";
    ctx.lineWidth = 1;
    ctx.strokeRect(benchPt.x - 14, benchPt.y - 7, 28, 10);

    // 7. Outdoor Stone BBQ Grill with animated smoke puffs
    const bbqPt = toIso(8, 16.5, originX, originY);
    ctx.fillStyle = "#475569";
    ctx.fillRect(bbqPt.x - 10, bbqPt.y - 18, 20, 20);
    ctx.strokeStyle = "#1E293B";
    ctx.strokeRect(bbqPt.x - 10, bbqPt.y - 18, 20, 20);
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(bbqPt.x - 8, bbqPt.y - 16, 16, 6);
    const smokeY = bbqPt.y - 22 - ((animationTick * 0.4) % 16);
    const smokeAlpha = 1 - (((animationTick * 0.4) % 16) / 16);
    ctx.fillStyle = `rgba(203, 213, 225, ${smokeAlpha})`;
    ctx.beginPath();
    ctx.arc(bbqPt.x - 1, smokeY, 3, 0, Math.PI * 2);
    ctx.arc(bbqPt.x + 3, smokeY - 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // 8. Vintage Streetlamp with soft amber glow
    const lampPt = toIso(3, 16.5, originX, originY);
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lampPt.x, lampPt.y);
    ctx.lineTo(lampPt.x, lampPt.y - 36);
    ctx.stroke();
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.arc(lampPt.x, lampPt.y - 38, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
    ctx.beginPath();
    ctx.arc(lampPt.x, lampPt.y - 38, 14, 0, Math.PI * 2);
    ctx.fill();

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

      // Model Identification Tag Banner (Vibrant Multi-Provider Badge)
      ctx.fillStyle = isDark ? "#0F172A" : "#FFFFFF";
      ctx.strokeStyle = pc.screenGlow;
      ctx.lineWidth = 1.5;

      const formatModelTag = (name: string) => {
        if (!name || name.includes("Standby")) return "STANDBY";
        let prov = "";
        let model = name;
        if (name.includes("/")) {
          const parts = name.split("/");
          prov = parts[0].toUpperCase();
          model = parts.slice(1).join("/");
        }
        const provMap: Record<string, string> = {
          NVIDIA: "NV",
          OPENROUTER: "OR",
          CLOUDFLARE: "CF",
          DEEPSEEK: "DS",
          ANTIGRAVITY: "AG",
          GEMINI: "GEM",
          GROQ: "GROQ",
          KIRO: "KR",
          MIMO: "MIMO",
        };
        const pTag = provMap[prov] || prov;

        let clean = model
          .replace(/^@cf\/meta\//i, "")
          .replace(/^minimaxai\//i, "")
          .replace(/^meta-llama\//i, "")
          .replace(/-instruct$/i, "")
          .replace(/-versatile$/i, "")
          .replace(/^gemini-/i, "")
          .replace(/^claude-/i, "")
          .replace(/-thinking$/i, "");

        if (clean.toLowerCase().includes("flash-high")) clean = "Flash-High";
        else if (clean.toLowerCase().includes("sonnet")) clean = "Sonnet 4.6";
        else if (clean.toLowerCase().includes("opus")) clean = "Opus 5.5";
        else if (clean.toLowerCase().includes("deepseek-v4")) clean = "DS-v4 Pro";
        else if (clean.toLowerCase().includes("llama-3.3")) clean = "LLaMA 3.3";
        else if (clean.toLowerCase().includes("llama-3.2")) clean = "LLaMA 3.2";
        else if (clean.toLowerCase().includes("minimax")) clean = "MiniMax 2.7";
        else if (clean.toLowerCase().includes("glm-5.3")) clean = "GLM 5.3";
        else if (clean.toLowerCase().includes("mimo-v2.6")) clean = "MiMo Pro";
        else if (clean.toLowerCase().includes("auto")) clean = "Auto Route";

        if (clean.length > 10) clean = clean.slice(0, 9) + "…";
        return pTag ? `[${pTag}] ${clean}` : clean;
      };

      const displayTag = formatModelTag(pc.internalName);
      const tagW = Math.max(78, displayTag.length * 6 + 10);

      ctx.strokeRect(pt.x - tagW / 2, monY - 14, tagW, 13);
      ctx.fillRect(pt.x - tagW / 2, monY - 14, tagW, 13);

      ctx.fillStyle = isDark ? pc.screenGlow : "#0F172A";
      ctx.font = "bold 7px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillText(displayTag, pt.x, monY - 5);
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

      const isWalking = agent.state === "walking";
      const isTyping = agent.state === "using_pc";
      const stride = isWalking ? Math.sin((agent.walkFrame || 0) * (Math.PI / 2)) * 3 : 0;
      const bob = isWalking ? (agent.walkFrame % 2 === 0 ? -2 : 0) : 0;
      const cy = pt.y - 12 + bob;

      // Legs / Seated pose
      ctx.fillStyle = isDark ? "#0F172A" : "#334155";
      if (isTyping) {
        // Seated knees bent towards desk
        ctx.fillRect(pt.x - 5, cy + 10, 10, 5);
      } else {
        // Walking stride
        ctx.fillRect(pt.x - 4, cy + 12 - stride, 3, 6 + stride);
        ctx.fillRect(pt.x + 1, cy + 12 + stride, 3, 6 - stride);
      }

      ctx.fillStyle = agent.shirtColor;
      ctx.fillRect(pt.x - 6, cy + 4, 12, 9);
      ctx.strokeStyle = isDark ? "#0F172A" : "#1E293B";
      ctx.lineWidth = 1;
      ctx.strokeRect(pt.x - 6, cy + 4, 12, 9);

      // Arms (with walking swing or laptop typing)
      if (isTyping) {
        const tapL = Math.sin(animationTick * 0.7) * 2;
        const tapR = Math.cos(animationTick * 0.7) * 2;
        ctx.fillStyle = agent.shirtColor;
        ctx.fillRect(pt.x - 8, cy + 5, 3, 4);
        ctx.fillRect(pt.x + 5, cy + 5, 3, 4);
        ctx.fillStyle = "#F6D5B8";
        ctx.fillRect(pt.x - 6, cy + 8 + tapL, 4, 3);
        ctx.fillRect(pt.x + 2, cy + 8 + tapR, 4, 3);

        // Neon Matrix Code Sparks rising from laptop
        const sparkShift = (animationTick * 2 + agent.gx * 4) % 18;
        const sparkAlpha = Math.max(0, 1 - (sparkShift / 18));
        ctx.fillStyle = `rgba(52, 211, 153, ${sparkAlpha})`;
        ctx.font = "bold 8px monospace";
        ctx.fillText(animationTick % 4 === 0 ? "<>" : (animationTick % 4 === 1 ? "01" : "λ"), pt.x + (animationTick % 3 - 1) * 6, cy - 2 - sparkShift);
      } else if (isWalking) {
        const armSwing = Math.sin((agent.walkFrame || 0) * (Math.PI / 2)) * 2;
        ctx.fillStyle = agent.shirtColor;
        ctx.fillRect(pt.x - 8, cy + 5 - armSwing, 3, 6);
        ctx.fillRect(pt.x + 5, cy + 5 + armSwing, 3, 6);
      }

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

      // -------------------------------------------------------------
      // Crisp Role Label Badge Floating Over Every NPC
      // -------------------------------------------------------------
      const ROLE_BADGES: Record<string, { short: string; color: string; border: string }> = {
        "Lead Fullstack Engineer": { short: "ARCHITECT", color: "#38BDF8", border: "#0284C7" },
        "Security Auditor & Systems Architect": { short: "SEC AUDITOR", color: "#F43F5E", border: "#E11D48" },
        "Data Intelligence Analyst": { short: "DATA INTEL", color: "#34D399", border: "#059669" },
        "Creative Copywriter & Brand Strategist": { short: "COPYWRITER", color: "#C084FC", border: "#9333EA" },
        "Operations Assistant": { short: "OPERATIONS", color: "#FBBF24", border: "#D97706" },
      };

      const getRoleShort = (roleStr: string) => {
        if (ROLE_BADGES[roleStr]) return ROLE_BADGES[roleStr];
        const lower = (roleStr || "").toLowerCase();
        if (lower.includes("architect") || lower.includes("fullstack")) return { short: "ARCHITECT", color: "#38BDF8", border: "#0284C7" };
        if (lower.includes("security") || lower.includes("auditor")) return { short: "SEC AUDITOR", color: "#F43F5E", border: "#E11D48" };
        if (lower.includes("data") || lower.includes("analyst")) return { short: "DATA INTEL", color: "#34D399", border: "#059669" };
        if (lower.includes("copy") || lower.includes("brand")) return { short: "COPYWRITER", color: "#C084FC", border: "#9333EA" };
        if (lower.includes("assistant") || lower.includes("operations")) return { short: "OPERATIONS", color: "#FBBF24", border: "#D97706" };
        return { short: (roleStr || "AI AGENT").slice(0, 9).toUpperCase(), color: "#FFB71B", border: "#B45309" };
      };

      const badgeInfo = getRoleShort(agent.role);
      const badgeW = Math.max(54, badgeInfo.short.length * 6 + 10);
      const badgeH = 11;
      const badgeX = pt.x - badgeW / 2;
      const badgeY = cy - 23;

      ctx.save();
      ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)";
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = isSelected ? "#FFB71B" : (agent.state === "using_pc" ? "#34D399" : badgeInfo.border);
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.fillStyle = isSelected ? "#FFB71B" : badgeInfo.color;
      ctx.font = "bold 7px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillText(badgeInfo.short, pt.x, badgeY + 8);
      ctx.restore();

      // -------------------------------------------------------------
      // The Sims Iconic Green Plumbob (Rotating / Bobbing 3D Diamond)
      // -------------------------------------------------------------
      const isSpeaking = Boolean(activeSpeaker && activeSpeaker.id === agent.id);
      const isWorking = agent.state === "using_pc";

      if (isSelected || isSpeaking || isWorking) {
        const pbBob = Math.sin((animationTick * 0.22) + (agent.gx * 0.5)) * 3;
        const pbY = cy - 35 + pbBob;
        const pbW = 4.5;
        const pbH = 8;

        ctx.save();
        ctx.fillStyle = isWorking ? "#22C55E" : (isSpeaking ? "#4ADE80" : "#10B981");
        ctx.strokeStyle = "#064E3B";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pt.x, pbY - pbH);
        ctx.lineTo(pt.x + pbW, pbY);
        ctx.lineTo(pt.x, pbY + 2);
        ctx.lineTo(pt.x - pbW, pbY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isWorking ? "#86EFAC" : (isSpeaking ? "#A7F3D0" : "#34D399");
        ctx.beginPath();
        ctx.moveTo(pt.x - pbW, pbY);
        ctx.lineTo(pt.x + pbW, pbY);
        ctx.lineTo(pt.x, pbY + pbH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // The Sims Swimming Effect: Water Submersion & Ripples
      if (agent.state === "swimming") {
        const ripShift = (animationTick * 0.3) % 6;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(pt.x, cy + 12, 11 + ripShift, 5.5 + ripShift * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // The Sims Sunbathing Sunglasses
      if (agent.state === "sunbathing") {
        ctx.fillStyle = "#0F172A";
        ctx.fillRect(pt.x - 4, cy - 3, 9, 3);
        ctx.fillStyle = "#38BDF8";
        ctx.fillRect(pt.x - 3, cy - 2, 2, 1);
        ctx.fillRect(pt.x + 2, cy - 2, 2, 1);
      }

      // The Sims Playful Thought Bubbles for Relaxing Agents
      if (!agent.dialogue && (agent.state === "cafe" || agent.state === "arcade" || agent.state === "swimming" || agent.state === "sunbathing" || agent.state === "garden")) {
        const emojiMap: Record<string, string> = {
          cafe: "☕",
          arcade: "🕹️",
          swimming: "🏊",
          sunbathing: "🏖️",
          garden: "🌸",
        };
        const em = emojiMap[agent.state] || "💭";
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.arc(pt.x + 8, cy - 14, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1E293B";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#000000";
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(em, pt.x + 8, cy - 11);
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
    // Interactive Prop Selection Indicator & Glowing Ring
    // -----------------------------------------------------------------
    if (selectedObjectId) {
      const activeProp = INTERACTIVE_PROPS.find((p) => p.id === selectedObjectId);
      if (activeProp) {
        const pPt = toIso(activeProp.gx, activeProp.gy, originX, originY);
        const pulse = Math.sin(animationTick * 0.18) * 4;
        ctx.save();
        ctx.strokeStyle = "#FFB71B";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(pPt.x, pPt.y, (activeProp.radius || 30) + pulse, ((activeProp.radius || 30) / 2) + pulse * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Floating retro pill label
        ctx.fillStyle = isDark ? "#0F172A" : "#FFFFFF";
        ctx.fillRect(pPt.x - 52, pPt.y - 42, 104, 15);
        ctx.strokeStyle = "#FFB71B";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pPt.x - 52, pPt.y - 42, 104, 15);
        ctx.fillStyle = "#FFB71B";
        ctx.font = "bold 7px 'Silkscreen', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`✨ ${activeProp.icon} ${activeProp.name.slice(0, 16)}`, pPt.x, pPt.y - 32);
        ctx.restore();
      }
    }

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

      // 1. Check Interactive Props Touch
      for (const prop of INTERACTIVE_PROPS) {
        const pt = toIso(prop.gx, prop.gy, originX, originY);
        if (Math.hypot(clickX - pt.x, clickY - pt.y) < (prop.radius || 32)) {
          setSelectedObjectId(prop.id);
          setSelectedPcId(null);
          return;
        }
      }

      workstationPCs.forEach((ws) => {
        const pt = toIso(ws.gx, ws.gy, originX, originY);
        if (Math.hypot(clickX - pt.x, clickY - pt.y) < 32) {
          setSelectedPcId(ws.id);
          setSelectedObjectId(null);
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

    // 1. Check Interactive Props Click
    for (const prop of INTERACTIVE_PROPS) {
      const pt = toIso(prop.gx, prop.gy, originX, originY);
      if (Math.hypot(clickX - pt.x, clickY - pt.y) < (prop.radius || 30)) {
        setSelectedObjectId(prop.id);
        setSelectedPcId(null);
        return;
      }
    }

    // 2. Check Workstations
    let clickedPc = false;
    workstationPCs.forEach((ws) => {
      const pt = toIso(ws.gx, ws.gy, originX, originY);
      if (Math.hypot(clickX - pt.x, clickY - pt.y) < 32) {
        setSelectedPcId(ws.id);
        setSelectedObjectId(null);
        clickedPc = true;
        if (onSelectModel && ws.modelId !== "offline") {
          onSelectModel(ws.modelId);
        }
      }
    });
    if (clickedPc) return;

    // 3. Check Agents
    agents.forEach((ag) => {
      const pt = toIso(ag.gx, ag.gy, originX, originY);
      if (Math.hypot(clickX - pt.x, clickY - (pt.y - 12)) < 28) {
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
                THEGATE <span className="text-retro-amber">ESTATE & VILLA</span>
              </span>
              <PixelBadge variant="mint" size="xs">
                THE SIMS 16-BIT
              </PixelBadge>
            </div>
            <p className="text-[10px] font-mono text-slate-300 mt-0.5">
              Live AI Operations Estate • Resort Pool & Courtyard Garden • Isometric 3D
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-retro-paper">
          <img
            src="/thegate-metaicon.png"
            alt="TheGate Meta Icon"
            className="h-8 w-8 object-contain border border-black shadow-pixel-xs"
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
            onClick={() => focusRoom("resort-pool")}
            className={`shrink-0 px-2 py-1 font-pixel text-xs border-2 border-black transition-none cursor-pointer ${
              activeRoomFocus === "resort-pool" || activeRoomFocus === "recreation-gym"
                ? "bg-retro-amber text-black shadow-pixel-sm font-bold"
                : "bg-retro-coal text-retro-cream hover:bg-retro-sand hover:text-black"
            }`}
          >
            🏊 08: POOL & GARDEN
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap max-w-full pb-1 no-scrollbar pt-2 border-t border-retro-ink/50">
          <button
            onClick={handleDispatchPipeline}
            disabled={isDispatchingPipeline}
            className={`shrink-0 flex items-center gap-1.5 border-2 border-black px-2.5 py-1 font-pixel text-xs shadow-pixel-sm transition-none cursor-pointer ${
              isDispatchingPipeline
                ? "bg-purple-400 text-black animate-pulse cursor-wait"
                : "bg-purple-600 hover:bg-purple-500 text-white font-bold"
            }`}
            title="Dispatch Real Multi-Agent DAG Pipeline (Distributed Systems & Architecture Task)"
          >
            <Workflow className={`h-3.5 w-3.5 ${isDispatchingPipeline ? "animate-spin" : ""}`} />
            <span>{isDispatchingPipeline ? "DISPATCHING..." : "⚡ RUN MULTI-AGENT PIPELINE"}</span>
          </button>

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

      {/* Active Multi-Agent Pipeline Monitor HUD (PRD 5.4) */}
      {pipelineHud && (
        <div className="border-2 border-black bg-retro-night p-3 shadow-pixel-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-retro-ink/60 pb-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 font-pixel text-[10px] font-bold border ${
                  pipelineHud.status === "COMPLETED"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                    : "bg-retro-amber/20 text-retro-amber border-retro-amber animate-pulse"
                }`}
              >
                {pipelineHud.status === "COMPLETED" ? "✓ 100% COMPLETE" : "⚡ ACTIVE PIPELINE"}
              </span>
              <span className="font-pixel text-xs font-bold text-retro-cream">
                {pipelineHud.title}
              </span>
              <span className="font-mono text-xs text-retro-sand">
                [{pipelineHud.stepProgress}]
              </span>
            </div>
            {pipelineHud.dialogue && (
              <div className="max-w-md truncate font-mono text-xs text-retro-cream italic">
                💬 {pipelineHud.dialogue}
              </div>
            )}
          </div>

          {/* Step Nodes Flow */}
          <div className="flex flex-wrap items-center gap-2 pt-2 overflow-x-auto no-scrollbar">
            {pipelineHud.stepsHistory.map((step, idx) => {
              const isActive = pipelineHud.status !== "COMPLETED" && pipelineHud.stepIndex === idx;
              const isDone = step.status === "DONE" || pipelineHud.status === "COMPLETED";
              return (
                <React.Fragment key={idx}>
                  <div
                    onClick={() => {
                      if (step.outputPreview) {
                        setInspectingStepArtifact({
                          title: step.title,
                          role: step.roleName,
                          content: step.outputPreview,
                        });
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border-2 text-xs font-mono transition-all ${
                      isDone
                        ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 cursor-pointer hover:bg-emerald-900/60"
                        : isActive
                        ? "border-retro-amber bg-amber-950/40 text-retro-amber animate-pulse"
                        : "border-retro-ink bg-retro-coal/40 text-retro-sand/60"
                    }`}
                    title={step.outputPreview ? "Klik untuk inspeksi artefak" : undefined}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : isActive ? (
                      <Zap className="h-3.5 w-3.5 text-retro-amber fill-retro-amber animate-bounce" />
                    ) : (
                      <span className="text-[10px] font-pixel text-retro-sand">{idx + 1}</span>
                    )}
                    <span className="font-bold">{step.roleName}</span>
                    {step.durationMs ? (
                      <span className="text-[10px] opacity-75">({step.durationMs}ms)</span>
                    ) : null}
                  </div>
                  {idx < pipelineHud.stepsHistory.length - 1 && (
                    <span className="text-retro-ink font-bold">➔</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Inspecting Artifact Drawer */}
          {inspectingStepArtifact && (
            <div className="mt-2 p-2.5 border-2 border-emerald-500 bg-black/90 font-mono text-xs text-emerald-200">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-emerald-800">
                <span className="font-bold text-retro-amber">
                  📜 Artefak Inspektor: {inspectingStepArtifact.title} ({inspectingStepArtifact.role})
                </span>
                <button
                  onClick={() => setInspectingStepArtifact(null)}
                  className="text-retro-sand hover:text-white cursor-pointer px-1"
                >
                  ✕ Tutup
                </button>
              </div>
              <pre className="whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed text-[11px]">
                {inspectingStepArtifact.content}
              </pre>
            </div>
          )}
        </div>
      )}

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
          {selectedProp ? (
            <PixelPanel
              title={`OBJECT [${selectedProp.name.toUpperCase()}]`}
              variant="amber"
              badge={
                <PixelBadge variant="mint" size="xs">
                  {selectedProp.icon} INTERACTIVE
                </PixelBadge>
              }
            >
              <div className="space-y-3.5 text-xs font-mono">
                <div className="flex items-center gap-2.5 border-b border-retro-ink pb-2.5">
                  <span className="text-2xl shrink-0 p-1 bg-retro-night border border-black">{selectedProp.icon}</span>
                  <div>
                    <span className="font-bold text-retro-amber text-xs block font-pixel">{selectedProp.name}</span>
                    <span className="text-[10px] text-retro-paper">{selectedProp.room}</span>
                  </div>
                </div>

                <p className="text-retro-paper text-[11px] leading-relaxed">
                  {selectedProp.description}
                </p>

                <div className="border-t border-retro-ink pt-2.5 space-y-2">
                  <span className="font-pixel text-[9px] uppercase tracking-wider text-retro-amber block">
                    {language === "en" ? `Command Active Agent (${selectedAgent.name}):` : `Aksi Agen Aktif (${selectedAgent.name}):`}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {selectedProp.actions.map((act) => (
                      <button
                        key={act.label}
                        type="button"
                        onClick={() => handleTriggerPropAction(selectedProp, act)}
                        className="w-full flex items-center justify-between border-2 border-black bg-retro-night hover:bg-retro-amber hover:text-black text-retro-cream px-3 py-2 font-pixel text-[10px] shadow-pixel-xs transition-none cursor-pointer group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{act.icon}</span>
                          <span className="font-bold group-hover:text-black">{act.label}</span>
                        </span>
                        <span className="text-[9px] font-mono text-retro-mint group-hover:text-black font-bold">SIMS ACTION ❯</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PixelPanel>
          ) : (
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

                {/* Custom Desk Model Assignment */}
                <div className="border-t border-retro-ink pt-2.5 mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[9px] uppercase tracking-wider text-retro-amber flex items-center gap-1.5">
                      <Settings2 className="w-3 h-3 text-retro-amber" />
                      {language === "en" ? "Desk Assignment:" : "Kustom Model Meja:"}
                    </span>
                    {(customDesks[selectedPc?.id || ""] || hotSwappedDesks[selectedPc?.id || ""]) && (
                      <span className="text-[9px] font-mono text-retro-mint bg-retro-night px-1.5 py-0.5 border border-black font-bold">
                        {customDesks[selectedPc?.id || ""] ? "CUSTOM" : "HOT-SWAPPED"}
                      </span>
                    )}
                  </div>

                  {!isEditingDesk ? (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDeskModel(selectedPc?.modelId || "");
                          setIsEditingDesk(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 border-2 border-black bg-retro-night hover:bg-retro-amber hover:text-black text-retro-cream px-2 py-1.5 font-pixel text-[9px] cursor-pointer transition-none shadow-pixel-xs font-bold"
                      >
                        <Edit3 className="w-3 h-3" />
                        {language === "en" ? "CONFIGURE MODEL" : "UBAH MODEL MEJA"}
                      </button>
                      {(customDesks[selectedPc?.id || ""] || hotSwappedDesks[selectedPc?.id || ""]) && (
                        <button
                          type="button"
                          onClick={() => handleResetDesk(selectedPc?.id || "")}
                          title={language === "en" ? "Reset desk to default detected model" : "Reset meja ke model bawaan"}
                          className="flex items-center justify-center border-2 border-black bg-retro-night hover:bg-retro-coral hover:text-white text-retro-paper px-2 py-1.5 font-pixel text-[9px] cursor-pointer transition-none shadow-pixel-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 bg-retro-night/90 p-2 border border-retro-ink">
                      <div>
                        <label className="text-[9px] text-retro-paper block mb-1 font-mono">
                          {language === "en" ? "Select preset or type model ID:" : "Pilih preset atau ketik ID model:"}
                        </label>
                        <select
                          className="w-full bg-retro-dark border border-retro-ink text-retro-cream text-[10px] p-1 font-mono mb-1.5"
                          value={editingDeskModel}
                          onChange={(e) => setEditingDeskModel(e.target.value)}
                        >
                          <option value="">-- {language === "en" ? "Choose from detected models" : "Pilih dari model terdeteksi"} --</option>
                          {models.map((m) => (
                            <option key={m.internal_name} value={m.internal_name}>
                              {m.internal_name} ({m.provider_adapter})
                            </option>
                          ))}
                          <optgroup label="Popular / Frontier Models">
                            <option value="ag/gemini-3.8-flash-high">ag/gemini-3.8-flash-high (Antigravity)</option>
                            <option value="ag/claude-sonnet-4-6">ag/claude-sonnet-4-6 (Antigravity)</option>
                            <option value="ag/claude-opus-4-6-thinking">ag/claude-opus-4-6-thinking (Antigravity)</option>
                            <option value="nvidia/deepseek-ai/deepseek-v4-flash">nvidia/deepseek-ai/deepseek-v4-flash</option>
                            <option value="deepseek/deepseek-r1">deepseek/deepseek-r1 (Reasoning)</option>
                            <option value="openai/gpt-4o">openai/gpt-4o (Flagship)</option>
                            <option value="openai/o1">openai/o1 (Deep Reasoning)</option>
                            <option value="groq/llama-3.3-70b-versatile">groq/llama-3.3-70b-versatile</option>
                            <option value="ollama/qwen-2.5-coder-32b">ollama/qwen-2.5-coder-32b</option>
                          </optgroup>
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. ollama/llama-3.3, gpt-4o, claude-3-7-sonnet"
                          value={editingDeskModel}
                          onChange={(e) => setEditingDeskModel(e.target.value)}
                          className="w-full bg-retro-dark border border-retro-ink text-retro-cream text-[10px] px-2 py-1 font-mono focus:border-retro-amber outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAssignModelToDesk(selectedPc?.id || "", editingDeskModel)}
                          className="flex-1 border border-black bg-retro-amber text-black hover:bg-retro-cream px-2 py-1 font-pixel text-[9px] font-bold cursor-pointer transition-none shadow-pixel-xs flex items-center justify-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          {language === "en" ? "SAVE TO DESK" : "SIMPAN KE MEJA"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingDesk(false)}
                          className="border border-black bg-retro-dark text-retro-paper hover:text-white px-2 py-1 font-pixel text-[9px] cursor-pointer transition-none"
                        >
                          {language === "en" ? "CANCEL" : "BATAL"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </PixelPanel>
          )}
        </div>
      </div>
    </div>
  );
}
