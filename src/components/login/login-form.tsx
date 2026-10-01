"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BACKEND_ORIGIN, login } from "@/lib/api";

interface LoginFormProps {
  onSuccess: (username: string) => void;
  onError: (message: string) => void;
  onActivity: () => void;
}

const FIELD =
  "h-12 border-white/10 bg-white/[0.05] pl-10 text-[15px] text-white placeholder:text-white/35 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-400/15";

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
          className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50"
        >
          Username
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
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
          className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
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
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="mt-2 h-12 w-full border border-white/15 bg-[#0C131C] text-[15px] font-semibold text-white hover:bg-[#141C28]"
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