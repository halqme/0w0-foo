import { describe, expect, it } from "vite-plus/test";
import {
  advanceSleep,
  dispatchSleep,
  idleSleepRemaining,
  newSleepState,
  nextSleepStage,
  shiftSleepTime,
  SLEEP_TIMING,
  stageSleepRemaining,
  type SleepEvent,
  type SleepStage,
} from "./sleep";

const transitionCases: [SleepStage, SleepEvent, SleepStage][] = [
  ["awake", "IDLE", "dozing"],
  ["dozing", "DOZED", "falling"],
  ["dozing", "WOKE", "returning"],
  ["dozing", "ACTIVITY", "returning"],
  ["falling", "FELL", "returning"],
  ["falling", "WOKE", "returning"],
  ["falling", "ACTIVITY", "returning"],
  ["returning", "RECOVERED", "awake"],
  ...(["awake", "dozing", "falling", "returning"] as const).map(
    (stage) =>
      [stage, "RESET", "awake"] as [SleepStage, SleepEvent, SleepStage],
  ),
];

describe("nextSleepStage", () => {
  it.each(transitionCases)(
    "transitions %s on %s to %s",
    (stage, event, next) => {
      expect(nextSleepStage(stage, event)).toBe(next);
    },
  );

  it.each([
    ["awake", "DOZED"],
    ["awake", "WOKE"],
    ["dozing", "IDLE"],
    ["falling", "DOZED"],
    ["returning", "FELL"],
    ["returning", "ACTIVITY"],
  ] as const)("keeps %s unchanged on invalid event %s", (stage, event) => {
    expect(nextSleepStage(stage, event)).toBe(stage);
  });
});

describe("sleep state behavior", () => {
  it("starts awake, allowed, and active at the supplied time", () => {
    expect(newSleepState(42)).toEqual({
      stage: "awake",
      asleep: false,
      allowed: true,
      stageStart: 0,
      lastActivity: 42,
      returnStartOffset: 0,
      offsetY: 0,
    });
  });

  it("allows REST only while awake and allowed", () => {
    const state = newSleepState(0);
    expect(dispatchSleep(state, "REST", 10)).toBe(true);
    expect(state.asleep).toBe(true);
    dispatchSleep(state, "IDLE", 20);
    expect(dispatchSleep(state, "REST", 30)).toBe(false);
    expect(state.asleep).toBe(true);
  });

  it("records activity, wakes, and permits a new idle after recovery", () => {
    const state = newSleepState(0);
    dispatchSleep(state, "IDLE", 6000);
    dispatchSleep(state, "DOZED", 7200);
    dispatchSleep(state, "FELL", 8400);
    dispatchSleep(state, "WOKE", 9000);
    expect(dispatchSleep(state, "ACTIVITY", 9100)).toBe(true);
    expect(state).toMatchObject({
      stage: "returning",
      asleep: false,
      allowed: true,
      lastActivity: 9100,
    });

    advanceSleep(state, 10500, 0);
    expect(state).toMatchObject({
      stage: "awake",
      allowed: false,
      asleep: false,
    });
    expect(dispatchSleep(state, "IDLE", 15100)).toBe(false);
    expect(state.stage).toBe("awake");

    dispatchSleep(state, "ACTIVITY", 15200);
    expect(dispatchSleep(state, "IDLE", 21200)).toBe(true);
    expect(state.stage).toBe("dozing");
  });

  it("resets every field and restarts activity time", () => {
    const state = newSleepState(0);
    dispatchSleep(state, "IDLE", 6000);
    dispatchSleep(state, "RESET", 7000);
    expect(state).toEqual(newSleepState(7000));
  });
});

describe("sleep timing and offsets", () => {
  it("reports remaining idle and stage time, clamped at zero", () => {
    const state = newSleepState(100);
    expect(idleSleepRemaining(state, 100)).toBe(SLEEP_TIMING.idle);
    expect(idleSleepRemaining(state, 50)).toBe(SLEEP_TIMING.idle + 50);
    expect(idleSleepRemaining(state, 7000)).toBe(0);

    dispatchSleep(state, "IDLE", 6100);
    expect(stageSleepRemaining(state, 6100)).toBe(SLEEP_TIMING.dozing);
    expect(stageSleepRemaining(state, 6700)).toBe(600);
    expect(stageSleepRemaining(state, 7400)).toBe(0);
    dispatchSleep(state, "DOZED", 7300);
    expect(stageSleepRemaining(state, 7300)).toBe(SLEEP_TIMING.falling);
    expect(stageSleepRemaining(state, 9000)).toBe(0);
  });

  it("falls progressively, then returns from its captured offset to zero", () => {
    const state = newSleepState(0);
    dispatchSleep(state, "IDLE", 6000);
    dispatchSleep(state, "DOZED", 7200);
    advanceSleep(state, 7500, 0);
    expect(state.offsetY).toBeCloseTo(60 * 0.25 ** 2);
    advanceSleep(state, 7800, 0);
    expect(state.offsetY).toBeCloseTo(60 * 0.5 ** 2);
    advanceSleep(state, 8400, 0);
    expect(state.offsetY).toBe(60);

    expect(dispatchSleep(state, "FELL", 8400)).toBe(true);
    advanceSleep(state, 9100, 0);
    expect(state.offsetY).toBeCloseTo(60 * 0.5 ** 2);
    advanceSleep(state, 9800, 0);
    expect(state.offsetY).toBe(0);
    expect(state).toMatchObject({
      stage: "awake",
      allowed: false,
      asleep: false,
    });
  });

  it("shifts stage and activity clocks without changing remaining time", () => {
    const state = newSleepState(1000);
    dispatchSleep(state, "IDLE", 7000);
    const beforeIdle = idleSleepRemaining(state, 8000);
    const beforeStage = stageSleepRemaining(state, 8000);
    shiftSleepTime(state, 5000);

    expect(state.stageStart).toBe(12000);
    expect(state.lastActivity).toBe(6000);
    expect(idleSleepRemaining(state, 13000)).toBe(beforeIdle);
    expect(stageSleepRemaining(state, 13000)).toBe(beforeStage);
  });
});
