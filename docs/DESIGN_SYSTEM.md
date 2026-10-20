# TheGate — Design System: Obsidian Telemetry
## Visual Design Language for the AI Control Plane

**Version:** 1.0  
**Design Direction:** Obsidian Telemetry  
**Target Persona:** Staff Infrastructure Engineers, SREs, FinOps Directors, AI Platform Architects

---

## 1. Design Direction & Aesthetic Principles

**Obsidian Telemetry** is a dense, high-contrast, information-dense dark mode designed for mission-critical operations software. It reflects the calm, technical precision of industrial control rooms and aerospace telemetry displays.

### Principles:
1. **Calm Authority**: Deep neutral dark surfaces with subtle warm obsidian undertones. No distracting colorful gradients or frivolous eye-candy.
2. **Restrained Amber (`#FFB71B`)**: Brand amber is used purposefully for primary actions, active states, and highlighted metrics. It is never applied indiscriminately across every border or card.
3. **Information Density**: Tabular data, execution metrics, and trace identifiers are tightly packed with monospaced alignment to maximize situational awareness.
4. **Legibility & Contrast**: Every text element satisfies or exceeds WCAG 2.2 AA contrast requirements (4.5:1 minimum contrast ratio).

---

## 2. Color Palette & Token Registry

| Token Name | Hex Code | Semantic Role | Contrast vs `#0B0D10` |
| :--- | :--- | :--- | :--- |
| **Background Base** | `#0B0D10` | Main application background | Baseline (1:1) |
| **Surface Low** | `#101318` | Persistent sidebar, table headers | 1.15:1 |
| **Surface Mid** | `#151920` | Telemetry panels, operational cards | 1.3:1 |
| **Surface High** | `#1B2028` | Elevated dialogs, drawer surfaces | 1.5:1 |
| **Border Subdued** | `#2A303A` | Dividers, card borders, outlines | 2.2:1 |
| **Brand Primary** | `#FFB71B` | Primary CTAs, active selection emphasis | 11.8:1 (AAA) |
| **Brand Hover** | `#EAA411` | Interactive hover state for brand controls | 10.2:1 (AAA) |
| **Operational Healthy** | `#36C98F` | Operational status, positive cost savings | 9.5:1 (AAA) |
| **Metric Warning** | `#F5B942` | Approaching tripwire limits, degraded status | 11.2:1 (AAA) |
| **Critical Fault** | `#F16D73` | Server errors (5xx), tripwire breach, rollbacks | 7.4:1 (AAA) |
| **Telemetry Info** | `#7AA7FF` | Latency metrics, informational badges | 9.1:1 (AAA) |
| **Primary Text** | `#EDEDED` | Main headings, metric values, body text | 15.2:1 (AAA) |
| **Secondary Text** | `#9CA3AF` | Labels, metadata, timestamps, units | 7.8:1 (AAA) |
| **Tertiary Text** | `#64748B` | Disabled controls, table borders, footers | 4.6:1 (AA) |

---

## 3. Typography Standards

The typography system pairs clean modern sans-serif typography for navigation and structure with monospaced tabular numerals for technical metrics.

### Type Stacks:
- **Interface Text (`font-sans`)**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
- **Telemetry & Technical Code (`font-mono`)**: `JetBrains Mono`, `Geist Mono`, `ui-monospace`, `Menlo`, `Consolas`, `monospace`.

### Typography Scale:
- **Page Titles**: `20px` (`text-xl`), bold (`font-bold`), monospaced uppercase, tracking `-0.02em`.
- **Card Headings**: `14px` (`text-sm`), bold, uppercase, tracking `0.05em`.
- **KPI Primary Value**: `24px` - `30px`, extra bold (`font-extrabold`), monospaced tabular numerals.
- **Table Data & Traces**: `12px` (`text-xs`), regular/medium, monospaced tabular numerals.
- **Labels & Micro-Badges**: `10px` - `11px`, bold, uppercase, monospaced.

---

## 4. Component Anatomy

### 4.1 KPI Telemetry Cards
- Surface: `#151920` (Surface Mid).
- Border: 1px `#2A303A`.
- Spacing: `16px` padding (`p-4`).
- Header: Micro uppercase label (`text-[10px] text-slate-400 font-bold tracking-wider`) with functional Lucide icon.
- Value: Large monospaced value (`text-2xl font-bold font-mono text-white`).
- Footer: Sub-metric comparison line with subtle 1px divider (`border-t border-[#2A303A] pt-2`).

### 4.2 Dense Data Tables
- Header: Background `#0B0D10` with border `#2A303A`, text `text-[10px] text-slate-400 uppercase font-mono font-bold`.
- Rows: Background `#151920` with subtle hover `#222834` (`hover:bg-obsidian-hover/40`).
- Dividers: 1px `#2A303A` between rows.
- Numerical Cells: Always formatted with `font-mono tabular-nums` for strict vertical alignment.

### 4.3 Status Badges
Every badge pairs a color container with explicit text:
- **Healthy (`200 OK`)**: Background `rgba(54, 201, 143, 0.12)`, text `#36C98F`, border `1px solid rgba(54, 201, 143, 0.3)`.
- **Fault (`5xx ERROR`)**: Background `rgba(241, 109, 115, 0.15)`, text `#F16D73`, border `1px solid rgba(241, 109, 115, 0.35)`.
- **Warning (`DEGRADED`)**: Background `rgba(245, 185, 66, 0.12)`, text `#F5B942`, border `1px solid rgba(245, 185, 66, 0.3)`.
- **Active Canary**: Background `rgba(255, 183, 27, 0.12)`, text `#FFB71B`, border `1px solid rgba(255, 183, 27, 0.28)`.

### 4.4 Micro-Interactions & Animation Standards
- **Radar Pulse**: Applied exclusively to live ingress cluster indicators (`2s` cubic-bezier pulse on 2px emerald dot).
- **Transitions**: Smooth `150ms ease-in-out` on interactive buttons and table rows.
- **Restraint**: Zero gratuitous bouncy physics or distracting marquee tickers.
