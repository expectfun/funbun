#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import * as readline from "readline";

const SCRIPT_DIR = dirname(Bun.main);
const FILES = {
  a: { path: join(SCRIPT_DIR, "a.md"), name: "ACTIVE TASKS" },
  b: { path: join(SCRIPT_DIR, "b.md"), name: "BACKLOG" },
  c: { path: join(SCRIPT_DIR, "c.md"), name: "COMPLETED" },
  d: { path: join(SCRIPT_DIR, "d.md"), name: "DELETED" },
  e: { path: join(SCRIPT_DIR, "e.md"), name: "GOALS" },
};

type FileKey = keyof typeof FILES;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function error(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function readLines(filePath: string): string[] {
  if (!existsSync(filePath)) {
    error(`file not found: ${filePath} — run 'fun init'`);
  }
  const content = readFileSync(filePath, "utf-8");
  return content.split("\n").filter((line) => line.trim() !== "");
}

function writeLines(filePath: string, lines: string[]): void {
  writeFileSync(filePath, lines.join("\n") + (lines.length > 0 ? "\n" : ""));
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (taskDate.getTime() === today.getTime()) {
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `today, ${hours}:${mins}`;
  } else if (taskDate.getTime() === yesterday.getTime()) {
    return "yesterday";
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
}

function parseTask(line: string): { checkbox: string; title: string; timestamp?: number } {
  const match = line.match(/^- \[([ x])\] (.+?)(?:\s+(\d{10,}))?$/);
  if (!match) {
    return { checkbox: " ", title: line, timestamp: undefined };
  }
  return {
    checkbox: match[1],
    title: match[2],
    timestamp: match[3] ? parseInt(match[3], 10) : undefined,
  };
}

function isToday(ts: number): boolean {
  const date = new Date(ts * 1000);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getDateKey(ts: number): string {
  const date = new Date(ts * 1000);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function show(fileKey: FileKey): void {
  const file = FILES[fileKey];
  const lines = readLines(file.path);

  console.log(file.name);
  console.log("─".repeat(file.name.length + 2));

  if (lines.length === 0) {
    console.log("(empty)");
    return;
  }

  lines.forEach((line, idx) => {
    const task = parseTask(line);
    const symbol = task.checkbox === "x" ? "✓" : "☐";
    let display = `${symbol} ${idx + 1}. ${task.title}`;
    if (task.timestamp) {
      display += ` (${formatTimestamp(task.timestamp)})`;
    }
    console.log(display);
  });
}

function add(fileKey: "a" | "b" | "e", title: string): void {
  const file = FILES[fileKey];
  if (!existsSync(file.path)) {
    error(`file not found: ${file.path} — run 'fun init'`);
  }
  const line = `- [ ] ${title}\n`;
  appendFileSync(file.path, line);
  console.log(`Added to ${fileKey}.md: ${title}`);
}

function complete(lineNum: number): void {
  const aPath = FILES.a.path;
  const cPath = FILES.c.path;
  const lines = readLines(aPath);

  if (lineNum < 1 || lineNum > lines.length) {
    error(`task ${lineNum} not found`);
  }

  const idx = lineNum - 1;
  const task = parseTask(lines[idx]);
  const timestamp = Math.floor(Date.now() / 1000);

  // Append to c.md with timestamp
  const completedLine = `- [x] ${task.title} ${timestamp}\n`;
  appendFileSync(cPath, completedLine);

  // Mark as completed in a.md (change checkbox)
  lines[idx] = `- [x] ${task.title}`;
  writeLines(aPath, lines);

  console.log(`Completed: ${task.title}`);
}

function deleteTask(lineNum: number): void {
  const aPath = FILES.a.path;
  const dPath = FILES.d.path;
  const lines = readLines(aPath);

  if (lineNum < 1 || lineNum > lines.length) {
    error(`task ${lineNum} not found`);
  }

  const idx = lineNum - 1;
  const task = parseTask(lines[idx]);
  const timestamp = Math.floor(Date.now() / 1000);

  // Append to d.md with timestamp
  const deletedLine = `- [x] ${task.title} ${timestamp}\n`;
  appendFileSync(dPath, deletedLine);

  // Remove from a.md
  lines.splice(idx, 1);
  writeLines(aPath, lines);

  console.log(`Deleted: ${task.title}`);
}

function stats(): void {
  const cPath = FILES.c.path;
  const aPath = FILES.a.path;

  let completedLines: string[] = [];
  let activeLines: string[] = [];

  if (existsSync(cPath)) {
    completedLines = readFileSync(cPath, "utf-8").split("\n").filter((l) => l.trim());
  }
  if (existsSync(aPath)) {
    activeLines = readFileSync(aPath, "utf-8").split("\n").filter((l) => l.trim());
  }

  // Parse completed tasks
  const completedTasks = completedLines.map(parseTask).filter((t) => t.timestamp);

  // Today's tasks
  const todayTasks = completedTasks.filter((t) => t.timestamp && isToday(t.timestamp));

  // Calculate streak
  const dates = new Set(completedTasks.map((t) => t.timestamp && getDateKey(t.timestamp)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 1000; i++) {
    const checkDate = new Date(today.getTime() - i * 86400000);
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      // Allow today to not have tasks yet
      break;
    }
  }

  // Bold/highlight streak if possible
  const streakDisplay = process.stdout.isTTY ? `\x1b[1m★ ${streak} days\x1b[0m` : `* ${streak} days`;

  console.log("──────────────────────────");
  console.log(`STREAK: ${streakDisplay}`);
  console.log(`TOTAL:  ${completedTasks.length} completed | ${activeLines.length} active`);
  console.log("──────────────────────────");
  console.log(`TODAY: ${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""} completed`);

  if (todayTasks.length > 0) {
    todayTasks.forEach((t) => console.log(`• ${t.title}`));
  }
  console.log("──────────────────────────");
}

async function split(lineNum: number): Promise<void> {
  const aPath = FILES.a.path;
  const lines = readLines(aPath);

  if (lineNum < 1 || lineNum > lines.length) {
    error(`task ${lineNum} not found`);
  }

  const idx = lineNum - 1;
  const task = parseTask(lines[idx]);

  console.log(`Decomposing: ${task.title}`);
  console.log("Enter subtasks (empty line to finish):");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const subtasks: string[] = [];

  const prompt = (): Promise<void> => {
    return new Promise((resolve) => {
      rl.question("> ", (answer) => {
        if (answer.trim() === "") {
          rl.close();
          resolve();
        } else {
          subtasks.push(answer.trim());
          prompt().then(resolve);
        }
      });
    });
  };

  await prompt();

  if (subtasks.length === 0) {
    console.log("Cancelled, keeping original task.");
    return;
  }

  // Replace original task with subtasks
  const newTasks = subtasks.map((sub) => `- [ ] ${task.title}: ${sub}`);
  lines.splice(idx, 1, ...newTasks);
  writeLines(aPath, lines);

  console.log(`Added ${subtasks.length} subtask${subtasks.length !== 1 ? "s" : ""}.`);
}

function refresh(): void {
  const aPath = FILES.a.path;
  if (!existsSync(aPath)) {
    error(`file not found: ${aPath} — run 'fun init'`);
  }

  const lines = readLines(aPath);
  const incomplete = lines.filter((line) => {
    const task = parseTask(line);
    return task.checkbox !== "x";
  });

  const removed = lines.length - incomplete.length;
  writeLines(aPath, incomplete);

  console.log(`Refreshed: removed ${removed} completed task${removed !== 1 ? "s" : ""}.`);
}

function init(): void {
  // Create missing .md files
  for (const key of Object.keys(FILES) as FileKey[]) {
    const file = FILES[key];
    if (!existsSync(file.path)) {
      writeFileSync(file.path, "");
      console.log(`Created ${key}.md`);
    }
  }

  // Detect shell
  const shell = process.env.SHELL || "";
  let configFile: string;

  if (shell.includes("zsh")) {
    configFile = join(homedir(), ".zshrc");
  } else if (shell.includes("bash")) {
    configFile = join(homedir(), ".bashrc");
  } else {
    console.log("Warning: non-standard shell detected. Aliases not installed.");
    console.log("Manually add aliases to your shell config.");
    return;
  }

  // Check if already initialized
  if (existsSync(configFile)) {
    const content = readFileSync(configFile, "utf-8");
    if (content.includes("## funbun")) {
      console.log("Aliases already installed.");
      return;
    }
  }

  // Generate aliases
  const scriptPath = Bun.main;
  const aliases = `
## funbun
alias fun='bun ${scriptPath}'
alias fa='vim ${FILES.a.path}'
alias fb='vim ${FILES.b.path}'
alias fc='vim ${FILES.c.path}'
alias fd='vim ${FILES.d.path}'
alias fe='vim ${FILES.e.path}'
a() { [[ $# -eq 0 ]] && bun ${scriptPath} show a || bun ${scriptPath} add a "$@"; }
b() { [[ $# -eq 0 ]] && bun ${scriptPath} show b || bun ${scriptPath} add b "$@"; }
c() { [[ $# -eq 0 ]] && bun ${scriptPath} show c || bun ${scriptPath} complete "$@"; }
d() { [[ $# -eq 0 ]] && bun ${scriptPath} show d || bun ${scriptPath} delete "$@"; }
s() { [[ $# -eq 0 ]] && bun ${scriptPath} stats || bun ${scriptPath} split "$@"; }
e() { [[ $# -eq 0 ]] && bun ${scriptPath} show e || bun ${scriptPath} add e "$@"; }
alias r='bun ${scriptPath} refresh'
`;

  appendFileSync(configFile, aliases);
  console.log(`Aliases added to ${configFile}`);
  console.log("Run 'source " + configFile + "' or restart your shell.");
}

function showHelp(warning?: string): void {
  if (warning) {
    console.log(`Warning: ${warning}\n`);
  }

  console.log(`FunBun - Minimalistic CLI To-Do

Usage: bun fun.ts <command> [args]

Commands:
  show <a|b|c|d|e>    Show tasks from file
  add <a|b|e> <title> Add task to active/backlog/goals
  complete <n>        Mark task n as completed
  delete <n>          Delete task n
  stats               Show completion stats
  split <n>           Decompose task n into subtasks
  refresh             Remove completed tasks from active
  init                Initialize files and shell aliases

Aliases (after init):
  a, b, c, d, e       Show corresponding file
  fa, fb, fc, fd, fe  Edit in vim
  a <title>           Add to active
  b <title>           Add to backlog
  e <title>           Add to goals
  c <n>               Complete task
  d <n>               Delete task
  s                   Show stats
  s <n>               Decompose task
  r                   Refresh active list
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Check for warnings
    const shell = process.env.SHELL || "";
    let warning: string | undefined;

    if (!shell.includes("zsh") && !shell.includes("bash")) {
      warning = "Non-standard shell detected. Some features may not work.";
    } else {
      const configFile = shell.includes("zsh")
        ? join(homedir(), ".zshrc")
        : join(homedir(), ".bashrc");

      const hasAliases = existsSync(configFile) && readFileSync(configFile, "utf-8").includes("## funbun");
      const hasFiles = Object.values(FILES).every((f) => existsSync(f.path));

      if (!hasAliases || !hasFiles) {
        warning = "Not initialized. Run 'bun fun.ts init' to set up.";
      }
    }

    showHelp(warning);
    return;
  }

  const [command, ...rest] = args;

  switch (command) {
    case "show":
      if (!rest[0] || !["a", "b", "c", "d", "e"].includes(rest[0])) {
        error("Usage: show <a|b|c|d|e>");
      }
      show(rest[0] as FileKey);
      break;

    case "add":
      if (!rest[0] || !["a", "b", "e"].includes(rest[0]) || rest.length < 2) {
        error("Usage: add <a|b|e> <title>");
      }
      add(rest[0] as "a" | "b" | "e", rest.slice(1).join(" "));
      break;

    case "complete":
      if (!rest[0] || isNaN(parseInt(rest[0], 10))) {
        error("Usage: complete <n>");
      }
      complete(parseInt(rest[0], 10));
      break;

    case "delete":
      if (!rest[0] || isNaN(parseInt(rest[0], 10))) {
        error("Usage: delete <n>");
      }
      deleteTask(parseInt(rest[0], 10));
      break;

    case "stats":
      stats();
      break;

    case "split":
      if (!rest[0] || isNaN(parseInt(rest[0], 10))) {
        error("Usage: split <n>");
      }
      await split(parseInt(rest[0], 10));
      break;

    case "refresh":
      refresh();
      break;

    case "init":
      init();
      break;

    default:
      error(`Unknown command: ${command}`);
  }
}

main();
