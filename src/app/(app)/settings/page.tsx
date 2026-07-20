import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ConnectorSettingsLink,
  LocalDataBackup,
  PermissionSettings,
} from "./local-data-backup";

export default function SettingsPage() {
  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-[#202124] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-[#f8f9fb]">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/modules/vocabulary-capture"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#17191d] text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
            aria-label="Back to capture"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-semibold text-[#dfe2ea]">Settings</h1>
          <div className="h-11 w-11" />
        </header>

        <ConnectorSettingsLink />
        <PermissionSettings />
        <LocalDataBackup />
      </div>
    </section>
  );
}
