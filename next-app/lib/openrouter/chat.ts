type OpenRouterMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

export async function chatWithOpenRouter({
  apiKey,
  model,
  messages,
}: {
  apiKey: string
  model: string
  messages: OpenRouterMessage[]
}) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "DevelopmentOS",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 1200,
    }),
  })

  const data = (await response.json()) as OpenRouterResponse

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenRouter error (${response.status})`)
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("OpenRouter returned an empty response.")
  }

  return content
}
