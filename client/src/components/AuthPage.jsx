import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isBackendConfiguredForProduction } from "../config/backendUrl";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signName, setSignName] = useState("");
  const [signEmail, setSignEmail] = useState("");
  const [signPassword, setSignPassword] = useState("");
  const [signConfirm, setSignConfirm] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({
        name: signName.trim(),
        email: signEmail.trim(),
        password: signPassword,
        confirmPassword: signConfirm
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#121826] px-4 py-3 text-sm text-white placeholder:text-[#6B7280] outline-none transition focus:border-[#00FFB2]/50 focus:ring-2 focus:ring-[#00FFB2]/20";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F1A] px-4 py-12">
      <div className="mb-10 text-center">
        <p className="bg-gradient-to-r from-[#00FFB2] to-cyan-300 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          Sentilyze
        </p>
        <p className="mt-2 text-sm text-[#9CA3AF]">Market sentiment and intelligence</p>
      </div>

      {!isBackendConfiguredForProduction() ? (
        <div className="mb-6 w-full max-w-md rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold text-amber-50">Production API URL missing</p>
          <p className="mt-2 text-amber-100/90">
            Set <code className="rounded bg-black/30 px-1">VITE_BACKEND_URL</code> in Netlify (HTTPS API only — not localhost), redeploy, and on the API host set{" "}
            <code className="rounded bg-black/30 px-1">CLIENT_URL</code> to this Netlify URL for CORS.
          </p>
        </div>
      ) : null}

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121826]/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
        <div className="mb-6 flex rounded-xl bg-[#0B0F1A] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === "login" ? "bg-[#00FFB2]/15 text-[#00FFB2]" : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === "signup" ? "bg-[#00FFB2]/15 text-[#00FFB2]" : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Create account
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 px-4 py-3 text-sm text-[#FCA5A5]">
            {error}
          </div>
        ) : null}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="auth-login-email" className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                Email
              </label>
              <input
                id="auth-login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="auth-login-password" className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                Password
              </label>
              <input
                id="auth-login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-[#00FFB2] to-emerald-400 py-3 text-sm font-bold text-[#0B0F1A] transition hover:opacity-95 disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="auth-sign-name" className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                Name
              </label>
              <input
                id="auth-sign-name"
                type="text"
                autoComplete="name"
                value={signName}
                onChange={(e) => setSignName(e.target.value)}
                className={inputClass}
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label htmlFor="auth-sign-email" className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                Email
              </label>
              <input
                id="auth-sign-email"
                type="email"
                autoComplete="email"
                value={signEmail}
                onChange={(e) => setSignEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="auth-sign-password" className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                New password
              </label>
              <input
                id="auth-sign-password"
                type="password"
                autoComplete="new-password"
                value={signPassword}
                onChange={(e) => setSignPassword(e.target.value)}
                className={inputClass}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="auth-sign-confirm" className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                Confirm password
              </label>
              <input
                id="auth-sign-confirm"
                type="password"
                autoComplete="new-password"
                value={signConfirm}
                onChange={(e) => setSignConfirm(e.target.value)}
                className={inputClass}
                placeholder="Repeat password"
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-[#00FFB2] to-emerald-400 py-3 text-sm font-bold text-[#0B0F1A] transition hover:opacity-95 disabled:opacity-50"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
