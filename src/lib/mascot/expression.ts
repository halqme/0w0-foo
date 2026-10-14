import type { Intent } from "./behavior";
import type { SleepStory } from "./sleep";

export type ExpressionInput = {
  now: number;
  happyUntil: number;
  clickFace: string;
  scrollUntil: number;
  scrollFace: string;
  story: SleepStory;
  intent: Intent;
  following: boolean;
  speed: number;
  curious: boolean;
  hoverFace: string;
  pleased: boolean;
};

/** Order is priority. Do not regroup these conditions by state axis. */
export function chooseExpression(input: ExpressionInput) {
  if (input.happyUntil > input.now) return input.clickFace || "^w^";
  if (input.story === "rising") return "0o0";
  if (
    input.story === "resting" ||
    input.story === "dozing" ||
    input.story === "dropping"
  )
    return "-w-";
  if (input.intent === "retreat" && input.following) return "0o0";
  if (input.speed > 0.8 && input.following) return "0o0";
  if (input.scrollUntil > input.now) return input.scrollFace;
  if (input.intent === "inspect" && input.following) return "0ω0";
  if (input.curious) return input.hoverFace;
  if ((input.speed > 0.2 && input.following) || input.pleased) return "^w^";
  return "0w0";
}

export function hoverFaceChoices(external: boolean, link: boolean) {
  if (external) return ["0o0", "OwO", "0v0"];
  if (link) return ["^w^", "0ω0", "0u0"];
  return ["0ω0", "^w^"];
}
