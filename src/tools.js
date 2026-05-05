import axios from "axios";
import { exec } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

/** Generated site folder (assignment output). */
export const OUTPUT_DIR = join(PROJECT_ROOT, "output", "scaler-clone");

export async function getTheWeatherOfCity(cityname = "") {
  const city = encodeURIComponent(String(cityname || "London").trim());
  const url = `https://wttr.in/${city}?format=%C+%t`;
  const { data } = await axios.get(url, { responseType: "text", timeout: 15_000 });
  return `The Weather of ${cityname || "requested city"} is ${data}`;
}

export async function getGithubDetailsAboutUser(username = "") {
  const safe = encodeURIComponent(String(username || "").trim());
  const url = `https://api.github.com/users/${safe}`;
  const { data } = await axios.get(url, { timeout: 15_000 });
  return {
    login: data.login,
    name: data.name,
    blog: data.blog,
    public_repos: data.public_repos,
  };
}

/** Runs shell command; returns stdout/stderr text for OBSERVE. */
export async function executeCommand(cmd = "") {
  return new Promise((resolvePromise) => {
    const opts = {
      maxBuffer: 10 * 1024 * 1024,
      shell: platform() === "win32" ? true : "/bin/bash",
    };
    exec(String(cmd || "").trim(), opts, (err, stdout, stderr) => {
      const out = (stdout ?? "").trim();
      const errOut = (stderr ?? "").trim();
      if (err) {
        resolvePromise(
          `Exit ${err.code ?? "?"}: ${err.message}\nstdout:\n${out || "(empty)"}\nstderr:\n${errOut || "(empty)"}`
        );
      } else {
        resolvePromise([out, errOut].filter(Boolean).join("\n") || "(no output)");
      }
    });
  });
}

/**
 * Writes a file under output/scaler-clone. Creates parent dirs.
 * tool_args (JSON): { "path": "index.html", "content": "..." }
 */
export async function writeProjectFile(relativePath = "", content = "") {
  const rel = String(relativePath).replace(/^[/\\]+/, "");
  if (!rel || rel.includes("..")) return "Refused: invalid path.";
  const full = join(OUTPUT_DIR, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, String(content ?? ""), "utf8");
  return `OK: wrote ${rel} (${Buffer.byteLength(String(content ?? ""), "utf8")} bytes)`;
}

/** Opens HTML in default browser. tool_args JSON: { "path": "index.html" } */
export async function openHtmlInBrowser(pathArg = "index.html") {
  const rel = String(pathArg || "index.html").replace(/^[/\\]+/, "");
  if (!rel.endsWith(".html") || rel.includes("..")) return "Refused: invalid html path.";
  const full = resolve(OUTPUT_DIR, rel);
  const quoted = JSON.stringify(full);
  const cmd =
    platform() === "win32"
      ? `start "" ${quoted}`
      : platform() === "darwin"
        ? `open ${quoted}`
        : `xdg-open ${quoted}`;
  return executeCommand(cmd);
}
