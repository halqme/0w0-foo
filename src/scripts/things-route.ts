function activeCategory(doc: Document, url: URL) {
  const category = url.searchParams.get("category") ?? "";
  if (category === "") return "";
  const known = [...doc.querySelectorAll("[data-thing-filter]")]
    .map((element) => element.getAttribute("data-thing-filter") ?? "")
    .filter((value) => value !== "");
  if (known.length === 0) return category;
  return known.includes(category) ? category : "";
}

export function applyThingsRoute(doc: Document, url: URL) {
  const active = activeCategory(doc, url);

  for (const item of doc.querySelectorAll<HTMLElement>("[data-thing]")) {
    item.hidden = active !== "" && item.dataset.category !== active;
  }

  for (const link of doc.querySelectorAll<HTMLAnchorElement>(
    "[data-thing-filter]",
  )) {
    const value = link.dataset.thingFilter ?? "";
    if (value === active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  for (const link of doc.querySelectorAll<HTMLAnchorElement>(
    "[data-thing-link]",
  )) {
    const path = (link.getAttribute("href") ?? "").split("?")[0];
    link.setAttribute(
      "href",
      active === "" ? path : `${path}?category=${encodeURIComponent(active)}`,
    );
  }

  const back = doc.querySelector<HTMLAnchorElement>("[data-things-back]");
  if (back) {
    back.setAttribute(
      "href",
      active === ""
        ? "/things"
        : `/things?category=${encodeURIComponent(active)}`,
    );
  }
}

function isThingsIndex(url: URL) {
  return url.pathname.replace(/\/$/, "") === "/things";
}

function stashTransition(element: HTMLElement) {
  const scope = element.getAttribute("data-astro-transition-scope");
  if (scope) element.dataset.thingTransitionScope = scope;
  element.removeAttribute("data-astro-transition-scope");
}

function restoreTransition(element: HTMLElement) {
  const scope = element.dataset.thingTransitionScope;
  if (scope) element.setAttribute("data-astro-transition-scope", scope);
}

function thingImages(doc: Document) {
  return doc.querySelectorAll<HTMLElement>(
    "[data-thing] [data-astro-transition-scope], [data-thing] [data-thing-transition-scope]",
  );
}

function thingCards(doc: Document) {
  return doc.querySelectorAll<HTMLElement>(
    "[data-thing][data-astro-transition-scope], [data-thing][data-thing-transition-scope]",
  );
}

function useCardSlides(doc: Document) {
  for (const image of thingImages(doc)) stashTransition(image);
  for (const card of thingCards(doc)) restoreTransition(card);
  doc.documentElement.setAttribute("data-things-filter", "");
}

function useImageMorphs(doc: Document) {
  for (const card of thingCards(doc)) stashTransition(card);
  for (const image of thingImages(doc)) restoreTransition(image);
  doc.documentElement.removeAttribute("data-things-filter");
}

let filterToken = 0;

function clearFilterFlagSoon() {
  const token = ++filterToken;
  window.setTimeout(() => {
    if (token !== filterToken) return;
    document.documentElement.removeAttribute("data-things-filter");
  }, 400);
}

applyThingsRoute(document, new URL(location.href));

document.addEventListener("astro:before-preparation", (event) => {
  const prep = event as Event & { from: URL; to: URL };
  if (isThingsIndex(prep.from) && isThingsIndex(prep.to)) {
    useCardSlides(document);
    return;
  }
  useImageMorphs(document);
});

document.addEventListener("astro:before-swap", (event) => {
  const swap = event as Event & { from: URL; to: URL; newDocument: Document };
  if (isThingsIndex(swap.from) && isThingsIndex(swap.to)) {
    useCardSlides(swap.newDocument);
  } else {
    useImageMorphs(swap.newDocument);
  }
  applyThingsRoute(swap.newDocument, swap.to);
});

document.addEventListener("astro:after-swap", () => {
  if (document.documentElement.hasAttribute("data-things-filter")) {
    clearFilterFlagSoon();
  }
});
