/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey"

export type SankeyNode = { id: string; name: string }
export type SankeyLink = { source: string; target: string; value: number }

type Props = {
  nodes: SankeyNode[]
  links: SankeyLink[]
  width?: number
  height?: number
  formatValue: (n: number) => string
}

export function SankeyFlux({
  nodes: nodesInput,
  links: linksInput,
  width = 900,
  height = 360,
  formatValue,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ w: width, h: height })

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || width
      setSize({ w: Math.max(400, w), h: height })
    })
    ro.observe(el)
    const w = el.clientWidth || width
    setSize({ w: Math.max(400, w), h: height })
    return () => ro.disconnect()
  }, [width, height])

  const graph = React.useMemo(() => {
    if (!nodesInput?.length || !linksInput?.length) return null
    const nodes = nodesInput.map((n) => ({ ...n }))
    const links = linksInput.map((l) => ({ ...l }))
    try {
      const layout = (d3Sankey as any)()
        .nodeId((d: any) => d.id)
        .nodeWidth(18)
        .nodePadding(12)
        .extent([
          [12, 12],
          [size.w - 12, size.h - 12],
        ])
      return layout({ nodes, links } as any)
    } catch {
      return null
    }
  }, [nodesInput, linksInput, size.w, size.h])

  const linkPath = sankeyLinkHorizontal()

  if (!graph || !graph.nodes?.length) {
    return (
      <div
        ref={containerRef}
        className="flex min-h-50 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50"
      >
        Pas assez de données pour le diagramme Sankey sur cette période.
      </div>
    )
  }

  const { nodes, links } = graph

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950/40"
    >
      <svg
        width={size.w}
        height={size.h}
        className="mx-auto block rounded-2xl text-zinc-800 dark:text-zinc-200"
        role="img"
        aria-label="Diagramme Sankey des flux de trésorerie"
      >
        <defs>
          {links.map((link: any, i: number) => {
            const id = `grad-${i}`
            const fromHub = link.source.id === "hub-flux" || link.target.id === "hub-flux"
            const c1 = fromHub ? "#10b981" : "#6366f1"
            const c2 = fromHub ? "#f43f5e" : "#a855f7"
            return (
              <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={c1} stopOpacity={0.55} />
                <stop offset="100%" stopColor={c2} stopOpacity={0.45} />
              </linearGradient>
            )
          })}
        </defs>
        {/* Liens */}
        <g fill="none">
          {links.map((link: any, i: number) => (
            <path
              key={i}
              d={linkPath(link) as string}
              stroke={`url(#grad-${i})`}
              strokeWidth={Math.max(2, link.width ?? 2)}
              opacity={0.85}
              className="transition-opacity hover:opacity-100"
            >
              <title>
                {link.source.name} → {link.target.name}: {formatValue(link.value)}
              </title>
            </path>
          ))}
        </g>
        {/* Nœuds */}
        <g>
          {nodes.map((node: any) => (
            <g key={node.id} transform={`translate(${node.x0},${node.y0})`}>
              <rect
                width={node.x1 - node.x0}
                height={node.y1 - node.y0}
                fill={
                  node.id === "hub-flux"
                    ? "#6366f1"
                    : node.id.startsWith("rev-")
                      ? "#10b981"
                      : node.id === "epargne"
                        ? "#0ea5e9"
                        : node.id.startsWith("dep-") || node.id === "source-deficit"
                          ? "#f43f5e"
                          : "#94a3b8"
                }
                rx={3}
                opacity={0.9}
              />
              <text
                x={node.x0 < size.w / 2 ? -6 : node.x1 - node.x0 + 6}
                y={(node.y1 - node.y0) / 2}
                dy="0.35em"
                textAnchor={node.x0 < size.w / 2 ? "end" : "start"}
                className="fill-zinc-700 text-[11px] font-medium dark:fill-zinc-200"
              >
                {node.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
