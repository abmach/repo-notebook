#!/usr/bin/env node

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
import {
  buildInstructionChoices,
  buildLocationChoices,
  createUi,
  formatInstallResult,
} from "../lib/prompts.js";

const args = process.argv.slice(2);
const packageData = await loadPackageData();

if (args.includes("--help") || args.includes("-h")) {
  printHelp(packageData.version);
  process.exit(0);
}

if (args[0] !== "init") {
  console.error(`Usage: repo-notebook init`);
  process.exit(2);
}

const explicitPlan = parseExplicitOptions(args.slice(1));
const root = await findProjectRoot();
const inspection = await inspectProject(root);
const ui = createUi();

try {
  console.log(`Repo Notebook ${packageData.version}`);
  console.log(`Project: ${root}`);

  if (!explicitPlan) {
    ui.renderProjectState(inspection);
  }

  const selectedLocations = explicitPlan?.locations ?? await pickLocations(inspection, ui);
  if (selectedLocations.length === 0) {
    console.log("No harness locations selected. Nothing was installed.");
    process.exit(0);
  }

  const createNotebookDirectory = explicitPlan?.notebook ?? await pickNotebook(ui, inspection);
  const instructionTargets = explicitPlan?.instructions ?? await pickInstructions(selectedLocations, inspection, ui);

  if (!explicitPlan) {
    // Genuine consent gate: the final summary + confirmation happens after
    // every other choice, and cancelling here leaves the project untouched.
    if (!(await ui.confirm({ message: "Install Repo Notebook with these choices?", defaultValue: true }))) {
      console.log("Installation cancelled. Nothing was installed.");
      process.exit(0);
    }
  }

  const stopSpinner = ui.startSpinner("Installing…");
  try {
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

    console.log(`\n${formatInstallResult(selectedLocations, notebookCreated, instructionFiles)}`);
  } finally {
    stopSpinner();
  }
} finally {
  ui.close();
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

async function pickLocations(inspection, ui) {
  const choices = buildLocationChoices(inspection);
  const selected = await ui.selectLocations(choices);
  return validateSelectedLocations(selected);
}

async function pickNotebook(ui, inspection) {
  const message = inspection.notebookExists
    ? `Create or refresh the ${notebookDirectory} templates? Existing files will be preserved.`
    : `Create ${notebookDirectory} with starter records?`;
  return ui.confirm({ message, defaultValue: true });
}

async function pickInstructions(selectedLocations, inspection, ui) {
  const targets = [...new Set(selectedLocations.map((location) => supportedLocations[location]))].map(
    (instructionFile) => ({
      instructionFile,
      exists: inspection.locations.some((entry) => entry.instructionName === instructionFile && entry.instructionExists),
    }),
  );
  const choices = buildInstructionChoices(targets);
  const picked = await ui.selectInstructions(choices);

  const invalid = picked.filter((value) => !targets.some((target) => target.instructionFile === value));
  if (invalid.length > 0) {
    throw new Error(`Unsupported instruction file(s): ${invalid.join(", ")}`);
  }

  return picked.map((instructionFile) => ({ instructionFile }));
}

function validateSelectedLocations(selected) {
  if (!selected || selected.length === 0) {
    return [];
  }
  const invalid = selected.filter((location) => !(location in supportedLocations));
  if (invalid.length > 0) {
    throw new Error(`Unsupported location(s): ${invalid.join(", ")}`);
  }
  return [...new Set(selected)];
}

function printHelp(version) {
  console.log(`Repo Notebook ${version}`);
  console.log("\nUsage:");
  console.log("  repo-notebook init");
  console.log("  repo-notebook init --location .agents --notebook --instruction AGENTS.md");
  console.log("\nInstalls Repo Notebook skills into selected harness locations.");
  console.log("Interactive mode asks before creating notebook files or modifying instruction files.");
}
