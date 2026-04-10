'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area,
} from 'recharts'
import Link from 'next/link'
import { BarChart2, PieChart as PieIcon, TrendingUp } from 'lucide-react'

// ── Typen ─────────────────────────────────────────────────────
export type ProjektKostenData = {
  name: string
  budget: number
  istKosten: number
}

export type StatusData = {
  status: string
  count: number
  farbe: string
}

export type MonatsData = {
  monat: string
  projekte: number
  kunden: number
}

// ── Formatierung ──────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const eurKurz = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

// ── Shared: Leerer Zustand ────────────────────────────────────
function LeererZustand({
  icon: Icon,
  titel,
  text,
  ctaLabel,
  ctaHref,
}: {
  icon: React.ElementType
  titel: string
  text: string
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-10 gap-3">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600">{titel}</p>
        <p className="text-xs text-gray-400 mt-0.5 max-w-[200px]">{text}</p>
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}

// ── Shared: Custom Tooltip ────────────────────────────────────
type TooltipPayloadItem = { name: string; value: number; color: string }
type TooltipProps = { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }

function ChartTooltip({ active, payload, label, isEur }: TooltipProps & { isEur?: boolean }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      {label && <p className="text-xs font-semibold text-gray-900 mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{isEur ? eur(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

type DonutPayloadItem = { name: string; value: number; payload: StatusData }

function DonutTooltip({ active, payload, gesamt }: { active?: boolean; payload?: DonutPayloadItem[]; gesamt: number }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const pct = gesamt > 0 ? Math.round((p.value / gesamt) * 100) : 0
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-900">{p.name}</p>
      <p className="text-xs text-gray-600 mt-0.5">
        {p.value} Produkte · {pct}%
      </p>
    </div>
  )
}

// ── Chart 1: Projektkosten Balkendiagramm ─────────────────────
export function BalkenChart({ data }: { data: ProjektKostenData[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Budget vs. Ist-Kosten</h3>
        <p className="text-xs text-gray-400 mt-0.5">Aktive Projekte</p>
      </div>

      {data.length === 0 ? (
        <LeererZustand
          icon={BarChart2}
          titel="Keine Projektdaten"
          text="Lege Projekte mit Budget an, um die Kostenübersicht zu sehen."
          ctaLabel="Neues Projekt"
          ctaHref="/dashboard/projekte/neu"
        />
      ) : (
        <div className="flex-1 min-h-0 px-4 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={eurKurz}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload as unknown as TooltipPayloadItem[] | undefined}
                    label={String(props.label ?? '')}
                    isEur
                  />
                )}
                cursor={{ fill: '#F9FAFB' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Bar dataKey="budget" name="Budget" fill="#6366F1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="istKosten" name="Ist-Kosten" radius={[3, 3, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.istKosten > entry.budget ? '#EF4444' : '#10B981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Chart 2: Freigabe-Status Donut ────────────────────────────
export function DonutChart({ data, gesamt }: { data: StatusData[]; gesamt: number }) {
  const hatDaten = gesamt > 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Freigabe-Status</h3>
        <p className="text-xs text-gray-400 mt-0.5">Alle Produkte</p>
      </div>

      {!hatDaten ? (
        <LeererZustand
          icon={PieIcon}
          titel="Keine Produkte"
          text="Füge Produkte zu Projekten hinzu, um die Statusverteilung zu sehen."
          ctaLabel="Zu den Projekten"
          ctaHref="/dashboard/projekte"
        />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col px-4 py-3">
          {/* Donut mit Overlay */}
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={90}
                  dataKey="count"
                  nameKey="status"
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.farbe} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={(props) => (
                  <DonutTooltip
                    active={props.active}
                    payload={props.payload as unknown as DonutPayloadItem[] | undefined}
                    gesamt={gesamt}
                  />
                )} />
              </PieChart>
            </ResponsiveContainer>
            {/* Mittige Zahl */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-900 leading-none">{gesamt}</span>
              <span className="text-[11px] text-gray-400 mt-1 font-medium">Produkte</span>
            </div>
          </div>

          {/* Legende */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 w-full px-2">
            {data.map((d) => (
              <div key={d.status} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.farbe }}
                />
                <span className="text-xs text-gray-600 truncate">{d.status}</span>
                <span className="text-xs font-semibold text-gray-900 ml-auto">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Chart 3: Aktivitäts-Liniendiagramm ───────────────────────
export function LinienChart({ data }: { data: MonatsData[] }) {
  const hatAktivitaet = data.some((d) => d.projekte > 0 || d.kunden > 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Aktivität</h3>
          <p className="text-xs text-gray-400 mt-0.5">Neue Projekte und Kunden – letzte 6 Monate</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-[#6366F1] inline-block" />
            Projekte
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-[#10B981] inline-block" />
            Kunden
          </span>
        </div>
      </div>

      {!hatAktivitaet ? (
        <div className="flex-1 min-h-0">
          <LeererZustand
            icon={TrendingUp}
            titel="Noch keine Aktivität"
            text="Hier erscheinen neue Projekte und Kunden der letzten 6 Monate."
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 px-4 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gradProjekte" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradKunden" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="monat"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as unknown as TooltipPayloadItem[] | undefined}
                  label={String(props.label ?? '')}
                />
              )} />
              <Area
                type="monotone"
                dataKey="projekte"
                name="Projekte"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#gradProjekte)"
                dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#6366F1', strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="kunden"
                name="Kunden"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#gradKunden)"
                dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#10B981', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
