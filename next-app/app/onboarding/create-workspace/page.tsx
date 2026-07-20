import { redirect } from "next/navigation"

import { OnboardingForm } from "@/components/workspace/onboarding-form"
import { getCurrentUser } from "@/lib/auth/workspace-context"

export default async function CreateWorkspacePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <OnboardingForm />
    </div>
  )
}
