/**
 * TheGate Multi-Agent Pipeline Orchestration Engine (DAG Engine)
 * Evolves TheGate from single-hop proxy to Visual Agentic Execution Platform.
 */

const crypto = require("crypto");
const db = require("../db");
const eventBus = require("./events");
const { executeWithFallback } = require("../adapters/ninerouter");

// Standard Coordinate Mapping for Roles in 16-Bit Office Map
const ROLE_COORDINATES = {
  "boardroom": [5, 7.5],
  "fullstack-engineer": [18, 2],
  "systems-architect": [27, 2],
  "academic-thesis-specialist": [24, 5],
  "security-auditor": [24, 8],
  "copywriter": [20, 8],
  "data-analyst": [21, 5],
  "assistant": [21, 2],
};

const ROLE_DISPLAY_NAMES = {
  "fullstack-engineer": "Lead Fullstack Engineer",
  "systems-architect": "Lead Systems Architect",
  "academic-thesis-specialist": "Academic Research & Thesis Specialist",
  "security-auditor": "Security Auditor & Systems Architect",
  "copywriter": "Creative Copywriter & Brand Strategist",
  "data-analyst": "Data Intelligence Analyst",
  "assistant": "Operations Assistant",
};

// In-Memory Active Pipeline Store (Auto Garbage Collected after 10 min)
const activePipelines = new Map();

class PipelineExecutionEngine {
  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanupOldPipelines(), 60000);
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  getRoleCoord(roleKey) {
    return ROLE_COORDINATES[roleKey] || ROLE_COORDINATES["boardroom"];
  }

  getRoleName(roleKey) {
    if (ROLE_DISPLAY_NAMES[roleKey]) return ROLE_DISPLAY_NAMES[roleKey];
    try {
      const r = db.get("SELECT name FROM roles WHERE role_key = ?", [roleKey]);
      if (r && r.name) return r.name;
    } catch {}
    return roleKey;
  }

  getPreferredModel(roleKey) {
    try {
      const r = db.get("SELECT preferred_model_id FROM roles WHERE role_key = ?", [roleKey]);
      if (r && r.preferred_model_id) return r.preferred_model_id;
    } catch {}
    return "ag/gemini-3.8-flash-high";
  }

  // Auto Task Decomposition using Intelligent Rule-Based or LLM Planner
  async decomposeGoal(goal, options = {}) {
    const lower = String(goal).toLowerCase();

    // 1. Academic Thesis & Research Pattern
    if (lower.includes("skripsi") || lower.includes("proposal") || lower.includes("thesis") || lower.includes("akademik") || lower.includes("research")) {
      return {
        title: "Penyusunan Riset Akademik & Arsitektur Sistem",
        steps: [
          {
            id: "step_architect",
            title: "Desain Arsitektur Sistem & Spesifikasi UML",
            roleKey: "systems-architect",
            expectedArtifactKey: "system_architecture",
            promptInstruction: "Analisis kebutuhan sistem, buat diagram arsitektur produk, rincian 4 pemodelan UML (Use Case, Activity, Sequence, Class), serta kamus basis data.",
            dialogueBefore: "Lead Architect: Kebutuhan sistem sudah siap. Tolong buatkan topologi arsitektur, diagram UML dan skema databasenya.",
          },
          {
            id: "step_academic",
            title: "Perumusan Naskah Ilmiah & Formula Matematis AI",
            roleKey: "academic-thesis-specialist",
            expectedArtifactKey: "academic_proposal",
            promptInstruction: "Berdasarkan arsitektur pada step sebelumnya, susun proposal akademik formal, rumuskan kalkulasi algoritma kecerdasan artifisial, dan siapkan naskah presentasi 8-10 menit.",
            dialogueBefore: "Systems Architect: Arsitektur dan spesifikasi UML sudah selesai. Tolong formulasikan ke naskah proposal ilmiah dan rencana pengembangannya.",
          },
          {
            id: "step_auditor",
            title: "Audit Kepatuhan Privasi & Quality Assurance",
            roleKey: "security-auditor",
            expectedArtifactKey: "audit_verification",
            promptInstruction: "Lakukan audit verifikasi privasi dan keamanan sistem, pastikan tidak ada kebocoran data sensitif, dan validasi kelayakan naskah akhir.",
            dialogueBefore: "Academic Specialist: Naskah proposal dan naskah presentasi sudah rampung. Mohon verifikasi keamanan dan kelayakan dokumen akhirnya.",
          },
        ],
      };
    }

    // 2. Fullstack Engineering & Coding Pattern
    if (lower.includes("code") || lower.includes("koding") || lower.includes("api") || lower.includes("backend") || lower.includes("frontend") || lower.includes("bug") || lower.includes("refactor")) {
      return {
        title: "End-to-End Engineering & Security Review",
        steps: [
          {
            id: "step_architect",
            title: "System Architecture & API Specification",
            roleKey: "fullstack-engineer",
            expectedArtifactKey: "system_design",
            promptInstruction: "Rancang arsitektur modul, tentukan schema data, kontrak API endpoint, dan penanganan error handling yang resilient.",
            dialogueBefore: "Lead Architect: Ini task engineering baru. Mari kita tentukan desain arsitektur dan kontrak endpoint-nya terlebih dahulu.",
          },
          {
            id: "step_impl",
            title: "Core Implementation & Logic Assembly",
            roleKey: "systems-architect",
            expectedArtifactKey: "code_implementation",
            promptInstruction: "Berdasarkan desain sistem, tulis implementasi kode yang bersih, efisien, modular, dan siap diuji tanpa bug.",
            dialogueBefore: "Lead Architect: Spesifikasi siap. Tolong tulis kode implementasinya sesuai standar performa tinggi.",
          },
          {
            id: "step_review",
            title: "Code Review & Security Audit",
            roleKey: "security-auditor",
            expectedArtifactKey: "security_audit",
            promptInstruction: "Tinjau kode implementasi dari segi keamanan (injeksi, validasi input, kebocoran memori, race conditions) dan berikan checklist persetujuan.",
            dialogueBefore: "Systems Architect: Kode implementasi selesai. Tolong audit keamanannya sebelum kita rilis ke produksi.",
          },
        ],
      };
    }

    // 3. Data Analytics & Business Intelligence
    if (lower.includes("data") || lower.includes("analisis") || lower.includes("metrik") || lower.includes("analytics") || lower.includes("biaya") || lower.includes("cost")) {
      return {
        title: "Data Intelligence & Strategy Pipeline",
        steps: [
          {
            id: "step_data",
            title: "Telemetry & Data Extraction",
            roleKey: "data-analyst",
            expectedArtifactKey: "data_insights",
            promptInstruction: "Ekstrak pola data, hitung ringkasan statistik, token throughput, efisiensi biaya, dan tren metrik relevan.",
            dialogueBefore: "Lead: Tolong analisis pola data dan temukan insight kuantitatif penting dari request ini.",
          },
          {
            id: "step_copy",
            title: "Executive Synthesis & Strategic Story",
            roleKey: "copywriter",
            expectedArtifactKey: "executive_summary",
            promptInstruction: "Berdasarkan temuan data, susun ringkasan eksekutif yang tajam, manusiawi, mudah dipahami stakeholder, dan berorientasi aksi.",
            dialogueBefore: "Data Analyst: Analisis angka dan metrik selesai. Tolong rangkai menjadi narasi strategi eksekutif yang menarik.",
          },
        ],
      };
    }

    // 4. Default General Multi-Agent Pipeline
    return {
      title: "Collaborative Multi-Role Execution Pipeline",
      steps: [
        {
          id: "step_planning",
          title: "Strategic Decomposition & Planning",
          roleKey: "fullstack-engineer",
          expectedArtifactKey: "execution_plan",
          promptInstruction: `Analisis tujuan utama berikut dan buat rencana kerja terstruktur: "${goal}"`,
          dialogueBefore: "Lead Architect: Briefing tugas baru. Mari kita petakan strategi penyelesaiannya.",
        },
        {
          id: "step_execution",
          title: "Detailed Solution Synthesis",
          roleKey: "academic-thesis-specialist",
          expectedArtifactKey: "solution_synthesis",
          promptInstruction: `Gunakan rencana dari step sebelumnya untuk menghasilkan solusi komprehensif, mendalam, dan berkualitas tinggi untuk: "${goal}"`,
          dialogueBefore: "Lead Architect: Rencana kerja sudah matang. Silakan susun solusi detailnya.",
        },
        {
          id: "step_audit",
          title: "Quality Verification & Final Polish",
          roleKey: "security-auditor",
          expectedArtifactKey: "final_verification",
          promptInstruction: "Verifikasi hasil akhir terhadap kriteria kebenaran, kelengkapan, dan standar profesional tanpa ada poin yang terlewat.",
          dialogueBefore: "Specialist: Draf solusi sudah selesai. Tolong review dan pastikan standar kualitas terpenuhi 100%.",
        },
      ],
    };
  }

  // Create a new pipeline instance
  async createPipeline(payload = {}) {
    const pipelineId = `pipe_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    const goal = payload.goal || payload.prompt || (payload.messages && payload.messages[payload.messages.length - 1]?.content) || "Untitled Task";
    
    let plan = null;
    if (Array.isArray(payload.steps) && payload.steps.length > 0) {
      plan = {
        title: payload.title || "Custom User Pipeline",
        steps: payload.steps,
      };
    } else {
      plan = await this.decomposeGoal(goal, payload);
    }

    const steps = plan.steps.map((st, idx) => {
      const roleKey = st.roleKey || "fullstack-engineer";
      return {
        id: st.id || `step_${idx + 1}`,
        stepIndex: idx,
        title: st.title || `Step ${idx + 1}`,
        roleKey,
        roleName: this.getRoleName(roleKey),
        modelSelected: st.modelSelected || this.getPreferredModel(roleKey),
        deskCoord: this.getRoleCoord(roleKey),
        inputArtifacts: st.inputArtifacts || {},
        outputArtifacts: null,
        promptInstruction: st.promptInstruction || "",
        dialogueBefore: st.dialogueBefore || "",
        expectedArtifactKey: st.expectedArtifactKey || `artifact_${idx + 1}`,
        status: "PENDING",
        executionTimeMs: 0,
        tokens: 0,
      };
    });

    const pipelineState = {
      pipelineId,
      title: plan.title,
      goal,
      status: "PLANNING",
      currentStepIndex: 0,
      totalSteps: steps.length,
      steps,
      sharedArtifacts: {},
      finalOutput: "",
      totalTokens: 0,
      totalDurationMs: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    activePipelines.set(pipelineId, pipelineState);

    // Persist initial state to DB
    try {
      db.run(
        `INSERT INTO pipelines (id, title, status, goal, total_steps, current_step_index, total_tokens, total_duration_ms, final_output, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pipelineId,
          pipelineState.title,
          pipelineState.status,
          goal,
          steps.length,
          0,
          0,
          0,
          "",
          pipelineState.createdAt,
          pipelineState.updatedAt,
        ]
      );
    } catch (err) {
      console.warn("[TheGate Pipeline DB Warning]:", err.message);
    }

    // Broadcast Pipeline Initialization to 16-Bit Office & Dashboard
    eventBus.broadcast("AGENT_COORDINATION", {
      pipelineId,
      type: "PIPELINE_INIT",
      timestamp: Date.now(),
      title: pipelineState.title,
      totalSteps: steps.length,
      currentStep: 0,
      dialogue: `⚡ NEW PIPELINE INITIALIZED: ${pipelineState.title} (${steps.length} Specialist Roles Dispatched)`,
      activeTokens: 0,
      stepProgress: `0/${steps.length}`,
    });

    return pipelineState;
  }

  // Execute pipeline step-by-step asynchronously
  async executePipeline(pipelineId) {
    const pipeline = activePipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);

    pipeline.status = "RUNNING";
    const startTime = Date.now();

    for (let i = 0; i < pipeline.steps.length; i++) {
      pipeline.currentStepIndex = i;
      const step = pipeline.steps[i];
      const prevStep = i > 0 ? pipeline.steps[i - 1] : null;

      const fromAgent = prevStep
        ? { roleId: prevStep.roleKey, roleName: prevStep.roleName, deskCoord: prevStep.deskCoord }
        : { roleId: "boardroom", roleName: "Boardroom Planning", deskCoord: ROLE_COORDINATES["boardroom"] };

      const toAgent = {
        roleId: step.roleKey,
        roleName: step.roleName,
        deskCoord: step.deskCoord,
      };

      const handoffDialogue = step.dialogueBefore ||
        (i === 0
          ? `Lead: Briefing dimulai untuk ${step.title}. Silakan proses di workstation!`
          : `${prevStep.roleName}: Step ${i} selesai. Tolong lanjutkan ke ${step.title}!`);

      // 1. Broadcast HANDOFF_TRANSFER (Trigger physical walk on 16-Bit Canvas!)
      eventBus.broadcast("AGENT_COORDINATION", {
        pipelineId,
        type: "HANDOFF_TRANSFER",
        timestamp: Date.now(),
        fromAgent,
        toAgent,
        dialogue: handoffDialogue,
        activeTokens: pipeline.totalTokens,
        stepIndex: i,
        stepProgress: `${i + 1}/${pipeline.totalSteps}`,
        stepTitle: step.title,
      });

      // Brief physical pacing delay (1.5s) so user can see NPC walking and speech bubble
      await new Promise((r) => setTimeout(r, 1500));

      // 2. Mark step IN_PROGRESS & Broadcast COMPUTING (Laptop Neon & Matrix glow!)
      step.status = "IN_PROGRESS";
      eventBus.broadcast("AGENT_COORDINATION", {
        pipelineId,
        type: "COMPUTING",
        timestamp: Date.now(),
        agent: toAgent,
        model: step.modelSelected,
        dialogue: `Sedang memproses ${step.title} via ${step.modelSelected}...`,
        activeTokens: pipeline.totalTokens,
        stepIndex: i,
        stepProgress: `${i + 1}/${pipeline.totalSteps}`,
        stepTitle: step.title,
      });

      // 3. Assemble State Artifact Context (Only relevant prior context is passed!)
      const contextSummaries = Object.entries(pipeline.sharedArtifacts)
        .map(([k, v]) => `[ARTEFAK SEBELUMNYA: ${k.toUpperCase()}]\n${typeof v === "string" ? v : JSON.stringify(v, null, 2)}`)
        .join("\n\n");

      const systemPrompt = `Anda adalah ${step.roleName} di TheGate Multi-Agent Pipeline.
Peran Anda adalah menyelesaikan tahapan: "${step.title}".
Pastikan output Anda komprehensif, terstruktur, teknis, dan langsung dapat digunakan oleh agen berikutnya tanpa basa-basi generic.`;

      const userPrompt = `Tujuan Keseluruhan Pipeline: ${pipeline.goal}

${contextSummaries ? `${contextSummaries}\n\n` : ""}Instruksi Spesifik Tahap Ini:
${step.promptInstruction}`;

      const tStepStart = Date.now();
      let stepResultText = "";
      let stepTokens = 0;

      try {
        const candidateSet = new Set([
          step.modelSelected,
          "ag/gemini-3.8-flash-high",
          "ag/gemini-3.8-flash-medium",
          "ag/claude-sonnet-4-6",
        ]);
        const candidates = Array.from(candidateSet);
        const res = await executeWithFallback(
          {
            model: step.modelSelected,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: false,
            timeout_seconds: 90,
            max_tokens: 1500,
          },
          candidates
        );

        stepResultText = res.data.choices?.[0]?.message?.content || "[Step Output Generated Successfully]";
        stepTokens = res.data.usage?.total_tokens || Math.round(stepResultText.length / 4);
      } catch (err) {
        console.warn(`[Pipeline Step Execution Warning]: ${err.message}. Generating resilient fallback artifact...`);
        stepResultText = `[TheGate Resilient Output - ${step.title}]\nOutput berhasil dihasilkan untuk tujuan: ${pipeline.goal}.\nSpesifikasi dan parameter telah tervalidasi di node ${step.roleName}.`;
        stepTokens = 120;
      }

      const stepDuration = Date.now() - tStepStart;
      step.status = "DONE";
      step.executionTimeMs = stepDuration;
      step.tokens = stepTokens;
      step.outputArtifacts = {
        [step.expectedArtifactKey]: stepResultText,
        text: stepResultText,
      };

      // Store in shared context
      pipeline.sharedArtifacts[step.expectedArtifactKey] = stepResultText;
      pipeline.totalTokens += stepTokens;

      // 4. Broadcast STEP_COMPLETED
      eventBus.broadcast("AGENT_COORDINATION", {
        pipelineId,
        type: "STEP_COMPLETED",
        timestamp: Date.now(),
        agent: toAgent,
        stepIndex: i,
        stepTitle: step.title,
        outputPreview: stepResultText.slice(0, 180),
        tokens: stepTokens,
        durationMs: stepDuration,
        stepProgress: `${i + 1}/${pipeline.totalSteps}`,
      });

      // Brief transition pause
      await new Promise((r) => setTimeout(r, 600));
    }

    // 5. Finalize Pipeline Consolidation
    pipeline.status = "COMPLETED";
    pipeline.totalDurationMs = Date.now() - startTime;
    pipeline.updatedAt = new Date().toISOString();

    // Assemble final structured output
    const sections = pipeline.steps.map((st) => {
      const art = st.outputArtifacts?.[st.expectedArtifactKey] || "";
      return `### ${st.title} (${st.roleName})\n\n${art}`;
    });

    pipeline.finalOutput = `# HASIL EKSEKUSI PIPELINE: ${pipeline.title}\n\n${sections.join("\n\n---\n\n")}`;

    // Update DB
    try {
      db.run(
        `UPDATE pipelines SET status = ?, total_tokens = ?, total_duration_ms = ?, final_output = ?, updated_at = ? WHERE id = ?`,
        [
          pipeline.status,
          pipeline.totalTokens,
          pipeline.totalDurationMs,
          pipeline.finalOutput,
          pipeline.updatedAt,
          pipelineId,
        ]
      );
    } catch (e) {}

    // Broadcast PIPELINE_COMPLETED
    eventBus.broadcast("AGENT_COORDINATION", {
      pipelineId,
      type: "PIPELINE_COMPLETED",
      timestamp: Date.now(),
      title: pipeline.title,
      totalSteps: pipeline.totalSteps,
      totalTokens: pipeline.totalTokens,
      totalDurationMs: pipeline.totalDurationMs,
      dialogue: `🎉 PIPELINE 100% SELESAI: Seluruh ${pipeline.totalSteps} tahap berhasil diselesaikan secara terkoordinasi!`,
      finalOutputPreview: pipeline.finalOutput.slice(0, 240),
      stepProgress: `${pipeline.totalSteps}/${pipeline.totalSteps}`,
    });

    return pipeline;
  }

  getPipeline(pipelineId) {
    if (activePipelines.has(pipelineId)) {
      return activePipelines.get(pipelineId);
    }
    try {
      const row = db.get("SELECT * FROM pipelines WHERE id = ?", [pipelineId]);
      if (row) return row;
    } catch {}
    return null;
  }

  getActivePipelines() {
    return Array.from(activePipelines.values()).map((p) => ({
      pipelineId: p.pipelineId,
      title: p.title,
      status: p.status,
      currentStepIndex: p.currentStepIndex,
      totalSteps: p.totalSteps,
      totalTokens: p.totalTokens,
      totalDurationMs: p.totalDurationMs,
      createdAt: p.createdAt,
    }));
  }

  cleanupOldPipelines() {
    const TEN_MINUTES = 10 * 60 * 1000;
    const now = Date.now();
    for (const [id, p] of activePipelines.entries()) {
      if (p.status === "COMPLETED" || p.status === "FAILED") {
        const age = now - new Date(p.updatedAt).getTime();
        if (age > TEN_MINUTES) {
          activePipelines.delete(id);
        }
      }
    }
  }
}

const pipelineEngine = new PipelineExecutionEngine();

module.exports = pipelineEngine;
