"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(false)
  }, [pathname, searchParams])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return

      const url = new URL(anchor.href, window.location.origin)
      if (url.origin !== window.location.origin) return

      const next = `${url.pathname}${url.search}`
      const current = `${window.location.pathname}${window.location.search}`
      if (next !== current) {
        setActive(true)
      }
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [])

  if (!active) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-primary/20">
      <div className="h-full w-1/3 animate-[navigation-progress_0.9s_ease-in-out_infinite] bg-primary" />
    </div>
  )
}
