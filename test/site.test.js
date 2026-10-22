// Validates the generated site in public/. Run via `npm test` (generates first).
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.join(import.meta.dir, "..", "public");
const SOURCE_POSTS = path.join(import.meta.dir, "..", "source", "_posts");
const SITE_URL = "https://how.nz";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

if (!fs.existsSync(ROOT)) throw new Error("public/ missing: run `hexo generate` first");

const htmls = walk(ROOT).filter((f) => f.endsWith(".html"));
const postHtmls = htmls.filter((f) => /\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/index\.html$/.test(f));
const sourcePosts = fs.readdirSync(SOURCE_POSTS).filter((f) => f.endsWith(".md"));

const isExternal = (url) => /^(https?:|\/\/|mailto:|tel:|data:|javascript:|#)/.test(url);

const resolveInternal = (fromFile, url) => {
  const clean = url.split("#")[0].split("?")[0];
  if (!clean) return true;
  const target = clean.startsWith("/")
    ? path.join(ROOT, clean)
    : path.join(path.dirname(fromFile ?? ROOT), clean);
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  return fs.existsSync(path.join(target, "index.html"));
};

describe("generated site", () => {
  test("every internal href/src resolves to a generated file", () => {
    const broken = new Map();
    for (const file of htmls) {
      const html = fs.readFileSync(file, "utf8");
      for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (isExternal(url)) continue;
        if (!resolveInternal(file, url)) broken.set(url, (broken.get(url) ?? 0) + 1);
      }
    }
    expect([...broken.keys()]).toEqual([]);
  });

  test("no unrendered template or tag markers", () => {
    const offenders = htmls.filter((f) =>
      /<%|\{\{|\{%|\[object Object\]/.test(fs.readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  test("every source post is rendered and titled", () => {
    expect(postHtmls.length).toBe(sourcePosts.length);
    for (const file of postHtmls) {
      const doc = new JSDOM(fs.readFileSync(file, "utf8")).window.document;
      const title = doc.title.trim();
      expect([file, title.length > 0]).toEqual([file, true]);
      expect([file, /- How\.nz/.test(title)]).toEqual([file, true]);
      const desc = doc.querySelector('meta[name="description"]')?.content?.trim();
      expect([file, Boolean(desc)]).toEqual([file, true]);
      const article = doc.querySelector(".post-content");
      const text = article?.textContent?.trim() ?? "";
      expect([file, text.length > 0]).toEqual([file, true]);
    }
  });

  test("post pages have unique titles", () => {
    const titles = new Map();
    for (const file of postHtmls) {
      const title = new JSDOM(fs.readFileSync(file, "utf8")).window.document.title;
      titles.set(title, [...(titles.get(title) ?? []), file]);
    }
    expect([...titles.entries()].filter(([, v]) => v.length > 1)).toEqual([]);
  });

  test("robots.txt is served and points at the sitemap", () => {
    const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
    expect(robots).toMatch(/^User-agent: \*/m);
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  test("sitemap.xml parses and lists every post with a resolvable URL", () => {
    const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
    const doc = new (new JSDOM().window.DOMParser)().parseFromString(xml, "text/xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.documentElement.tagName).toBe("urlset");
    const locs = [...doc.querySelectorAll("loc")].map((n) => n.textContent);
    expect(locs).toContain(`${SITE_URL}/`);
    expect(locs.length).toBeGreaterThanOrEqual(postHtmls.length + 1);
    expect(new Set(locs).size).toBe(locs.length);
    for (const loc of locs) {
      expect([loc, loc.startsWith(SITE_URL)]).toEqual([loc, true]);
      expect([loc, resolveInternal(null, loc.slice(SITE_URL.length))]).toEqual([loc, true]);
    }
    for (const file of postHtmls) {
      const route = `/${path.relative(ROOT, path.dirname(file))}/`;
      expect([route, locs.includes(SITE_URL + route)]).toEqual([route, true]);
    }
    expect(locs.some((l) => l.endsWith("404.html"))).toBe(false);
    expect(locs.filter((l) => /\/[^/]*\.[a-z0-9]+$/i.test(l) && !l.endsWith(".html"))).toEqual([]);
  });
});
