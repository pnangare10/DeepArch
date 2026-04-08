import type { AIArchitectureSchema } from "@deeparch/shared";

export interface AIProvider {
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

// ── Anthropic ──────────────────────────────────────────────────────────────
class AnthropicProvider implements AIProvider {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: process.env.AI_MODEL || "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}

// ── Ollama ─────────────────────────────────────────────────────────────────
class OllamaProvider implements AIProvider {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const model = process.env.AI_MODEL || "deepseek-v3.1:671b-cloud";

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Ollama request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  }
}

// ── OpenAI ─────────────────────────────────────────────────────────────────
class OpenAIProvider implements AIProvider {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`OpenAI request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

// ── Factory ────────────────────────────────────────────────────────────────
export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || "ollama").toLowerCase();
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "ollama":
    default:
      return new OllamaProvider();
  }
}

// ── Shared prompt builder ──────────────────────────────────────────────────
export function buildPrompts(
  prompt: string,
  validNodeTypes: string,
): { system: string; user: string } {
  return {
    system: `You are an architecture diagram generator. Given a description, produce a JSON object representing the architecture.
Return ONLY valid JSON — no markdown fences, no explanation text, just the raw JSON object.`,
    user: `Generate an architecture diagram for: ${prompt}

Return JSON with this exact shape:
{
  "nodes": [
    { "tempId": "n1", "name": "string", "nodeType": "${validNodeTypes}", "description": "string", "layer": 0 }
  ],
  "edges": [
    { "sourceId": "n1", "targetId": "n2", "label": "optional string" }
  ]
}

Rules:
- layer starts at 0 for the leftmost/first tier, increment for each downstream tier
- tempId must be unique strings like "n1", "n2", "n3"
- edges reference tempId values (not names)
- max 20 nodes, max 30 edges
- nodeType must be exactly one of: ${validNodeTypes}
- keep names short (1-4 words)
- description is optional but helpful (1 sentence max)`,
  };
}

export function parseAIResponse(rawContent: string): AIArchitectureSchema {
  // Strip markdown fences if the model wraps output despite instructions
  const cleaned = rawContent
    .replace(/^```[a-z]*\n?/im, "")
    .replace(/\n?```\s*$/im, "")
    .trim();
  return JSON.parse(cleaned) as AIArchitectureSchema;
}
