/**
 * Multi-agent debate team — orchestrator + subagent pattern.
 *
 * Architecture:
 *
 *   Orchestrator (Claude)                 ← drives the debate autonomously
 *     ├── tool: call_pro_agent(prompt)    → Pro subagent (Claude)
 *     └── tool: call_con_agent(prompt)    → Con subagent (Claude)
 *
 * The orchestrator decides when and what to ask each subagent.
 * Pro and Con are true subagents: separate Claude instances with their own
 * system prompts and conversation histories, invoked via tool calls.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your-key npx tsx scripts/debate-team.ts "Remote work is better than office work"
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL = "claude-opus-4-6";
const ROUNDS = 3;
// Subagents get more tokens than the orchestrator needs per tool call
const SUBAGENT_MAX_TOKENS = 1024;
// Orchestrator needs enough room to run the full debate loop
const ORCHESTRATOR_MAX_TOKENS = 8192;

// ── Subagent state ────────────────────────────────────────────────────────────

type SubagentHistory = Anthropic.MessageParam[];

interface Subagent {
  side: "Pro" | "Con";
  systemPrompt: string;
  history: SubagentHistory;
}

function buildSubagentSystemPrompt(side: "Pro" | "Con", topic: string): string {
  const position = side === "Pro" ? "in favour of" : "against";
  const opponent = side === "Pro" ? "Con" : "Pro";
  return `You are a skilled, articulate debate agent locked into arguing ${position} the following topic:

"${topic}"

Rules:
- You MUST argue the ${side} side, even if you personally disagree.
- Keep each response to 3–5 focused paragraphs.
- Always rebut the opponent's most recent point before advancing your own.
- Be persuasive and concrete — use real examples where possible.
- Never concede or switch sides.
- Address your opponent as "My ${opponent} colleague".`;
}

// ── Subagent invocation ───────────────────────────────────────────────────────

/**
 * Invoke a subagent synchronously and return its text response.
 * The subagent sees its own full history so it can rebut consistently.
 */
async function invokeSubagent(
  agent: Subagent,
  prompt: string,
): Promise<string> {
  // Append the incoming prompt as the next user turn
  agent.history.push({ role: "user", content: prompt });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: SUBAGENT_MAX_TOKENS,
    system: agent.systemPrompt,
    messages: agent.history,
    thinking: { type: "adaptive" },
  });

  // Extract text (skip thinking blocks)
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  // Persist the subagent's reply in its own history
  agent.history.push({ role: "assistant", content: response.content });

  return text;
}

// ── Terminal helpers ──────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
};

function label(tag: string, color: string, text: string): void {
  console.log(`\n${color}${COLORS.bold}[${tag}]${COLORS.reset} ${text}`);
}

function separator(title: string): void {
  const line = "─".repeat(70);
  console.log(`\n${COLORS.dim}${line}${COLORS.reset}`);
  console.log(`${COLORS.bold}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.dim}${line}${COLORS.reset}`);
}

// ── Orchestrator tools ────────────────────────────────────────────────────────

/**
 * Build the tools array the orchestrator uses to invoke subagents.
 * Each tool captures its subagent via closure.
 */
function buildOrchestratorTools(
  proAgent: Subagent,
  conAgent: Subagent,
): Anthropic.Tool[] {
  return [
    {
      name: "call_pro_agent",
      description:
        "Invoke the Pro debate subagent. Pass the prompt you want it to respond to. " +
        "Returns the Pro agent's argument as a string.",
      input_schema: {
        type: "object" as const,
        properties: {
          prompt: {
            type: "string",
            description:
              "The instruction or context to send to the Pro agent (e.g. the Con agent's latest argument plus a request to rebut it).",
          },
        },
        required: ["prompt"],
      },
    },
    {
      name: "call_con_agent",
      description:
        "Invoke the Con debate subagent. Pass the prompt you want it to respond to. " +
        "Returns the Con agent's argument as a string.",
      input_schema: {
        type: "object" as const,
        properties: {
          prompt: {
            type: "string",
            description:
              "The instruction or context to send to the Con agent (e.g. the Pro agent's latest argument plus a request to rebut it).",
          },
        },
        required: ["prompt"],
      },
    },
  ];
}

// ── Orchestrator loop ─────────────────────────────────────────────────────────

/**
 * Run the orchestrator's agentic loop.
 * The orchestrator autonomously calls Pro and Con via tool use until done.
 */
async function runOrchestratorLoop(
  orchestratorMessages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  proAgent: Subagent,
  conAgent: Subagent,
): Promise<void> {
  while (true) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: ORCHESTRATOR_MAX_TOKENS,
      system: buildOrchestratorSystemPrompt(),
      messages: orchestratorMessages,
      tools,
      thinking: { type: "adaptive" },
    });

    // Print any orchestrator commentary (non-tool text blocks)
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        label("Orchestrator", COLORS.magenta, block.text);
      }
    }

    // Append the full response (preserves tool_use blocks for the next turn)
    orchestratorMessages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    // Process tool calls
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const input = toolUse.input as { prompt: string };

      if (toolUse.name === "call_pro_agent") {
        separator(`PRO SUBAGENT  (round prompt: ${input.prompt.slice(0, 60)}…)`);
        label("Thinking…", COLORS.dim, "Pro subagent generating argument");
        const reply = await invokeSubagent(proAgent, input.prompt);
        label("Agent Pro", COLORS.green, reply);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: reply,
        });
      } else if (toolUse.name === "call_con_agent") {
        separator(`CON SUBAGENT  (round prompt: ${input.prompt.slice(0, 60)}…)`);
        label("Thinking…", COLORS.dim, "Con subagent generating argument");
        const reply = await invokeSubagent(conAgent, input.prompt);
        label("Agent Con", COLORS.cyan, reply);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: reply,
        });
      }
    }

    // Feed all tool results back to the orchestrator
    orchestratorMessages.push({ role: "user", content: toolResults });
  }
}

// ── Orchestrator system prompt ────────────────────────────────────────────────

function buildOrchestratorSystemPrompt(): string {
  return `You are an autonomous debate orchestrator. You manage a structured debate between two subagents:
- call_pro_agent: argues IN FAVOUR of the topic
- call_con_agent: argues AGAINST the topic

Your job:
1. Open by asking Pro for an opening argument (prompt it clearly).
2. Pass Pro's argument to Con and ask for a rebuttal + Con's own point.
3. Repeat for ${ROUNDS} full rounds (Pro → Con per round).
4. After all rounds, write a concise moderator summary: key points from each side, and which side made the stronger overall case with one-sentence justification.

Rules:
- Always pass the opponent's latest argument verbatim in the prompt so the subagent can rebut it.
- Keep your own commentary brief — the debate is the focus.
- You control the pacing; call the agents in strict alternating order.
- After the final round, do NOT call any more tools — write your summary as plain text.`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function runDebateTeam(topic: string): Promise<void> {
  console.log(
    "\n╔══════════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    `  ${COLORS.bold}DEBATE TEAM${COLORS.reset}  ·  Topic: ${COLORS.yellow}${topic}${COLORS.reset}`,
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════════╝",
  );
  console.log(`  Rounds: ${ROUNDS}  |  Model: ${MODEL}`);
  console.log(
    `  Architecture: Orchestrator → [Pro subagent] vs [Con subagent]\n`,
  );

  // Initialise the two opposing subagents
  const proAgent: Subagent = {
    side: "Pro",
    systemPrompt: buildSubagentSystemPrompt("Pro", topic),
    history: [],
  };

  const conAgent: Subagent = {
    side: "Con",
    systemPrompt: buildSubagentSystemPrompt("Con", topic),
    history: [],
  };

  const tools = buildOrchestratorTools(proAgent, conAgent);

  // Orchestrator's conversation — kick it off with the topic
  const orchestratorMessages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Begin the debate on this topic: "${topic}"\n\nRun ${ROUNDS} full rounds then provide your moderator summary.`,
    },
  ];

  separator("DEBATE STARTING");

  await runOrchestratorLoop(
    orchestratorMessages,
    tools,
    proAgent,
    conAgent,
  );

  separator("DEBATE COMPLETE");
  console.log();
}

const topic = process.argv.slice(2).join(" ").trim();

if (!topic) {
  console.error(
    `Usage: ANTHROPIC_API_KEY=<key> npx tsx scripts/debate-team.ts "<topic>"`,
  );
  process.exit(1);
}

runDebateTeam(topic).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
