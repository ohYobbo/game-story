import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close();
        reject(new Error("Unable to reserve a test port"));
        return;
      }
      probe.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

async function startProductionServer() {
  const port = await getFreePort();
  const server = spawn(
    process.execPath,
    [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error("Next.js server exited before startup:\n" + output);
    }
    try {
      const response = await fetch("http://127.0.0.1:" + port + "/");
      return { response, server };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  server.kill();
  throw new Error("Next.js server did not become ready:\n" + output);
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  await new Promise((resolve) => {
    const fallback = setTimeout(resolve, 1_000);
    fallback.unref();
    server.once("exit", () => {
      clearTimeout(fallback);
      resolve();
    });
    server.kill();
  });
}

test("server-renders the finished game interface", async () => {
  const { response, server } = await startProductionServer();
  try {
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^text\/html\b/i,
    );

    const html = await response.text();
    assert.match(html, /<title>像素工坊 — 游戏公司经营物语<\/title>/);
    assert.match(html, /class="game-shell"/);
    assert.match(html, /aria-label="像素工作室第 1 阶段办公室"/);
    assert.match(html, /class="bottom-menu"/);
    assert.match(html, /behavior-planning is-working/);
    assert.match(html, /正在补充能量/);
    assert.doesNotMatch(
      html,
      /codex-preview|Building your site|react-loading-skeleton/i,
    );
  } finally {
    await stopServer(server);
  }
});

test("wires the complete generated pixel-art system into the product", async () => {
  const [
    page,
    dashboard,
    modals,
    pixelUi,
    stageCreation,
    css,
    dashboardCss,
    modalsCss,
    stageCreationCss,
    responsiveCss,
    layout,
    background,
    socialCard,
    favicon,
    officeAtlas,
    characterAtlas,
    sippingAtlas,
    iconAtlas,
    panelTexture,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/game-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/game-modals.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/pixel-ui.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/stage-creation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/dashboard.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/modals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/stage-creation.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/responsive.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    stat(new URL("../public/pixel-studio-night-bg.png", import.meta.url)),
    stat(new URL("../public/og.png", import.meta.url)),
    stat(new URL("../public/favicon.png", import.meta.url)),
    stat(new URL("../public/game-ui/office-levels-atlas.png", import.meta.url)),
    stat(
      new URL(
        "../public/game-ui/character-behaviors-atlas.png",
        import.meta.url,
      ),
    ),
    stat(
      new URL(
        "../public/game-ui/character-sipping-atlas.png",
        import.meta.url,
      ),
    ),
    stat(new URL("../public/game-ui/ui-icons-atlas.png", import.meta.url)),
    stat(new URL("../public/game-ui/panel-texture.png", import.meta.url)),
  ]);

  const components = [page, dashboard, modals, pixelUi, stageCreation].join("\n");
  const styles = [css, dashboardCss, modalsCss, stageCreationCss, responsiveCss].join("\n");

  assert.match(components, /WorkerBehavior/);
  assert.match(components, /getWorkerBehavior\(member, project, index\)/);
  for (const behavior of [
    "idle",
    "planning",
    "coding",
    "drawing",
    "mixing",
    "debugging",
    "sipping",
    "tired",
  ]) {
    assert.match(styles, new RegExp("\\.behavior-" + behavior));
  }
  for (const modal of [
    "develop",
    "console",
    "stage",
    "contracts",
    "staff",
    "training",
    "career",
    "shop",
    "items",
    "hire",
    "marketing",
    "records",
    "result",
    "event",
    "review",
    "challenge",
  ]) {
    assert.match(components, new RegExp('modal === "' + modal + '"'));
  }
  assert.equal(components.match(/<ModalShell/g)?.length, 16);
  for (const feedback of [
    "企划确认摘要",
    "常规周期",
    "上次同阶段负责人",
    "逾期风险",
    "有效热度",
    "提前发售",
    "基础成功率",
    "失败后果",
    "跳过挑战",
    "ResultEntries",
  ]) {
    assert.match(components, new RegExp(feedback));
  }
  assert.match(styles, /url\("\/pixel-studio-night-bg\.png"\)/);
  assert.match(styles, /url\("\/game-ui\/office-levels-atlas\.png"\)/);
  assert.match(styles, /url\("\/game-ui\/character-behaviors-atlas\.png"\)/);
  assert.match(styles, /url\("\/game-ui\/character-sipping-atlas\.png"\)/);
  assert.match(styles, /url\("\/game-ui\/ui-icons-atlas\.png"\)/);
  assert.match(styles, /url\("\/game-ui\/panel-texture\.png"\)/);
  assert.match(styles, /background-size:\s*100% 100%, 100% 300%/);
  assert.match(
    styles,
    /\.pixel-modal[\s\S]*url\("\/game-ui\/panel-texture\.png"\)/,
  );
  assert.match(
    components,
    /className=\{.office office-level-\$\{companyLevel\}.\}/,
  );
  assert.match(components, /function UiIcon/);
  assert.match(components, /function StaffAvatar/);
  for (const phase of ["focus", "create", "result", "resume"]) {
    assert.match(styles, new RegExp("\\.phase-" + phase));
  }
  for (const stage of ["planning", "coding", "graphics", "sound"]) {
    assert.match(stageCreation, new RegExp("\\b" + stage + ":"));
  }
  assert.match(components, /onAnimationEnd=\{handleAnimationEnd\}/);
  assert.match(components, /FALLBACK_DELAYS/);
  assert.match(components, /CHALLENGE_FALLBACK_DELAYS/);
  assert.match(components, /is-challenge/);
  assert.match(components, /prefers-reduced-motion: reduce/);
  assert.match(components, /确认成果 · 开始推进/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /\/favicon\.png/);
  assert.doesNotMatch(
    components + "\n" + styles + "\n" + layout,
    /window\.svg|globe\.svg|file\.svg|new Audio|AudioContext|<audio/i,
  );
  for (const asset of [
    background,
    socialCard,
    officeAtlas,
    characterAtlas,
    sippingAtlas,
    iconAtlas,
    panelTexture,
  ]) {
    assert.ok(asset.size > 100_000);
  }
  assert.ok(favicon.size > 1_000);
});
