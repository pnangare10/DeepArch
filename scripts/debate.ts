/**
 * Two-agent debate system using the Anthropic SDK.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your-key npx tsx scripts/debate.ts "AI will replace all human jobs"
 *
 * Each agent takes a fixed side (Pro / Con), sees the full debate history,
 * and responds in alternating turns. The moderator summarises at the end.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ── Config ──────────────────────────────────────────────────────────────────

const ROUNDS = 3; // number of exchanges per side
const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 1024;

// ── Types ────────────────────────────────────────────────────────────────────

interface DebateMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentContext {
  name: string;
  side: "Pro" | "Con";
  systemPrompt: string;
  history: DebateMessage[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(side: "Pro" | "Con", topic: string): string {
  const position = side === "Pro" ? "in favour of" : "against";
  const opponent = side === "Pro" ? "Con" : "Pro";

  return `You are a skilled, articulate debate agent arguing ${position} the following topic:

"${topic}"

Rules:
- You MUST argue the ${side} side, even if you personally disagree.
- Keep each response concise: 3–5 short paragraphs.
- Directly rebut the opponent's most recent argument before making new points.
- Be persuasive, logical, and use concrete examples where possible.
- Do NOT concede the debate or switch sides.
- Address your opponent as "My ${opponent} colleague".
- Start each turn with a brief rebuttal, then advance your position.`;
}

function printSeparator(label: string): void {
  const width = 72;
  const pad = Math.max(0, Math.floor((width - label.length - 2) / 2));
  console.log("\n" + "─".repeat(pad) + ` ${label} ` + "─".repeat(pad));
}

async function getArgument(
  agent: AgentContext,
  opponentLastArg: string | null,
): Promise<string> {
  // Build the messages for this agent's API call.
  // The history contains prior turns from THIS agent's perspective.
  const messages: DebateMessage[] = [...agent.history];

  if (opponentLastArg !== null) {
    // Inject the opponent's latest argument as the "user" turn the agent responds to.
    messages.push({
      role: "user",
      content: `Your opponent (${agent.side === "Pro" ? "Con" : "Pro"}) just argued:\n\n${opponentLastArg}\n\nNow give your ${agent.side} response.`,
    });
  } else {
    // First turn: no opponent yet.
    messages.push({
      role: "user",
      content: `Open the debate with your strongest ${agent.side} argument for the topic: "${agent.systemPrompt.match(/"(.+)"/)![1]}"`,
    });
  }

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: agent.systemPrompt,
    messages,
    thinking: { type: "adaptive" },
  });

  process.stdout.write(`\n[${agent.name}] `);

  let fullText = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
      fullText += event.delta.text;
    }
  }
  console.log(); // newline after streaming

  // Update this agent's history so it "remembers" the exchange.
  agent.history.push(
    { role: "user", content: messages[messages.length - 1].content },
    { role: "assistant", content: fullText },
  );

  return fullText;
}

async function moderatorSummary(
  topic: string,
  transcript: string,
): Promise<void> {
  printSeparator("MODERATOR SUMMARY");

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 512,
    system:
      "You are an impartial debate moderator. Summarise the key arguments from both sides fairly and concisely, then indicate which side presented the stronger overall case, with a one-sentence justification.",
    messages: [
      {
        role: "user",
        content: `Topic: "${topic}"\n\nDebate transcript:\n${transcript}\n\nPlease provide your impartial summary.`,
      },
    ],
  });

  process.stdout.write("\n[Moderator] ");
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
    }
  }
  console.log();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runDebate(topic: string): Promise<void> {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`  DEBATE TOPIC: ${topic}`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  Rounds: ${ROUNDS}  |  Model: ${MODEL}`);

  const proAgent: AgentContext = {
    name: "Agent Pro",
    side: "Pro",
    systemPrompt: buildSystemPrompt("Pro", topic),
    history: [],
  };

  const conAgent: AgentContext = {
    name: "Agent Con",
    side: "Con",
    systemPrompt: buildSystemPrompt("Con", topic),
    history: [],
  };

  const transcriptLines: string[] = [];
  let lastProArg: string | null = null;
  let lastConArg: string | null = null;

  for (let round = 1; round <= ROUNDS; round++) {
    printSeparator(`ROUND ${round}`);

    // Pro speaks
    printSeparator("PRO ▶");
    lastProArg = await getArgument(proAgent, lastConArg);
    transcriptLines.push(`[PRO – Round ${round}]\n${lastProArg}`);

    // Con responds
    printSeparator("CON ▶");
    lastConArg = await getArgument(conAgent, lastProArg);
    transcriptLines.push(`[CON – Round ${round}]\n${lastConArg}`);
  }

  await moderatorSummary(topic, transcriptLines.join("\n\n"));

  printSeparator("DEBATE COMPLETE");
  console.log();
}

// ── Entry point ──────────────────────────────────────────────────────────────

const topic = process.argv.slice(2).join(" ").trim();

if (!topic) {
  console.error(
    'Usage: ANTHROPIC_API_KEY=<key> npx tsx scripts/debate.ts "<topic>"',
  );
  process.exit(1);
}

runDebate(topic).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
