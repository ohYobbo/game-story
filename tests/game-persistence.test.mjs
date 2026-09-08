import assert from "node:assert/strict";
import test from "node:test";

import { startGamePersistence } from "../app/game/persistence.ts";
import { createInitialGameState } from "../app/game/rules.ts";
import { parseSave, serializeGameState } from "../app/game/save.ts";

for (const speed of [1, 2, 3]) {
  test(`autosave keeps its cadence and latest state at speed ${speed}`, (t) => {
    t.mock.timers.enable({ apis: ["setInterval"] });
    let state = createInitialGameState();
    const writes = [];
    const storage = { getItem: () => null, setItem: (_key, value) => writes.push(parseSave(value)) };
    const session = startGamePersistence(() => storage, () => state, () => assert.fail("no existing save"), () => {});
    t.after(() => session.dispose());
    // State changes faster than the save interval; they must never restart it.
    for (let elapsed = 0; elapsed < 24000; elapsed += 200) {
      if (elapsed % (1200 / speed) === 0) state = { ...state, cash: state.cash + 1 };
      t.mock.timers.tick(200);
    }
    assert.equal(writes.length, 3);
    assert.deepEqual(writes.at(-1), state);
    t.mock.timers.tick(8000); // Pausing the simulation must not pause saving.
    assert.equal(writes.length, 4);
    assert.deepEqual(writes.at(-1), state);
    session.dispose();
    t.mock.timers.tick(16000);
    assert.equal(writes.length, 4);
    assert.equal(session.save(), false);
  });
}

test("restore precedes any write and manual or critical saves read the committed state", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let state = createInitialGameState();
  const saved = { ...state, cash: 1234, year: 7 };
  const writes = [];
  const session = startGamePersistence(
    () => ({ getItem: () => JSON.stringify(serializeGameState(saved)), setItem: (_key, value) => writes.push(parseSave(value)) }),
    () => state,
    (restored) => { state = restored; },
    () => {},
  );
  t.after(() => session.dispose());
  assert.deepEqual(state, saved);
  assert.equal(writes.length, 0);
  state = { ...state, research: 17 };
  assert.equal(session.save(), true);
  assert.deepEqual(writes[0], state);
  t.mock.timers.tick(8000);
  assert.deepEqual(writes[1], state);
});

test("storage failures are visible, retryable, and never reported as a successful save", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let fail = true;
  let lastError = "";
  const writes = [];
  const session = startGamePersistence(
    () => ({ getItem: () => null, setItem: (_key, value) => { if (fail) throw new Error("QuotaExceededError"); writes.push(value); } }),
    createInitialGameState,
    () => {},
    (message) => { lastError = message; },
  );
  t.after(() => session.dispose());
  assert.equal(session.save(), false);
  assert.match(lastError, /保存失败/);
  assert.equal(writes.length, 0);
  fail = false;
  t.mock.timers.tick(8000);
  assert.equal(writes.length, 1);
  assert.equal(lastError, "");
});

test("failed reads and unreadable saves cannot overwrite existing progress", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  for (const read of [() => { throw new Error("SecurityError"); }, () => "broken save"]) {
    let error = "";
    const session = startGamePersistence(
      () => ({ getItem: read, setItem: () => assert.fail("must not overwrite") }),
      createInitialGameState,
      () => assert.fail("must not restore"),
      (message) => { error = message; },
    );
    assert.match(error, /无法读取/);
    assert.equal(session.save(), false);
    t.mock.timers.tick(24000);
    session.dispose();
  }
});
