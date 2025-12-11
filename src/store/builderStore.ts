import type { ProtocolKey } from "../config";

export type PersistedFormState = Record<ProtocolKey, Record<string, string | number | boolean>>;

export type BuilderState = {
  formStates: PersistedFormState;
  selectedKeys: ProtocolKey[];
  activeKey: ProtocolKey;
};

const STORAGE_KEY = "ctj_builder_state";

export function loadBuilderState(fallback: BuilderState): BuilderState {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<BuilderState>;
    return {
      formStates: parsed.formStates ?? fallback.formStates,
      selectedKeys: parsed.selectedKeys?.length ? parsed.selectedKeys : fallback.selectedKeys,
      activeKey: parsed.activeKey ?? fallback.activeKey,
    };
  } catch {
    return fallback;
  }
}

export function saveBuilderState(state: BuilderState) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
