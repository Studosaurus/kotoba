export type LocalPermissionState = "unknown" | "granted" | "denied" | "prompt" | "unavailable";

export interface LocalPermissionSettings {
  microphone: {
    state: LocalPermissionState;
    updatedAt?: string;
  };
}

const PERMISSION_SETTINGS_KEY = "kotoba:permission-settings";

const DEFAULT_PERMISSION_SETTINGS: LocalPermissionSettings = {
  microphone: {
    state: "unknown",
  },
};

export function loadLocalPermissionSettings(): LocalPermissionSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PERMISSION_SETTINGS;
  }

  try {
    return {
      ...DEFAULT_PERMISSION_SETTINGS,
      ...(JSON.parse(
        window.localStorage.getItem(PERMISSION_SETTINGS_KEY) ?? "{}",
      ) as Partial<LocalPermissionSettings>),
    };
  } catch {
    return DEFAULT_PERMISSION_SETTINGS;
  }
}

export function saveMicrophonePermissionState(state: LocalPermissionState) {
  if (typeof window === "undefined") {
    return;
  }

  const settings = loadLocalPermissionSettings();

  window.localStorage.setItem(
    PERMISSION_SETTINGS_KEY,
    JSON.stringify({
      ...settings,
      microphone: {
        state,
        updatedAt: new Date().toISOString(),
      },
    } satisfies LocalPermissionSettings),
  );
}
