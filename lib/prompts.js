// Prompt adapter for the installer CLI.
//
// The installer previously hand-rolled `node:readline` prompts — plain [Y/n]
// questions and a free-typed, comma-separated location list. That is hard to
// discover and easy to mistype. In a real terminal the adapter now uses
// @inquirer/prompts (the maintained successor of `inquirer`) for arrow-key
// multiselect checkboxes, `confirm` with a stated default, and a spinner for
// the install step. The non-TTY fallback keeps the original readline questions
// working, so pipes, CI, and test harnesses see the same behavior as before.

import { createInterface } from "node:readline";

import { supportedLocations } from "./installer.js";

/**
 * Build location multiselect choices from a project inspection result.
 *
 * Each choice carries a short state hint (already installed / instruction
 * already present / not installed) and is preselected when the project
 * already carries that location's instruction file or skills. When nothing
 * is preselected, the first choice is checked so the selector never opens
 * empty.
 *
 * @param {{ locations: Array<{ path: string, instructionName: string, instructionExists: boolean, skillsExist: boolean }> }} project
 */
export function buildLocationChoices(project) {
  const choices = project.locations.map((location) => {
    const state = location.skillsExist
      ? "already installed"
      : location.instructionExists
        ? "instruction already present"
        : "not installed";
    const checked = Boolean(location.instructionExists || location.skillsExist);
    return {
      name: `${location.path} — ${state}`,
      value: location.path,
      checked,
    };
  });

  if (choices.some((choice) => choice.checked)) {
    return choices;
  }

  return choices.map((choice, index) => ({ ...choice, checked: index === 0 }));
}

/**
 * Build checkbox choices for always-read instruction files. Values are the
 * instruction target file names; every choice starts checked.
 *
 * @param {Array<{ instructionFile: string, exists?: boolean }>} targets
 */
export function buildInstructionChoices(targets) {
  return targets.map((target) => ({
    name: `${target.instructionFile}${target.exists ? " — already exists" : " — will be created"}`,
    value: target.instructionFile,
    checked: true,
  }));
}

/**
 * Create the UI adapter for this process.
 *
 * `isTTY` is an explicit parameter (not read from process) so tests and
 * non-TTY harnesses can force the readline fallback path. An explicit `false`
 * always selects the fallback; an explicit `true` requires usable streams.
 *
 * @param {{ isTTY?: boolean, stdin?: unknown, stdout?: unknown, stderr?: unknown }} [options]
 */
export function createUi({ isTTY, stdin, stdout, stderr } = {}) {
  const input = stdin ?? process.stdin;
  const output = stdout ?? process.stdout;
  const errorOutput = stderr ?? process.stderr;
  const interactive = isTTY ?? (Boolean(input.isTTY) && Boolean(output.isTTY));

  if (interactive) {
    return createTtyUi({ stdin: input, stdout: output, stderr: errorOutput });
  }
  return createFallbackUi({ stdin: input, stdout: output, stderr: errorOutput });
}

// ---------------------------------------------------------------------------
// TTY path (@inquirer/prompts)
// ---------------------------------------------------------------------------

function createTtyUi({ stdin, stdout, stderr }) {
  // One shared loader keeps the dynamic import — and its error translation —
  // in exactly one place. Inquirer writes prompts to stderr by default; the
  // explicit streams keep the banner (stdout) and prompts (stderr)
  // separable and testable.
  async function load() {
    try {
      return await import("@inquirer/prompts");
    } catch (error) {
      throw new Error(
        `Interactive prompts unavailable (${error.message}). ` +
          `Run with explicit flags instead: repo-notebook init --location .agents --notebook --instruction AGENTS.md`,
      );
    }
  }

  function handlePromptError(error) {
    if (error?.name === "ExitPromptError") {
      console.error("Installation cancelled. Nothing was installed.");
      process.exit(0);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }

  async function selectLocations(choices) {
    if (choices.length === 0) {
      return [];
    }
    try {
      const { multiselect } = await load();
      return await multiselect({
        message: "Which harness locations should receive the skills?",
        choices,
        pageSize: Math.max(4, choices.length),
        input: stdin,
        output: stderr,
      });
    } catch (error) {
      handlePromptError(error);
    }
    return [];
  }

  async function selectInstructions(choices) {
    if (choices.length === 0) {
      return [];
    }
    try {
      const { checkbox } = await load();
      return await checkbox({
        message: "Which instruction files should get the always-on Repo Notebook guidance?",
        choices,
        pageSize: Math.max(4, choices.length),
        input: stdin,
        output: stderr,
      });
    } catch (error) {
      handlePromptError(error);
    }
    return [];
  }

  async function confirm({ message, defaultValue }) {
    try {
      const { confirm: promptConfirm } = await load();
      return Boolean(
        await promptConfirm({
          message,
          default: defaultValue ?? true,
          input: stdin,
          output: stderr,
        }),
      );
    } catch (error) {
      handlePromptError(error);
    }
    return false;
  }

  return {
    renderProjectState: () => {},
    selectLocations,
    selectInstructions,
    confirm,
    startSpinner: (message) => createSpinner({ message, stderr }),
    close: () => {},
  };
}

// ---------------------------------------------------------------------------
// Fallback path (readline, piped stdin/stdout)
// ---------------------------------------------------------------------------

function createFallbackUi({ stdin, stdout }) {
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

  function ask(question) {
    stdout.write(question);
    if (queue.length > 0) {
      return Promise.resolve(queue.shift());
    }
    if (closed) {
      return Promise.resolve("");
    }
    return new Promise((resolve) => waiters.push(resolve));
  }

  function isDefaultYes(answer) {
    const normalized = answer.trim().toLowerCase();
    return normalized === "" || ["y", "yes"].includes(normalized);
  }

  async function confirm({ message, defaultValue }) {
    const suffix = defaultValue ? " [Y/n] " : " [y/N] ";
    const answer = await ask(`${message}${suffix}`);
    const normalized = answer.trim().toLowerCase();
    if (normalized === "") {
      return Boolean(defaultValue);
    }
    return ["y", "yes"].includes(normalized);
  }

  async function selectLocations(choices) {
    const answer = await ask(
      'Install skills into which locations? Comma-separated, or "none" [none]: ',
    );
    const requested = answer
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => value !== "none");

    const offered = new Set(choices.map((choice) => choice.value));
    const allowed = offered.size > 0 ? offered : new Set(Object.keys(supportedLocations));
    const invalid = requested.filter((location) => !allowed.has(location));
    if (invalid.length > 0) {
      throw new Error(`Unsupported location(s): ${invalid.join(", ")}`);
    }

    return [...new Set(requested)];
  }

  async function selectInstructions(choices) {
    if (choices.length === 0) {
      return [];
    }

    const selected = [];
    for (const choice of choices) {
      const preserved = choice.name.includes("already exists") ? " The existing file will be preserved." : "";
      const answer = await ask(
        `Add the always-on Repo Notebook instruction to ${choice.value}?${preserved} [Y/n] `,
      );
      if (isDefaultYes(answer)) {
        selected.push(choice.value);
      }
    }
    return selected;
  }

  return {
    renderProjectState: (project) => {
      console.log("\nSupported harness locations:");
      for (const location of project.locations) {
        const state = location.skillsExist ? "skills already present" : "not installed";
        const instruction = location.instructionExists ? "instruction exists" : "instruction absent";
        console.log(`- ${location.path} (${state}; ${instruction})`);
      }
    },
    selectLocations,
    selectInstructions,
    confirm,
    startSpinner: () => () => {},
    close() {
      rl.close();
    },
  };
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// Spinner lives on stderr (stdout is reserved for the machine-readable
// result) and only animates when stderr is a TTY; otherwise it is a no-op so
// pipes never see half-overwritten lines. The stop function clears the line.
export function createSpinner({ message, stderr }) {
  if (!stderr.isTTY) {
    return () => {};
  }

  let frame = 0;
  let active = true;
  const tick = () => {
    if (!active) return;
    stderr.write(`\r${SPINNER_FRAMES[frame % SPINNER_FRAMES.length]} ${message}`);
    frame += 1;
  };
  tick();
  const timer = setInterval(tick, 80);
  timer.unref();

  return () => {
    active = false;
    clearInterval(timer);
    stderr.write("\r");
  };
}

/**
 * Render the final "Installed:" summary block. Used by both paths so the
 * result text stays byte-identical for non-TTY consumers.
 */
export function formatInstallResult(selectedLocations, notebookCreated, instructionFiles) {
  const lines = ["Installed:"];
  for (const location of selectedLocations) {
    lines.push(`- skills: ${location}/skills/`);
  }
  if (notebookCreated) {
    lines.push("- notebook: .repo-notebook/");
  }
  for (const instructionFile of [...new Set(instructionFiles)]) {
    lines.push(`- instruction: ${instructionFile}`);
  }
  lines.push("- marker: .repo-notebook-install.json");
  lines.push("");
  lines.push("Run the bootstrap skill in your agent to propose the first durable records.");
  return lines.join("\n");
}
