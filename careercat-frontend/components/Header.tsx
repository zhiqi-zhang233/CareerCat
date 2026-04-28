"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { useLocalUserId } from "@/lib/useLocalUserId";

export default function Header() {
  const auth = useAuth();
  const userId = useLocalUserId();

  const handleNewLocalAccount = () => {
    const confirmed = window.confirm(
      "Start a new local testing account on this browser? Unsaved form changes will be lost."
    );

    if (!confirmed) return;

    auth.createNewLocalAccount();
  };

  return (
    <header className="w-full border-b border-white/10 bg-[#011A55] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="CareerCat Logo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />

          <div>
            <h1 className="text-lg font-semibold text-[#FFB238]">
              CareerCat
            </h1>
            <p className="text-sm text-slate-300">
              AI Job Search Agent
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <Link href="/" className="hover:text-[#FFB238] transition">
            Home
          </Link>
          <Link href="/profile" className="hover:text-[#FFB238] transition">
            Profile
          </Link>
          <Link href="/import-jobs" className="hover:text-[#FFB238] transition">
            Import Jobs
          </Link>
          <Link href="/recommendations" className="hover:text-[#FFB238] transition">
            Recommendations
          </Link>
          <Link href="/dashboard" className="hover:text-[#FFB238] transition">
            Dashboard
          </Link>
          <Link href="/coach" className="hover:text-[#FFB238] transition">
            Coach
          </Link>

          <div className="ml-2 hidden max-w-64 items-center gap-2 rounded-lg border border-white/15 px-3 py-1 text-xs text-slate-300 md:flex">
            <span>{auth.isCognito ? "Signed in" : "Local account"}</span>
            <span className="font-mono text-[#FFB238]">
              {auth.isCognito ? auth.email || "loading" : userId || "loading"}
            </span>
          </div>

          {auth.isCognito ? (
            <button
              type="button"
              onClick={auth.signOut}
              className="rounded-lg border border-white/20 px-3 py-1 text-xs transition hover:bg-white/10"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNewLocalAccount}
              className="rounded-lg border border-white/20 px-3 py-1 text-xs transition hover:bg-white/10"
            >
              New Account
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
