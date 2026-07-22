"use client"

import { Sparkles } from "lucide-react"

import { useOpenSoulsWithLore } from "@/components/souls/souls-side-panel"
import { Button } from "@/components/ui/button"

type AskSoulsButtonProps = {
  entrySlug: string
  variant?: "outline" | "ghost"
  size?: "sm" | "default"
}

export function AskSoulsButton({
  entrySlug,
  variant = "outline",
  size = "sm",
}: AskSoulsButtonProps) {
  const openSouls = useOpenSoulsWithLore()

  return (
    <Button type="button" variant={variant} size={size} onClick={() => openSouls(entrySlug)}>
      <Sparkles className="size-4 text-primary" />
      Ask Souls
    </Button>
  )
}
