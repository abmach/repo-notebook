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
import { checkNotebook, summarize, fixMechanical } from "../lib/checker.js";
import path from "node:path";
const CHECK_FLAGS = new Set(["--json", "--strict", "--fix"]);

const args = process.argv.slice(2);
const packageData = await loadPackageData();

if (args.includes("--help") || args.includes("-h")) {
  printHelp(packageData.version);
  process.exit(0);
}

if (args[0] === "check") {
  await runCheck(args.slice(1));
} else if (args[0] !== "init") {
  console.error(`Usage: repo-notebook init | repo-notebook check`);
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
    const preservedSkillFiles = [];
    const replacedSkillFiles = [];
    const skillHashes = {};
    for (const location of selectedLocations) {
      const result = await installSkills(root, location, packageData, {
        replaceExisting: explicitPlan?.replaceSkills === true,
      });
      preservedSkillFiles.push(...result.preserved);
      replacedSkillFiles.push(...result.replaced);
      skillHashes[location] = result.hashes;
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
      skillHashes,
    );

    console.log(`\n${formatInstallResult(
      selectedLocations,
      notebookCreated,
      instructionFiles,
      preservedSkillFiles,
      replacedSkillFiles,
    )}`);
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
  let replaceSkills = false;

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
    } else if (option === "--replace-skills") {
      replaceSkills = true;
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
    replaceSkills,
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

async function runCheck(options) {
  for (const opt of options) {
    if (!CHECK_FLAGS.has(opt)) {
      console.error(`Unknown option for check: ${opt}`);
      process.exit(2);
    }
  }
  const json = options.includes("--json");
  const strict = options.includes("--strict");
  const fix = options.includes("--fix");
  const root = await findProjectRoot();
  const notebookDir = path.join(root, notebookDirectory);

  if (fix) {
    const { fixed, changed } = await fixMechanical(notebookDir);
    if (json) {
      console.log(JSON.stringify({ fixed, changed }, null, 2));
    } else if (fixed.length === 0) {
      console.log("Nothing to fix.");
    } else {
      for (const f of fixed) console.log(`fixed ${f.code} (${f.file}): ${f.message}`);
    }
  }

  const findings = await checkNotebook(notebookDir);
  const { errors, warnings, stale, ok } = summarize(findings);

  if (json) {
    console.log(JSON.stringify({ ok, errors, warnings, stale }, null, 2));
  } else if (findings.length === 0) {
    console.log(`No structural issues found in ${notebookDir}.`);
  } else {
    for (const f of findings) {
      const where = f.file ? ` (${f.file})` : "";
      const tag = f.code.startsWith("S") ? "review" : f.code.startsWith("W") ? "warn" : "error";
      console.log(`${f.code} [${tag}]${where}: ${f.message}`);
    }
  }

  const failed = !ok || (strict && warnings.length > 0);
  process.exit(failed ? 1 : 0);
}

function printHelp(version) {
  console.log(`Repo Notebook ${version}`);
  console.log("\nUsage:");
  console.log("  repo-notebook init");
  console.log("  repo-notebook init --location .agents --notebook --instruction AGENTS.md");
  console.log("  repo-notebook init --location .agents --replace-skills");
  console.log("  repo-notebook check [--json] [--strict] [--fix]");
  console.log("\nInstalls Repo Notebook skills into selected harness locations.");
  console.log("--replace-skills explicitly replaces differing installed skill files.");
  console.log("Interactive mode asks before creating notebook files or modifying instruction files.");
  console.log("\n`check` lints notebook structure: absent notebook, duplicate decision IDs,");
  console.log("id/filename mismatches, dangling or incomplete supersession, and invalid");
  console.log("status. --fix applies only mechanical fixes (align id to filename,");
  console.log("renumber duplicate ids). --json prints machine-readable findings;");
  console.log("--strict fails on warnings too.");
  console.log("S001 findings are report-only review prompts (a superseded decision's");
  console.log("terms still appear in current truth), never pass/fail.");
}
