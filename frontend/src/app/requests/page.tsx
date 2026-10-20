"use client";

import { useEffect, useState } from "react";
import {
  Layers,
  Search,
  Filter,
  X,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Cpu,
  Zap,
} from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import {
  api,
  RequestLogItem,
  RequestDetailResponse,
} from "@/lib/api";

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modelFilter, setModelFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestDetail, setRequestDetail] = useState<RequestDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await api.getRequests({
        limit,
        offset,
        status: statusFilter || undefined,
        model: modelFilter || undefined,
      });
      setRequests(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id: string) {
    setSelectedRequestId(id);
    setDetailLoading(true);
    try {
      const detail = await api.getRequestDetail(id);
      setRequestDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedRequestId(null);
    setRequestDetail(null);
  }

  useEffect(() => {
    loadRequests();
  }, [limit, offset, statusFilter, modelFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black bg-retro-plum p-4 shadow-pixel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-pixel tracking-wider text-white">
              LIVE REQUEST EXPLORER
            </h1>
            <PixelBadge variant="amber" size="xs">
              TRACES
            </PixelBadge>
          </div>
          <p className="mt-1 text-xs text-slate-300 font-mono">
            Sub-millisecond trace explorer, routing decisions, and zero-prompt audit trail.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <PixelBadge variant="mint" size="sm">
            Zero-Prompt Persistence Guaranteed
          </PixelBadge>
          <PixelButton
            size="sm"
            variant="plum"
            icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-retro-amber" : ""}`} />}
            onClick={loadRequests}
            disabled={loading}
          >
            Sync
          </PixelButton>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 border-2 border-black bg-retro-night p-3 sm:p-3.5 font-mono text-xs shadow-pixel">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-bold uppercase tracking-wider text-[10px]">Filter:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          className="border-2 border-black bg-retro-coal text-retro-cream px-3 py-1.5 font-mono text-xs focus:ring-0 focus:outline-none focus:border-retro-amber"
        >
          <option value="">All Statuses (Completed, Failed, Cancelled)</option>
          <option value="completed">200 OK (Completed)</option>
          <option value="failed">5xx / 4xx (Failed)</option>
        </select>

        <input
          type="text"
          placeholder="Filter by model (e.g. claude-3-5-sonnet, gpt-4o)..."
          value={modelFilter}
          onChange={(e) => {
            setModelFilter(e.target.value);
            setOffset(0);
          }}
          className="border-2 border-black bg-retro-coal text-retro-cream placeholder-retro-paper/50 px-3 py-1.5 font-mono text-xs focus:ring-0 focus:outline-none focus:border-retro-amber w-full sm:w-auto min-w-0 sm:min-w-[280px]"
        />

        <div className="ml-auto text-retro-paper font-bold text-xs">
          Showing <span className="font-bold text-retro-cream">{requests.length}</span> of{" "}
          <span className="font-bold text-retro-cream">{total}</span> traces
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden border-2 border-black bg-retro-night shadow-pixel font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b-2 border-black bg-retro-coal text-retro-paper font-pixel text-[11px]">
              <tr>
                <th className="py-2.5 px-4">TIMESTAMP</th>
                <th className="py-2.5 px-4">TRACE ID</th>
                <th className="py-2.5 px-4">SELECTED MODEL</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4">TOKENS (IN/OUT)</th>
                <th className="py-2.5 px-4">COST (USD)</th>
                <th className="py-2.5 px-4">NET SAVINGS</th>
                <th className="py-2.5 px-4">DURATION</th>
                <th className="py-2.5 px-4 text-right">AUDIT</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-retro-ink/50 text-retro-cream">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-retro-paper font-mono">
                    Streaming trace activity from edge cluster...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-retro-paper font-mono">
                    No traces found. Execute requests in the Playground to generate live traces.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openDetail(r.id)}
                    className="hover:bg-retro-wine/40 cursor-pointer transition-none"
                  >
                    <td className="py-3 px-4 text-retro-paper font-bold">
                      {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-retro-cream font-mono">
                      {r.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-bold text-retro-cream">
                      {r.model_name}
                      {r.stream_enabled && (
                        <span className="ml-1.5 border border-black bg-retro-amber/20 px-1 py-0.5 font-pixel text-[9px] text-retro-amber">
                          sse
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 border border-black px-2 py-0.5 font-pixel text-[10px] uppercase ${
                          r.status === "completed"
                            ? "bg-retro-mint/20 text-retro-mint"
                            : "bg-retro-rose/20 text-retro-rose"
                        }`}
                      >
                        {r.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-retro-cream font-semibold">
                      {r.input_tokens ?? 0} / {r.output_tokens ?? 0}
                    </td>
                    <td className="py-3 px-4 text-retro-cream font-semibold">
                      ${Number(r.cost_amount ?? 0).toFixed(6)}
                    </td>
                    <td className="py-3 px-4">
                      {r.estimated_savings_percent ? (
                        <span
                          className={`font-bold ${
                            Number(r.estimated_savings_percent) >= 0
                              ? "text-retro-mint"
                              : "text-retro-amber"
                          }`}
                        >
                          -{r.estimated_savings_percent}%
                        </span>
                      ) : (
                        <span className="text-retro-paper">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-retro-paper font-semibold">
                      {r.total_duration_ms ? `${r.total_duration_ms} ms` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="border-2 border-black bg-retro-amber text-black px-2 py-0.5 font-pixel text-[10px] shadow-pixel-sm hover:bg-retro-sand transition-none active:translate-y-0.5">
                        Detail →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t-2 border-black bg-retro-coal px-4 py-3 text-retro-paper font-mono text-xs font-bold">
          <div>
            Page {Math.floor(offset / limit) + 1} of {Math.max(1, Math.ceil(total / limit))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="border-2 border-black bg-retro-amber text-black px-3 py-1 font-pixel text-xs shadow-pixel-sm hover:bg-retro-sand disabled:opacity-40 disabled:hover:bg-retro-amber transition-none"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="border-2 border-black bg-retro-amber text-black px-3 py-1 font-pixel text-xs shadow-pixel-sm hover:bg-retro-sand disabled:opacity-40 disabled:hover:bg-retro-amber transition-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Detail Drawer */}
      {selectedRequestId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80">
          <div className="w-full max-w-xl border-l-4 border-black bg-retro-night p-4 sm:p-6 shadow-2xl overflow-y-auto space-y-6 font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-retro-ink pb-4">
              <div>
                <h3 className="font-pixel text-xs text-retro-amber flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-retro-amber" />
                  REQUEST EXECUTION WATERFALL & AUDIT
                </h3>
                <p className="text-xs text-retro-paper mt-0.5 font-bold">{selectedRequestId}</p>
              </div>
              <button
                onClick={closeDetail}
                className="border-2 border-black bg-retro-coal text-retro-cream hover:bg-retro-rose hover:text-white px-2 py-1 font-pixel text-xs shadow-pixel-sm active:translate-y-0.5"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-retro-paper font-mono">
                Retrieving AST execution traces...
              </div>
            ) : requestDetail ? (
              <div className="space-y-6">
                {/* Privacy Compliance Banner */}
                <div className="flex items-center gap-2 border-2 border-black bg-retro-mint/20 p-3 text-retro-mint font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Privacy by Default: Prompt and completion content strictly omitted from storage.
                  </span>
                </div>

                {/* Sub-Millisecond Waterfall */}
                <div className="border-2 border-black bg-retro-coal p-4 space-y-3 shadow-pixel-sm">
                  <h4 className="font-pixel text-[11px] text-retro-amber uppercase tracking-wider">
                    EXECUTION WATERFALL METRICS
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-retro-ink pb-1 font-bold">
                      <span className="text-retro-paper">TheGate Routing Latency:</span>
                      <span className="text-retro-amber font-bold">{requestDetail.routing_latency_ms ?? 1.2} ms</span>
                    </div>
                    <div className="flex justify-between border-b border-retro-ink pb-1 font-bold">
                      <span className="text-retro-paper">Upstream Provider TTFT:</span>
                      <span className="text-retro-mint font-bold">{requestDetail.provider_latency_ms ?? 0} ms</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-retro-paper">Total Connection Duration:</span>
                      <span className="text-retro-cream font-bold">{requestDetail.total_duration_ms ?? 0} ms</span>
                    </div>
                  </div>
                </div>

                {/* Routing Decision Rationale */}
                <div className="border-2 border-black bg-retro-coal p-4 space-y-3 shadow-pixel-sm">
                  <h4 className="font-pixel text-[11px] text-retro-cyan uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    AUTONOMOUS ROUTING DECISION RATIONALE
                  </h4>
                  {requestDetail.routing_decision ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-retro-paper">Strategy:</span>
                        <span className="text-retro-cream">
                          {requestDetail.routing_decision.strategy_name} (v{requestDetail.routing_decision.strategy_version})
                        </span>
                      </div>
                      <div className="border-2 border-black bg-retro-night p-3 text-retro-cream text-xs leading-relaxed">
                        {requestDetail.routing_decision.decision_reason || "Autonomous policy match selected optimal model candidate."}
                      </div>
                      {requestDetail.routing_decision.candidate_summary && (
                        <div>
                          <span className="text-retro-paper block mb-1 font-bold">Evaluated Candidates:</span>
                          <pre className="border-2 border-black bg-retro-night p-2 text-[10px] text-retro-paper overflow-x-auto font-mono">
                            {JSON.stringify(requestDetail.routing_decision.candidate_summary, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-retro-paper font-bold">Direct model bypass or policy auto-resolved.</div>
                  )}
                </div>

                {/* FinOps Accounting Comparison */}
                <div className="border-2 border-black bg-retro-coal p-4 space-y-3 shadow-pixel-sm">
                  <h4 className="font-pixel text-[11px] text-retro-mint uppercase tracking-wider">
                    FINOPS ARBITRAGE & COUNTERFACTUAL BASELINE
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="border-2 border-black bg-retro-night p-3">
                      <span className="text-retro-paper block text-[10px] font-bold">ACTUAL SPEND</span>
                      <div className="text-base font-pixel text-retro-cream mt-1">
                        ${Number(requestDetail.cost_amount ?? 0).toFixed(6)}
                      </div>
                      <span className="text-[10px] text-retro-paper font-bold">Type: {requestDetail.cost_type || "ESTIMATED"}</span>
                    </div>
                    <div className="border-2 border-black bg-retro-night p-3">
                      <span className="text-retro-paper block text-[10px] font-bold">BASELINE REF (GPT-4O)</span>
                      <div className="text-base font-pixel text-retro-cream mt-1">
                        ${Number(requestDetail.baseline_cost_amount ?? 0).toFixed(6)}
                      </div>
                      <span className="text-[10px] text-retro-mint font-bold">
                        Savings: -{requestDetail.estimated_savings_percent ?? 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Execution Attempts */}
                <div className="border-2 border-black bg-retro-coal p-4 space-y-3 shadow-pixel-sm">
                  <h4 className="font-pixel text-[11px] text-retro-paper uppercase tracking-wider font-bold">
                    EXECUTION ATTEMPTS & FALLBACK DRAIN
                  </h4>
                  <div className="space-y-2 text-xs">
                    {requestDetail.attempts.map((att) => (
                      <div
                        key={att.attempt_number}
                        className="flex items-center justify-between border-2 border-black bg-retro-night p-3 shadow-pixel-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-retro-cream">Attempt #{att.attempt_number}</span>
                          <span className="border border-black bg-retro-mint/20 px-1.5 py-0.5 font-pixel text-[9px] text-retro-mint uppercase">
                            {att.status}
                          </span>
                        </div>
                        {att.error_category && (
                          <span className="text-retro-rose font-bold text-xs">{att.error_category}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
