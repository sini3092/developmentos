const DEFAULT_TIMEOUT_MS = 20_000

export class DevelopmentOSClient {
  constructor({ baseUrl, token, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    this.baseUrl = baseUrl.replace(/\/$/, "")
    this.token = token
    this.timeoutMs = timeoutMs
  }

  async call(operation, input = {}) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(`${this.baseUrl}/api/mcp`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          "user-agent": "developmentos-mcp/1.0",
        },
        body: JSON.stringify({ operation, input }),
        signal: controller.signal,
      })
      const text = await response.text()
      let body
      try { body = text ? JSON.parse(text) : {} } catch { body = { error: text } }
      if (!response.ok) {
        const error = new Error(body.error || `DevelopmentOS API returned HTTP ${response.status}`)
        error.status = response.status
        error.details = body.details
        throw error
      }
      return body.data
    } catch (error) {
      if (error.name === "AbortError") throw new Error(`DevelopmentOS API timed out after ${this.timeoutMs}ms`)
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}
