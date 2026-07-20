import { SignInForm } from "@/components/auth/sign-in-form"

type SignInPageProps = {
  searchParams: Promise<{ next?: string; notice?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next, notice } = await searchParams

  return <SignInForm next={next} notice={notice} />
}
