#!/usr/bin/env node
/*
 * A static pass over the repo for the mistakes that matter on this site.
 * Pattern matching, so every hit is a place to look rather than a verdict,
 * and silence is not proof. It reads the tracked files plus new untracked
 * ones (what `git ls-files -co --exclude-standard` lists), never .env files,
 * and never prints a matched secret, only where it is.
 *
 *   node .claude/skills/fc-security/scripts/scan.mjs            from the repo root
 *   node .claude/skills/fc-security/scripts/scan.mjs --only secrets,client-env
 *
 * Exit code 1 when a "high" rule matched, so it can gate a commit.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const only = (() => {
  const i = process.argv.indexOf("--only");
  return i > 0 ? new Set(process.argv[i + 1].split(",")) : null;
})();

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" })
  .split("\n").map((f) => f.trim()).filter(Boolean)
  .filter((f) => !/^(node_modules|\.next|\.open-next|public|data|assets)\//.test(f))
  .filter((f) => !f.startsWith(".claude/skills/")) // these files describe the patterns themselves
  .filter((f) => !/\.env/.test(f))
  .filter((f) => /\.(ts|tsx|js|mjs|cjs|jsx|json|ya?ml|sql|py|md|toml|jsonc)$/.test(f));

const text = new Map();
const read = (f) => {
  if (!text.has(f)) {
    try { text.set(f, readFileSync(f, "utf8")); } catch { text.set(f, ""); }
  }
  return text.get(f);
};
const isClient = (f) => /^\s*["']use client["']/m.test(read(f).slice(0, 400));
const isCode = (f) => /\.(ts|tsx|js|mjs|jsx)$/.test(f);

// Modules that read server secrets; a client file importing one would ship them.
const secretModules = files.filter((f) => isCode(f) && /process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)[A-Z_]+/.test(read(f)));

const rules = [
  {
    id: "secrets", level: "high",
    what: "Something shaped like a key or token in a tracked file",
    test: (f, line) =>
      /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/.test(line) // JWT (Supabase keys)
      || /\bsb_(secret|publishable)_[A-Za-z0-9_-]{20,}/.test(line)                // new Supabase keys
      || /\b[MN][A-Za-z\d]{23,25}\.[\w-]{6}\.[\w-]{27,}/.test(line)                // Discord bot token
      || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)
      || /\b(gh[pousr]_[A-Za-z0-9]{36,})\b/.test(line),                          // GitHub token
    redact: true,
  },
  {
    id: "client-env", level: "high",
    what: "A client file reads a server-only env var (it would be undefined, or shipped)",
    files: (f) => isCode(f) && isClient(f),
    test: (f, line) => /process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)[A-Z_]+/.test(line),
  },
  {
    id: "client-imports-secret-module", level: "high",
    what: "A client file imports a module that reads server secrets",
    files: (f) => isCode(f) && isClient(f),
    test: (f, line) => {
      const m = /from\s+["'](@\/|\.\.?\/)([^"']+)["']/.exec(line);
      if (!m) return false;
      const target = m[2].replace(/\.(ts|tsx|js)$/, "");
      return secretModules.some((s) => s.replace(/\.(ts|tsx|js|mjs)$/, "").endsWith(target));
    },
  },
  {
    id: "public-secret-name", level: "high",
    what: "A NEXT_PUBLIC_ variable whose name says secret (it is inlined into the browser bundle)",
    test: (f, line) => /NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE|PRIVATE|TOKEN|PASSWORD)[A-Z_]*/.test(line),
  },
  {
    id: "html-injection", level: "high",
    what: "Raw HTML or code from strings",
    files: isCode,
    test: (f, line) => /dangerouslySetInnerHTML|\.innerHTML\s*=|\bnew Function\(|\beval\(/.test(line),
  },
  {
    id: "server-only-missing", level: "medium",
    what: "Reads server secrets but does not import \"server-only\" (a future client import would not fail the build)",
    files: (f) => secretModules.includes(f) && /^(lib|components)\//.test(f) && !/\.test\./.test(f),
    fileLevel: (f) => !/import\s+["']server-only["']/.test(read(f)),
  },
  {
    id: "route-auth", level: "medium",
    what: "A route handler with no visible auth or signature check (confirm it is meant to be public)",
    files: (f) => /^app\/.*route\.(ts|js)$/.test(f),
    fileLevel: (f) => !/getUser\(|getClaims\(|verify[A-Z]\w*\(|timingSafeEqual|x-sync-secret|authorization/i.test(read(f)),
  },
  {
    id: "server-fetch-dynamic", level: "medium",
    what: "Server code fetches a URL built from data (SSRF: allowlist the host, https only, size and time limits)",
    files: (f) => /^(app|lib)\//.test(f) && isCode(f) && !isClient(f),
    test: (f, line) => /\bfetch\(\s*(?![`"']https:\/\/[^`"'$]+[`"'])/.test(line) && !/fetch\(\s*new URL\(["'`]\/|fetch\(\s*[`"']\//.test(line),
  },
  {
    id: "blank-target", level: "low",
    what: "target=_blank without rel=noopener",
    files: (f) => /\.(tsx|jsx)$/.test(f),
    test: (f, line, i, lines) => /target=["{]?["']?_blank/.test(line)
      && !/rel=/.test(lines.slice(Math.max(0, i - 3), i + 4).join(" ")),
  },
  {
    id: "select-star", level: "low",
    what: "select(\"*\") from the browser returns every column the role may read (name the columns)",
    files: (f) => isCode(f) && isClient(f),
    // `{ head: true }` is a count and returns no rows, so it is fine.
    test: (f, line) => /\.select\(\s*["'`]\*["'`]/.test(line) && !/head:\s*true/.test(line),
  },
  {
    id: "error-echo", level: "low",
    what: "An error message or env name returned to the caller (log it server-side instead)",
    files: (f) => /^app\/.*route\.(ts|js)$/.test(f),
    test: (f, line) => /(NextResponse\.json|Response\.json|new Response)\([^)]*(\.message|process\.env|SUPABASE_|DISCORD_)/.test(line),
  },
  {
    id: "log-secret", level: "medium",
    what: "Logging something that may be a token, key or session",
    files: isCode,
    test: (f, line) => /console\.(log|info|warn|error)\([^)]*\b(token|secret|service_?role|apikey|password|session|cookie)\b/i.test(line),
  },
  {
    id: "actions-untrusted", level: "high",
    what: "GitHub Actions: an event field interpolated into run: (script injection) or a privileged trigger",
    files: (f) => /^\.github\/workflows\//.test(f),
    test: (f, line) => /\$\{\{\s*github\.event\.(issue|pull_request|comment|review|head_commit|commits|discussion|pages)\b/.test(line)
      || /^\s*pull_request_target\s*:/.test(line),
  },
];

let high = 0;
const report = [];
for (const rule of rules) {
  if (only && !only.has(rule.id)) continue;
  const hits = [];
  for (const f of files) {
    if (rule.files && !rule.files(f)) continue;
    if (rule.fileLevel) {
      if (rule.fileLevel(f)) hits.push(`${f}`);
      continue;
    }
    const lines = read(f).split("\n");
    lines.forEach((line, i) => {
      if (line.length > 2000) return; // minified or data
      if (rule.test(f, line, i, lines)) {
        hits.push(`${f}:${i + 1}${rule.redact ? "  (value not shown)" : `  ${line.trim().slice(0, 140)}`}`);
      }
    });
  }
  if (hits.length) {
    if (rule.level === "high") high += hits.length;
    report.push(`\n[${rule.level}] ${rule.id}: ${rule.what} (${hits.length})\n  ${hits.slice(0, 40).join("\n  ")}${hits.length > 40 ? `\n  … ${hits.length - 40} more` : ""}`);
  }
}

console.log(`scanned ${files.length} files`);
console.log(report.length ? report.join("\n") : "\nnothing matched");
process.exitCode = high ? 1 : 0;
