/** Utility scorer for mascot intent. */

export type Intent = "wander" | "inspect" | "retreat";
export type Temperament = {
  intent: Intent;
  energy: number;
  curiosity: number;
  wariness: number;
  until: number;
  nextDecision: number;
  lastInspect: number;
  lastRetreat: number;
};
export type Stimulus = {
  pointerSpeed: number; // px / ms
  pointerDistance: number; // px
  interactiveNearby: boolean;
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function newTemperament(): Temperament {
  return {
    intent: "wander",
    energy: 0.85,
    curiosity: 0.75,
    wariness: 0.2,
    until: 0,
    nextDecision: 0,
    lastInspect: -Infinity,
    lastRetreat: -Infinity,
  };
}

export function evolveTemperament(
  mind: Temperament,
  dt: number,
  active: boolean,
) {
  mind.energy = clamp01(mind.energy + (active ? -0.0018 : 0.012) * dt);
  mind.curiosity = clamp01(mind.curiosity + (active ? 0.016 : 0.006) * dt);
  mind.wariness = clamp01(mind.wariness - 0.035 * dt);
}

/**
 * Behaviors compete on utility, but each has a minimum commitment time.
 * Cooldowns and continuous needs prevent oscillation and make reactions less scripted.
 * Inject random() so long-running behavior can be reproduced in tests.
 */
export function chooseIntent(
  mind: Temperament,
  stimulus: Stimulus,
  now: number,
  random: () => number = Math.random,
): Intent {
  const urgent =
    stimulus.pointerDistance < 175 &&
    stimulus.pointerSpeed > 0.85 &&
    now - mind.lastRetreat > 4000;
  // Reflexes may interrupt an ongoing investigation or a pending routine decision.
  if (!urgent && (now < mind.until || now < mind.nextDecision))
    return mind.intent;
  mind.nextDecision = now + 420 + random() * 340;
  const scores: Record<Intent, number> = {
    wander: 0.46 + 0.19 * mind.energy,
    inspect: -Infinity,
    retreat: -Infinity,
  };
  if (stimulus.interactiveNearby && now - mind.lastInspect > 3400) {
    scores.inspect = 0.48 + mind.curiosity * 0.38 + random() * 0.16;
  }
  if (
    stimulus.pointerDistance < 175 &&
    stimulus.pointerSpeed > 0.85 &&
    now - mind.lastRetreat > 4000
  ) {
    scores.retreat =
      0.65 +
      clamp01((stimulus.pointerSpeed - 0.85) / 1.5) * 0.35 +
      mind.wariness * 0.1;
  }
  const entries: [Intent, number][] = [
    ["wander", scores.wander],
    ["inspect", scores.inspect],
    ["retreat", scores.retreat],
  ];
  const next = entries.reduce((best, entry) =>
    entry[1] > best[1] ? entry : best,
  )[0];
  if (next === mind.intent) return next;

  mind.intent = next;
  if (next === "inspect") {
    mind.lastInspect = now;
    mind.curiosity = clamp01(mind.curiosity - 0.27);
    mind.until = now + 1100 + random() * 1000;
  } else if (next === "retreat") {
    mind.lastRetreat = now;
    mind.wariness = clamp01(mind.wariness + 0.4);
    mind.until = now + 650 + random() * 350;
  } else {
    mind.until = now + 600 + random() * 500;
  }
  return next;
}
