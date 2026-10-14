import { describe, expect, it, vi } from "vite-plus/test";
import {
  behindTarget,
  intentTarget,
  newWander,
  retreatTarget,
  routeWaypoint,
  sampleObstacles,
  segmentHitsRect,
  stepSteering,
  stepWander,
  type Obstacle,
} from "./steering";

const box: Obstacle = { left: 10, top: 10, right: 20, bottom: 20 };

const element = (rect: Partial<DOMRect>) => ({
  getBoundingClientRect: () => ({
    left: 10,
    top: 10,
    right: 30,
    bottom: 30,
    width: 20,
    height: 20,
    ...rect,
  }),
});

describe("intentTarget", () => {
  it("uses the wander point unless inspect or retreat can replace it", () => {
    const hover = { left: 0, top: 0, right: 100, bottom: 40 };
    const pointer = { x: 10, y: 10 };
    const fallback = { x: 1, y: 2 };
    const retreat = { x: 9, y: 8 };
    const beside = behindTarget(hover, pointer);
    expect(intentTarget("inspect", hover, pointer, retreat, fallback)).toEqual({
      x: beside.x - 40,
      y: beside.y - 22,
    });
    expect(intentTarget("inspect", null, pointer, retreat, fallback)).toEqual(
      fallback,
    );
    expect(intentTarget("retreat", hover, pointer, retreat, fallback)).toEqual(
      retreat,
    );
    expect(intentTarget("retreat", hover, pointer, null, fallback)).toEqual(
      fallback,
    );
    expect(intentTarget("wander", hover, pointer, retreat, fallback)).toEqual(
      fallback,
    );
  });
});

describe("stepWander", () => {
  it("settles a hesitation faster than a moving turn", () => {
    const hesitant = stepWander(
      { ...newWander(), velocity: 1, desiredVelocity: 0, decisionIn: 10 },
      0.2,
      () => 0,
    );
    const moving = stepWander(
      { ...newWander(), velocity: 0, desiredVelocity: 0.2, decisionIn: 10 },
      0.2,
      () => 0,
    );
    expect(hesitant.velocity).toBeCloseTo(Math.exp(-1));
    expect(moving.velocity).toBeCloseTo(0.2 * (1 - Math.exp(-0.28)));
    expect(hesitant.decisionIn).toBe(9.8);
  });

  it("pauses or reverses without consuming an extra sign roll", () => {
    const pause = [0, 0, 0.5];
    const paused = stepWander(
      { ...newWander(), desiredVelocity: 0.3 },
      0,
      () => pause.shift() ?? 0,
    );
    expect(paused.desiredVelocity).toBe(0);
    expect(paused.desiredRadius).toBe(115);
    expect(paused.decisionIn).toBe(2);
    expect(pause).toEqual([]);

    const reverse = [0, 0.5, 0, 0, 0];
    const reversed = stepWander(
      { ...newWander(), desiredVelocity: 0.3 },
      0,
      () => reverse.shift() ?? 0,
    );
    expect(reversed.desiredVelocity).toBeCloseTo(-0.18);
    expect(reversed.desiredRadius).toBe(90);
    expect(reverse).toEqual([]);
  });
});

describe("segmentHitsRect", () => {
  it("detects crossings, inclusive edges and corners", () => {
    expect(segmentHitsRect({ x: 0, y: 15 }, { x: 30, y: 15 }, box)).toBe(true);
    expect(segmentHitsRect({ x: 0, y: 10 }, { x: 30, y: 10 }, box)).toBe(true);
    expect(segmentHitsRect({ x: 0, y: 0 }, { x: 10, y: 10 }, box)).toBe(true);
  });

  it("handles reversed, parallel, and degenerate segments", () => {
    expect(segmentHitsRect({ x: 30, y: 15 }, { x: 0, y: 15 }, box)).toBe(true);
    expect(segmentHitsRect({ x: 0, y: 9 }, { x: 30, y: 9 }, box)).toBe(false);
    expect(segmentHitsRect({ x: 15, y: 15 }, { x: 15, y: 15 }, box)).toBe(true);
    expect(segmentHitsRect({ x: 0, y: 0 }, { x: 0, y: 0 }, box)).toBe(false);
  });
});

describe("routeWaypoint", () => {
  it("keeps direct routes, detours around blockers, and exits an obstacle", () => {
    const from = { x: 0, y: 15 },
      goal = { x: 30, y: 15 };
    expect(routeWaypoint(from, goal, [])).toEqual(goal);
    const waypoint = routeWaypoint(from, goal, [box], 0);
    expect(waypoint).not.toEqual(goal);
    expect(segmentHitsRect(from, waypoint, box)).toBe(false);
    expect(segmentHitsRect(waypoint, goal, box)).toBe(false);
    expect(routeWaypoint({ x: 15, y: 15 }, goal, [box], 0)).not.toEqual(goal);
  });
});

describe("target helpers", () => {
  it("places behind a target in each dominant direction and honors offset", () => {
    const rect = { left: 10, top: 10, right: 30, bottom: 30 };
    expect(behindTarget(rect, { x: 0, y: 20 }, 5)).toEqual({ x: 35, y: 20 });
    expect(behindTarget(rect, { x: 40, y: 20 }, 5)).toEqual({ x: 5, y: 20 });
    expect(behindTarget(rect, { x: 20, y: 0 }, 5)).toEqual({ x: 20, y: 35 });
    expect(behindTarget(rect, { x: 20, y: 40 }, 5)).toEqual({ x: 20, y: 5 });
  });

  it("retreats along the away vector and handles coincident points", () => {
    expect(retreatTarget({ x: 10, y: 20 }, { x: 7, y: 16 }, 10)).toEqual({
      x: 16,
      y: 28,
    });
    expect(retreatTarget({ x: 10, y: 20 }, { x: 10, y: 20 }, 10)).toEqual({
      x: 10,
      y: 20,
    });
  });
});

describe("stepSteering", () => {
  it.each([0, -1])("returns the identical state for dt %s", (dt) => {
    const state = { position: { x: 1, y: 2 }, velocity: { x: 3, y: 4 } };
    expect(stepSteering(state, { x: 10, y: 20 }, [], dt)).toBe(state);
  });

  it("does not mutate positive-dt inputs and converges within the speed bound", () => {
    const state = { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
    const before = structuredClone(state);
    const first = stepSteering(state, { x: 100, y: 0 }, [], 0.1, 80);
    expect(state).toEqual(before);
    expect(first.velocity.x).toBeGreaterThan(0);
    let current = first;
    for (let i = 0; i < 100; i++)
      current = stepSteering(current, { x: 100, y: 0 }, [], 0.02, 80);
    expect(current.position.x).toBeCloseTo(100, 1);
    expect(
      Math.hypot(current.velocity.x, current.velocity.y),
    ).toBeLessThanOrEqual(80);
  });

  it("simulates obstacle avoidance deterministically", () => {
    const obstacle = { left: 80, top: -20, right: 120, bottom: 20 };
    let current = { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
    const positions = [];
    for (let i = 0; i < 160; i++) {
      current = stepSteering(current, { x: 200, y: 0 }, [obstacle], 0.02, 120);
      positions.push(current.position);
    }
    expect(positions.at(-1)?.x).toBeGreaterThan(150);
    expect(positions.some((point) => point.y < -30 || point.y > 40)).toBe(true);
    expect(positions).toEqual(expect.any(Array));
  });
});

describe("sampleObstacles", () => {
  it("excludes the mascot root, tiny, huge, and offscreen elements, then caps results", () => {
    const rootChild = element({ left: 1 });
    const candidates = [
      rootChild,
      element({ width: 7 }),
      element({ width: 701 }),
      element({ left: 1001, right: 1021 }),
      element({ left: 40, right: 60 }),
      element({ left: 70, right: 90 }),
    ];
    const contains = vi
      .fn<(candidate: Node) => boolean>()
      .mockReturnValue(false)
      .mockReturnValueOnce(true);
    const root = { contains };
    const querySelectorAll = vi.fn(() => candidates);
    vi.stubGlobal("document", { querySelectorAll });
    vi.stubGlobal("innerWidth", 1000);
    vi.stubGlobal("innerHeight", 800);
    try {
      expect(sampleObstacles(root, 1)).toEqual([
        { left: 40, right: 60, top: 10, bottom: 30 },
      ]);
      expect(contains).toHaveBeenCalledWith(rootChild);
      expect(querySelectorAll).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
