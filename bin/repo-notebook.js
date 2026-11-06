#!/usr/bin/env node

import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import {
  addInstruction,
  createNotebook,
  findProjectRoot,
  inspectProject,
  installSkills,
  loadPackageData,
  notebookDirectory,
  supportedLocations,
  writeInstallMarker,
} from "../lib/installer.js";

const args = process.argv.slice(2);
const packageData = await loadPackageData();

if (args.includes("--help") || args.includes("-h")) {
  printHelp(packageData.version);
  process.exit(0);
}

if (args[0] !== "init") {
  console.error("Usage: repo-notebook init");
  process.exit(2);
}

const explicitPlan = parseExplicitOptions(args.slice(1));
const root = await findProjectRoot();
const inspection = await inspectProject(root);
const prompt = explicitPlan ? null : createPrompt();

try {
  console.log(`Repo Notebook ${packageData.version}`);
  console.log(`Project: ${root}`);
  if (explicitPlan) {
    printLocations(inspection);
  }

  const selectedLocations = explicitPlan?.locations ?? await selectLocations(inspection, prompt);
  if (selectedLocations.length === 0) {
    console.log("No harness locations selected. Nothing was installed.");
    process.exit(0);
  }

  const createNotebookDirectory = explicitPlan?.notebook ?? await confirm(
    prompt,
    inspection.notebookExists
      ? `Create or refresh the ${notebookDirectory} templates? Existing files will be preserved. [y/N] `
      : `Create ${notebookDirectory} with starter records? [y/N] `,
  );

  const instructionTargets = explicitPlan?.instructions ?? await selectInstructionTargets(selectedLocations, inspection, prompt);

  if (!explicitPlan) {
    const confirmed = await confirm(prompt, "Install Repo Notebook with these choices? [y/N] ");
    if (!confirmed) {
      console.log("Installation cancelled. Nothing was installed.");
      process.exit(0);
    }
  }

  for (const location of selectedLocations) {
    await installSkills(root, location, packageData);
  }

  let notebookCreated = false;
  if (createNotebookDirectory) {
    await createNotebook(root);
    notebookCreated = true;
  }

  const instructionFiles = [];
  for (const target of instructionTargets) {
    await addInstruction(root, target.instructionFile, packageData);
    instructionFiles.push(target.instructionFile);
  }

  await writeInstallMarker(
    root,
    packageData,
    selectedLocations,
    notebookCreated,
    [...new Set(instructionFiles)],
  );

  console.log("\nInstalled:");
  for (const location of selectedLocations) {
    console.log(`- skills: ${location}/skills/`);
  }
  if (notebookCreated) {
    console.log(`- notebook: ${notebookDirectory}/`);
  }
  for (const instructionFile of [...new Set(instructionFiles)]) {
    console.log(`- instruction: ${instructionFile}`);
  }
  console.log("- marker: .repo-notebook-install.json");
  console.log("\nRun the bootstrap skill in your agent to propose the first durable records.");
} finally {
  prompt?.close();
}

function parseExplicitOptions(options) {
  if (options.length === 0) {
    return null;
  }

  const locations = [];
  const instructions = [];
  let notebook = false;

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--location") {
      const value = options[++index];
      if (!supportedLocations[value]) {
        throw new Error(`Unsupported location: ${value}`);
      }
      locations.push(value);
    } else if (option === "--notebook") {
      notebook = true;
    } else if (option === "--instruction") {
      const value = options[++index];
      if (!["AGENTS.md", "CLAUDE.md"].includes(value)) {
        throw new Error(`Unsupported instruction file: ${value}`);
      }
      instructions.push({ instructionFile: value });
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }

  if (locations.length === 0) {
    throw new Error("At least one --location is required with explicit options.");
  }

  return {
    locations: [...new Set(locations)],
    notebook,
    instructions: [...new Map(instructions.map((target) => [target.instructionFile, target])).values()],
  };
}

function printLocations(project) {
  console.log("\nSupported harness locations:");
  for (const location of project.locations) {
    const state = location.skillsExist ? "skills already present" : "not installed";
    const instruction = location.instructionExists ? "instruction exists" : "instruction absent";
    console.log(`- ${location.path} (${state}; ${instruction})`);
  }
}

async function selectLocations(project, prompt) {
  printLocations(project);

  const answer = await prompt.ask(
    `Install skills into which locations? Comma-separated, or "none" [none]: `,
  );
  const requested = answer
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (requested.length === 0 || requested.includes("none")) {
    return [];
  }

  const invalid = requested.filter((location) => !(location in supportedLocations));
  if (invalid.length > 0) {
    throw new Error(`Unsupported location(s): ${invalid.join(", ")}`);
  }

  return [...new Set(requested)];
}

async function selectInstructionTargets(locations, project, prompt) {
  const files = [...new Set(locations.map((location) => supportedLocations[location]))];
  const targets = [];

  for (const instructionName of files) {
    const existing = project.locations.find((entry) => entry.instructionName === instructionName);
    const answer = await prompt.ask(
      `Add the always-on Repo Notebook instruction to ${instructionName}?${
        existing?.instructionExists ? " The existing file will be preserved." : ""
      } [y/N] `,
    );
    if (confirmAnswer(answer)) {
      targets.push({ instructionFile: instructionName });
    }
  }

  return targets;
}

async function confirm(prompt, question) {
  return confirmAnswer(await prompt.ask(question));
}

function confirmAnswer(answer) {
  return ["y", "yes"].includes(answer.trim().toLowerCase());
}

function createPrompt() {
  const rl = createInterface({ input: stdin, output: stdout });
  const queue = [];
  const waiters = [];
  let closed = false;

  rl.on("line", (line) => {
    if (waiters.length > 0) {
      waiters.shift()(line);
    } else {
      queue.push(line);
    }
  });

  rl.on("close", () => {
    closed = true;
    while (waiters.length > 0) {
      waiters.shift()("");
    }
  });

  return {
    async ask(question) {
      stdout.write(question);
      if (queue.length > 0) {
        return queue.shift();
      }
      if (closed) {
        return "";
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
    close() {
      rl.close();
    },
  };
}

function printHelp(version) {
  console.log(`Repo Notebook ${version}`);
  console.log("\nUsage:");
  console.log("  repo-notebook init");
  console.log("  repo-notebook init --location .agents --notebook --instruction AGENTS.md");
  console.log("\nInstalls Repo Notebook skills into selected harness locations.");
  console.log("Interactive mode asks before creating notebook files or modifying instruction files.");
}
