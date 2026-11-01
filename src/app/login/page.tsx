"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError("Invalid email or password.");
      return;
    }

    await router.refresh();
    router.push(callbackUrl);
  }

  return (
    <main id="main-content" className="storefront min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full px-6 py-12">
        <div className="border-b border-gray-200 pb-6 mb-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-semibold text-xl tracking-tight text-admin-ink">
              CommerceOps
            </span>
          </Link>
        </div>

        <h1 className="font-display font-bold text-2xl text-storefront-ink mb-6">Sign in</h1>

        {error && (
          <div className="mb-6 p-3 rounded-md bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>

        <p className="mt-8 text-muted text-sm text-center">
          Don&rsquo;t have an account? Contact an administrator to create one.{" "}
          <Link href="/" className="text-admin-accent hover:underline">Return home</Link>
        </p>
      </div>
    </main>
  );
}
