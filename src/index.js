import "dotenv/config";
import * as readline from "readline";
import OpenAI from "openai";
import {
  executeCommand,
  getGithubDetailsAboutUser,
  getTheWeatherOfCity,
  openHtmlInBrowser,
  writeProjectFile,
  OUTPUT_DIR,
} from "./tools.js";

function extractJsonObject(text) {
  const raw = String(text ?? "").trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model reply.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function toObserveString(result) {
  if (typeof result === "object" && result !== null) {
    try {
      return JSON.stringify(result);
    } catch {
      return String(result);
    }
  }
  return String(result);
}

const tool_map = {
  getTheWeatherOfCity,
  getGithubDetailsAboutUser,
  executeCommand,
  writeProjectFile,
  openHtmlInBrowser,
};

async function invokeTool(name, rawArgs) {
  const fn = tool_map[name];
  if (!fn) return { ok: false, text: "This tool is not available" };

  try {
    if (name === "getTheWeatherOfCity" || name === "getGithubDetailsAboutUser") {
      return { ok: true, text: toObserveString(await fn(String(rawArgs ?? "").trim())) };
    }
    if (name === "executeCommand") {
      return { ok: true, text: await fn(String(rawArgs ?? "")) };
    }
    if (name === "writeProjectFile" || name === "openHtmlInBrowser") {
      let obj;
      try {
        obj = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
      } catch {
        return { ok: false, text: 'Invalid JSON for tool_args. Use {"path":"...","content":"..."} or {"path":"index.html"}' };
      }
      const path = obj?.path ?? obj?.relativePath ?? "";
      if (name === "writeProjectFile") {
        const text = await writeProjectFile(path, obj?.content ?? "");
        return { ok: true, text };
      }
      return { ok: true, text: await openHtmlInBrowser(path || "index.html") };
    }
    return { ok: true, text: await fn(rawArgs) };
  } catch (e) {
    return { ok: false, text: e?.message ?? String(e) };
  }
}

function buildSystemPrompt() {
  const out = OUTPUT_DIR.replace(/\\/g, "/");
  return `
You are an AI Assistant who works on START, THINK, TOOL, OBSERVE, and OUTPUT steps.
Break the user's request into smaller steps. Multiple THINK steps are required before OUTPUT.
Respond with exactly ONE JSON object per assistant message — no markdown, no extra text.

Primary assignment capability: cloning the **Scaler Academy** marketing-style landing page.
When the user asks to build or clone Scaler's site:
- Produce a working **HTML** file plus separate **CSS** and **JavaScript** files (multiple writeProjectFile TOOL calls; never one giant step).
- Sections required: **header** (logo + nav + CTAs), **hero** (headline + subcopy + CTAs), **footer** (links columns + bottom line).
- Visual style: light background like Scaler, dark text, vivid blue accents, clean typography.
- Working directory for files: ${out}
- After all files exist, call openHtmlInBrowser once with {"path":"index.html"}
- Finish with OUTPUT summarizing paths and confirming the browser was opened.

Tools:
1. getTheWeatherOfCity(cityname: string)
2. getGithubDetailsAboutUser(username: string)
3. executeCommand(cmd: string)
4. writeProjectFile — tool_args MUST be a JSON STRING: {"path":"index.html","content":"<full file>"}. Paths relative to scaler-clone, no "..".
5. openHtmlInBrowser — tool_args JSON STRING: {"path":"index.html"}

Rules:
1. Follow the JSON format only.
2. One step per message; wait for OBSERVE before the next TOOL.
3. Do several THINK steps before any substantive TOOL and before OUTPUT.

Output shape:
{ "step": "START" | "THINK" | "TOOL" | "OUTPUT", "content": "string", "tool_name": "string", "tool_args": "string" }

Never emit step "OBSERVE" as assistant — the developer message provides OBSERVE.
`.trim();
}

async function promptLine() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question("\nYou> ", (line) => {
      rl.close();
      res(line);
    });
  });
}

async function runOneTurn(messages, client) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxSteps = 120;

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.35,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    let parsed;
    try {
      parsed = extractJsonObject(raw);
    } catch {
      console.log("\n[Invalid JSON from model]\n");
      messages.push({
        role: "user",
        content: "Reply again with ONLY one valid JSON object matching the required schema.",
      });
      continue;
    }

    messages.push({ role: "assistant", content: JSON.stringify(parsed) });

    const step = parsed.step;
    const content = parsed.content ?? "";

    if (step === "START") {
      console.log("STARTING STEP ....\n");
      console.log(parsed);
    } else if (step === "THINK") {
      console.log("THINKING .....\n");
      console.log(parsed);
    } else if (step === "TOOL") {
      console.log("TOOL calling ....\n");
      console.log(`calling ${parsed.tool_name}`);

      const name = parsed.tool_name;
      const args = parsed.tool_args ?? "";

      if (!tool_map[name]) {
        messages.push({
          role: "developer",
          content: JSON.stringify({
            step: "OBSERVE",
            content: "This tool is not available",
          }),
        });
      } else {
        const { ok, text } = await invokeTool(name, args);
        messages.push({
          role: "developer",
          content: JSON.stringify({
            step: "OBSERVE",
            content: ok ? text : text,
          }),
        });
      }
    } else if (step === "OUTPUT") {
      console.log("OUTPUT");
      console.log(parsed);
      return;
    } else {
      console.log("Unknown step:\n", parsed);
      messages.push({
        role: "user",
        content: `Invalid step "${step}". Use START, THINK, TOOL, or OUTPUT only.`,
      });
    }
  }
  console.error("Stopped: exceeded max steps for this message.");
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Set OPENAI_API_KEY in .env (see .env.example).");
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log(
    `Assignment ~02 CLI — conversational agent (${process.env.OPENAI_MODEL || "gpt-4o-mini"}).\nScaler output: ${OUTPUT_DIR.replace(/\\/g, "/")}\nEmpty line to exit.`
  );

  /** @type {import("openai").Chat.ChatCompletionMessageParam[]} */
  const messages = [{ role: "system", content: buildSystemPrompt() }];

  for (;;) {
    const line = (await promptLine()).trim();
    if (!line) {
      console.log("Bye.");
      break;
    }
    messages.push({ role: "user", content: line });
    try {
      await runOneTurn(messages, client);
    } catch (e) {
      console.error("Error:", e?.message ?? e);
    }
  }
}

main();
