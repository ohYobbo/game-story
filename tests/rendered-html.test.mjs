import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished game interface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>像素工坊 — 游戏公司经营物语<\/title>/);
  assert.match(html, /class="game-shell"/);
  assert.match(html, /aria-label="像素工作室第 1 阶段办公室"/);
  assert.match(html, /class="bottom-menu"/);
  assert.match(html, /behavior-planning is-working/);
  assert.match(html, /正在补充能量/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("wires the complete generated pixel-art system into the product", async () => {
  const [page, css, layout, background, socialCard, favicon, officeAtlas, characterAtlas, sippingAtlas, iconAtlas, panelTexture] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    stat(new URL("../public/pixel-studio-night-bg.png", import.meta.url)),
    stat(new URL("../public/og.png", import.meta.url)),
    stat(new URL("../public/favicon.png", import.meta.url)),
    stat(new URL("../public/game-ui/office-levels-atlas.png", import.meta.url)),
    stat(new URL("../public/game-ui/character-behaviors-atlas.png", import.meta.url)),
    stat(new URL("../public/game-ui/character-sipping-atlas.png", import.meta.url)),
    stat(new URL("../public/game-ui/ui-icons-atlas.png", import.meta.url)),
    stat(new URL("../public/game-ui/panel-texture.png", import.meta.url)),
  ]);

  assert.match(page, /type WorkerBehavior =/);
  assert.match(page, /getWorkerBehavior\(member, project, index\)/);
  for (const behavior of ["idle", "planning", "coding", "drawing", "mixing", "debugging", "sipping", "tired"]) {
    assert.match(css, new RegExp(`\\.behavior-${behavior}`));
  }
  for (const modal of ["develop", "console", "stage", "contracts", "staff", "training", "career", "shop", "items", "hire", "marketing", "records", "event", "review"]) {
    assert.match(page, new RegExp(`modal === "${modal}"`));
  }
  assert.equal(page.match(/<ModalShell/g)?.length, 14);
  assert.match(css, /url\("\/pixel-studio-night-bg\.png"\)/);
  assert.match(css, /url\("\/game-ui\/office-levels-atlas\.png"\)/);
  assert.match(css, /url\("\/game-ui\/character-behaviors-atlas\.png"\)/);
  assert.match(css, /url\("\/game-ui\/character-sipping-atlas\.png"\)/);
  assert.match(css, /url\("\/game-ui\/ui-icons-atlas\.png"\)/);
  assert.match(css, /url\("\/game-ui\/panel-texture\.png"\)/);
  assert.match(css, /background-size:\s*100% 100%, 100% 300%/);
  assert.match(css, /\.pixel-modal[\s\S]*url\("\/game-ui\/panel-texture\.png"\)/);
  assert.match(page, /className={`office office-level-\$\{companyLevel\}`}/);
  assert.match(page, /function UiIcon/);
  assert.match(page, /function StaffAvatar/);
  assert.match(page, /event\.key !== "Escape"/);
  assert.match(page, /previousFocus\?\.focus\(\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /\/favicon\.png/);
  assert.doesNotMatch(`${page}\n${css}\n${layout}`, /window\.svg|globe\.svg|file\.svg/);
  for (const asset of [background, socialCard, officeAtlas, characterAtlas, sippingAtlas, iconAtlas, panelTexture]) {
    assert.ok(asset.size > 100_000);
  }
  assert.ok(favicon.size > 1_000);
});
