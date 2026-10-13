export type SleepStage = "awake" | "dozing" | "falling" | "returning";
export type SleepEvent =
  | "IDLE"
  | "DOZED"
  | "FELL"
  | "WOKE"
  | "RECOVERED"
  | "RESET"
  | "ACTIVITY"
  | "REST";

export const SLEEP_TIMING = {
  idle: 6000,
  dozing: 1200,
  falling: 1200,
  returning: 1400,
} as const;

/** Stationary sleep keeps stage awake; recovery blocks another story until activity. */
export type SleepState = {
  stage: SleepStage;
  asleep: boolean;
  allowed: boolean;
  stageStart: number;
  lastActivity: number;
  returnStartOffset: number;
  offsetY: number;
};

export function newSleepState(now: number): SleepState {
  return {
    stage: "awake",
    asleep: false,
    allowed: true,
    stageStart: 0,
    lastActivity: now,
    returnStartOffset: 0,
    offsetY: 0,
  };
}

export function nextSleepStage(
  state: SleepStage,
  event: SleepEvent,
): SleepStage {
  if (event === "RESET") return "awake";
  switch (state) {
    case "awake":
      return event === "IDLE" ? "dozing" : state;
    case "dozing":
      if (event === "DOZED") return "falling";
      return event === "WOKE" ? "returning" : state;
    case "falling":
      if (event === "FELL" || event === "WOKE") return "returning";
      return state;
    case "returning":
      return event === "RECOVERED" ? "awake" : state;
    default:
      return state;
  }
}

function enterStage(state: SleepState, stage: SleepStage, now: number) {
  if (stage === state.stage) return false;
  state.stage = stage;
  state.stageStart = now;
  if (stage === "returning") state.returnStartOffset = state.offsetY;
  return true;
}

export function dispatchSleep(
  state: SleepState,
  event: SleepEvent,
  now: number,
) {
  if (event === "RESET") {
    Object.assign(state, newSleepState(now));
    return true;
  }
  if (event === "ACTIVITY") {
    state.lastActivity = now;
    state.allowed = true;
    state.asleep = false;
    if (state.stage === "dozing" || state.stage === "falling")
      enterStage(state, "returning", now);
    return true;
  }
  if (event === "REST") {
    if (state.stage === "awake" && state.allowed) state.asleep = true;
    return state.stage === "awake" && state.allowed;
  }
  if (event === "IDLE" && (state.stage !== "awake" || !state.allowed))
    return false;
  const next = nextSleepStage(state.stage, event);
  if (next === state.stage) return false;
  enterStage(state, next, now);
  if (event === "RECOVERED") {
    state.allowed = false;
    state.asleep = false;
  }
  return true;
}

export function stageSleepRemaining(state: SleepState, now: number) {
  const duration =
    state.stage === "dozing" || state.stage === "falling"
      ? SLEEP_TIMING[state.stage]
      : 0;
  return Math.max(0, duration - Math.max(0, now - state.stageStart));
}

export function idleSleepRemaining(state: SleepState, now: number) {
  return Math.max(0, SLEEP_TIMING.idle - (now - state.lastActivity));
}

export function advanceSleep(state: SleepState, time: number, dt: number) {
  const elapsed = Math.max(0, time - state.stageStart);
  if (state.stage === "falling") {
    state.offsetY =
      60 * Math.pow(Math.min(elapsed / SLEEP_TIMING.falling, 1), 2);
  } else if (state.stage === "returning") {
    const progress = Math.min(elapsed / SLEEP_TIMING.returning, 1);
    state.offsetY = state.returnStartOffset * (1 - progress) * (1 - progress);
    if (progress >= 1) dispatchSleep(state, "RECOVERED", time);
  } else if (state.stage !== "dozing") {
    state.offsetY *= Math.exp(-5 * dt);
  }
}

export function shiftSleepTime(state: SleepState, duration: number) {
  state.stageStart += duration;
  state.lastActivity += duration;
}
