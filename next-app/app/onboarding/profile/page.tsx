import { redirect } from "next/navigation"

import { ProfileSetupForm } from "@/components/workspace/profile-setup-form"
import { getCurrentUser } from "@/lib/auth/workspace-context"

export default async function ProfileSetupPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <ProfileSetupForm />
    </div>
  )
}
