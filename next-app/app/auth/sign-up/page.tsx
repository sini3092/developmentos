import { redirect } from "next/navigation"

import { isPublicSignUpEnabled } from "@/lib/auth/registration-policy"

export default function SignUpPage() {
  if (!isPublicSignUpEnabled()) {
    redirect("/auth/sign-in?notice=registration_disabled")
  }

  redirect("/auth/sign-in")
}
