import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../src/components/ui/Mascot.astro", import.meta.url),
  "utf8",
);
const rawScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(rawScript, "Mascot script exists");
// Astro bundles these imports in production; inline them for the deterministic VM harness.
const moduleFiles = ["behavior.ts", "steering.ts", "sleep.ts"];
const moduleSources = await Promise.all(
  moduleFiles.map((file) =>
    readFile(new URL(`../src/lib/mascot/${file}`, import.meta.url), "utf8"),
  ),
);
const stripImports = (text) => {
  const file = ts.createSourceFile(
    "harness.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  for (const node of file.statements
    .filter(ts.isImportDeclaration)
    .toReversed()) {
    text = text.slice(0, node.getStart(file)) + text.slice(node.end);
  }
  return text;
};
const bundledScript =
  moduleSources
    .map((value) => stripImports(value).replace(/^export /gm, ""))
    .join("\n") +
  "\n" +
  stripImports(rawScript);
const script = ts
  .transpileModule(bundledScript, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  })
  .outputText.replace(/^export \{\};?\s*$/gm, "");
const listeners = new Map(),
  rafs = new Map(),
  timers = new Map();
let rafId = 0,
  timerId = 0,
  now = 100,
  reduced = false,
  rootPresent = true;
const add = (map, name, fn) => {
  const set = map.get(name) ?? new Set();
  set.add(fn);
  map.set(name, set);
};
const remove = (map, name, fn) => map.get(name)?.delete(fn);
const make = (width = 80, height = 44) => ({
  style: { transform: "", visibility: "" },
  dataset: {},
  textContent: "",
  offsetWidth: width,
  offsetHeight: height,
  addEventListener(name, fn) {
    add((this.listeners ??= new Map()), name, fn);
  },
  removeEventListener(name, fn) {
    remove(this.listeners, name, fn);
  },
  contains(el) {
    return el === this || el?.insideMascot === true;
  },
  getBoundingClientRect() {
    return { left: 800, top: 700 };
  },
});
const root = make(),
  mascot = make(),
  face = make(),
  follower = make(),
  followerFace = make();
mascot.querySelector = (s) => (s === "[data-face]" ? face : null);
follower.querySelector = (s) => (s === "[data-face]" ? followerFace : null);
root.querySelector = (s) =>
  s === "[data-mascot]" ? mascot : s === "[data-follower]" ? follower : null;
class Element {
  constructor(selector = "button") {
    this.selector = selector;
    this.href = "https://example.test/path";
  }
  closest(s) {
    return s.split(", ").includes(this.selector) ? this : null;
  }
  contains(el) {
    return el === this || el?.insideMascot === true;
  }
}
class HTMLAnchorElement extends Element {}
const document = {
  activeElement: null,
  visibilityState: "visible",
  baseURI: "https://example.test/",
  querySelector(s) {
    return s === "[data-mascot-root]"
      ? rootPresent
        ? root
        : null
      : s === "[data-mascot]"
        ? mascot
        : s === "[data-follower]"
          ? follower
          : null;
  },
  addEventListener(n, fn) {
    add(listeners, n, fn);
  },
  removeEventListener(n, fn) {
    remove(listeners, n, fn);
  },
};
const media = {
  listeners: new Map(),
  get matches() {
    return reduced;
  },
  addEventListener(n, fn) {
    add(this.listeners, n, fn);
  },
  removeEventListener(n, fn) {
    remove(this.listeners, n, fn);
  },
};
const window = {
  matchMedia: () => media,
  addEventListener(n, fn) {
    add((this.listeners ??= new Map()), n, fn);
  },
  removeEventListener(n, fn) {
    remove(this.listeners, n, fn);
  },
  setTimeout(fn, delay) {
    const id = ++timerId;
    timers.set(id, { fn, at: now + delay });
    return id;
  },
};
const context = {
  document,
  window,
  Element,
  HTMLAnchorElement,
  URL,
  location: { origin: "https://example.test" },
  innerWidth: 1000,
  innerHeight: 800,
  Math: Object.assign(Object.create(Math), {
    random: (() => {
      let seed = 0x51a7;
      return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
      };
    })(),
  }),
  performance: { now: () => now },
  requestAnimationFrame(fn) {
    const id = ++rafId;
    rafs.set(id, fn);
    return id;
  },
  cancelAnimationFrame(id) {
    rafs.delete(id);
  },
  clearTimeout(id) {
    timers.delete(id);
  },
  setTimeout: (fn, delay) => window.setTimeout(fn, delay),
};
const pure = vm.runInNewContext(
  script +
    "\n({ nextSleepStage, newSleepState, dispatchSleep, advanceSleep, shiftSleepTime, idleSleepRemaining, stageSleepRemaining, SLEEP_TIMING, newTemperament, chooseIntent, evolveTemperament, routeWaypoint, segmentHitsRect, behindTarget, stepSteering })",
  context,
);

// Sleep transitions and elapsed-time calculations are deterministic outside the browser.
const sleepStages = ["awake", "dozing", "falling", "returning"];
const sleepEvents = ["IDLE", "DOZED", "FELL", "WOKE", "RECOVERED", "RESET"];
const expectedStages = {
  awake: {
    IDLE: "dozing",
    DOZED: "awake",
    FELL: "awake",
    WOKE: "awake",
    RECOVERED: "awake",
    RESET: "awake",
  },
  dozing: {
    IDLE: "dozing",
    DOZED: "falling",
    FELL: "dozing",
    WOKE: "returning",
    RECOVERED: "dozing",
    RESET: "awake",
  },
  falling: {
    IDLE: "falling",
    DOZED: "falling",
    FELL: "returning",
    WOKE: "returning",
    RECOVERED: "falling",
    RESET: "awake",
  },
  returning: {
    IDLE: "returning",
    DOZED: "returning",
    FELL: "returning",
    WOKE: "returning",
    RECOVERED: "awake",
    RESET: "awake",
  },
};
for (const stage of sleepStages)
  for (const event of sleepEvents)
    assert.equal(
      pure.nextSleepStage(stage, event),
      expectedStages[stage][event],
      `${stage} + ${event}`,
    );
assert.deepEqual(
  { ...pure.SLEEP_TIMING },
  { idle: 6000, dozing: 1200, falling: 1200, returning: 1400 },
);
const newSleep = (nsnow = 0) => pure.newSleepState(nsnow);
const transition = (state, event, tnow) =>
  pure.dispatchSleep(state, event, tnow);
const uninterrupted = newSleep(0);
for (const stage of sleepStages) {
  const state = newSleep(25);
  state.stage = stage;
  state.stageStart = 25;
  for (const event of sleepEvents) {
    if (event === "RESET" || expectedStages[stage][event] !== stage) continue;
    const before = { ...state };
    assert.equal(
      transition(state, event, 100),
      false,
      `${stage} ignores invalid ${event}`,
    );
    assert.deepEqual({ ...state }, before, `${stage} + ${event} is unchanged`);
  }
}
assert.equal(
  transition(uninterrupted, "WOKE", 10),
  false,
  "invalid events do not mutate state",
);
transition(uninterrupted, "IDLE", 10);
transition(uninterrupted, "DOZED", 1210);
pure.advanceSleep(uninterrupted, 2410, 0.016);
assert.equal(
  uninterrupted.offsetY,
  60,
  "uninterrupted story reaches full fall",
);
transition(uninterrupted, "FELL", 2410);
pure.advanceSleep(uninterrupted, 3810, 0.016);
assert.equal(uninterrupted.offsetY, 0, "uninterrupted return reaches home");
assert.equal(uninterrupted.stage, "awake");
assert.equal(
  uninterrupted.allowed,
  false,
  "one story locks sleep until activity",
);
assert.equal(transition(uninterrupted, "IDLE", 4000), false);
transition(uninterrupted, "ACTIVITY", 4100);
assert.equal(uninterrupted.allowed, true);
transition(uninterrupted, "IDLE", 10100);
const interruption = newSleep();
transition(interruption, "IDLE", 1);
transition(interruption, "DOZED", 1201);
interruption.offsetY = 60;
transition(interruption, "ACTIVITY", 1300);
assert.equal(interruption.stage, "returning", "activity interrupts falling");
assert.equal(interruption.returnStartOffset, 60);
transition(interruption, "RECOVERED", 2700);
transition(interruption, "ACTIVITY", 2800);
transition(interruption, "IDLE", 3000);
transition(interruption, "DOZED", 4200);
transition(interruption, "FELL", 5400);
transition(interruption, "ACTIVITY", 5500);
assert.equal(
  interruption.stage,
  "returning",
  "activity remains valid during return",
);
const offset = newSleep();
transition(offset, "IDLE", 0);
transition(offset, "DOZED", 1200);
pure.advanceSleep(offset, 1800, 0.016);
assert.equal(offset.offsetY, 15, "fall offset uses original quadratic timing");
transition(offset, "ACTIVITY", 1800);
assert.equal(
  offset.returnStartOffset,
  15,
  "return starts continuously from fall offset",
);
pure.advanceSleep(offset, 2500, 0.016);
assert.ok(offset.offsetY > 0 && offset.offsetY < 15);
pure.advanceSleep(offset, 3200, 0.016);
assert.equal(offset.stage, "awake", "return recovers on its duration");
assert.equal(offset.allowed, false);
const pausedSleep = newSleep(100);
transition(pausedSleep, "IDLE", 6100);
transition(pausedSleep, "DOZED", 7300);
pure.shiftSleepTime(pausedSleep, 5000);
assert.equal(pausedSleep.stageStart, 12300);
assert.equal(pausedSleep.lastActivity, 5100);
assert.equal(pure.stageSleepRemaining(pausedSleep, 12300), 1200);
assert.equal(pure.idleSleepRemaining(pausedSleep, 6100), 5000);
assert.equal(pure.idleSleepRemaining(pausedSleep, 15100), 0);
const rested = newSleep(0);
assert.equal(transition(rested, "REST", 6000), true);
assert.equal(rested.asleep, true, "stationary idle enters asleep mode");
transition(rested, "ACTIVITY", 7000);
assert.equal(rested.asleep, false);
const mind = pure.newTemperament();
assert.equal(
  pure.chooseIntent(
    mind,
    {
      pointerSpeed: 0,
      pointerDistance: 100,
      interactiveNearby: true,
    },
    5000,
    () => 0.99,
  ),
  "inspect",
);
assert.equal(
  pure.chooseIntent(
    mind,
    {
      pointerSpeed: 2.5,
      pointerDistance: 55,
      interactiveNearby: false,
    },
    5100,
    () => 0.5,
  ),
  "retreat",
  "startle interrupts investigation",
);
assert.equal(
  pure.chooseIntent(
    mind,
    {
      pointerSpeed: 0,
      pointerDistance: 180,
      interactiveNearby: false,
    },
    5400,
    () => 0.5,
  ),
  "retreat",
  "reflex has a short commitment",
);
assert.equal(
  pure.chooseIntent(
    mind,
    {
      pointerSpeed: 0,
      pointerDistance: 180,
      interactiveNearby: false,
    },
    9000,
    () => 0.5,
  ),
  "wander",
);
pure.evolveTemperament(mind, 1000, true);
assert.ok(mind.energy >= 0 && mind.energy <= 1);
const wall = { left: 40, right: 60, top: -10, bottom: 10 };
assert.equal(
  pure.segmentHitsRect({ x: 0, y: 0 }, { x: 100, y: 0 }, wall),
  true,
);
assert.equal(
  pure.segmentHitsRect({ x: 0, y: 25 }, { x: 100, y: 25 }, wall),
  false,
);
const waypoint = pure.routeWaypoint(
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  [wall],
  0,
);
assert.ok(
  waypoint.y !== 0,
  "pathfinding picks a corner around a blocking element",
);
assert.ok(!pure.segmentHitsRect({ x: 0, y: 0 }, waypoint, wall));
assert.deepEqual(
  { ...pure.behindTarget(wall, { x: 0, y: 0 }, 38) },
  { x: 98, y: 0 },
);
let steering = { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
for (let i = 0; i < 180; i++)
  steering = pure.stepSteering(steering, { x: 100, y: 0 }, [], 1 / 60);
assert.ok(
  Math.hypot(steering.position.x - 100, steering.position.y) < 2,
  "steering converges with finite acceleration",
);
let detouring = { position: { x: 0, y: 70 }, velocity: { x: 0, y: 0 } };
let deviated = false;
for (let i = 0; i < 360; i++) {
  detouring = pure.stepSteering(
    detouring,
    { x: 240, y: 70 },
    [{ left: 130, right: 150, top: 60, bottom: 90 }],
    1 / 60,
  );
  if (Math.abs(detouring.position.y - 70) > 45) deviated = true;
}
assert.ok(
  deviated,
  "mascot steers around, rather than through, a wide obstacle",
);
assert.ok(detouring.position.x > 190, "detour eventually reaches the far side");
const fire = (name, event = {}) => {
  for (const fn of listeners.get(name) ?? [])
    fn({ pointerType: "mouse", ...event });
};
const frame = () => {
  now += 16;
  const pending = [...rafs.values()];
  rafs.clear();
  for (const fn of pending) fn(now);
  assert.ok(rafs.size <= 1, "at most one animation frame is queued");
};
const advance = (duration) => {
  const end = now + duration;
  while (now < end) {
    now = Math.min(now + 16, end);
    for (const [id, timer] of [...timers].toSorted((a, b) => a[1].at - b[1].at))
      if (timer.at <= now) {
        timers.delete(id);
        timer.fn();
      }
    const pending = [...rafs.values()];
    rafs.clear();
    for (const fn of pending) fn(now);
    assert.ok(rafs.size <= 1, "at most one animation frame is queued");
  }
};
const xy = () => {
  const m = follower.style.transform.match(
    /translate3d\(([-\d.]+)px, ([-\d.]+)px/,
  );
  assert.ok(m, follower.style.transform);
  return { x: +m[1], y: +m[2] };
};
const gazeX = () => {
  const m = followerFace.style.transform.match(/translateX\(([-\d.]+)px\)/);
  assert.ok(m, followerFace.style.transform);
  return +m[1];
};
const move = (x, y) => fire("pointermove", { clientX: x, clientY: y });

assert.match(source, /transition:persist="mascot"/);
assert.match(source, /mascot-breathe 4\.8s/);
assert.match(source, /prefers-reduced-motion: reduce/);
assert.match(source, /"dozing"/);
assert.match(source, /"falling"/);
assert.match(source, /"returning"/);
fire("pointerdown", { clientX: 500, clientY: 400 });
advance(250);
const buttonOffset = mascot.style.transform.match(
  /translate3d\(([-\d.]+)px, ([-\d.]+)px/,
);
assert.ok(buttonOffset, "stationary button renders its happy bounce");
assert.ok(Math.abs(+buttonOffset[2]) <= 3, "button bounce stays within 3px");
advance(6000);
assert.equal(face.textContent, "-w-", "stationary normal-motion mascot sleeps");
fire("pointerdown", { clientX: 500, clientY: 400 });
assert.equal(
  face.textContent === "-w-",
  false,
  "activity wakes stationary mascot",
);
const beforePointerFrame = follower.style.transform;
move(400, 300);
assert.equal(
  follower.style.transform,
  beforePointerFrame,
  "pointermove does not update transform before first rAF",
);
frame();
advance(1000);
let previous = xy();
for (let i = 0; i < 60; i++) {
  frame();
  const current = xy();
  assert.ok(
    Math.hypot(current.x - previous.x, current.y - previous.y) <= 5,
    "orbit moves smoothly without per-frame jumps",
  );
  previous = current;
}
advance(1800);
const settled = xy();
assert.ok(
  Math.hypot(settled.x - 400, settled.y - 300) < 155,
  "orbits around pointer",
);
const stableFace = followerFace.textContent;
advance(500);
assert.equal(
  followerFace.textContent,
  stableFace,
  "ambient frames do not resample expression",
);
const anchor = new HTMLAnchorElement("a");
fire("pointerover", { target: anchor });
assert.ok(["^w^", "0ω0", "0u0"].includes(face.textContent));
const internal = face.textContent;
advance(200);
assert.equal(face.textContent, internal);
const external = new HTMLAnchorElement("a");
external.href = "https://outside.test/";
fire("pointerout", { target: anchor, relatedTarget: null });
fire("pointerover", { target: external });
assert.ok(["0o0", "OwO", "0v0"].includes(face.textContent));
fire("pointerout", { target: external, relatedTarget: null });
fire("pointerdown", { clientX: 500, clientY: 400 });
const click1 = face.textContent;
advance(750);
fire("pointerdown", { clientX: 500, clientY: 400 });
assert.notEqual(face.textContent, click1);
// A fresh motionless interval runs one finite doze/fall/return story.
move(400, 300);
advance(6100);
assert.equal(face.textContent, "-w-", "dozing face");
const beforeFall = xy();
advance(1200);
const falling = xy();
assert.ok(falling.y >= beforeFall.y, "fall moves down within bounds");
advance(1200);
assert.equal(face.textContent, "0o0", "panic expression on return");
advance(1450);
const returned = xy();
assert.ok(
  Math.hypot(returned.x + 40 - 400, returned.y + 22 - 300) <= 155,
  "returns to the pointer-centered orbit region",
);
advance(7000);
assert.equal(face.textContent, "0w0", "sleep story does not loop");
const pauseSleepAt = (stage, elapsedBeforePause) => {
  fire("pointerleave", { relatedTarget: null });
  move(400, 300);
  advance(elapsedBeforePause);
  const beforePauseTransform = follower.style.transform;
  const beforePauseFace = face.textContent;
  fire("astro:before-swap");
  assert.equal(rafs.size, 0, `${stage} pause cancels rAF`);
  assert.equal(timers.size, 0, `${stage} pause clears timers`);
  advance(5000);
  assert.equal(
    follower.style.transform,
    beforePauseTransform,
    `${stage} stays still while paused`,
  );
  assert.equal(
    face.textContent,
    beforePauseFace,
    `${stage} face is frozen while paused`,
  );
  fire("astro:page-load");
  assert.equal(
    follower.style.transform,
    beforePauseTransform,
    `${stage} resume does not snap`,
  );
};
pauseSleepAt("awake", 0);
advance(6000);
assert.equal(
  face.textContent,
  "-w-",
  "awake idle timer resumes with remaining time",
);
pauseSleepAt("dozing", 6000);
advance(1200);
assert.equal(
  face.textContent,
  "-w-",
  "dozing timer resumes with remaining time",
);
advance(1200);
assert.equal(face.textContent, "0o0", "resumed fall reaches returning");
pauseSleepAt("falling", 6000 + 1200);
advance(1200);
assert.equal(
  face.textContent,
  "0o0",
  "falling timer resumes with remaining time",
);
pauseSleepAt("returning", 6000 + 1200 + 1200);
advance(1400);
assert.notEqual(
  face.textContent,
  "0o0",
  "returning resumes and completes recovery",
);
// A seeded intent sequence makes long-run wandering behavior reproducible.
move(500, 400);
advance(1500);
const wanderSamples = [];
for (let elapsed = 0; elapsed < 90000; elapsed += 250) {
  if (elapsed > 0 && elapsed % 4000 === 0) move(500, 400);
  advance(250);
  const point = xy();
  const dx = point.x + mascot.offsetWidth / 2 - 500;
  const dy = point.y + mascot.offsetHeight / 2 - 400;
  const distance = Math.hypot(dx, dy);
  assert.ok(distance >= 65 && distance <= 155, `wander distance ${distance}`);
  wanderSamples.push({ dx, dy, gaze: gazeX(), distance });
}
for (const quadrant of [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
])
  assert.ok(
    wanderSamples.some(
      (p) => p.dx * quadrant[0] > 15 && p.dy * quadrant[1] > 15,
    ),
    `wandering reaches quadrant ${quadrant.join()}`,
  );
const bearings = wanderSamples.map((p) => Math.atan2(p.dy / 0.85, p.dx));
const angularSteps = bearings.slice(1).map((bearing, index) => {
  let delta = bearing - bearings[index];
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
});
assert.ok(
  angularSteps.some((step) => step > 0.002),
  "wandering turns both ways",
);
assert.ok(
  angularSteps.some((step) => step < -0.002),
  "wandering reverses direction",
);
assert.ok(
  angularSteps.filter((step) => Math.abs(step) < 0.001).length >= 5,
  "wandering includes hesitation",
);
assert.ok(
  Math.max(...wanderSamples.map((p) => p.distance)) -
    Math.min(...wanderSamples.map((p) => p.distance)) >=
    15,
  "wandering varies its distance from the pointer",
);
assert.ok(
  Math.max(...wanderSamples.map((p) => p.gaze)) -
    Math.min(...wanderSamples.map((p) => p.gaze)) >=
    8,
  "gaze sweeps visibly across its range",
);
move(650, 380);
advance(3000);
const recentered = xy();
assert.ok(
  Math.hypot(recentered.x + 40 - 650, recentered.y + 22 - 380) <= 155,
  `orbit recenters around latest pointer: ${JSON.stringify(recentered)}`,
);
for (const [x, y] of [
  [0, 0],
  [999, 0],
  [0, 799],
  [999, 799],
]) {
  move(x, y);
  advance(2200);
  const point = xy();
  assert.ok(
    point.x >= 22 && point.x <= 908 && point.y >= 48 && point.y <= 734,
    `composed corner position stays in viewport: ${JSON.stringify(point)}`,
  );
}
// Interrupting the fall wakes toward the latest target without snapping.
move(420, 310);
advance(6100);
advance(1250);
const interruptedStart = xy();
move(700, 450);
const moved = xy();
assert.ok(
  Math.hypot(moved.x - interruptedStart.x, moved.y - interruptedStart.y) < 20,
);
advance(1800);
assert.ok(
  Math.hypot(xy().x + 40 - 700, xy().y + 22 - 450) <= 155,
  `smoothly recovers toward latest pointer: ${JSON.stringify(xy())}`,
);
fire("scroll");
const burstFace = face.textContent;
for (let i = 0; i < 60; i++) {
  now += 16;
  fire("scroll");
  assert.equal(
    face.textContent,
    burstFace,
    "scroll burst keeps one expression",
  );
}
fire("pointerdown", { clientX: 500, clientY: 400 });
const clickDuringScroll = face.textContent;
assert.ok(["^w^", "0o0", "OwO", "0v0", "0ω0"].includes(clickDuringScroll));
for (let i = 0; i < 50; i++) {
  advance(16);
  fire("scroll");
}
assert.notEqual(
  face.textContent,
  clickDuringScroll,
  "click reaction expires during scroll",
);
assert.equal(
  face.textContent,
  burstFace,
  "scroll expression resumes after click",
);
advance(700);
assert.notEqual(
  face.textContent,
  burstFace,
  "scroll expression expires after pause",
);
fire("scroll");
const nextBurstFace = face.textContent;
for (let i = 0; i < 60; i++) {
  now += 16;
  fire("scroll");
  assert.equal(
    face.textContent,
    nextBurstFace,
    "next scroll burst stays stable",
  );
}
advance(300);
assert.ok(rafs.size > 0);
const beforeSwap = follower.style.transform;
fire("astro:before-swap");
assert.equal(timers.size, 0);
fire("scroll");
fire("pointerleave", { relatedTarget: null });
fire("astro:page-load");
assert.equal(follower.style.transform, beforeSwap, "swap preserves transform");
fire("astro:page-load");
assert.equal(mascot.dataset.ready, "true");
reduced = true;
for (const fn of media.listeners.get("change") ?? []) fn();
assert.equal(rafs.size, 0, "reduced motion cancels RAF");
assert.equal(
  follower.style.visibility,
  "hidden",
  "reduced motion restores home button",
);
assert.equal(
  follower.style.transform,
  "",
  "reduced motion clears follower transform",
);
assert.equal(timers.size, 1, "reduced motion retains only the idle timer");
advance(6100);
assert.equal(
  face.textContent,
  "-w-",
  "stationary mascot sleeps under reduced motion",
);
fire("pointerdown", { clientX: 500, clientY: 400 });
assert.notEqual(face.textContent, "-w-", "activity wakes reduced-motion sleep");
assert.equal(
  rafs.size,
  0,
  "reduced-motion wake does not start animation frames",
);
advance(6100);
assert.equal(
  face.textContent,
  "-w-",
  "reduced-motion mascot sleeps again after idle",
);
assert.equal(rafs.size, 0, "re-entering reduced-motion sleep still has no rAF");
rootPresent = false;
fire("astro:before-swap");
fire("astro:after-swap");
assert.equal(mascot.dataset.ready, undefined);
assert.equal(timers.size, 0);
for (const event of ["pointermove", "scroll"])
  assert.equal(listeners.get(event)?.size ?? 0, 0, `${event} listener cleaned`);
console.log(
  "Mascot harness passed: cursor wandering/recentering, hesitation and reversals, expressions, finite sleep story, interruption, reduced motion, persistence, cleanup",
);
