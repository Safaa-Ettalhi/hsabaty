"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type LogoProps = {
  className?: string
}

function getDocDark(): boolean {
  if (typeof document === "undefined") return false
  return document.documentElement.classList.contains("dark")
}

export function Logo({ className = "h-10 w-auto" }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [docDark, setDocDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDocDark(getDocDark())
  }, [])

  // Sync with actual DOM class (next-themes sets class on <html>) so logo updates even if resolvedTheme lags
  useEffect(() => {
    if (!mounted) return
    const el = document.documentElement
    setDocDark(el.classList.contains("dark"))
    const obs = new MutationObserver(() => setDocDark(el.classList.contains("dark")))
    obs.observe(el, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [mounted])

  const isDark = mounted && (resolvedTheme === "dark" || docDark)

  // Two images: visibility via inline style so logo switches everywhere (dashboard + auth).
  // Hidden one keeps layout space; absolute one overlays so the right asset is shown.
  return (
    <span className={cn("relative inline-block", className)}>
      <img
        src="/logo.svg"
        alt="Hssabaty"
        className={className}
        style={{ visibility: isDark ? "hidden" : "visible" }}
      />
      <img
        src="/light-logo.svg"
        alt="Hssabaty"
        className={className}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          visibility: isDark ? "visible" : "hidden",
        }}
      />
    </span>
  )
}
