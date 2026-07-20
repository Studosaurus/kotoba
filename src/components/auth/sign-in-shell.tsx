"use client";

import Link from "next/link";
import { useState } from "react";
import { hasSupabasePublicConfig } from "@/config/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInShell() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>();

  const canUseSupabase = hasSupabasePublicConfig();

  const signIn = async () => {
    if (!email.trim()) {
      setStatus("error");
      setMessage("Enter your email address.");
      return;
    }

    if (!canUseSupabase) {
      setStatus("error");
      setMessage("Supabase environment variables are not configured yet.");
      return;
    }

    setStatus("sending");
    setMessage(undefined);

    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/modules/vocabulary-capture`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email for a sign-in link.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202124] px-4 text-[#f8f9fb]">
      <section className="w-full max-w-sm rounded-[1.75rem] bg-[#17191d] p-6 shadow-[0_24px_80px_rgb(0_0_0/0.35)]">
        <p className="text-sm font-semibold text-[#a8c7fa]">Kotoba</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>

        <div className="mt-6 space-y-3">
          <label htmlFor="email" className="text-sm font-medium text-[#bdc1c6]">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void signIn();
              }
            }}
            className="h-12 w-full rounded-xl border border-transparent bg-[#202329] px-3 text-base text-[#f8f9fb] outline-none focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/20"
          />
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={status === "sending"}
            className="h-12 w-full rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30 disabled:opacity-70"
          >
            {status === "sending" ? "Sending" : "Send magic link"}
          </button>
        </div>

        {message ? (
          <p
            className={`mt-4 text-sm ${status === "error" ? "text-[#ff9aa8]" : "text-[#bdc1c6]"}`}
            role={status === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}

        <Link
          href="/modules/vocabulary-capture"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#202329] px-4 text-sm font-semibold text-[#a8c7fa] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
        >
          Back to capture
        </Link>
      </section>
    </main>
  );
}
