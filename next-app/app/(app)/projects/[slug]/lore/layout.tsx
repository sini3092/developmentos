import { LoreShell } from "@/components/lore/lore-shell"

type LoreLayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function LoreLayout({ children, params }: LoreLayoutProps) {
  const { slug } = await params

  return <LoreShell slug={slug}>{children}</LoreShell>
}
