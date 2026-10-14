import { describe, expect, it } from "vite-plus/test";
import { mascotPose } from "./pose";
import type { SleepStory } from "./sleep";

const base = {
  time: 0,
  position: { x: 100, y: 100 },
  target: { x: 100, y: 100 },
  pointer: { x: 0, y: 0 },
  bounds: { minX: 0, maxX: 500, minY: 0, maxY: 500 },
  story: "awake" as SleepStory,
  sleepOffset: 0,
  happyUntil: 0,
  scrollUntil: 0,
  following: true,
};

describe("mascotPose", () => {
  it("returns a still following pose without changing its inputs", () => {
    const input = {
      ...base,
      position: { ...base.position },
      target: { ...base.target },
      pointer: { ...base.pointer },
    };
    const before = structuredClone(input);

    expect(mascotPose(input)).toEqual({
      gaze: -3,
      follower: { x: 100, y: 100 },
      tilt: 0,
      home: null,
    });
    expect(input).toEqual(before);
  });

  it("combines drift, sleep offset, click hop, scroll shake and gaze", () => {
    const input = {
      ...base,
      time: 350,
      position: { x: 100, y: 100 },
      target: { x: 120, y: 100 },
      pointer: { x: 150, y: 0 },
      sleepOffset: 30,
      happyUntil: 700,
      scrollUntil: 1050,
      following: false,
    };
    const scroll = 1;
    const hop = -1.5;
    const scrollY = Math.sin(350 / 300) * 1.5;
    const scrollX = Math.sin(350 / 400) * 1.5;

    const pose = mascotPose(input);
    expect(pose.gaze).toBeCloseTo(Math.sin(350 / 3900) * 6 + 3);
    expect(pose.follower.x).toBeCloseTo(
      100 + Math.sin(350 / 3400) * 4 + scrollX,
    );
    expect(pose.follower.y).toBeCloseTo(
      100 + Math.sin(350 / 2700) * 5 + 30 + hop + scrollY,
    );
    expect(pose.tilt).toBeCloseTo(0.8);
    expect(pose.home).toEqual({
      x: scrollX,
      y: hop + scrollY,
      rotation: Math.sin(350 / 400) * 0.7 * scroll,
    });
  });

  it("clamps positions, disables gaze while asleep, and clears the docked transform", () => {
    const pose = mascotPose({
      ...base,
      position: { x: 200, y: 200 },
      target: { x: 500, y: -500 },
      bounds: { minX: 10, maxX: 150, minY: 20, maxY: 120 },
      story: "dropping",
      sleepOffset: 60,
      following: false,
    });

    expect(pose).toEqual({
      gaze: 0,
      follower: { x: 150, y: 120 },
      tilt: 3,
      home: "",
    });
  });
});
