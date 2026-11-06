import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInstructionChoices,
  buildLocationChoices,
  createSpinner,
  createUi,
  formatInstallResult,
} from "../lib/prompts.js";

test("buildLocationChoices preselects locations with an existing instruction file", () => {
  const choices = buildLocationChoices({
    locations: [
      { path: ".agents", instructionName: "AGENTS.md", instructionExists: true, skillsExist: false },
      { path: ".claude", instructionName: "CLAUDE.md", instructionExists: false, skillsExist: false },
    ],
  });

  assert.equal(choices[0].checked, true);
  assert.equal(choices[1].checked, false);
  assert.match(choices[0].name, /\.agents/);
});

test("buildLocationChoices preselects locations with already-installed skills", () => {
  const choices = buildLocationChoices({
    locations: [
      { path: ".agents", instructionName: "AGENTS.md", instructionExists: false, skillsExist: true },
      { path: ".claude", instructionName: "CLAUDE.md", instructionExists: false, skillsExist: false },
    ],
  });

  assert.equal(choices[0].checked, true);
});



test("buildLocationChoices checks the first entry when nothing else matches", () => {
  const choices = buildLocationChoices({
    locations: [
      { path: ".agents", instructionName: "AGENTS.md", instructionExists: false, skillsExist: false },
      { path: ".claude", instructionName: "CLAUDE.md", instructionExists: false, skillsExist: false },
    ],
  });

  assert.equal(choices[0].checked, true);
});



test("buildInstructionChoices defaults every choice to checked", () => {
  const choices = buildInstructionChoices([
    { instructionFile: "AGENTS.md", exists: false },
    { instructionFile: "CLAUDE.md", exists: true },
  ]);

  assert.deepEqual(
    choices.map((choice) => choice.value),
    ["AGENTS.md", "CLAUDE.md"],
  );
  assert.ok(choices.every((choice) => choice.checked));
  assert.match(choices[0].name, /will be created/);
  assert.match(choices[1].name, /already exists/);
});

test("createUi forces the fallback path when isTTY is false", () => {
  const ui = createUi({ isTTY: false, stdin: process.stdin, stdout: process.stdout, stderr: process.stderr });
  assert.equal(typeof ui.selectLocations, "function");
  assert.equal(typeof ui.selectInstructions, "function");
  assert.equal(typeof ui.confirm, "function");
  assert.equal(typeof ui.startSpinner, "function");
  assert.equal(typeof ui.renderProjectState, "function");
});

test("createSpinner is silent when stderr is not a TTY", () => {
  const writes = [];
  const stderr = {
    isTTY: false,
    write: (text) => writes.push(text),
  };

  const stop = createSpinner({ message: "Installing…", stderr });
  stop();

  assert.deepEqual(writes, []);
});

test("createSpinner writes frames and clears on stop when stderr is a TTY", async () => {
  const writes = [];
  const stderr = {
    isTTY: true,
    write: (text) => writes.push(text),
  };

  const stop = createSpinner({ message: "Installing…", stderr });
  await new Promise((resolve) => setTimeout(resolve, 100));
  stop();

  assert.ok(writes.length >= 2, "spinner writes at least two frames");
  assert.ok(writes.every((text) => text.startsWith("\r")));
  assert.equal(writes.at(-1), "\r");
});

test("formatInstallResult mirrors the CLI installed summary", () => {
  const text = formatInstallResult([".agents"], true, ["AGENTS.md"]);

  assert.match(text, /^Installed:/);
  assert.match(text, /- skills: \.agents\/skills\//);
  assert.match(text, /- notebook: \.repo-notebook\//);
  assert.match(text, /- instruction: AGENTS\.md/);
  assert.match(text, /- marker: \.repo-notebook-install\.json/);
  assert.match(text, /bootstrap skill/);
});

test("formatInstallResult deduplicates instruction files", () => {
  const text = formatInstallResult([".agents", ".omp"], true, ["AGENTS.md", "AGENTS.md"]);

  assert.equal(text.match(/- instruction: AGENTS\.md/g)?.length, 1);
});
