"use client";

import Link from "next/link";
import { useSession } from "@/hooks/use-session";

export function Navbar() {
  const { session, loading } = useSession();

  return (
    <nav
      className="sticky top-0 z-40 border-b border-admin-border bg-white/95 backdrop-blur"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2" aria-label="CommerceOps home">
            <span className="font-display font-semibold text-xl tracking-tight text-admin-ink">
              CommerceOps
            </span>
            <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-storefront-accent">
              storefront
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/catalog"
              className="text-sm font-medium text-admin-ink hover:text-admin-accent"
              aria-label="Browse catalogue"
            >
              Catalogue
            </Link>
            <Link
              href="/cart"
              className="text-sm font-medium text-admin-ink hover:text-admin-accent"
              aria-label="View shopping cart"
            >
              Cart
              <span
                className="ml-2 inline-block h-5 w-5 rounded-full bg-admin-accent text-white text-[10px] flex items-center justify-center"
                aria-hidden="true"
              >
                0
              </span>
            </Link>
            {session ? (
              <>
                <a
                  href="/account"
                  className="text-sm font-medium text-admin-ink hover:text-admin-accent"
                >
                  Account
                </a>
                <form
                  action="/api/auth/logout"
                  method="POST"
                  className="ml-4"
                >
                  <button
                    type="submit"
                    className="text-sm font-medium text-admin-ink hover:text-admin-accent bg-transparent border-none p-0 cursor-pointer"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <a href="/login" className="btn-secondary">
                  Sign in
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
