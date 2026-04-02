import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildRepairCommands,
  validateProjectContext,
} from "./project-context-lib.mjs";

const repoRoot = process.cwd();
const contextPath = path.join(repoRoot, ".project-context.json");

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, "utf8").trim() || null;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  };
}

function resolveGhUser() {
  const result = run("gh", ["auth", "status", "--hostname", "github.com"]);
  if (!result.ok) {
    return null;
  }

  const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const loginMatch =
    combinedOutput.match(/account\s+([A-Za-z0-9-]+)\b/) ??
    combinedOutput.match(/Logged in to github\.com as ([A-Za-z0-9-]+)\b/);

  return loginMatch?.[1] ?? null;
}

function resolveSupabaseProjectRef(expectedProjectRef) {
  const localFiles = [
    path.join(repoRoot, "supabase", ".temp", "project-ref"),
    path.join(repoRoot, ".supabase", "project-ref"),
  ];

  for (const filePath of localFiles) {
    const value = readText(filePath);
    if (value) {
      return value;
    }
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    return null;
  }

  const result = run("npx", [
    "supabase",
    "link",
    "--project-ref",
    expectedProjectRef,
    "--dry-run",
  ]);

  if (!result.ok) {
    return null;
  }

  return expectedProjectRef;
}

function printFailure(expected, errors) {
  const repairCommands = buildRepairCommands(expected);
  console.error("Project context guard blocked this command.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  console.error("Repair with:");
  for (const command of repairCommands) {
    console.error(`  ${command}`);
  }
}

const expected = readJson(contextPath);
if (!expected) {
  console.error(`Missing project context file: ${contextPath}`);
  process.exit(1);
}

const actual = {
  gitRemoteUrl: run("git", ["config", "--get", "remote.origin.url"]).stdout || null,
  ghUser: resolveGhUser(),
  vercelProject: readJson(path.join(repoRoot, ".vercel", "project.json")),
  supabaseProjectRef: resolveSupabaseProjectRef(expected.supabase.projectRef),
};

const validation = validateProjectContext(expected, actual);

if (!validation.ok) {
  printFailure(expected, validation.errors);
  process.exit(1);
}
