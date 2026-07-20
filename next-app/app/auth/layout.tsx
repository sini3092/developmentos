import { Gamepad2 } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.52_0.18_255/0.12),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.58_0.18_305/0.08),transparent_45%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-sm font-medium text-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Gamepad2 className="size-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">DevelopmentOS</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Game development workspace
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
