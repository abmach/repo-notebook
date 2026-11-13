// Prompt-stream tests: drive the real @inquirer/prompts checkbox/confirm through
// @inquirer/testing's deterministic `render`, with a scripted keystroke sequence,
// and assert the TTY UI adapter returns the expected selection.
//
// This is the "fake TTY" layer: no real terminal, no pty, fully deterministic,
// and it exercises the exact prompt components the installer uses.
import assert from "node:assert/strict";
import test from "node:test";

import { render } from "@inquirer/testing";
import { checkbox as realCheckbox, confirm as realConfirm } from "@inquirer/prompts";

import { createUi } from "../lib/prompts.js";

// A prompts module that picks the right key script based on the message text.
function promptsRouter({ locationKeys, instructionKeys, confirmKeys }) {
  return {
    async checkbox(config) {
      const keys = /harness locations/i.test(config.message) ? locationKeys : instructionKeys;
      const { answer, events } = await render(realCheckbox, config);
      for (const k of keys) events.keypress(k);
      return answer;
    },
    async confirm(config) {
      const { answer, events } = await render(realConfirm, config);
      for (const k of confirmKeys) {
        if (k.startsWith("type:")) events.type(k.slice(5));
        else events.keypress(k);
      }
      return answer;
    },
  };
}

test("checkbox selects the arrow-key target", async () => {
  const prompts = promptsRouter({ locationKeys: ["down", "space", "return"], instructionKeys: [], confirmKeys: [] });
  const ui = createUi({ isTTY: true, prompts });
  const choices = [
    { name: ".agents", value: ".agents" },
    { name: ".claude", value: ".claude" },
    { name: ".omp", value: ".omp" },
  ];
  const selected = await ui.selectLocations(choices);
  assert.deepEqual(selected, [".claude"]);
});

test("checkbox can select multiple entries", async () => {
  const prompts = promptsRouter({ locationKeys: ["space", "down", "space", "return"], instructionKeys: [], confirmKeys: [] });
  const ui = createUi({ isTTY: true, prompts });
  const choices = [
    { name: ".agents", value: ".agents" },
    { name: ".claude", value: ".claude" },
  ];
  const selected = await ui.selectLocations(choices);
  assert.deepEqual(selected.sort(), [".agents", ".claude"]);
});

test("confirm honors the default on bare enter", async () => {
  const prompts = promptsRouter({ locationKeys: [], instructionKeys: [], confirmKeys: ["return"] });
  const ui = createUi({ isTTY: true, prompts });
  const ok = await ui.confirm({ message: "Install?", defaultValue: true });
  assert.equal(ok, true);
});

test("confirm returns false on 'n'", async () => {
  const prompts = promptsRouter({ locationKeys: [], instructionKeys: [], confirmKeys: ["type:n", "return"] });
  const ui = createUi({ isTTY: true, prompts });
  const ok = await ui.confirm({ message: "Install?", defaultValue: true });
  assert.equal(ok, false);
});

test("selectLocations with no choices returns empty without prompting", async () => {
  const prompts = promptsRouter({ locationKeys: [], instructionKeys: [], confirmKeys: [] });
  const ui = createUi({ isTTY: true, prompts });
  assert.deepEqual(await ui.selectLocations([]), []);
});