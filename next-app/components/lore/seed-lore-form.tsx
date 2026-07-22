import { Sparkles } from "lucide-react"

import { seedStarterLoreEntries } from "@/lib/actions/knowledge"
import { Button } from "@/components/ui/button"

type SeedLoreFormProps = {
  projectId: string
  slug: string
}

export function SeedLoreForm({ projectId, slug }: SeedLoreFormProps) {
  async function seed() {
    "use server"
    await seedStarterLoreEntries(projectId, slug)
  }

  return (
    <form action={seed}>
      <Button type="submit" variant="outline">
        <Sparkles className="size-4" />
        Seed starters
      </Button>
    </form>
  )
}
