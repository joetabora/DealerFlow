import Link from "next/link";
import { LoginForm } from "./login-form";
import { tryPublicSupabaseConfig } from "@/lib/supabase/env";

export default function LoginPage() {
  const configured = Boolean(tryPublicSupabaseConfig());

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">
          Use the dealer account you created in Supabase Authentication.
        </p>
        {!configured ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Supabase URL and anon key are not set. Add{" "}
            <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and a
            publishable key to <code className="rounded bg-amber-100/80 px-1">.env.local</code>, then{" "}
            <Link href="/" className="font-medium underline decoration-amber-800/40">
              continue setup from the homepage
            </Link>
            .
          </p>
        ) : null}
        <div className="mt-5">
          <LoginForm configured={configured} />
        </div>
        <p className="mt-5 text-center text-xs text-gray-500">
          <Link href="/" className="font-medium text-gray-700 underline decoration-gray-300">
            ← Back home
          </Link>
        </p>
      </div>
    </div>
  );
}
