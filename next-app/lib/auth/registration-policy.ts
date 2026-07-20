/**
 * Public self-registration is disabled by default.
 * Set ALLOW_PUBLIC_SIGNUP=true only for local experiments.
 */
export function isPublicSignUpEnabled() {
  return process.env.ALLOW_PUBLIC_SIGNUP === "true"
}
