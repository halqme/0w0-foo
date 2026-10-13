/** Pure geometry and movement for the cursor mascot (viewport CSS pixels). */
export type Vec = { x: number; y: number };
export type Obstacle = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const expanded = (r: Obstacle, margin: number): Obstacle => ({
  left: r.left - margin,
  right: r.right + margin,
  top: r.top - margin,
  bottom: r.bottom + margin,
});

/** Intersects the closed rectangle. Used only for route selection, not collision physics. */
export function segmentHitsRect(a: Vec, b: Vec, r: Obstacle): boolean {
  let enter = 0,
    exit = 1;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  for (const [origin, delta, min, max] of [
    [a.x, dx, r.left, r.right],
    [a.y, dy, r.top, r.bottom],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < min || origin > max) return false;
      continue;
    }
    let t0 = (min - origin) / delta,
      t1 = (max - origin) / delta;
    if (t0 > t1) [t0, t1] = [t1, t0];
    enter = Math.max(enter, t0);
    exit = Math.min(exit, t1);
    if (enter > exit) return false;
  }
  return true;
}

/** Choose a visible corner rather than trying to move straight through a DOM obstacle. */
export function routeWaypoint(
  from: Vec,
  goal: Vec,
  obstacles: readonly Obstacle[],
  margin = 12,
): Vec {
  const blocking = obstacles
    .map((rect) => expanded(rect, margin))
    .find((rect) => segmentHitsRect(from, goal, rect));
  if (!blocking) return goal;
  const clearance = 12;
  const corners: Vec[] = [
    { x: blocking.left - clearance, y: blocking.top - clearance },
    { x: blocking.right + clearance, y: blocking.top - clearance },
    { x: blocking.left - clearance, y: blocking.bottom + clearance },
    { x: blocking.right + clearance, y: blocking.bottom + clearance },
  ];
  // If the mascot starts inside a newly sampled obstacle, leave by its nearest edge.
  if (
    from.x >= blocking.left &&
    from.x <= blocking.right &&
    from.y >= blocking.top &&
    from.y <= blocking.bottom
  ) {
    return [...corners].toSorted(
      (a, b) => distance(from, a) - distance(from, b),
    )[0];
  }
  // A single corner cannot bypass a broad rectangle from the opposite side.
  // Enumerate paths with up to two corners, then keep only unobstructed segments.
  const candidates: Vec[][] = [
    ...corners.map((corner) => [corner]),
    [corners[0], corners[1]],
    [corners[1], corners[0]],
    [corners[2], corners[3]],
    [corners[3], corners[2]],
    [corners[0], corners[2]],
    [corners[2], corners[0]],
    [corners[1], corners[3]],
    [corners[3], corners[1]],
  ];
  let best: Vec[] | undefined,
    bestCost = Infinity;
  for (const via of candidates) {
    const path = [from, ...via, goal];
    const traversable = path
      .slice(1)
      .every(
        (point, i) =>
          !obstacles.some((rect) =>
            segmentHitsRect(path[i], point, expanded(rect, margin)),
          ),
      );
    if (!traversable) continue;
    const cost = path
      .slice(1)
      .reduce((total, point, i) => total + distance(path[i], point), 0);
    if (cost < bestCost) {
      best = via;
      bestCost = cost;
    }
  }
  return best?.[0] ?? goal;
}

/** Produce the point behind an inspected element relative to the cursor. */
export function behindTarget(rect: Obstacle, pointer: Vec, offset = 38): Vec {
  const cx = (rect.left + rect.right) / 2,
    cy = (rect.top + rect.bottom) / 2;
  const dx = cx - pointer.x,
    dy = cy - pointer.y;
  if (
    Math.abs(dx / Math.max(1, rect.right - rect.left)) >
    Math.abs(dy / Math.max(1, rect.bottom - rect.top))
  ) {
    return { x: dx >= 0 ? rect.right + offset : rect.left - offset, y: cy };
  }
  return { x: cx, y: dy >= 0 ? rect.bottom + offset : rect.top - offset };
}

export function retreatTarget(
  position: Vec,
  pointer: Vec,
  distanceAway = 115,
): Vec {
  const dx = position.x - pointer.x,
    dy = position.y - pointer.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: position.x + (dx / len) * distanceAway,
    y: position.y + (dy / len) * distanceAway,
  };
}

export type SteeringState = { position: Vec; velocity: Vec };

/**
 * Accelerated arrival + obstacle separation. dt is capped by the caller.
 * Coordinates describe the mascot's top-left, with obstacle padding accounting for its footprint.
 */
export function stepSteering(
  state: SteeringState,
  goal: Vec,
  obstacles: readonly Obstacle[],
  dt: number,
  maxSpeed = 250,
): SteeringState {
  if (dt <= 0) return state;
  // Obstacles are expanded so the mascot's 80x44 pill does not overlap them.
  const margin = 14;
  const footprint = obstacles.map((o) => ({
    left: o.left - 80 - margin,
    right: o.right + margin,
    top: o.top - 44 - margin,
    bottom: o.bottom + margin,
  }));
  const { position, velocity } = state;
  let safeGoal = goal;
  // A desired point inside an element is not a valid destination.
  for (const rect of footprint) {
    if (
      safeGoal.x >= rect.left &&
      safeGoal.x <= rect.right &&
      safeGoal.y >= rect.top &&
      safeGoal.y <= rect.bottom
    ) {
      const options = [
        { x: rect.left - 12, y: safeGoal.y },
        { x: rect.right + 12, y: safeGoal.y },
        { x: safeGoal.x, y: rect.top - 12 },
        { x: safeGoal.x, y: rect.bottom + 12 },
      ];
      safeGoal = options.toSorted(
        (a, b) => distance(goal, a) - distance(goal, b),
      )[0];
    }
  }
  const waypoint = routeWaypoint(position, safeGoal, footprint, 0);
  const dx = waypoint.x - position.x,
    dy = waypoint.y - position.y;
  const remaining = Math.hypot(dx, dy);
  const arrivalSpeed = Math.min(maxSpeed, remaining * 4);
  let vx = remaining > 0.01 ? (dx / remaining) * arrivalSpeed : 0;
  let vy = remaining > 0.01 ? (dy / remaining) * arrivalSpeed : 0;

  // Local separation keeps the sprite from sticking to or cutting through an element.
  for (const rect of footprint) {
    const nearestX = clamp(position.x, rect.left, rect.right);
    const nearestY = clamp(position.y, rect.top, rect.bottom);
    let ax = position.x - nearestX,
      ay = position.y - nearestY;
    let d = Math.hypot(ax, ay);
    if (d < 1e-5) {
      const sides = [
        { d: position.x - rect.left, x: -1, y: 0 },
        { d: rect.right - position.x, x: 1, y: 0 },
        { d: position.y - rect.top, x: 0, y: -1 },
        { d: rect.bottom - position.y, x: 0, y: 1 },
      ];
      const side = sides.toSorted((a, b) => a.d - b.d)[0];
      ax = side.x;
      ay = side.y;
      d = 0;
    }
    if (d < 32) {
      const strength = (1 - d / 32) * maxSpeed;
      const norm = Math.hypot(ax, ay) || 1;
      vx += (ax / norm) * strength;
      vy += (ay / norm) * strength;
    }
  }
  const requestedSpeed = Math.hypot(vx, vy);
  if (requestedSpeed > maxSpeed) {
    vx *= maxSpeed / requestedSpeed;
    vy *= maxSpeed / requestedSpeed;
  }
  const response = 1 - Math.exp(-12 * dt);
  const nextVelocity = {
    x: velocity.x + (vx - velocity.x) * response,
    y: velocity.y + (vy - velocity.y) * response,
  };
  return {
    position: {
      x: position.x + nextVelocity.x * dt,
      y: position.y + nextVelocity.y * dt,
    },
    velocity: nextVelocity,
  };
}

/**
 * Sample meaningful leaf content rather than giant layout containers.
 * Refresh only occasionally, never query the DOM inside the animation tick.
 */
export function sampleObstacles(root: Element, max = 32): Obstacle[] {
  if (typeof document.querySelectorAll !== "function") return [];
  const nodes = document.querySelectorAll(
    "main a, main button, main h1, main h2, main h3, main img, main pre, main blockquote, [data-mascot-obstacle]",
  );
  const obstacles: Obstacle[] = [];
  for (const el of nodes) {
    if (root.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (
      r.width < 8 ||
      r.height < 8 ||
      r.width > innerWidth * 0.7 ||
      r.height > innerHeight * 0.45 ||
      r.right < 0 ||
      r.bottom < 0 ||
      r.left > innerWidth ||
      r.top > innerHeight
    )
      continue;
    obstacles.push({
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
    });
    if (obstacles.length >= max) break;
  }
  return obstacles;
}
