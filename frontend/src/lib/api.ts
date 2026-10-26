/**
 * TheGate Dashboard API Client & Type Definitions
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:4848");
export const DEFAULT_API_KEY =
  process.env.NEXT_PUBLIC_DEFAULT_API_KEY || "tg_live_dev_test_key_1234567890abcdef";

export interface AnalyticsOverview {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_cost: string;
  baseline_cost: string;
  net_savings_amount: string;
  net_savings_percent: string | null;
  avg_latency_ms: number;
  p95_latency_ms: number;
}

export interface ModelAnalyticsItem {
  model_name: string;
  model_id: string | null;
  request_count: number;
  percentage: number;
  total_cost: string;
  total_tokens: number;
}

export interface ModelAnalyticsResponse {
  items: ModelAnalyticsItem[];
  total_requests: number;
}

export interface CostTimeSeriesItem {
  timestamp: string;
  total_cost: string;
  baseline_cost: string;
  request_count: number;
}

export interface CostTimeSeriesResponse {
  items: CostTimeSeriesItem[];
}

export interface RequestLogItem {
  id: string;
  timestamp: string;
  status: "completed" | "failed" | "cancelled" | string;
  model_name: string;
  routing_policy_name: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_duration_ms: number | null;
  cost_amount: string | null;
  cost_type: "PROVIDER_REPORTED" | "ESTIMATED" | "UNKNOWN" | string | null;
  baseline_cost_amount: string | null;
  estimated_savings_percent: string | null;
  stream_enabled: boolean;
  error_category: string | null;
}

export interface RequestLogListResponse {
  items: RequestLogItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface RoutingDecisionItem {
  strategy_name: string;
  strategy_version: string;
  decision_reason: string | null;
  candidate_summary: Record<string, unknown> | null;
  decision_latency_ms: number | null;
}

export interface RequestAttemptItem {
  attempt_number: number;
  status: string;
  error_category: string | null;
  usage_metadata: Record<string, unknown> | null;
}

export interface RequestDetailResponse {
  id: string;
  timestamp: string;
  status: string;
  model_name: string;
  selected_model_id: string | null;
  routing_policy_id: string | null;
  routing_policy_name: string | null;
  routing_policy_version: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_amount: string | null;
  cost_currency: string;
  cost_type: string | null;
  baseline_cost_amount: string | null;
  estimated_savings_percent: string | null;
  routing_latency_ms: number | null;
  provider_latency_ms: number | null;
  total_duration_ms: number | null;
  stream_enabled: boolean;
  error_category: string | null;
  routing_decision: RoutingDecisionItem | null;
  attempts: RequestAttemptItem[];
}

export interface RoutingPolicy {
  id: string;
  name: string;
  mode: "economy" | "balanced" | "quality";
  configuration: Record<string, unknown>;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelPricingEntry {
  id: string;
  input_price_per_million: string;
  output_price_per_million: string;
  effective_from: string;
  effective_to: string | null;
}

export interface ModelRegistryItem {
  id: string;
  internal_name: string;
  backend_model_id: string;
  provider_adapter: string;
  capabilities: Record<string, unknown>;
  context_limit: number | null;
  enabled: boolean;
  pricing_entries: ModelPricingEntry[];
}

// API Fetch Helpers
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  let authHeader: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("thegate_auth_token");
      if (token) {
        authHeader["Authorization"] = `Bearer ${token}`;
      }
    } catch {}
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const json = await res.json();
      errorDetail = json.detail || json.error?.message || errorDetail;
    } catch {
      // fallback to status text
    }
    throw new Error(`API error (${res.status}): ${errorDetail}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getOverview: () => fetchApi<AnalyticsOverview>("/api/v1/analytics/overview"),
  getModelAnalytics: () => fetchApi<ModelAnalyticsResponse>("/api/v1/analytics/models"),
  getCostsTimeSeries: () => fetchApi<CostTimeSeriesResponse>("/api/v1/analytics/costs"),
  getRequests: (params?: {
    limit?: number;
    offset?: number;
    model?: string;
    status?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set("limit", params.limit.toString());
    if (params?.offset !== undefined) q.set("offset", params.offset.toString());
    if (params?.model) q.set("model", params.model);
    if (params?.status) q.set("status", params.status);
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return fetchApi<RequestLogListResponse>(`/api/v1/requests${queryString}`);
  },
  getRequestDetail: (id: string) => fetchApi<RequestDetailResponse>(`/api/v1/requests/${id}`),
  getPolicies: async () => {
    const data = await fetchApi<any>("/api/v1/policies");
    return Array.isArray(data) ? data : (data.policies || []);
  },
  updatePolicy: (id: string, data: { mode?: string; is_active?: boolean; configuration?: Record<string, unknown> }) =>
    fetchApi<RoutingPolicy>(`/api/v1/policies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getModels: async () => {
    const data = await fetchApi<{ models: ModelRegistryItem[]; total: number }>("/api/v1/models");
    return data.models || [];
  },
  getRouterConfig: () =>
    fetchApi<RouterConfigResponse>("/api/v1/providers/config"),
  updateRouterConfig: (data: {
    provider_adapter: string;
    base_url: string;
    api_key?: string | null;
    timeout_seconds?: number;
  }) =>
    fetchApi<RouterConfigResponse>("/api/v1/providers/config", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  testRouterConnection: (data: {
    base_url: string;
    api_key?: string | null;
    timeout_seconds?: number;
  }) =>
    fetchApi<RouterTestResponse>("/api/v1/providers/test", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  syncRouterModels: (data?: {
    base_url?: string;
    api_key?: string | null;
    provider_adapter?: string;
  }) =>
    fetchApi<{
      success: boolean;
      synced_count: number;
      message: string;
      models: ModelRegistryItem[];
    }>("/api/v1/providers/sync-models", {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),
  clearModels: () =>
    fetchApi<{ success: boolean; message: string }>("/api/v1/providers/models", {
      method: "DELETE",
    }),
  getLiveTraffic: () =>
    fetchApi<LiveTrafficResponse>("/api/v1/analytics/live-traffic"),
  sendTestIngress: (modelId?: string) =>
    fetchApi<{
      success: boolean;
      model: string;
      provider: string;
      input_tokens: number;
      output_tokens: number;
      duration_ms: number;
      response_text: string;
    }>("/api/v1/providers/test-ingress-prompt", {
      method: "POST",
      body: JSON.stringify({ model_id: modelId || "ag/gemini-3.8-flash-high" }),
    }),

  // Role & AI Workforce API
  getRoles: () => fetchApi<RoleItem[]>("/api/v1/roles"),
  createRole: (payload: RoleCreatePayload) =>
    fetchApi<RoleItem>("/api/v1/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getRole: (id: string) => fetchApi<RoleItem>(`/api/v1/roles/${id}`),
  updateRole: (id: string, payload: RoleUpdatePayload) =>
    fetchApi<RoleItem>(`/api/v1/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteRole: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/api/v1/roles/${id}`, {
      method: "DELETE",
    }),
  generateRoleContext: (payload: { role_name: string; department?: string; key_focus?: string }) =>
    fetchApi<GenerateContextResponse>("/api/v1/roles/generate-context", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Authentication & Password Management
  login: (password: string) =>
    fetchApi<{ success: boolean; token: string; message: string; is_default_password: boolean }>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ password }),
      }
    ),
  getAuthStatus: () =>
    fetchApi<{ authenticated: boolean; is_default_password: boolean }>("/api/v1/auth/status"),
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchApi<{ success: boolean; token: string; message: string }>("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
  logout: () =>
    fetchApi<{ success: string; message: string }>("/api/v1/auth/logout", {
      method: "POST",
    }),
};

export interface LiveTrafficEvent {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  raw_model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  status: string;
  source: string;
}

export interface LiveTrafficResponse {
  recent_requests: LiveTrafficEvent[];
  active_models: string[];
  primary_active_model: string;
  active_provider: string;
  latest_event_id: string | null;
  total_ingress_count: number;
  total_spend_usd: number;
}

export interface RouterConfigResponse {
  provider_adapter: string;
  base_url: string;
  api_key_masked: string | null;
  timeout_seconds: number;
  is_connected: boolean;
  last_ping_ms: number | null;
  detected_models: string[];
  message: string | null;
}

export interface RouterTestResponse {
  success: boolean;
  latency_ms: number | null;
  status_code: number | null;
  message: string;
  detected_models: string[];
}

export interface RoleItem {
  id: string;
  name: string;
  role_key: string;
  department: string;
  context_behavior: string;
  preferred_model_id: string | null;
  hair_color: string;
  shirt_color: string;
  tie_color: string | null;
  has_glasses: boolean;
  has_headset: boolean;
  is_default: boolean;
  current_activity: string;
  created_at: string;
  updated_at: string;
}

export interface RoleCreatePayload {
  name: string;
  role_key?: string;
  department: string;
  context_behavior: string;
  preferred_model_id?: string | null;
  hair_color?: string;
  shirt_color?: string;
  tie_color?: string | null;
  has_glasses?: boolean;
  has_headset?: boolean;
  is_default?: boolean;
}

export interface RoleUpdatePayload {
  name?: string;
  department?: string;
  context_behavior?: string;
  preferred_model_id?: string | null;
  hair_color?: string;
  shirt_color?: string;
  tie_color?: string | null;
  has_glasses?: boolean;
  has_headset?: boolean;
  is_default?: boolean;
  current_activity?: string;
}

export interface GenerateContextResponse {
  role_name: string;
  department: string;
  generated_context: string;
  suggested_models: string[];
  suggested_appearance: {
    hair_color?: string;
    shirt_color?: string;
    tie_color?: string;
    has_glasses?: boolean;
    has_headset?: boolean;
  };
}


