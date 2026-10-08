"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/api";

interface LoginFormProps {
  onSuccess: (username: string) => void;
  onError: (message: string) => void;
  onActivity: () => void;
}

const FIELD =
  "h-12 border-white/20 border-t-white/30 border-l-white/30 bg-white/10 pl-10 text-sm font-medium text-white placeholder:text-white/40 backdrop-blur-md rounded-xl transition-all focus-visible:border-cyan-300/60 focus-visible:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-300/20 shadow-inner";

export function LoginForm({ onSuccess, onError, onActivity }: LoginFormProps) {
  const [username, setUsername] = useState("SNAPP");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    if (!username.trim() || !password) {
      onError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login({ username: username.trim(), password });
      if (res.status === "success") {
        onSuccess(res.username ?? username.trim());
      } else {
        onError(res.message || "Invalid credentials.");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="block text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/70"
        >
          Username
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <Input
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              onActivity();
            }}
            autoComplete="username"
            placeholder="Enter operator ID"
            className={FIELD}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/70"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              onActivity();
            }}
            autoComplete="current-password"
            placeholder="Enter password"
            className={`${FIELD} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="mt-2 h-12 w-full rounded-xl border border-cyan-300/50 border-t-cyan-200/70 bg-gradient-to-r from-cyan-500/90 via-sky-500/90 to-blue-600/90 text-sm font-bold text-white shadow-[0_8px_32px_0_rgba(14,165,233,0.35)] backdrop-blur-xl transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_12px_40px_0_rgba(14,165,233,0.5)] active:scale-[0.98] disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Authenticating…
          </>
        ) : (
          "Login"
        )}
      </Button>
    </form>
  );
}