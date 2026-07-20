import { seedStarterProjects } from "@/lib/actions/projects"
import { Button } from "@/components/ui/button"

type SeedStarterProjectsButtonProps = {
  workspaceId: string
}

export function SeedStarterProjectsButton({
  workspaceId,
}: SeedStarterProjectsButtonProps) {
  async function seed() {
    "use server"
    await seedStarterProjects(workspaceId)
  }

  return (
    <form action={seed}>
      <Button type="submit" variant="outline">
        Add starter projects
      </Button>
    </form>
  )
}
