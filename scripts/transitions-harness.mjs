import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
const scriptFrom = (source) => {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "component script exists");
  return transpile(script);
};
const listeners = () => new Map();
const listen = (map, name, callback) => {
  const callbacks = map.get(name) ?? new Set();
  callbacks.add(callback);
  map.set(name, callbacks);
};
const fire = (map, name, event = {}) => {
  for (const callback of map.get(name) ?? []) callback(event);
};

class FakeNode {
  constructor() {
    this.parentElement = null;
  }
  contains(node) {
    for (let current = node; current; current = current.parentElement) {
      if (current === this) return true;
    }
    return false;
  }
}

class FakeElement extends FakeNode {
  constructor(attrs = {}) {
    super();
    this.attrs = new Map(Object.entries(attrs));
    this.dataset = {};
    this.children = [];
    this.hidden = false;
    this.inert = false;
    this.value = "";
    this.checked = false;
    this.classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classNames.add(name)),
      remove: (...names) =>
        names.forEach((name) => this.classNames.delete(name)),
      contains: (name) => this.classNames.has(name),
      toggle: (name, force) => {
        const enabled = force ?? !this.classNames.has(name);
        if (enabled) this.classNames.add(name);
        else this.classNames.delete(name);
        return enabled;
      },
    };
    this.attributes = new Map();
    this.offsetHeight = 40;
  }
  append(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  matches(selector) {
    return selector
      .split(",")
      .map((part) => part.trim())
      .some((part) => {
        const match = part.match(/^\[([^\]]+)\]$/);
        return match
          ? this.attrs.has(match[1].replace(/^data-/, "data-"))
          : false;
      });
  }
  closest(selector) {
    for (let current = this; current; current = current.parentElement) {
      if (current.matches(selector)) return current;
    }
    return null;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (parent) => {
      for (const child of parent.children) {
        if (child.matches(selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
}

class FakeInput extends FakeElement {}

const themeSource = await read("src/components/ui/ThemeToggle.astro");
const themeRoot = new FakeElement();
themeRoot.ownerDocument = { activeElement: null };
const picker = new FakeElement({ "data-theme-picker": "" });
const trigger = picker.append(new FakeElement({ "data-theme-trigger": "" }));
const panel = picker.append(new FakeElement({ "data-theme-panel": "" }));
panel.hidden = true;
const label = picker.append(new FakeElement({ "data-theme-label": "" }));
const iconSlot = picker.append(new FakeElement({ "data-theme-icon": "" }));
const options = ["auto", "light", "dark"].map((value) => {
  const input = picker.append(new FakeInput({ "data-theme-option": "" }));
  input.value = value;
  return input;
});
options[0].checked = true;
const status = new FakeElement();
const themeDocumentListeners = listeners();
const timers = new Map();
let timerId = 0;
let reducedMotion = false;
const media = {
  get matches() {
    return reducedMotion;
  },
  addEventListener() {},
};
const themeDocument = {
  documentElement: themeRoot,
  activeElement: null,
  querySelectorAll: (selector) =>
    selector === "[data-theme-picker]" ? [picker] : [],
  querySelector: (selector) =>
    selector === "[data-theme-status]" ? status : null,
  addEventListener: (name, callback) =>
    listen(themeDocumentListeners, name, callback),
};
themeRoot.ownerDocument = themeDocument;
trigger.ownerDocument = themeDocument;
for (const option of options) option.ownerDocument = themeDocument;
picker.querySelectorAll = (selector) => {
  if (selector === "[data-theme-option]") return options;
  if (selector === "[data-theme-icon]") return [iconSlot];
  return FakeElement.prototype.querySelectorAll.call(picker, selector);
};
picker.querySelector = (selector) => {
  const map = {
    "[data-theme-trigger]": trigger,
    "[data-theme-panel]": panel,
    "[data-theme-label]": label,
    "[data-theme-option]:checked": options.find((option) => option.checked),
  };
  return map[selector] ?? null;
};
picker.contains = (node) =>
  node === picker ||
  [trigger, panel, label, iconSlot, ...options].includes(node);
for (const child of [trigger, panel, label, iconSlot, ...options])
  child.parentElement = picker;
const themeWindow = {
  matchMedia: () => media,
  setTimeout(callback, delay) {
    const id = ++timerId;
    timers.set(id, { callback, delay });
    return id;
  },
  clearTimeout(id) {
    timers.delete(id);
  },
  addEventListener() {},
};
const themeContext = {
  document: themeDocument,
  window: themeWindow,
  Element: FakeElement,
  Node: FakeNode,
  HTMLInputElement: FakeInput,
  localStorage: { getItem: () => null, setItem() {} },
  getComputedStyle: () => ({ getPropertyValue: () => "150ms" }),
};
vm.runInNewContext(scriptFrom(themeSource), themeContext);
const themeEvent = (name, event) => fire(themeDocumentListeners, name, event);
const click = (target, detail = 1) =>
  themeEvent("click", { target, detail, preventDefault() {} });

click(trigger);
assert.equal(panel.hidden, false, "trigger opens menu");
assert.equal(panel.classList.contains("is-open"), true);
click(trigger);
assert.equal(
  panel.inert,
  true,
  "close removes menu from focus order immediately",
);
assert.equal(panel.getAttribute("aria-hidden"), "true");
assert.equal(trigger.getAttribute("aria-expanded"), "false");
assert.equal(timers.size, 1, "close waits for its visual transition");
click(trigger);
assert.equal(timers.size, 0, "rapid reopen cancels pending close timer");
assert.equal(panel.inert, false);
assert.equal(panel.classList.contains("is-open"), true);

const option = options[0];
option.focus();
themeEvent("keydown", {
  target: option,
  key: "Escape",
  preventDefault() {},
});
assert.equal(
  themeDocument.activeElement,
  trigger,
  "Escape returns focus to trigger",
);
assert.equal(panel.inert, true);

click(trigger);
themeEvent("astro:before-swap", {
  newDocument: { documentElement: new FakeElement() },
});
assert.equal(timers.size, 0, "navigation clears close timeout");
assert.equal(panel.hidden, true, "navigation resets menu state");
assert.equal(panel.classList.contains("is-closing"), false);

click(trigger);
reducedMotion = true;
click(trigger);
assert.equal(timers.size, 1, "reduced motion closes without a visual delay");
const [reducedTimerId, reducedTimer] = [...timers.entries()][0];
assert.equal(reducedTimer.delay, 0);
timers.delete(reducedTimerId);
reducedTimer.callback();
assert.equal(panel.hidden, true, "close timer hides panel after transition");
assert.equal(panel.getAttribute("aria-hidden"), null);

const layoutSource = await read("src/layouts/Layout.astro");
const aboutMarkup = await read("src/components/About.astro");
const projectMarkup = await read("src/components/Projects.astro");
const blogMarkup = await read("src/components/ui/BlogCard.astro");
const blogPostMarkup = await read("src/layouts/BlogPost.astro");
const headerMarkup = await read("src/components/ui/Header.astro");
const tagPageMarkup = await read("src/pages/tags/[tag].astro");
const motionCss = await read("src/styles/transitions.css");

for (const [name, source] of [
  ["layout", layoutSource],
  ["about", aboutMarkup],
  ["projects", projectMarkup],
  ["blog cards", blogMarkup],
  ["blog post", blogPostMarkup],
]) {
  assert.doesNotMatch(
    source,
    /IntersectionObserver|motion-ready|is-shown|t-stagger(?:-line)?|stagger-index/,
    `${name} has no scroll reveal or entry-animation hooks`,
  );
}
assert.doesNotMatch(
  motionCss,
  /IntersectionObserver|motion-ready|is-shown|t-stagger|stagger-index/,
);
assert.match(
  layoutSource,
  /import \{ ClientRouter \} from "astro:transitions"/,
);
assert.match(layoutSource, /<ClientRouter \/>/);
assert.match(blogMarkup, /transition:name=\{`blog-card-\$\{post\.id\}`\}/);
assert.match(blogMarkup, /transition:name=\{`blog-title-\$\{post\.id\}`\}/);
assert.match(tagPageMarkup, /transition:animate="slide"/);
assert.match(
  projectMarkup,
  /<span class="motion-underline">\{project\.name\}<\/span>/,
);
assert.match(blogMarkup, /class="motion-underline underline-offset-4"/);
assert.match(
  headerMarkup,
  /class="motion-underline [^"]*aria-\[current=page\]:underline/,
);
assert.match(motionCss, /\.project-link:hover \.motion-underline/);
assert.match(motionCss, /a\.motion-underline:hover/);
assert.match(motionCss, /:focus-visible/);
assert.match(motionCss, /background-size: 100% 1px/);
assert.match(motionCss, /background-size 140ms ease-out/);
assert.match(motionCss, /prefers-reduced-motion: reduce/);
assert.match(motionCss, /:active[\s\S]*?transition: none/);
assert.match(motionCss, /forced-colors: active/);
assert.match(motionCss, /background-image: none/);
assert.match(motionCss, /box-decoration-break: clone/);
assert.doesNotMatch(motionCss, /box-shadow|translate\(/);
assert.doesNotMatch(projectMarkup, /rounded-sm/);
console.log(
  "theme dropdown timing/focus/navigation and static-content underline invariants: ok",
);
