"use client";

import { Download, FileUp, Link as LinkIcon, Mic } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  loadLocalPermissionSettings,
  saveMicrophonePermissionState,
  type LocalPermissionState,
} from "@/lib/local-permission-settings";

const LOCAL_DATA_PREFIX = "kotoba:";
const BACKUP_FORMAT = "kotoba-local-data";
const BACKUP_VERSION = 1;

interface LocalDataBackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  origin: string;
  data: Record<string, string>;
}

export function LocalDataBackup() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const exportLocalData = () => {
    const data = readKotobaLocalStorage();
    const backup: LocalDataBackupFile = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      origin: window.location.origin,
      data,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateLabel = new Date().toISOString().slice(0, 10);

    link.href = objectUrl;
    link.download = `kotoba-local-data-${dateLabel}.json`;
    link.click();
    URL.revokeObjectURL(objectUrl);
    setError(undefined);
    setMessage(`Exported ${Object.keys(data).length} local data items.`);
  };

  const importLocalData = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const backup = JSON.parse(await file.text()) as Partial<LocalDataBackupFile>;

      if (
        backup.format !== BACKUP_FORMAT ||
        backup.version !== BACKUP_VERSION ||
        !backup.data ||
        typeof backup.data !== "object"
      ) {
        throw new Error("This is not a Kotoba local data backup.");
      }

      const confirmed = window.confirm(
        "Importing will replace current local Kotoba data on this device. Continue?",
      );

      if (!confirmed) {
        return;
      }

      replaceKotobaLocalStorage(backup.data);
      setError(undefined);
      setMessage("Imported local data. Reloading...");
      window.setTimeout(() => window.location.reload(), 300);
    } catch (importError) {
      setMessage(undefined);
      setError(importError instanceof Error ? importError.message : "Could not import backup.");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4 text-[#f8f9fb]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Local data</h2>
          <p className="mt-1 text-sm leading-5 text-[#bdc1c6]">
            Export or restore local testing data stored on this device.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={exportLocalData}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export all local data
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#202329] px-4 text-sm font-semibold text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
        >
          <FileUp className="h-4 w-4" aria-hidden="true" />
          Import local data
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            void importLocalData(event.target.files?.[0]);
          }}
        />
      </div>

      {message ? <p className="mt-3 text-sm font-medium text-[#a8c7fa]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-[#ffb1c0]">{error}</p> : null}
    </section>
  );
}

export function ConnectorSettingsLink() {
  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4 text-[#f8f9fb]">
      <h2 className="text-lg font-semibold">Sources and connectors</h2>
      <p className="mt-1 text-sm leading-5 text-[#bdc1c6]">
        Manage external services and podcast source setup.
      </p>
      <Link
        href="/connectors?from=/settings"
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#202329] px-4 text-sm font-semibold text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
      >
        <LinkIcon className="h-4 w-4" aria-hidden="true" />
        Open connectors
      </Link>
    </section>
  );
}

export function PermissionSettings() {
  const [microphoneState, setMicrophoneState] = useState<LocalPermissionState>(() =>
    loadLocalPermissionSettings().microphone.state,
  );
  const [message, setMessage] = useState<string>();

  const updateMicrophoneState = (state: LocalPermissionState, nextMessage: string) => {
    saveMicrophonePermissionState(state);
    setMicrophoneState(state);
    setMessage(nextMessage);
  };

  const checkMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      updateMicrophoneState("unavailable", "Microphone access is unavailable in this browser.");
      return;
    }

    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });

        updateMicrophoneState(
          status.state,
          status.state === "granted"
            ? "Microphone access is allowed."
            : "Microphone permission has not been granted yet.",
        );
        return;
      }

      updateMicrophoneState("unknown", "This browser cannot report microphone permission status.");
    } catch {
      updateMicrophoneState("unknown", "This browser cannot report microphone permission status.");
    }
  };

  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      updateMicrophoneState("unavailable", "Microphone access is unavailable in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      stream.getTracks().forEach((track) => track.stop());
      updateMicrophoneState("granted", "Microphone access is allowed.");
    } catch {
      updateMicrophoneState("denied", "Microphone permission was blocked.");
    }
  };

  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4 text-[#f8f9fb]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Voice recording</h2>
          <p className="mt-1 text-sm leading-5 text-[#bdc1c6]">
            Save and check local microphone permission status for capture and study.
          </p>
        </div>
        <span className="rounded-full bg-[#202329] px-3 py-1 text-xs font-semibold text-[#a8c7fa]">
          {formatPermissionState(microphoneState)}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={() => {
            void requestMicrophonePermission();
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          Allow microphone
        </button>
        <button
          type="button"
          onClick={() => {
            void checkMicrophonePermission();
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#202329] px-4 text-sm font-semibold text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
        >
          Check permission
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-medium text-[#bdc1c6]">{message}</p> : null}
    </section>
  );
}

function readKotobaLocalStorage() {
  const data: Record<string, string> = {};

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(LOCAL_DATA_PREFIX)) {
      const value = window.localStorage.getItem(key);

      if (value !== null) {
        data[key] = value;
      }
    }
  }

  return data;
}

function replaceKotobaLocalStorage(data: Record<string, string>) {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(LOCAL_DATA_PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));

  Object.entries(data).forEach(([key, value]) => {
    if (key.startsWith(LOCAL_DATA_PREFIX) && typeof value === "string") {
      window.localStorage.setItem(key, value);
    }
  });
}

function formatPermissionState(state: LocalPermissionState) {
  switch (state) {
    case "granted":
      return "Allowed";
    case "denied":
      return "Blocked";
    case "prompt":
      return "Ask";
    case "unavailable":
      return "Unavailable";
    case "unknown":
    default:
      return "Unknown";
  }
}
