export type SleepStory = "awake" | "resting" | "dozing" | "dropping" | "rising";
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
  dropping: 1200,
  rising: 1400,
} as const;

export type SleepState = {
  story: SleepStory;
  storyReady: boolean;
  storyStart: number;
  lastActivity: number;
  riseStartOffset: number;
  offsetY: number;
};

export function newSleepState(now: number): SleepState {
  return {
    story: "awake",
    storyReady: true,
    storyStart: 0,
    lastActivity: now,
    riseStartOffset: 0,
    offsetY: 0,
  };
}

const STORY_TRANSITIONS: Record<
  SleepStory,
  Partial<Record<SleepEvent, SleepStory>>
> = {
  awake: { IDLE: "dozing", REST: "resting" },
  resting: { IDLE: "dozing", ACTIVITY: "awake" },
  dozing: { DOZED: "dropping", WOKE: "rising", ACTIVITY: "rising" },
  dropping: { FELL: "rising", WOKE: "rising", ACTIVITY: "rising" },
  rising: { RECOVERED: "awake" },
};

export function nextSleepStory(
  story: SleepStory,
  event: SleepEvent,
): SleepStory {
  return event === "RESET"
    ? "awake"
    : (STORY_TRANSITIONS[story][event] ?? story);
}

function enterStory(state: SleepState, story: SleepStory, now: number) {
  if (story === state.story) return false;
  state.story = story;
  state.storyStart = now;
  if (story === "rising") state.riseStartOffset = state.offsetY;
  return true;
}

function canBegin(state: SleepState) {
  return (
    state.storyReady && (state.story === "awake" || state.story === "resting")
  );
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
    state.storyReady = true;
  }
  if ((event === "IDLE" || event === "REST") && !canBegin(state)) return false;
  const next = nextSleepStory(state.story, event);
  const changed = enterStory(state, next, now);
  // Activity during a rise is not permission for the next story.
  if (event === "RECOVERED" && changed) state.storyReady = false;
  return event === "ACTIVITY" || event === "REST" || changed;
}

export function storyRemaining(state: SleepState, now: number) {
  const duration =
    state.story === "dozing" || state.story === "dropping"
      ? SLEEP_TIMING[state.story]
      : 0;
  return Math.max(0, duration - Math.max(0, now - state.storyStart));
}

export function idleSleepRemaining(state: SleepState, now: number) {
  return Math.max(0, SLEEP_TIMING.idle - (now - state.lastActivity));
}

/**
 * Updates the vertical offset only.
 * Returns RECOVERED when a rise finishes; the caller dispatches it.
 * Dozing and dropping are not finished here — their timers can be held.
 */
export function advanceSleep(
  state: SleepState,
  time: number,
  dt: number,
): "RECOVERED" | null {
  const elapsed = Math.max(0, time - state.storyStart);
  if (state.story === "dropping") {
    state.offsetY =
      60 * Math.pow(Math.min(elapsed / SLEEP_TIMING.dropping, 1), 2);
    return null;
  }
  if (state.story === "rising") {
    const progress = Math.min(elapsed / SLEEP_TIMING.rising, 1);
    state.offsetY = state.riseStartOffset * (1 - progress) * (1 - progress);
    return progress >= 1 ? "RECOVERED" : null;
  }
  if (state.story !== "dozing") state.offsetY *= Math.exp(-5 * dt);
  return null;
}

export function shiftSleepTime(state: SleepState, duration: number) {
  state.storyStart += duration;
  state.lastActivity += duration;
}
