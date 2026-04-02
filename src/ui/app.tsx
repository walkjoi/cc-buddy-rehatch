import React, { useEffect, useRef, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";

import { EYES, HATS, RARITIES, RARITY_LABELS, SPECIES } from "../core/constants";
import type {
  BuddyEye,
  BuddyHat,
  BuddyRarity,
  BuddySpecies,
  BuddyStats,
  ClaudeRuntimeContext,
  RehatchTarget,
  SearchBackend,
} from "../core/types";
import { SaltReplacePatchBackend } from "../claude/patch-salt";
import { renderSprite } from "../sprites/render";
import { RARITY_COLORS, RARITY_STARS } from "../sprites/data";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Spinner({ label }: { label: string }): React.ReactElement {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFrame((value) => (value + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(timer);
  }, []);
  return (
    <Text>
      <Text color="cyan">{SPINNER_FRAMES[frame]}</Text> {label}
    </Text>
  );
}

function KeyHint({ children }: { children: React.ReactNode }): React.ReactElement {
  return <Text italic dimColor>{children}</Text>;
}

function ListSelect<T extends string>({
  label,
  options,
  defaultValue,
  onChange,
  onSubmit,
  onBack,
  isActive,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  defaultValue: T;
  onChange: (value: T) => void;
  onSubmit: (value: T) => void;
  onBack?: () => void;
  isActive: boolean;
}): React.ReactElement {
  const [index, setIndex] = useState(Math.max(0, options.findIndex((option) => option.value === defaultValue)));
  useInput(
    (_, key) => {
      if (key.escape && onBack) {
        onBack();
        return;
      }
      if (key.upArrow || key.leftArrow) {
        const next = (index - 1 + options.length) % options.length;
        setIndex(next);
        onChange(options[next]!.value);
      }
      if (key.downArrow || key.rightArrow) {
        const next = (index + 1) % options.length;
        setIndex(next);
        onChange(options[next]!.value);
      }
      if (key.return) {
        onSubmit(options[index]!.value);
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      <Text bold>{label}</Text>
      {options.map((option, optionIndex) => (
        <Text key={option.value} {...(optionIndex === index ? { color: "cyan" as const } : {})}>
          {optionIndex === index ? "❯ " : "  "}
          {option.label}
        </Text>
      ))}
      <KeyHint>{onBack ? "↑↓ select · enter confirm · esc back" : "↑↓ select · enter confirm"}</KeyHint>
    </Box>
  );
}

function ConfirmSelect({
  label,
  onConfirm,
  onCancel,
  onBack,
  isActive,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  onBack?: () => void;
  isActive: boolean;
}): React.ReactElement {
  const [index, setIndex] = useState(0);
  useInput(
    (_, key) => {
      if (key.escape && onBack) {
        onBack();
        return;
      }
      if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
        setIndex((value) => (value === 0 ? 1 : 0));
      }
      if (key.return) {
        if (index === 0) {
          onConfirm();
        } else {
          onCancel();
        }
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      <Text bold>{label}</Text>
      <Box gap={2}>
        <Text {...(index === 0 ? { color: "cyan" as const } : {})}>{index === 0 ? "❯ Yes" : "  Yes"}</Text>
        <Text {...(index === 1 ? { color: "cyan" as const } : {})}>{index === 1 ? "❯ No" : "  No"}</Text>
      </Box>
      <KeyHint>{onBack ? "←→ select · enter confirm · esc back" : "←→ select · enter confirm"}</KeyHint>
    </Box>
  );
}

function PreviewCard({
  species,
  rarity,
  eye,
  hat,
  shiny,
  stats,
}: {
  species: BuddySpecies;
  rarity: BuddyRarity;
  eye: BuddyEye;
  hat: BuddyHat;
  shiny: boolean;
  stats?: BuddyStats;
}): React.ReactElement {
  const color = RARITY_COLORS[rarity] ?? "white";
  const stars = RARITY_STARS[rarity] ?? "";
  const sprite = renderSprite({ species, eye, hat });
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
      <Box>
        <Box flexDirection="column">
          {sprite.map((line, index) => (
            <Text key={`${species}-${index}`} color={color}>
              {line}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column" marginLeft={2}>
          <Text bold>{species}</Text>
          <Text color={color}>
            {rarity}
            {shiny ? " ✦shiny" : ""}
          </Text>
          <Text dimColor>
            eye:{eye} hat:{hat}
          </Text>
          <Text>{stars}</Text>
        </Box>
      </Box>
      {stats ? (
        <Box flexDirection="column" marginTop={1}>
          {Object.entries(stats).map(([name, value]) => {
            const filled = Math.min(10, Math.max(0, Math.round(value / 10)));
            return (
              <Text key={name}>
                <Text>{name.padEnd(10)} </Text>
                <Text color={color}>{"█".repeat(filled)}</Text>
                <Text dimColor>{"░".repeat(10 - filled)}</Text>
                <Text> {String(value).padStart(3)}</Text>
              </Text>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}

const STEP_ORDER = ["action", "species", "rarity", "eye", "hat", "shiny", "confirm"] as const;
type Step = typeof STEP_ORDER[number] | "search" | "result" | "done" | "showCurrent";

function previousStep(step: Step, rarity: BuddyRarity): Step | null {
  const index = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number]);
  if (index <= 0) {
    return null;
  }
  let candidate = STEP_ORDER[index - 1] as Step;
  if (candidate === "hat" && rarity === "common") {
    candidate = "eye";
  }
  return candidate;
}

function App({
  context,
  searchBackend,
  patchBackend,
  onRestore,
  force,
  noSign,
  rehatchSoul,
  timeoutMs,
}: {
  context: ClaudeRuntimeContext;
  searchBackend: SearchBackend;
  patchBackend: SaltReplacePatchBackend;
  onRestore: () => Promise<string[]>;
  force: boolean;
  noSign: boolean;
  rehatchSoul: boolean;
  timeoutMs: number;
}): React.ReactElement {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>("action");
  const [species, setSpecies] = useState<BuddySpecies>(context.currentRoll.species);
  const [rarity, setRarity] = useState<BuddyRarity>(context.currentRoll.rarity);
  const [eye, setEye] = useState<BuddyEye>(context.currentRoll.eye);
  const [hat, setHat] = useState<BuddyHat>(context.currentRoll.hat);
  const [shiny, setShiny] = useState<boolean>(context.currentRoll.shiny);
  const [progress, setProgress] = useState("Searching for matching salt...");
  const [error, setError] = useState<string | null>(null);
  const [doneMessages, setDoneMessages] = useState<string[]>([]);
  const [found, setFound] = useState<{ salt: string; result: typeof context.currentRoll; checked: number; elapsedMs: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const effectiveHat = rarity === "common" ? "none" : hat;
  const target = (shinyValue = shiny): RehatchTarget => ({ species, rarity, eye, hat: effectiveHat, shiny: shinyValue });
  const displayRoll = found?.result ?? { ...context.currentRoll, species, rarity, eye, hat: effectiveHat, shiny };
  const showStats = step === "showCurrent" || step === "result" || step === "done";

  const goBack = (): void => {
    const candidate = previousStep(step, rarity);
    if (candidate) {
      setStep(candidate);
    } else {
      exit();
    }
  };

  useEffect(() => {
    if (step !== "search") {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    void searchBackend
      .find(context.installTarget.userId, target(), {
        signal: controller.signal,
        hashBackendName: context.installTarget.hashBackendName,
        excludeSalt: context.currentSalt,
        timeoutMs,
        onProgress: (next) => {
          setProgress(`${(next.checked / 1e6).toFixed(1)}M salts checked (${(next.elapsedMs / 1000).toFixed(1)}s)`);
        },
      })
      .then((result) => {
        if (!result) {
          setError("No matching salt found. Try relaxing constraints.");
          return;
        }
        setFound(result);
        setStep("result");
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Search failed");
      });

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [context.installTarget.userId, eye, effectiveHat, rarity, searchBackend, shiny, species, step, timeoutMs]);

  useInput(
    (_, key) => {
      if (step === "search" && key.escape) {
        abortRef.current?.abort();
        exit();
      }
      if ((step === "showCurrent" || step === "done") && !key.ctrl) {
        exit();
      }
    },
    { isActive: step === "search" || step === "showCurrent" || step === "done" },
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor>
        cc-buddy-rehatch
      </Text>
      <PreviewCard
        species={displayRoll.species}
        rarity={displayRoll.rarity}
        eye={displayRoll.eye}
        hat={displayRoll.hat}
        shiny={displayRoll.shiny}
        {...(showStats ? { stats: displayRoll.stats } : {})}
      />
      <Box marginTop={1}>
        {step === "action" ? (
          <ListSelect
            label="What would you like to do?"
            options={[
              { label: "Rehatch buddy", value: "rehatch" },
              { label: "Restore latest backup", value: "restore" },
              { label: "Show current", value: "current" },
            ]}
            defaultValue="rehatch"
            onChange={() => {}}
            onSubmit={(value) => {
              if (value === "current") {
                setStep("showCurrent");
                return;
              }
              if (value === "restore") {
                void onRestore()
                  .then((messages) => {
                    setDoneMessages(messages);
                    setStep("done");
                  })
                  .catch((cause) => {
                    setDoneMessages([cause instanceof Error ? cause.message : "Restore failed"]);
                    setStep("done");
                  });
                return;
              }
              setStep("species");
            }}
            isActive
          />
        ) : null}
        {step === "showCurrent" ? (
          <Box flexDirection="column">
            <Text color="green">✓ Current buddy shown above.</Text>
            <KeyHint>Press any key to exit</KeyHint>
          </Box>
        ) : null}
        {step === "species" ? (
          <ListSelect
            label="Species"
            options={SPECIES.map((value) => ({ label: value, value }))}
            defaultValue={species}
            onChange={setSpecies}
            onSubmit={() => setStep("rarity")}
            onBack={goBack}
            isActive
          />
        ) : null}
        {step === "rarity" ? (
          <ListSelect
            label="Rarity"
            options={RARITIES.map((value) => ({ label: RARITY_LABELS[value], value }))}
            defaultValue={rarity}
            onChange={(value) => {
              setRarity(value);
              if (value === "common") {
                setHat("none");
              }
            }}
            onSubmit={() => setStep("eye")}
            onBack={goBack}
            isActive
          />
        ) : null}
        {step === "eye" ? (
          <ListSelect
            label="Eye"
            options={EYES.map((value) => ({ label: value, value }))}
            defaultValue={eye}
            onChange={setEye}
            onSubmit={() => setStep(rarity === "common" ? "shiny" : "hat")}
            onBack={goBack}
            isActive
          />
        ) : null}
        {step === "hat" ? (
          <ListSelect
            label="Hat"
            options={HATS.map((value) => ({ label: value, value }))}
            defaultValue={hat === "none" ? "crown" : hat}
            onChange={setHat}
            onSubmit={() => setStep("shiny")}
            onBack={goBack}
            isActive
          />
        ) : null}
        {step === "shiny" ? (
          <ConfirmSelect
            label="Shiny?"
            onConfirm={() => {
              setShiny(true);
              setStep("confirm");
            }}
            onCancel={() => {
              setShiny(false);
              setStep("confirm");
            }}
            onBack={goBack}
            isActive
          />
        ) : null}
        {step === "confirm" ? (
          <Box flexDirection="column">
            <Text>
              Target: <Text bold>{species}</Text> / <Text bold>{rarity}</Text> / eye:{eye} / hat:{effectiveHat}
              {shiny ? " / shiny" : ""}
            </Text>
            <ConfirmSelect
              label="Search and apply?"
              onConfirm={() => setStep("search")}
              onCancel={() => exit()}
              onBack={goBack}
              isActive
            />
          </Box>
        ) : null}
        {step === "search" ? (
          <Box flexDirection="column">
            {error ? <Text color="red">✗ {error}</Text> : <Spinner label={progress} />}
            <KeyHint>{error ? "Press esc to exit" : "esc to cancel"}</KeyHint>
          </Box>
        ) : null}
        {step === "result" && found ? (
          <Box flexDirection="column">
            <Text bold color="green">
              ✓ Found in {found.checked.toLocaleString()} attempts ({(found.elapsedMs / 1000).toFixed(1)}s)
            </Text>
            <ConfirmSelect
              label="Apply patch?"
              onConfirm={() => {
                try {
                  const plan = patchBackend.createPlan({
                    binaryPath: context.installTarget.binaryPath,
                    configPath: context.installTarget.configPath,
                    backupDir: context.installTarget.backupDir,
                    currentSalt: context.currentSalt,
                    nextSalt: found.salt,
                    fingerprint: context.installTarget.fingerprint,
                    force,
                  });
                  void patchBackend
                    .apply(plan, { signBinary: !noSign, rehatchSoul })
                    .then((report) => {
                      setDoneMessages([
                        `Backup saved to ${report.backupPath}`,
                        `Patched ${report.replacements} occurrence(s)`,
                        report.signed ? "Binary re-signed (ad-hoc codesign)" : "Binary signing skipped or not required",
                        report.clearedConfigKeys.length > 0
                          ? `Cleared config keys: ${report.clearedConfigKeys.join(", ")}`
                          : "No config cache keys needed clearing",
                        ...(rehatchSoul ? ["Next /buddy will generate a new name and personality"] : []),
                      ]);
                      setStep("done");
                    })
                    .catch((cause) => {
                      setDoneMessages([cause instanceof Error ? cause.message : "Patch failed"]);
                      setStep("done");
                    });
                } catch (cause) {
                  setDoneMessages([cause instanceof Error ? cause.message : "Patch planning failed"]);
                  setStep("done");
                }
              }}
              onCancel={() => exit()}
              isActive
            />
          </Box>
        ) : null}
        {step === "done" ? (
          <Box flexDirection="column">
            {doneMessages.map((message, index) => (
              <Text key={`${message}-${index}`} color="green">
                ✓ {message}
              </Text>
            ))}
            <Text bold>Done! Restart Claude Code and run /buddy to rehatch your new companion.</Text>
            <KeyHint>Press any key to exit</KeyHint>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export async function runInteractiveRehatchUI(input: {
  context: ClaudeRuntimeContext;
  searchBackend: SearchBackend;
  patchBackend: SaltReplacePatchBackend;
  onRestore: () => Promise<string[]>;
  force: boolean;
  noSign: boolean;
  rehatchSoul: boolean;
  timeoutMs: number;
}): Promise<void> {
  const { waitUntilExit } = render(<App {...input} />);
  await waitUntilExit();
}
