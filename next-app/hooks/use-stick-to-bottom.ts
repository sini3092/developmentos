"use client"

import { useEffect, useLayoutEffect, useRef } from "react"

import {
  isContainerNearBottom,
  scrollContainerToBottom,
} from "@/lib/channels/message-tree-signature"

export function useStickToBottom<T extends HTMLElement>(
  dependency: string | number
) {
  const containerRef = useRef<T>(null)
  const shouldAutoScrollRef = useRef(true)

  useLayoutEffect(() => {
    shouldAutoScrollRef.current = true
    const container = containerRef.current
    if (!container) {
      return
    }

    const scrollToLatest = () => scrollContainerToBottom(container, "auto")
    scrollToLatest()
    requestAnimationFrame(() => {
      scrollToLatest()
      requestAnimationFrame(scrollToLatest)
    })
  }, [dependency])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const onScroll = () => {
      shouldAutoScrollRef.current = isContainerNearBottom(container)
    }

    container.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", onScroll)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !shouldAutoScrollRef.current) {
      return
    }

    requestAnimationFrame(() => {
      scrollContainerToBottom(container, "smooth")
    })
  }, [dependency])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const content = container.firstElementChild
    if (!content) {
      return
    }

    const observer = new ResizeObserver(() => {
      if (!shouldAutoScrollRef.current) {
        return
      }
      scrollContainerToBottom(container, "auto")
    })

    observer.observe(content)
    return () => {
      observer.disconnect()
    }
  }, [dependency])

  return containerRef
}
