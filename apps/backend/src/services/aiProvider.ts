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

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Ollama request failed (${response.status}): ${responseText}`,
      );
    }

    const data = JSON.parse(responseText) as { message?: { content?: string } };
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

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `OpenAI request failed (${response.status}): ${responseText}`,
      );
    }

    const data = JSON.parse(responseText) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

// ── Factory ────────────────────────────────────────────────────────────────
export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || "ollama").toLowerCase();
  console.log(`Using AI provider: ${provider}`);
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
    system: `You are an expert software architecture analyst and diagram designer. Your job is to read technical documentation and produce architecture diagrams that are visually clean, easy to read, and structurally sound.

A good diagram has:
- A clear left-to-right primary flow (the path a typical request takes)
- No more than 4 nodes per vertical column
- Balanced columns so the diagram doesn't look lopsided
- Meaningful edge labels that explain what flows between components
- Metadata (ports, env vars, URLs) captured in node properties

You MUST follow the multi-step process described in the user message before generating JSON.

Return ONLY valid JSON — no markdown fences, no explanation text, just the raw JSON object.`,
    user: `Analyze the following documentation and produce a layout-optimized architecture diagram by following these steps in order.

════════════════════════════════════════════
DOCUMENTATION TO ANALYZE:
════════════════════════════════════════════
${prompt}
════════════════════════════════════════════

Follow ALL steps below before generating JSON:

───────────────────────────────────────────
STEP 1 — IDENTIFY THE PRIMARY FLOW (the spine)
───────────────────────────────────────────
Find the single most important request path through the system: from entry point to final storage.
This spine must have 4–8 nodes in a strict left-to-right sequence.

Examples of good spines:
  Web app:  Client → Load Balancer → API Gateway → App Service → PostgreSQL
  Pipeline: Scheduler → Ingest API → Message Queue → Worker → Database
  Microservices: Browser → CDN → API Gateway → Auth Service → Order Service → MySQL

Write out your spine as: "spine: [component1] → [component2] → ..."

───────────────────────────────────────────
STEP 2 — DESIGN LAYER GROUPS (density limit: max 4 nodes per layer)
───────────────────────────────────────────
Assign a layer number (0, 1, 2, ...) to every component you plan to include.
Layer 0 is leftmost (clients, external systems), layers increase moving right (deeper in the stack).

Rules:
- NEVER put more than 4 nodes in the same layer. If a layer would overflow, either:
  a) Move secondary/support services to the adjacent layer (±1), OR
  b) Merge highly similar services into one combined node
- The spine components should each occupy their own layer in sequence
- Supporting services (caches, config, monitoring) go in the same layer as the component they primarily serve
- Sticky notes can share a layer with the component they annotate — they don't count toward the 4-node limit

Write out your layer plan as:
  Layer 0: [node names] (count: N)
  Layer 1: [node names] (count: N)
  ...

───────────────────────────────────────────
STEP 3 — SELECT MAX 3 STICKY NOTES FOR KEY WARNINGS
───────────────────────────────────────────
From the documentation, pick at most 3 things a developer must know that are NOT system components:
  - Warnings, known issues, or unexpected behaviors
  - Important config values or environment quirks
  - Architectural decisions with non-obvious consequences

Assign each sticky note to the layer of its most relevant component.
Color guide:
  "#fed7aa" = warnings / known issues / risks
  "#fef08a" = general notes / context / decisions
  "#bbf7d0" = important architectural choices
  "#bfdbfe" = external documentation references

───────────────────────────────────────────
STEP 4 — PLAN EDGES (primary flow first, then secondary)
───────────────────────────────────────────
List the edges in priority order:
  1. Spine edges (most important — these form the main flow)
  2. Secondary connections (caches, fallbacks, sidecars)
  3. Background/async connections (monitoring, logging, shadow systems)

For each edge choose:
  edgeType: "http" (REST/HTTP calls), "event" (queue/pub-sub), "data-flow" (pipeline/ETL), "dependency" (build-time), "default" (other)
  label: short description of what flows (e.g. "POST /ingest", "Kafka events", "SQL read")

Limit: max 40 edges. Omit minor or implied connections if you're approaching the limit.

───────────────────────────────────────────
STEP 5 — GENERATE JSON
───────────────────────────────────────────
Now produce the JSON. The "plan" field documents your reasoning (layers + spine).
The "nodes" and "edges" fields implement the plan.

Return JSON with this exact shape:
{
  "plan": {
    "spine": ["n1", "n2", "n3", "n4"],
    "layer_summary": {
      "0": "2 nodes: external entry points",
      "1": "2 nodes: edge / gateway layer",
      "2": "3 nodes: processing + async ingress",
      "3": "2 nodes: storage"
    }
  },
  "nodes": [
    {
      "tempId": "n1",
      "name": "Edge Gateway",
      "nodeType": "${validNodeTypes}",
      "description": "Main ingress point handling TLS termination and routing.",
      "layer": 1,
      "metadata": {
        "customFields": [
          { "key": "Port", "value": "8081" },
          { "key": "TLS Port", "value": "8443" },
          { "key": "EDGE_SSL_MODE", "value": "env flag, sometimes overridden at runtime" }
        ],
        "links": [],
        "tags": ["gateway", "TLS"]
      }
    }
  ],
  "edges": [
    {
      "sourceId": "n1",
      "targetId": "n2",
      "label": "route to /v1/ingest",
      "edgeType": "http"
    }
  ]
}

FINAL RULES:
- max 30 nodes total (sticky notes included)
- max 40 edges
- nodeType must be exactly one of: ${validNodeTypes}
  ("service" = APIs/microservices, "database" = any DB or cache, "queue" = message brokers,
   "gateway" = API gateways/reverse proxies, "load-balancer", "frontend" = UI/web apps,
   "environment" = cloud namespaces, "infrastructure" = CI/CD/monitoring/storage)
- names: 1–4 words max
- descriptions: 1 sentence
- tempIds: unique strings "n1", "n2", ...
- metadata.customFields: port numbers, env var names/values, config values, versions
- metadata.links: every URL found in the documentation
- metadata.tags: languages, frameworks, cloud providers, protocols
- DO NOT emit markdown, explanation, or anything outside the JSON object`,
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
