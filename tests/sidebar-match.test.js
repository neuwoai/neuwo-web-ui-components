import { describe, expect, it } from "vitest";
import { holds, isPage, isUnder, normalizePath } from "../src/components/sidebar/match.js";

/**
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {import("../src/core/template.js").ChildInfo[]} [children]
 * @returns {import("../src/core/template.js").ChildInfo}
 */
const child = (tag, attrs = {}, children = []) => ({ tag, attrs, text: "", slot: "default", children });

describe("normalizePath()", () => {
  it.each([
    ["/", "/"],
    ["/api/", "/api"],
    ["/api", "/api"],
    ["/api/?q=1#top", "/api"],
    ["/api?q=1", "/api"],
    ["/demo/sidebar/index.html", "/demo/sidebar"],
    ["/index.html", "/"],
    ["/#top", "/"],
    ["https://neuwo.ai/api/", "https://neuwo.ai/api"],
    ["https://neuwo.ai/api/index.html?q=1", "https://neuwo.ai/api"],
    ["https://neuwo.ai/", "https://neuwo.ai"],
    ["https://neuwo.ai", "https://neuwo.ai"],
    ["HTTPS://Neuwo.AI/Api/", "https://neuwo.ai/Api"],
  ])("normalises %j to %j", (value, expected) => {
    expect(normalizePath(value)).toBe(expected);
  });

  it.each(["api/", "./api/", "../api/", "", "#top", "?q=1", "//cdn.example/x", "mailto:a@b.c", "javascript:void(0)", "ftp://neuwo.ai/x"])(
    "ignores %j",
    (value) => {
      expect(normalizePath(value)).toBeNull();
    },
  );

  it("ignores a missing value", () => {
    expect(normalizePath(null)).toBeNull();
    expect(normalizePath(undefined)).toBeNull();
  });
});

describe("isPage()", () => {
  it.each([
    ["/api/", "/api", true],
    ["/api", "/api/?tab=keys", true],
    ["/", "/index.html", true],
    ["/demo/sidebar/", "/demo/sidebar/index.html", true],
    ["https://neuwo.ai/api/", "https://neuwo.ai/api", true],
    ["https://neuwo.ai/api/", "/api/", false],
    ["/api/", "https://neuwo.ai/api/", false],
    ["/api/", "/api/keys/", false],
    ["api/", "api/", false],
    ["#top", "#top", false],
    ["/api/", "", false],
  ])("isPage(%j, %j) is %j", (href, current, expected) => {
    expect(isPage(href, current)).toBe(expected);
  });
});

describe("isUnder()", () => {
  it.each([
    ["/bid-enrichment/", "/bid-enrichment/gam/", true],
    ["/bid-enrichment", "/bid-enrichment/prebid/reference/", true],
    ["https://neuwo.ai/api/", "https://neuwo.ai/api/keys", true],
    ["/bid-enrichment/prebid/", "/bid-enrichment/prebid-latest/", false],
    ["/", "/api/", false],
    ["/index.html", "/api/", false],
    ["https://neuwo.ai/", "https://neuwo.ai/api/", false],
    ["/api/", "/api/", false],
    ["/api/", "/api/?tab=keys", false],
    ["/api/", "https://neuwo.ai/api/keys/", false],
    ["api/", "/api/keys/", false],
  ])("isUnder(%j, %j) is %j", (href, current, expected) => {
    expect(isUnder(href, current)).toBe(expected);
  });
});

describe("holds()", () => {
  const deep = (href, label = []) => [
    child("neuwo-nav-section", { label: "One" }, [
      child("neuwo-nav-item", { href: "/elsewhere/" }),
      child("neuwo-nav-section", { label: "Two" }, [child("neuwo-nav-item", { href }, label)]),
    ]),
  ];

  it("finds an exact and a prefix match three levels down", () => {
    expect(holds(deep("/a/b/"), "/a/b/")).toBe(true);
    expect(holds(deep("/a/b/"), "/a/b/c/")).toBe(true);
    expect(holds(deep("/a/b/"), "/a/")).toBe(false);
    expect(holds(deep("/a/b/"), "/a/bc/")).toBe(false);
  });

  it("counts a section's own href", () => {
    expect(holds([child("div", {}, [child("neuwo-nav-section", { label: "Guides", href: "/guides/" })])], "/guides/setup/")).toBe(true);
  });

  it("ignores an <a href> inside an item's label, and an href on any other tag", () => {
    expect(holds(deep("/x/", [child("a", { href: "/a/" })]), "/a/")).toBe(false);
    expect(holds([child("a", { href: "/a/" }), child("neuwo-menu-item", { href: "/a/" })], "/a/")).toBe(false);
  });

  it("never holds a page through the root entry", () => {
    expect(holds([child("neuwo-nav-item", { href: "/" })], "/api/")).toBe(false);
    expect(holds([child("neuwo-nav-item", { href: "/" })], "/")).toBe(true);
  });

  it("holds nothing without children or a current page", () => {
    expect(holds([], "/a/")).toBe(false);
    expect(holds(deep("/a/"), "")).toBe(false);
    expect(holds([child("neuwo-nav-item", {})], "/a/")).toBe(false);
  });
});
