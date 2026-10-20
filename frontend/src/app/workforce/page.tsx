"use client";

import React, { useState, useEffect } from "react";
import {
  api,
  RoleItem,
  RoleCreatePayload,
  RoleUpdatePayload,
  ModelRegistryItem,
  GenerateContextResponse,
} from "@/lib/api";
import {
  Users,
  Bot,
  Briefcase,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Terminal,
  Plus,
  Trash2,
  Edit3,
  Coffee,
  Building,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelAvatarPreview } from "@/components/pixel/PixelAvatarPreview";

const DEPARTMENTS = [
  "Core Systems & Fullstack Architecture",
  "Mobile & Frontend Engineering",
  "Product & User Experience",
  "Marketing & Brand Growth",
  "FinOps & Cloud Economics",
  "DevSecOps & SRE Reliability",
  "QA & Test Automation",
  "Executive & Management",
];

const PRESET_HAIR_COLORS = [
  "#4B2E1E", // Dark Brown
  "#1A202C", // Jet Black
  "#B7791F", // Golden Blonde
  "#DD6B20", // Auburn / Reddish
  "#4A5568", // Slate Gray
  "#805AD5", // Cyber Purple
];

const PRESET_SHIRT_COLORS = [
  "#2B5278", // Corporate Navy
  "#1E3A2F", // Forest Green
  "#7B341E", // Rust Crimson
  "#4A5568", // Carbon Gray
  "#A16207", // Ochre Amber
  "#6B21A8", // Deep Violet
  "#0F766E", // Teal Cyan
];

const PRESET_TIE_COLORS = [
  "#E53E3E", // Bright Red
  "#34D399", // Emerald Mint
  "#FFB71B", // Retro Amber
  "#38BDF8", // Sky Blue
  "#F43F5E", // Rose Coral
  "",        // No Tie
];

export default function WorkforceRolesPage() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState<string>("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [preferredModelId, setPreferredModelId] = useState<string>("ag/gemini-3.8-flash-high");
  const [contextBehavior, setContextBehavior] = useState<string>("");
  const [hairColor, setHairColor] = useState<string>("#4B2E1E");
  const [shirtColor, setShirtColor] = useState<string>("#2B5278");
  const [tieColor, setTieColor] = useState<string>("#E53E3E");
  const [hasGlasses, setHasGlasses] = useState<boolean>(true);
  const [hasHeadset, setHasHeadset] = useState<boolean>(false);
  const [isDefault, setIsDefault] = useState<boolean>(false);

  // AI Context Generation State
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedRoles, fetchedModels] = await Promise.all([
        api.getRoles(),
        api.getModels().catch(() => []),
      ]);
      setRoles(fetchedRoles);
      setModels(fetchedModels);
    } catch (err: any) {
      showToast(`Error loading workforce data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingRoleId(null);
    setName("");
    setDepartment(DEPARTMENTS[1]);
    setPreferredModelId(models[0]?.internal_name || "ag/gemini-3.8-flash-high");
    setContextBehavior("");
    setHairColor("#1A202C");
    setShirtColor("#0F766E");
    setTieColor("");
    setHasGlasses(false);
    setHasHeadset(true);
    setIsDefault(false);
    setIsModalOpen(true);
  };

  const openEditModal = (role: RoleItem) => {
    setModalMode("edit");
    setEditingRoleId(role.id);
    setName(role.name);
    setDepartment(role.department);
    setPreferredModelId(role.preferred_model_id || "ag/gemini-3.8-flash-high");
    setContextBehavior(role.context_behavior);
    setHairColor(role.hair_color || "#4B2E1E");
    setShirtColor(role.shirt_color || "#2B5278");
    setTieColor(role.tie_color || "");
    setHasGlasses(role.has_glasses);
    setHasHeadset(role.has_headset);
    setIsDefault(role.is_default);
    setIsModalOpen(true);
  };

  const handleGenerateAiContext = async () => {
    if (!name.trim()) {
      showToast("Please enter a Role Name first to generate contextual behavior.");
      return;
    }
    setIsGeneratingAi(true);
    try {
      const result: GenerateContextResponse = await api.generateRoleContext({
        role_name: name.trim(),
        department: department.trim(),
      });
      setContextBehavior(result.generated_context);
      if (result.suggested_models && result.suggested_models.length > 0) {
        setPreferredModelId(result.suggested_models[0]);
      }
      if (result.suggested_appearance) {
        const app = result.suggested_appearance;
        if (app.hair_color) setHairColor(app.hair_color);
        if (app.shirt_color) setShirtColor(app.shirt_color);
        if (app.tie_color !== undefined) setTieColor(app.tie_color || "");
        if (app.has_glasses !== undefined) setHasGlasses(app.has_glasses);
        if (app.has_headset !== undefined) setHasHeadset(app.has_headset);
      }
      showToast("⚡ Context behavior & persona generated successfully!");
    } catch (err: any) {
      showToast(`Context generation error: ${err.message}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Role name is required.");
      return;
    }
    if (!contextBehavior.trim()) {
      showToast("Context behavior description is required.");
      return;
    }

    try {
      if (modalMode === "create") {
        const payload: RoleCreatePayload = {
          name: name.trim(),
          department: department.trim(),
          context_behavior: contextBehavior.trim(),
          preferred_model_id: preferredModelId.trim() || undefined,
          hair_color: hairColor,
          shirt_color: shirtColor,
          tie_color: tieColor || undefined,
          has_glasses: hasGlasses,
          has_headset: hasHeadset,
          is_default: isDefault,
        };
        const created = await api.createRole(payload);
        showToast(`✓ Role "${created.name}" created! New NPC is now active in Virtual Office.`);
      } else if (modalMode === "edit" && editingRoleId) {
        const payload: RoleUpdatePayload = {
          name: name.trim(),
          department: department.trim(),
          context_behavior: contextBehavior.trim(),
          preferred_model_id: preferredModelId.trim() || undefined,
          hair_color: hairColor,
          shirt_color: shirtColor,
          tie_color: tieColor || undefined,
          has_glasses: hasGlasses,
          has_headset: hasHeadset,
          is_default: isDefault,
        };
        const updated = await api.updateRole(editingRoleId, payload);
        showToast(`✓ Role "${updated.name}" updated! NPC context refreshed.`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (roles.length <= 1) {
      showToast("Cannot delete the last remaining role. At least 1 role must remain for Virtual Office NPC representation.");
      return;
    }
    try {
      await api.deleteRole(roleId);
      showToast("✓ Role deleted. Matching NPC removed from Virtual Office.");
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 border-2 border-black bg-retro-amber px-4 py-2.5 font-mono text-xs font-bold text-black shadow-pixel animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
          <span>{toast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-2 border-black bg-retro-plum p-3.5 sm:p-4 shadow-pixel">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-pixel text-xs sm:text-base text-retro-amber uppercase tracking-wider">
              {t("workforce.title")}
            </h1>
            <PixelBadge variant="mint" size="xs">
              {t("workforce.npc_badge")}
            </PixelBadge>
          </div>
          <p className="font-mono text-[11px] sm:text-xs text-retro-paper font-semibold leading-relaxed">
            {t("workforce.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href="/office">
            <button className="flex items-center gap-1.5 border-2 border-black bg-retro-coal text-retro-cream px-3 py-1.5 font-pixel text-xs hover:bg-retro-sand hover:text-black transition-none cursor-pointer shadow-pixel-sm">
              <Building className="h-3.5 w-3.5 text-retro-amber" />
              <span>{t("workforce.virtual_office_btn")}</span>
            </button>
          </Link>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 border-2 border-black bg-retro-amber text-black font-bold px-3 py-1.5 font-pixel text-xs hover:bg-amber-400 transition-none cursor-pointer shadow-pixel-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>{t("workforce.add_role_btn")}</span>
          </button>
        </div>
      </div>

      {/* Real-time Roster KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono text-xs">
        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-pixel text-[9px]">{t("workforce.total_roles")}</span>
            <Users className="h-4 w-4 text-retro-amber" />
          </div>
          <div className="text-2xl font-bold text-retro-cream font-mono">
            {roles.length} {roles.length === 1 ? "Role" : "Roles"}
          </div>
          <div className="text-[11px] text-retro-mint font-bold pt-1 border-t border-retro-ink">
            {roles.length} {t("workforce.npcs_in_office")}
          </div>
        </div>

        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-pixel text-[9px]">{t("workforce.default_architect")}</span>
            <Sparkles className="h-4 w-4 text-retro-blue" />
          </div>
          <div className="text-sm font-bold text-retro-blue font-mono truncate">
            {roles.find((r) => r.is_default)?.name || "Lead Fullstack Engineer"}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-retro-ink">
            {t("workforce.authentic_phil")}
          </div>
        </div>

        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-pixel text-[9px]">{t("workforce.campus_behaviour")}</span>
            <Coffee className="h-4 w-4 text-retro-amber" />
          </div>
          <div className="text-sm font-bold text-retro-amber font-mono">
            {t("workforce.relaxed_santai")}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-retro-ink">
            {t("workforce.real_ingress_only")}
          </div>
        </div>

        <div className="border-2 border-black bg-retro-night p-4 shadow-pixel space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-pixel text-[9px]">{t("workforce.ai_generator")}</span>
            <Zap className="h-4 w-4 text-retro-mint" />
          </div>
          <div className="text-sm font-bold text-retro-mint font-mono">
            {t("workforce.router_synthesis")}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-retro-ink">
            {t("workforce.one_click")}
          </div>
        </div>
      </div>

      {/* Main Roles Roster Grid */}
      {loading ? (
        <div className="border-2 border-black bg-retro-night p-12 text-center font-mono text-sm text-retro-paper">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-retro-amber mb-2" />
          <span>Loading workforce roles from database...</span>
        </div>
      ) : roles.length === 0 ? (
        <div className="border-2 border-black bg-retro-night p-8 text-center space-y-3">
          <Users className="h-10 w-10 text-retro-amber mx-auto" />
          <h3 className="font-pixel text-sm text-retro-cream">No Roles Registered Yet</h3>
          <p className="font-mono text-xs text-slate-400 max-w-md mx-auto">
            Create your first role to initialize your AI engineering workforce and spawn autonomous NPCs into the Virtual Office.
          </p>
          <button
            onClick={openCreateModal}
            className="border-2 border-black bg-retro-amber text-black font-bold px-4 py-2 font-pixel text-xs hover:bg-amber-400 cursor-pointer shadow-pixel-sm"
          >
            + ADD DEFAULT ARCHITECT ROLE
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="border-2 border-black bg-retro-night flex flex-col justify-between shadow-pixel hover:border-retro-amber transition-colors"
            >
              {/* Card Header & Avatar */}
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PixelAvatarPreview
                      hairColor={role.hair_color}
                      shirtColor={role.shirt_color}
                      tieColor={role.tie_color}
                      hasGlasses={role.has_glasses}
                      hasHeadset={role.has_headset}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-pixel text-xs text-retro-cream">
                          {role.name}
                        </h3>
                        {role.is_default && (
                          <span className="border border-retro-amber bg-retro-amber/20 px-1 py-0.2 font-mono text-[9px] font-bold text-retro-amber">
                            DEFAULT (YOU)
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {role.department}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="font-mono text-[10px] text-retro-mint font-semibold">
                          Pref: {role.preferred_model_id || "Auto-Route"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Behavioral Context Prompt Box */}
                <div className="border border-retro-ink bg-retro-coal/70 p-3 space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-retro-amber">
                      <Terminal className="h-3 w-3" />
                      Context Behavior
                    </span>
                    <span className="text-[9px] text-slate-400">
                      NPC Reasoning Rationale
                    </span>
                  </div>
                  <p className="text-xs text-retro-paper leading-relaxed line-clamp-4">
                    {role.context_behavior}
                  </p>
                </div>

                {/* Live Campus Presence */}
                <div className="flex items-center justify-between font-mono text-[11px] border-t border-retro-ink pt-2 text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-retro-mint animate-pulse" />
                    Office NPC Status:
                  </span>
                  <span className="font-bold text-retro-cream">
                    {role.current_activity === "idle" ? "Santai (Leisure)" : role.current_activity || "Santai di Campus"}
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="border-t-2 border-black bg-retro-coal/50 p-2.5 flex items-center justify-between gap-2">
                <button
                  onClick={() => openEditModal(role)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-black bg-retro-coal hover:bg-retro-sand hover:text-black text-retro-cream px-2.5 py-1.5 font-pixel text-xs transition-none cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>EDIT ROLE</span>
                </button>

                {deleteConfirmId === role.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="border border-red-600 bg-red-600 text-white px-2 py-1.5 font-pixel text-xs font-bold cursor-pointer"
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="border border-black bg-retro-coal text-retro-paper px-2 py-1.5 font-pixel text-xs cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(role.id)}
                    disabled={roles.length <= 1}
                    title={roles.length <= 1 ? "At least 1 role must remain" : "Delete role"}
                    className={`border border-black p-1.5 text-xs transition-none ${
                      roles.length <= 1
                        ? "opacity-30 cursor-not-allowed bg-retro-coal text-slate-400"
                        : "bg-retro-coal hover:bg-red-700 hover:text-white text-red-400 cursor-pointer"
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl border-2 border-black bg-retro-night shadow-pixel-lg my-8 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-black bg-retro-plum p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-retro-amber" />
                <h2 className="font-pixel text-sm text-retro-cream uppercase tracking-wider">
                  {modalMode === "create" ? "Add New AI Workforce Role" : `Edit Role: ${name}`}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-retro-paper hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRole} className="p-6 space-y-5 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role Name */}
                <div className="space-y-1.5">
                  <label className="text-retro-paper font-bold block">
                    Role Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mobile Developer, QA Lead, PM..."
                    required
                    className="w-full border-2 border-black bg-retro-coal px-3 py-2 text-retro-cream placeholder:text-slate-400 focus:border-retro-amber focus:outline-hidden"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-retro-paper font-bold block">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border-2 border-black bg-retro-coal px-3 py-2 text-retro-cream focus:border-retro-amber focus:outline-hidden"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferred Model */}
              <div className="space-y-1.5">
                <label className="text-retro-paper font-bold block">
                  Preferred Upstream Model Target
                </label>
                <select
                  value={preferredModelId}
                  onChange={(e) => setPreferredModelId(e.target.value)}
                  className="w-full border-2 border-black bg-retro-coal px-3 py-2 text-retro-cream focus:border-retro-amber focus:outline-hidden"
                >
                  <option value="ag/gemini-3.8-flash-high">ag/gemini-3.8-flash-high (Antigravity Speed Workhorse)</option>
                  <option value="thegate-balanced">thegate-balanced (Dynamic Cost/Quality)</option>
                  <option value="thegate-quality">thegate-quality (Deep Deterministic Reasoning)</option>
                  <option value="thegate-economy">thegate-economy (Budget Arbitrage)</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.internal_name}>
                      {m.internal_name} ({m.provider_adapter})
                    </option>
                  ))}
                </select>
              </div>

              {/* Avatar Appearance Customizer & Live Preview */}
              <div className="border-2 border-black bg-retro-coal/60 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-xs text-retro-amber uppercase tracking-wider">
                    NPC Appearance Customizer
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Live Virtual Office Sprite
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Live Avatar Box */}
                  <div className="flex flex-col items-center gap-1.5">
                    <PixelAvatarPreview
                      hairColor={hairColor}
                      shirtColor={shirtColor}
                      tieColor={tieColor}
                      hasGlasses={hasGlasses}
                      hasHeadset={hasHeadset}
                      size="lg"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">
                      Campus Sprite
                    </span>
                  </div>

                  {/* Color Palette Choices */}
                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <span className="text-[11px] text-retro-paper block mb-1">
                        Hair Color:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {PRESET_HAIR_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setHairColor(c)}
                            className={`h-6 w-6 border-2 transition-none cursor-pointer ${
                              hairColor === c ? "border-retro-amber scale-110" : "border-black"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input
                          type="color"
                          value={hairColor}
                          onChange={(e) => setHairColor(e.target.value)}
                          className="h-6 w-8 bg-transparent cursor-pointer"
                          title="Custom Hair Color"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-retro-paper block mb-1">
                        Shirt Color:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {PRESET_SHIRT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setShirtColor(c)}
                            className={`h-6 w-6 border-2 transition-none cursor-pointer ${
                              shirtColor === c ? "border-retro-amber scale-110" : "border-black"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input
                          type="color"
                          value={shirtColor}
                          onChange={(e) => setShirtColor(e.target.value)}
                          className="h-6 w-8 bg-transparent cursor-pointer"
                          title="Custom Shirt Color"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-retro-paper block mb-1">
                        Necktie / Accent:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {PRESET_TIE_COLORS.map((c, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTieColor(c)}
                            className={`h-6 w-6 border-2 flex items-center justify-center text-[9px] font-bold transition-none cursor-pointer ${
                              tieColor === c ? "border-retro-amber scale-110" : "border-black"
                            }`}
                            style={{ backgroundColor: c || "#1A202C" }}
                          >
                            {!c && "✕"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accessories Checkboxes */}
                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 text-retro-cream cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasGlasses}
                          onChange={(e) => setHasGlasses(e.target.checked)}
                          className="h-4 w-4 accent-retro-amber cursor-pointer"
                        />
                        <span>Glasses</span>
                      </label>

                      <label className="flex items-center gap-2 text-retro-cream cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasHeadset}
                          onChange={(e) => setHasHeadset(e.target.checked)}
                          className="h-4 w-4 accent-retro-amber cursor-pointer"
                        />
                        <span>Headset</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Context Behavior with AI Generator Button */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-retro-paper font-bold block">
                    Context Behavior & Reasoning Philosophy <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiContext}
                    disabled={isGeneratingAi || !name.trim()}
                    className={`flex items-center gap-1.5 border-2 border-black px-2.5 py-1 font-pixel text-xs transition-none cursor-pointer ${
                      isGeneratingAi
                        ? "bg-retro-sand text-black animate-pulse cursor-wait"
                        : "bg-retro-amber hover:bg-amber-400 text-black font-bold shadow-pixel-sm"
                    }`}
                  >
                    <Zap className={`h-3.5 w-3.5 ${isGeneratingAi ? "animate-spin" : "fill-black"}`} />
                    <span>{isGeneratingAi ? "SYNTHESIZING..." : "⚡ AI GENERATE CONTEXT"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Describes how this role reasons, evaluates tradeoffs, chooses upstream models, and speaks when processing real requests in the office.
                </p>
                <textarea
                  value={contextBehavior}
                  onChange={(e) => setContextBehavior(e.target.value)}
                  rows={5}
                  required
                  placeholder="Click [⚡ AI Generate Context] or write custom persona instructions for this role..."
                  className="w-full border-2 border-black bg-retro-coal p-3 text-retro-cream placeholder:text-slate-400 font-mono text-xs focus:border-retro-amber focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Default Role Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 accent-retro-amber cursor-pointer"
                />
                <label htmlFor="isDefault" className="text-retro-paper cursor-pointer select-none">
                  Set as Primary Default Role
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border-2 border-black bg-retro-coal text-retro-paper px-4 py-2 font-pixel text-xs hover:bg-retro-sand hover:text-black cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="border-2 border-black bg-retro-amber text-black font-bold px-5 py-2 font-pixel text-xs hover:bg-amber-400 cursor-pointer shadow-pixel-sm"
                >
                  {modalMode === "create" ? "SAVE & SPAWN NPC" : "UPDATE ROLE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
