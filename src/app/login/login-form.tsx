"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonPrimary } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = { configured: boolean };

export function LoginForm({ configured }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Configure Supabase in .env.local first.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      router.refresh();
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="df-email" className="block text-xs font-medium text-gray-500">
          Email
        </label>
        <input
          id="df-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-gray-900/15 focus:border-gray-400 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="df-password" className="block text-xs font-medium text-gray-500">
          Password
        </label>
        <input
          id="df-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-gray-900/15 focus:border-gray-400 focus:ring-2"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy || !configured} className={buttonPrimary + " w-full"}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
