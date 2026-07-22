export function formatToolError(error: unknown, fallback = "Action failed."): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }

  return fallback
}
