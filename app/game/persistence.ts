import { parseSave, SAVE_STORAGE_KEY, serializeGameState } from "./save.ts";
import type { GameState } from "./types";

type SaveStorage = Pick<Storage, "getItem" | "setItem">;

export function startGamePersistence(
  getStorage: () => SaveStorage,
  getState: () => GameState,
  restore: (state: GameState) => void,
  reportError: (message: string) => void,
) {
  let loaded = false;
  let disposed = false;
  try {
    const serialized = getStorage().getItem(SAVE_STORAGE_KEY);
    const saved = parseSave(serialized);
    if (serialized && !saved) throw new Error("Invalid save");
    if (saved) restore(saved);
    loaded = true;
  } catch {
    reportError("无法读取本地存档，已停止保存以免覆盖原进度。请检查浏览器存储后刷新。");
  }

  const save = () => {
    if (!loaded || disposed) return false;
    try {
      getStorage().setItem(SAVE_STORAGE_KEY, JSON.stringify(serializeGameState(getState())));
      reportError("");
      return true;
    } catch {
      reportError("保存失败，当前进度尚未写入设备。请检查浏览器存储空间后重试保存。");
      return false;
    }
  };

  // The lifetime belongs to the mounted game, not to a particular state snapshot.
  const timer = loaded ? setInterval(save, 8000) : undefined;
  return {
    save,
    dispose() {
      disposed = true;
      clearInterval(timer);
    },
  };
}
