import { describe, expect, it, vi } from "vite-plus/test";
import { chooseIntent, evolveTemperament, newTemperament } from "./behavior";

describe("evolveTemperament", () => {
  it("evolves active and inactive needs and clamps each value", () => {
    const active = {
      ...newTemperament(),
      energy: 0.5,
      curiosity: 0.5,
      wariness: 0.5,
    };
    evolveTemperament(active, 10, true);
    expect(active.energy).toBeCloseTo(0.482);
    expect(active.curiosity).toBeCloseTo(0.66);
    expect(active.wariness).toBeCloseTo(0.15);
    const inactive = {
      ...newTemperament(),
      energy: 0.5,
      curiosity: 0.5,
      wariness: 0.5,
    };
    evolveTemperament(inactive, 10, false);
    expect(inactive.energy).toBeCloseTo(0.62);
    expect(inactive.curiosity).toBeCloseTo(0.56);
    expect(inactive.wariness).toBeCloseTo(0.15);
    evolveTemperament(
      { ...active, energy: 0, curiosity: 1, wariness: 0 },
      100,
      true,
    );
    const bounded = { ...active, energy: 0, curiosity: 1, wariness: 0 };
    evolveTemperament(bounded, 100, true);
    expect(bounded).toMatchObject({ energy: 0, curiosity: 1, wariness: 0 });
  });
});

describe("chooseIntent", () => {
  const neutral = {
    pointerSpeed: 0,
    pointerDistance: 500,
    interactiveNearby: false,
  };

  it.each([
    ["wander", neutral, { energy: 1, curiosity: 0, wariness: 0 }],
    [
      "inspect",
      { ...neutral, interactiveNearby: true },
      { energy: 0, curiosity: 1, wariness: 0 },
    ],
    [
      "retreat",
      { pointerSpeed: 3, pointerDistance: 50, interactiveNearby: false },
      { energy: 0, curiosity: 0, wariness: 1 },
    ],
  ] as const)("selects %s", (intent, stimulus, needs) => {
    const mind = { ...newTemperament(), ...needs };
    expect(chooseIntent(mind, stimulus, 5000, () => 0)).toBe(intent);
    expect(mind.intent).toBe(intent);
  });

  it("commits through until and pending decision time without consuming randomness", () => {
    const mind = {
      ...newTemperament(),
      intent: "inspect" as const,
      until: 100,
      nextDecision: 200,
    };
    const random = vi.fn(() => 0.5);
    expect(chooseIntent(mind, neutral, 99, random)).toBe("inspect");
    expect(chooseIntent(mind, neutral, 150, random)).toBe("inspect");
    expect(chooseIntent(mind, neutral, 199, random)).toBe("inspect");
    expect(random).not.toHaveBeenCalled();
  });

  it("lets urgent retreat interrupt commitment and routine decision delays", () => {
    const mind = {
      ...newTemperament(),
      intent: "inspect" as const,
      until: 9000,
      nextDecision: 9000,
    };
    expect(
      chooseIntent(
        mind,
        { pointerSpeed: 2, pointerDistance: 100, interactiveNearby: false },
        5000,
        () => 0,
      ),
    ).toBe("retreat");
  });

  it("applies strict cooldown boundaries", () => {
    const mind = {
      ...newTemperament(),
      intent: "inspect" as const,
      until: 0,
      lastInspect: 1600,
    };
    const stimulus = { ...neutral, interactiveNearby: true };
    expect(chooseIntent(mind, stimulus, 5000, () => 0)).toBe("wander");
    const justOutside = { ...newTemperament(), lastInspect: 1599 };
    expect(chooseIntent(justOutside, stimulus, 5000, () => 0)).toBe("inspect");

    const retreatAtBoundary = { ...newTemperament(), lastRetreat: 1000 };
    expect(
      chooseIntent(
        retreatAtBoundary,
        { ...neutral, pointerSpeed: 2, pointerDistance: 100 },
        5000,
        () => 0,
      ),
    ).toBe("wander");
    const retreatOutside = { ...newTemperament(), lastRetreat: 999 };
    expect(
      chooseIntent(
        retreatOutside,
        { ...neutral, pointerSpeed: 2, pointerDistance: 100 },
        5000,
        () => 0,
      ),
    ).toBe("retreat");
  });

  it("sets deterministic decision and mutation times", () => {
    const mind = newTemperament();
    expect(
      chooseIntent(
        mind,
        { ...neutral, interactiveNearby: true },
        1000,
        () => 0.5,
      ),
    ).toBe("inspect");
    expect(mind.nextDecision).toBe(1590);
    expect(mind.lastInspect).toBe(1000);
    expect(mind.until).toBe(2600);

    const retreat = newTemperament();
    chooseIntent(
      retreat,
      { ...neutral, pointerSpeed: 2, pointerDistance: 100 },
      2000,
      () => 0.5,
    );
    expect(retreat.nextDecision).toBe(2590);
    expect(retreat.lastRetreat).toBe(2000);
    expect(retreat.until).toBe(2825);
  });
});
