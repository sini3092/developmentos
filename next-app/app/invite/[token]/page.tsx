import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { acceptInvitation } from "@/lib/actions/workspace"
import { getCurrentUser } from "@/lib/auth/workspace-context"
import { createClient } from "@/lib/supabase/server"

type InvitePageProps = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: previews } = await supabase.rpc("get_invitation_preview", {
    invite_token: token,
  })

  const invitation = previews?.[0]

  if (!invitation || invitation.accepted_at) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>
              This invitation is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join {invitation.workspace_name}</CardTitle>
            <CardDescription>
              Sign in with <strong>{invitation.email}</strong> to accept this invitation. If you
              do not have an account yet, ask your workspace owner to create one for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/auth/sign-in?next=/invite/${token}`}>Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Wrong account</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{invitation.email}</strong>. You are
              signed in as <strong>{user.email}</strong>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  async function accept() {
    "use server"
    const result = await acceptInvitation(token)
    if (result?.error) {
      redirect(`/invite/${token}?error=${encodeURIComponent(result.error)}`)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {invitation.workspace_name}</CardTitle>
          <CardDescription>
            You have been invited as a <strong>{invitation.role.replace("_", " ")}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={accept}>
            <Button type="submit" className="w-full">
              Accept invitation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
