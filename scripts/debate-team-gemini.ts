/**
 * Multi-agent debate team powered by Google Gemini.
 *
 * Architecture:
 *
 *   Orchestrator (Gemini)                  ← drives the debate via function calling
 *     ├── function: call_pro_agent(prompt)  → Pro subagent (Gemini chat session)
 *     └── function: call_con_agent(prompt)  → Con subagent (Gemini chat session)
 *
 * Each subagent is a separate Gemini chat session with its own system
 * instruction and conversation history. The orchestrator invokes them
 * autonomously through Gemini's native function-calling interface.
 *
 * Usage:
 *   GEMINI_API_KEY=your-key npx tsx scripts/debate-team-gemini.ts "Remote work is better than office work"
 */

import {
  GoogleGenerativeAI,
  type ChatSession,
  type FunctionDeclaration,
  type Part,
  SchemaType,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL = "gemini-2.0-flash";
const ROUNDS = 3;
const SUBAGENT_MAX_TOKENS = 1024;
const ORCHESTRATOR_MAX_TOKENS = 8192;

// ── Terminal helpers ──────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};

function label(tag: string, color: string, text: string): void {
  console.log(`\n${color}${C.bold}[${tag}]${C.reset}\n${text}`);
}

function separator(title: string): void {
  const line = "─".repeat(70);
  console.log(`\n${C.dim}${line}${C.reset}`);
  console.log(`${C.bold}  ${title}${C.reset}`);
  console.log(`${C.dim}${line}${C.reset}`);
}

// ── Subagent system prompts ───────────────────────────────────────────────────

function buildSubagentInstruction(side: "Pro" | "Con", topic: string): string {
  const position = side === "Pro" ? "in favour of" : "against";
  const opponent = side === "Pro" ? "Con" : "Pro";
  return `You are a skilled debate agent locked into arguing ${position} the following topic:

"${topic}"

Rules:
- You MUST argue the ${side} side, even if you personally disagree.
- Keep each response to 3–5 focused paragraphs.
- Always rebut the opponent's most recent point before advancing your own.
- Be persuasive and concrete — use real examples where possible.
- Never concede or switch sides.
- Address your opponent as "My ${opponent} colleague".`;
}

function buildOrchestratorInstruction(): string {
  return `You are an autonomous debate orchestrator. You manage a structured debate between two subagents using the provided functions:
- call_pro_agent: argues IN FAVOUR of the topic
- call_con_agent: argues AGAINST the topic

Your job:
1. Open by calling call_pro_agent for an opening argument.
2. Pass Pro's argument to call_con_agent for a rebuttal + Con's own point.
3. Repeat for ${ROUNDS} full rounds (Pro → Con per round).
4. After all rounds, write a concise moderator summary as plain text: key points from each side and which side made the stronger overall case with a one-sentence justification.

Rules:
- Always pass the opponent's latest argument verbatim in the prompt so the subagent can rebut it.
- Call the agents in strict alternating order: Pro → Con → Pro → Con …
- After the final round, do NOT call any more functions — write your summary as plain text.`;
}

// ── Subagent invocation ───────────────────────────────────────────────────────

async function invokeSubagent(
  chat: ChatSession,
  prompt: string,
): Promise<string> {
  const result = await chat.sendMessage(prompt);
  return result.response.text();
}

// ── Orchestrator function declarations ───────────────────────────────────────

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "call_pro_agent",
    description:
      "Invoke the Pro debate subagent. Pass the full context it needs to respond to " +
      "(e.g. the Con agent's latest argument plus a request to rebut it). " +
      "Returns the Pro agent's argument as a string.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prompt: {
          type: SchemaType.STRING,
          description:
            "The instruction or context to send to the Pro agent.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "call_con_agent",
    description:
      "Invoke the Con debate subagent. Pass the full context it needs to respond to " +
      "(e.g. the Pro agent's latest argument plus a request to rebut it). " +
      "Returns the Con agent's argument as a string.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prompt: {
          type: SchemaType.STRING,
          description:
            "The instruction or context to send to the Con agent.",
        },
      },
      required: ["prompt"],
    },
  },
];

// ── Orchestrator agentic loop ─────────────────────────────────────────────────

async function runOrchestratorLoop(
  orchestratorChat: ChatSession,
  proChat: ChatSession,
  conChat: ChatSession,
  kickoffMessage: string,
): Promise<void> {
  // Kick off the debate
  let result = await orchestratorChat.sendMessage(kickoffMessage);

  while (true) {
    const response = result.response;
    const parts: Part[] = response.candidates?.[0]?.content?.parts ?? [];

    // Print any plain-text parts from the orchestrator
    for (const part of parts) {
      if ("text" in part && part.text?.trim()) {
        label("Orchestrator", C.magenta, part.text);
      }
    }

    // Collect function calls
    const functionCalls = parts.filter((p) => "functionCall" in p && p.functionCall);

    if (functionCalls.length === 0) {
      // No more function calls — orchestrator is done
      break;
    }

    // Execute each function call and collect responses
    const functionResponseParts: Part[] = [];

    for (const part of functionCalls) {
      if (!("functionCall" in part) || !part.functionCall) continue;

      const { name, args } = part.functionCall;
      const prompt = (args as { prompt: string }).prompt;

      if (name === "call_pro_agent") {
        separator(`PRO SUBAGENT`);
        label("Thinking…", C.dim, "Pro subagent generating argument…");
        const reply = await invokeSubagent(proChat, prompt);
        label("Agent Pro", C.green, reply);
        functionResponseParts.push({
          functionResponse: {
            name,
            response: { result: reply },
          },
        });
      } else if (name === "call_con_agent") {
        separator(`CON SUBAGENT`);
        label("Thinking…", C.dim, "Con subagent generating argument…");
        const reply = await invokeSubagent(conChat, prompt);
        label("Agent Con", C.cyan, reply);
        functionResponseParts.push({
          functionResponse: {
            name,
            response: { result: reply },
          },
        });
      }
    }

    // Feed all function responses back to the orchestrator
    result = await orchestratorChat.sendMessage(functionResponseParts);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function runDebateTeam(topic: string): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
  }

  console.log(
    "\n╔══════════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    `  ${C.bold}GEMINI DEBATE TEAM${C.reset}  ·  Topic: ${C.yellow}${topic}${C.reset}`,
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════════╝",
  );
  console.log(`  Rounds: ${ROUNDS}  |  Model: ${MODEL}`);
  console.log(
    `  Architecture: Orchestrator → [Pro subagent] vs [Con subagent]\n`,
  );

  // ── Subagents — separate Gemini chat sessions ──────────────────────────────
  const proModel = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: buildSubagentInstruction("Pro", topic),
    generationConfig: { maxOutputTokens: SUBAGENT_MAX_TOKENS },
  });
  const proChat: ChatSession = proModel.startChat();

  const conModel = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: buildSubagentInstruction("Con", topic),
    generationConfig: { maxOutputTokens: SUBAGENT_MAX_TOKENS },
  });
  const conChat: ChatSession = conModel.startChat();

  // ── Orchestrator — Gemini model with function calling ──────────────────────
  const orchestratorModel = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: buildOrchestratorInstruction(),
    tools: [{ functionDeclarations }],
    generationConfig: { maxOutputTokens: ORCHESTRATOR_MAX_TOKENS },
  });
  const orchestratorChat: ChatSession = orchestratorModel.startChat();

  separator("DEBATE STARTING");

  await runOrchestratorLoop(
    orchestratorChat,
    proChat,
    conChat,
    `Begin the debate on this topic: "${topic}"\n\nRun ${ROUNDS} full rounds then provide your moderator summary.`,
  );

  separator("DEBATE COMPLETE");
  console.log();
}

const topic = process.argv.slice(2).join(" ").trim();

if (!topic) {
  console.error(
    `Usage: GEMINI_API_KEY=<key> npx tsx scripts/debate-team-gemini.ts "<topic>"`,
  );
  process.exit(1);
}

runDebateTeam(topic).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
