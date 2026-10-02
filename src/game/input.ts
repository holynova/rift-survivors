import type { Action } from "./simulation";
export const bindings: Record<string, Action> = {
  Space: "core",
  KeyE: "skill",
  KeyQ: "ultimate",
};
export function movement(keys: Set<string>) {
  return {
    x:
      Number(keys.has("KeyD") || keys.has("ArrowRight")) -
      Number(keys.has("KeyA") || keys.has("ArrowLeft")),
    y:
      Number(keys.has("KeyS") || keys.has("ArrowDown")) -
      Number(keys.has("KeyW") || keys.has("ArrowUp")),
  };
}
