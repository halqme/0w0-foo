import { describe, expect, it } from "vite-plus/test";
import {
  advanceSleep,
  dispatchSleep,
  idleSleepRemaining,
  newSleepState,
  nextSleepStory,
  shiftSleepTime,
  SLEEP_TIMING,
  storyRemaining,
  type SleepEvent,
  type SleepStory,
} from "./sleep";

const transitionCases: [SleepStory, SleepEvent, SleepStory][] = [
  ["awake", "IDLE", "dozing"],
  ["awake", "REST", "resting"],
  ["resting", "IDLE", "dozing"],
  ["resting", "ACTIVITY", "awake"],
  ["dozing", "DOZED", "dropping"],
  ["dozing", "WOKE", "rising"],
  ["dozing", "ACTIVITY", "rising"],
  ["dropping", "FELL", "rising"],
  ["dropping", "WOKE", "rising"],
  ["dropping", "ACTIVITY", "rising"],
  ["rising", "RECOVERED", "awake"],
  ...(["awake", "resting", "dozing", "dropping", "rising"] as const).map(
    (story) =>
      [story, "RESET", "awake"] as [SleepStory, SleepEvent, SleepStory],
  ),
];

describe("nextSleepStory", () => {
  it.each(transitionCases)(
    "transitions %s on %s to %s",
    (story, event, next) => {
      expect(nextSleepStory(story, event)).toBe(next);
    },
  );

  it.each([
    ["awake", "DOZED"],
    ["awake", "WOKE"],
    ["awake", "ACTIVITY"],
    ["resting", "REST"],
    ["dozing", "IDLE"],
    ["dropping", "DOZED"],
    ["rising", "FELL"],
    ["rising", "ACTIVITY"],
  ] as const)("keeps %s unchanged on %s", (story, event) => {
    expect(nextSleepStory(story, event)).toBe(story);
  });
});

describe("sleep state behavior", () => {
  it("starts awake, ready for a story, and active at the supplied time", () => {
    expect(newSleepState(42)).toEqual({
      story: "awake",
      storyReady: true,
      storyStart: 0,
      lastActivity: 42,
      riseStartOffset: 0,
      offsetY: 0,
    });
  });

  it("rests in place only while awake or already resting, and ready", () => {
    const state = newSleepState(0);
    expect(dispatchSleep(state, "REST", 10)).toBe(true);
    expect(state.story).toBe("resting");
    expect(dispatchSleep(state, "REST", 15)).toBe(true);
    expect(state.story).toBe("resting");

    expect(dispatchSleep(state, "IDLE", 20)).toBe(true);
    expect(state.story).toBe("dozing");
    expect(dispatchSleep(state, "REST", 30)).toBe(false);
    expect(state.story).toBe("dozing");
  });

  it("records activity, wakes, and permits a new idle only after recovery", () => {
    const state = newSleepState(0);
    dispatchSleep(state, "IDLE", 6000);
    dispatchSleep(state, "DOZED", 7200);
    dispatchSleep(state, "FELL", 8400);
    dispatchSleep(state, "WOKE", 9000);
    expect(dispatchSleep(state, "ACTIVITY", 9100)).toBe(true);
    expect(state).toMatchObject({
      story: "rising",
      storyReady: true,
      lastActivity: 9100,
    });

    expect(advanceSleep(state, 10500, 0)).toBe("RECOVERED");
    expect(state.story).toBe("rising");
    expect(dispatchSleep(state, "RECOVERED", 10500)).toBe(true);
    expect(state).toMatchObject({
      story: "awake",
      storyReady: false,
    });
    expect(dispatchSleep(state, "IDLE", 15100)).toBe(false);
    expect(dispatchSleep(state, "REST", 15100)).toBe(false);
    expect(state.story).toBe("awake");

    dispatchSleep(state, "ACTIVITY", 15200);
    expect(dispatchSleep(state, "IDLE", 21200)).toBe(true);
    expect(state.story).toBe("dozing");
  });

  it("resets every field and restarts activity time", () => {
    const state = newSleepState(0);
    dispatchSleep(state, "IDLE", 6000);
    dispatchSleep(state, "RESET", 7000);
    expect(state).toEqual(newSleepState(7000));
  });
});

describe("sleep timing and offsets", () => {
  it("reports remaining idle and story time, clamped at zero", () => {
    const state = newSleepState(100);
    expect(idleSleepRemaining(state, 100)).toBe(SLEEP_TIMING.idle);
    expect(idleSleepRemaining(state, 50)).toBe(SLEEP_TIMING.idle + 50);
    expect(idleSleepRemaining(state, 7000)).toBe(0);

    dispatchSleep(state, "IDLE", 6100);
    expect(storyRemaining(state, 6100)).toBe(SLEEP_TIMING.dozing);
    expect(storyRemaining(state, 6700)).toBe(600);
    expect(storyRemaining(state, 7400)).toBe(0);
    dispatchSleep(state, "DOZED", 7300);
    expect(storyRemaining(state, 7300)).toBe(SLEEP_TIMING.dropping);
    expect(storyRemaining(state, 9000)).toBe(0);
  });

  it("drops on a curve, then rises from its captured offset to zero", () => {
    const state = newSleepState(0);
    dispatchSleep(state, "IDLE", 6000);
    dispatchSleep(state, "DOZED", 7200);
    expect(advanceSleep(state, 7500, 0)).toBe(null);
    expect(state.offsetY).toBeCloseTo(60 * 0.25 ** 2);
    advanceSleep(state, 7800, 0);
    expect(state.offsetY).toBeCloseTo(60 * 0.5 ** 2);
    advanceSleep(state, 8400, 0);
    expect(state.offsetY).toBe(60);
    expect(state.story).toBe("dropping");

    expect(dispatchSleep(state, "FELL", 8400)).toBe(true);
    expect(advanceSleep(state, 9100, 0)).toBe(null);
    expect(state.offsetY).toBeCloseTo(60 * 0.5 ** 2);
    expect(advanceSleep(state, 9800, 0)).toBe("RECOVERED");
    expect(state.story).toBe("rising");
    expect(state.offsetY).toBe(0);
    expect(dispatchSleep(state, "RECOVERED", 9800)).toBe(true);
    expect(state).toMatchObject({
      story: "awake",
      storyReady: false,
    });
  });

  it("shifts story and activity clocks without changing remaining time", () => {
    const state = newSleepState(1000);
    dispatchSleep(state, "IDLE", 7000);
    const beforeIdle = idleSleepRemaining(state, 8000);
    const beforeStory = storyRemaining(state, 8000);
    shiftSleepTime(state, 5000);

    expect(state.storyStart).toBe(12000);
    expect(state.lastActivity).toBe(6000);
    expect(idleSleepRemaining(state, 13000)).toBe(beforeIdle);
    expect(storyRemaining(state, 13000)).toBe(beforeStory);
  });
});
