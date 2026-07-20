import { createHash } from "node:crypto"

import { createAdminClient } from "@/lib/supabase/admin"

export async function authenticateBridgeToken(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing bridge token." as const }
  }

  const token = authHeader.slice("Bearer ".length).trim()
  if (!token) {
    return { error: "Missing bridge token." as const }
  }

  const tokenHash = createHash("sha256").update(token).digest("hex")
  const supabase = createAdminClient()

  const { data: bridgeToken, error } = await supabase
    .from("user_bridge_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (error || !bridgeToken) {
    return { error: "Invalid bridge token." as const }
  }

  await supabase
    .from("user_bridge_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", bridgeToken.id)

  return { userId: bridgeToken.user_id }
}
