import { describe, expect, it } from "vite-plus/test";
import {
  chooseExpression,
  hoverFaceChoices,
  type ExpressionInput,
} from "./expression";

const input = (overrides: Partial<ExpressionInput> = {}): ExpressionInput => ({
  now: 1000,
  happyUntil: 0,
  clickFace: "",
  scrollUntil: 0,
  scrollFace: "0o0",
  story: "awake",
  intent: "wander",
  following: false,
  speed: 0,
  curious: false,
  hoverFace: "0ω0",
  pleased: false,
  ...overrides,
});

describe("hoverFaceChoices", () => {
  it("prefers an external destination over a plain link", () => {
    expect(hoverFaceChoices(true, true)).toEqual(["0o0", "OwO", "0v0"]);
    expect(hoverFaceChoices(false, true)).toEqual(["^w^", "0ω0", "0u0"]);
    expect(hoverFaceChoices(false, false)).toEqual(["0ω0", "^w^"]);
  });
});

describe("chooseExpression", () => {
  it.each([
    [
      "click reaction",
      { happyUntil: 2000, clickFace: "OwO", story: "rising" },
      "OwO",
    ],
    ["empty click face", { happyUntil: 2000, clickFace: "" }, "^w^"],
    ["rising", { story: "rising", intent: "retreat", following: true }, "0o0"],
    ["resting", { story: "resting" }, "-w-"],
    ["dozing", { story: "dozing" }, "-w-"],
    ["dropping", { story: "dropping" }, "-w-"],
    [
      "retreat while following",
      { intent: "retreat", following: true, speed: 2 },
      "0o0",
    ],
    [
      "fast follow",
      { following: true, speed: 0.81, scrollUntil: 2000, scrollFace: "OwO" },
      "0o0",
    ],
    [
      "scroll",
      {
        scrollUntil: 2000,
        scrollFace: "OwO",
        intent: "inspect",
        following: true,
      },
      "OwO",
    ],
    [
      "inspect",
      { intent: "inspect", following: true, curious: true, hoverFace: "^w^" },
      "0ω0",
    ],
    [
      "curious",
      {
        curious: true,
        hoverFace: "0v0",
        pleased: true,
        following: true,
        speed: 0.5,
      },
      "0v0",
    ],
    ["moving follow", { following: true, speed: 0.21 }, "^w^"],
    ["pleased", { pleased: true }, "^w^"],
    ["resting face at home", {}, "0w0"],
  ] as const)("prefers %s", (_label, overrides, face) => {
    expect(chooseExpression(input(overrides))).toBe(face);
  });

  it("keeps deadlines and speed checks exclusive", () => {
    expect(
      chooseExpression(input({ happyUntil: 1000, clickFace: "OwO" })),
    ).toBe("0w0");
    expect(
      chooseExpression(input({ scrollUntil: 1000, scrollFace: "OwO" })),
    ).toBe("0w0");
    expect(chooseExpression(input({ following: true, speed: 0.8 }))).toBe(
      "^w^",
    );
    expect(chooseExpression(input({ following: true, speed: 0.2 }))).toBe(
      "0w0",
    );
    expect(
      chooseExpression(input({ intent: "retreat", following: false })),
    ).toBe("0w0");
    expect(
      chooseExpression(input({ intent: "inspect", following: false })),
    ).toBe("0w0");
  });
});
