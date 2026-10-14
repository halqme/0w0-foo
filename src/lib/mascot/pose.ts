import type { SleepStory } from "./sleep";
import type { Vec } from "./steering";

export type PoseBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type MascotPose = {
  gaze: number;
  follower: Vec;
  tilt: number;
  home: "" | { x: number; y: number; rotation: number } | null;
};

export function mascotPose(input: {
  time: number;
  position: Vec;
  target: Vec;
  pointer: Vec;
  bounds: PoseBounds;
  story: SleepStory;
  sleepOffset: number;
  happyUntil: number;
  scrollUntil: number;
  following: boolean;
}): MascotPose {
  const { time, position, target, pointer, bounds } = input;
  const driftX = Math.sin(time / 3400) * 4;
  const driftY = Math.sin(time / 2700) * 5;
  const reaction =
    input.happyUntil > time ? (input.happyUntil - time) / 700 : 0;
  const scroll =
    input.scrollUntil > time ? (input.scrollUntil - time) / 700 : 0;
  const hop = -3 * Math.sin(Math.PI * (1 - reaction)) * reaction;
  const scrollY = Math.sin(time / 300) * 1.5 * scroll;
  const x = clamp(position.x + driftX, bounds.minX, bounds.maxX);
  const y = clamp(
    position.y + driftY + input.sleepOffset + hop + scrollY,
    bounds.minY,
    bounds.maxY,
  );
  const gaze =
    input.story === "awake"
      ? clamp(
          Math.sin(time / 3900) * 6 + (pointer.x >= position.x + 40 ? 3 : -3),
          -6,
          6,
        )
      : 0;
  const scrollX = Math.sin(time / 400) * 1.5 * scroll;
  const tilt = clamp((target.x - position.x) * 0.04, -3, 3);

  return {
    gaze,
    follower: {
      x: clamp(x + scrollX, bounds.minX, bounds.maxX),
      y,
    },
    tilt,
    home: input.following
      ? null
      : input.happyUntil > time || scroll > 0
        ? {
            x: scrollX,
            y: hop + scrollY,
            rotation: Math.sin(time / 400) * 0.7 * scroll,
          }
        : "",
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
