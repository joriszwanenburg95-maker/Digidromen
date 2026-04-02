import { spawnSync } from "node:child_process";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Missing guarded command.");
  process.exit(1);
}

const guard = spawnSync("node", ["scripts/project-context-guard.mjs"], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (guard.status !== 0) {
  process.exit(guard.status ?? 1);
}

const child = spawnSync(command, args, {
  cwd: process.cwd(),
  stdio: "inherit",
});

process.exit(child.status ?? 1);
