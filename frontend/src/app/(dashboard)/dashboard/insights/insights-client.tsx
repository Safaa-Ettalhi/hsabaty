/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Sparkles, TrendingDown, TrendingUp, AlertCircle, Compass, BrainCircuit, Zap, ArrowDownCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"

const TABS = [
  { value: "insights", label: "Insights Globaux", path: "/api/conseils/insights", key: "insights", icon: BrainCircuit, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
  { value: "reduction", label: "Réduire les Dépenses", path: "/api/conseils/recommandations/reduction-depenses", key: "recommandations", icon: TrendingDown, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
  { value: "optimisation", label: "Optimiser l'Épargne", path: "/api/conseils/recommandations/optimisation-epargne", key: "recommandations", icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  { value: "inhabituelles", label: "Anomalies", path: "/api/conseils/depenses-inhabituelles", key: "depensesInhabituelles", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { value: "planification", label: "Planification", path: "/api/conseils/planification", key: "conseils", icon: Compass, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
] as const

type InsightItem = { transaction?: { description: string; montant: number; categorie: string }; montant: number; moyenneMoisPrecedent: number; ecart: number }
type TabData = { text?: string; list?: InsightItem[] }

const formatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

export function InsightsClient() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].value)
  const [data, setData] = useState<Record<string, TabData>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const tab = TABS.find((t) => t.value === activeTab)
    if (!tab) return
    if (data[activeTab]) return

    setLoading((l) => ({ ...l, [activeTab]: true }))
    api.get(tab.path).then((res) => {
      if (res.succes && res.donnees) {
        const d = res.donnees as any
        if (tab.key === "depensesInhabituelles") {
          setData((prev) => ({
            ...prev,
            [activeTab]: { list: d.depensesInhabituelles ?? [] },
          }))
        } else {
          setData((prev) => ({
            ...prev,
            [activeTab]: { text: d[tab.key] ?? d.recommandations ?? d.conseils ?? "" },
          }))
        }
      }
    }).finally(() => setLoading((l) => ({ ...l, [activeTab]: false })))
  }, [activeTab])

  const current = data[activeTab]
  const isLoading = loading[activeTab]
  const tabConfig = TABS.find((t) => t.value === activeTab)!

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-16 text-center min-h-100 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-3xl">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl animate-pulse"></div>
            <div className="size-20 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center relative shadow-sm border border-violet-100 dark:border-violet-500/20">
              <BrainCircuit className="size-10 text-violet-600 dark:text-violet-400 animate-pulse" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">L&apos;IA analyse vos données...</h3>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
            Notre moteur d&apos;intelligence artificielle recherche des modèles dans vos transactions pour vous fournir les meilleurs conseils.
          </p>
        </div>
      )
    }

    if (tabConfig.key === "depensesInhabituelles" && current?.list) {
      if (!current.list.length) {
        return (
          <div className="flex flex-col items-center justify-center p-16 text-center min-h-100 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-3xl">
            <div className="size-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-5 border border-emerald-100 dark:border-emerald-900/30">
              <Sparkles className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">Aucune anomalie détectée</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
              Vos dépenses semblent parfaitement alignées avec vos habitudes. Excellent travail de gestion !
            </p>
          </div>
        )
      }

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-3xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="size-14 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-700/50 relative z-10 shadow-sm">
              <AlertTriangle className="size-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl md:text-2xl font-extrabold text-amber-900 dark:text-amber-100 tracking-tight">Dépenses Inhabituelles Détectées</h3>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mt-1">
                L&apos;IA a repéré {current.list.length} transaction{current.list.length > 1 ? 's' : ''} dépassant largement vos moyennes habituelles.
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-200 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/30 shadow-sm">
              <div className="grid grid-cols-12 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200/80 dark:border-zinc-800/80 font-bold text-xs uppercase tracking-wider text-zinc-500">
                <div className="col-span-4 p-4 px-5">Transaction</div>
                <div className="col-span-3 p-4 px-5">Catégorie</div>
                <div className="col-span-2 p-4 px-5 text-right">Moyenne</div>
                <div className="col-span-3 p-4 px-5 text-right">Débit & Écart</div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900">
                {current.list.map((item, i) => {
                  const severityColor = item.ecart > 100 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400";
                  const severityBg = item.ecart > 100 ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-900/30" : "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-900/30";

                  return (
                    <div key={i} className="grid grid-cols-12 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors group">
                      <div className="col-span-4 p-4 px-5 flex items-center gap-3">
                        <div className={cn("size-10 rounded-xl flex items-center justify-center border shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105", severityBg)}>
                          {item.ecart > 100 ? (
                            <TrendingUp className={cn("size-5", severityColor)} />
                          ) : (
                            <AlertCircle className={cn("size-5", severityColor)} />
                          )}
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-[15px]" title={item.transaction?.description ?? "Dépense inhabituelle"}>
                          {item.transaction?.description ?? "Dépense inhabituelle"}
                        </span>
                      </div>
                      <div className="col-span-3 p-4 px-5 flex items-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                          {item.transaction?.categorie ?? "Non catégorisé"}
                        </span>
                      </div>
                      <div className="col-span-2 p-4 px-5 flex items-center justify-end">
                        <span className="font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums text-[15px]">
                          {formatter.format(item.moyenneMoisPrecedent)}
                        </span>
                      </div>
                      <div className="col-span-3 p-4 px-5 flex items-center justify-end gap-3">
                        <span className="font-black text-zinc-900 dark:text-zinc-100 tabular-nums text-lg">
                          {formatter.format(item.montant)}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black tabular-nums border shadow-sm", severityBg, severityColor)}>
                          <ArrowDownCircle className="size-3 rotate-180" />
                          +{item.ecart?.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (current?.text) {
      const blocks = current.text.split('\n');

      const formatInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-zinc-900 dark:text-zinc-50">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      const processedBlocks: any[] = [];
      let currentTable: string[] | null = null;

      for (let i = 0; i < blocks.length; i++) {
        const trimmed = blocks[i].trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
          if (!currentTable) currentTable = [];
          currentTable.push(trimmed);
        } else {
          if (currentTable) {
            processedBlocks.push({ type: 'table', rows: currentTable });
            currentTable = null;
          }
          processedBlocks.push({ type: 'line', content: blocks[i] });
        }
      }
      if (currentTable) processedBlocks.push({ type: 'table', rows: currentTable });

      return (
        <div className="w-full relative rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-6 md:p-8 xl:p-10 shadow-sm transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className={cn("size-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-colors", tabConfig.bg, tabConfig.color, "border-current/10")}>
              <tabConfig.icon className="size-7" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">{tabConfig.label}</h2>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1.5">
                <Sparkles className="size-4 text-violet-500" /> Analyse approfondie générée par l&apos;IA
              </p>
            </div>
          </div>

          <div dir="auto" className="space-y-1.5 w-full">
            {processedBlocks.map((item, i) => {
              if (item.type === 'table') {
                const headerRow = item.rows[0];
                const hasSeparator = item.rows.length > 1 && item.rows[1].startsWith('|-');
                const bodyRows = hasSeparator ? item.rows.slice(2) : item.rows.slice(1);
                const headerCells = headerRow.split('|').filter((c: string) => c.trim() !== '');

                return (
                  <div key={i} className="my-6 w-full overflow-x-auto pb-2">
                    <div className="min-w-175 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/30">
                      <div className="grid bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200/80 dark:border-zinc-800/80 font-bold text-xs uppercase tracking-wider text-zinc-500" style={{ gridTemplateColumns: `repeat(${headerCells.length}, minmax(0, 1fr))` }}>
                        {headerCells.map((cell: string, idx: number) => (
                          <div key={idx} className="p-3.5 px-4 leading-relaxed whitespace-pre-wrap">{formatInline(cell.trim())}</div>
                        ))}
                      </div>
                      {bodyRows.map((row: string, rowIdx: number) => {
                        const cells = row.split('|').filter((c: string) => c.trim() !== '');
                        const colCount = Math.max(headerCells.length, cells.length);
                        return (
                          <div key={rowIdx} className={cn("grid text-[14px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors", rowIdx !== bodyRows.length - 1 && "border-b border-zinc-100 dark:border-zinc-800/80")} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
                            {cells.map((cell: string, idx: number) => (
                              <div key={idx} className="p-3.5 px-4 leading-relaxed whitespace-pre-wrap">{formatInline(cell.trim())}</div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              const trimmed = item.content.trim();
              if (!trimmed) return <div key={i} className="h-2"></div>;

              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={i} className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3 mt-8 mb-4">
                    <span className={cn("w-1.5 h-6 rounded-full bg-current shrink-0", tabConfig.color)}></span>
                    <span>{formatInline(trimmed.substring(3))}</span>
                  </h3>
                );
              }
              if (trimmed.startsWith('# ')) {
                return <h2 key={i} className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-10 mb-5">{formatInline(trimmed.substring(2))}</h2>;
              }

              if (trimmed === '---' || trimmed === '***') {
                return <div key={i} className="h-px w-full bg-zinc-200 dark:bg-zinc-800 my-8"></div>;
              }

              const isFullBold = trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 150;
              if (isFullBold && !trimmed.includes('|')) {
                return (
                  <div key={i} className="pt-6 pb-2">
                    <h4 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100 flex items-start gap-2.5">
                      <span className={cn("mt-1.5 size-1.5 rounded-full bg-current shrink-0", tabConfig.color)}></span>
                      <span className="leading-snug">{trimmed.slice(2, -2)}</span>
                    </h4>
                  </div>
                );
              }

              if (/^\d+\.\s/.test(trimmed)) {
                const match = trimmed.match(/^(\d+)\.\s(.*)/);
                if (match) {
                  return (
                    <div key={i} className="pt-5 pb-1.5 flex items-start gap-3.5">
                      <span className={cn("shrink-0 flex items-center justify-center size-8 rounded-full text-sm font-extrabold shadow-sm border mt-0.5", tabConfig.bg, tabConfig.color, "border-current/10")}>
                        {match[1]}
                      </span>
                      <div className="text-[15.5px] font-bold text-zinc-900 dark:text-zinc-100 pt-1 leading-relaxed">
                        {formatInline(match[2])}
                      </div>
                    </div>
                  );
                }
              }

              if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                return (
                  <div key={i} className="flex items-start gap-3 pl-2 sm:pl-4 py-1.5">
                    <div className="mt-2.5 size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0"></div>
                    <div className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[15px]">
                      {formatInline(trimmed.substring(2))}
                    </div>
                  </div>
                );
              }

              if (trimmed.startsWith('>')) {
                return (
                  <div key={i} className="my-6 p-4 md:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 flex gap-3.5 text-blue-800 dark:text-blue-300">
                    <div className="mt-0.5 shrink-0 text-violet-500">
                      <Sparkles className="size-5" />
                    </div>
                    <div className="text-[14px] leading-relaxed font-medium italic">
                      {formatInline(trimmed.substring(1).trim())}
                    </div>
                  </div>
                );
              }

              return (
                <p key={i} className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[15px] pt-1 pb-1">
                  {formatInline(trimmed)}
                </p>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-16 text-center min-h-100 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-3xl">
        <div className="size-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5 border border-zinc-200 dark:border-zinc-700">
          <Zap className="size-8 text-zinc-400" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">Aucun conseil pour le moment</h3>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
          L&apos;intelligence artificielle a besoin de plus de données (transactions, budgets) pour formuler des recommandations pertinentes. Revenez plus tard !
        </p>
      </div>
    )
  }

  return (
    <DashboardPageShell contentClassName="gap-6">
      <DashboardPageHeader
        badge={{
          icon: Sparkles,
          label: "Conseils & Insights",
          className:
            "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
        }}
        title="Conseils & Insights"
        description="Recommandations personnalisées pour optimiser vos finances — propulsé par l&apos;IA."
        className="shrink-0"
      />

      <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar shrink-0">
        <div className="flex gap-2 min-w-max">
          {TABS.map((t) => {
            const isActive = activeTab === t.value
            return (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all border shadow-xs outline-none",
                  isActive
                    ? "border-violet-600 bg-violet-600 text-white shadow-md dark:border-violet-500 dark:bg-violet-600"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                )}
              >
                <t.icon className={cn("size-4", isActive ? "text-current" : t.color.split(' ')[0])} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-2 shrink-0">
        {renderContent()}
      </div>
    </DashboardPageShell>
  )
}
