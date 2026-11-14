import { useState, useEffect } from "react";
import { LogIn, UserPlus, Sparkles, X, Shield, Lock, ArrowRight } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<boolean>;
  onSignup: (name: string, email: string, pass: string, org: string) => Promise<boolean>;
  onDemoLogin: () => Promise<boolean>;
  initialMode?: "login" | "signup";
  busy?: boolean;
}

export function AuthModal({
  isOpen,
  onClose,
  onLogin,
  onSignup,
  onDemoLogin,
  initialMode = "login",
  busy,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError("");
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      if (!email || !password) {
        setError("Please enter both email and password.");
        return;
      }
      const success = await onLogin(email, password);
      if (success) onClose();
      else setError("Invalid credentials. Please verify your email and password.");
    } else {
      if (!name.trim() || !email.trim() || !password || !orgName.trim()) {
        setError("All fields are required.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      const success = await onSignup(name.trim(), email.trim(), password, orgName.trim());
      if (success) onClose();
      else setError("Could not create account. Email may already be in use.");
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="modal-panel auth-modal">
        <header className="flex justify-between items-center mb-4">
          <div className="flex gap-2 items-center">
            <span className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
              {mode === "login" ? <LogIn size={20} /> : <UserPlus size={20} />}
            </span>
            <div>
              <h2 id="auth-modal-title" className="text-lg font-bold">
                {mode === "login" ? "Sign In to Relay" : "Create Your Organisation"}
              </h2>
              <small className="text-stone-500">
                {mode === "login" ? "Enter your credentials or try the demo" : "Start your isolated company workspace"}
              </small>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close" disabled={busy}>
            <X size={18} />
          </button>
        </header>

        {/* Demo Account Callout Card */}
        <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
              <Sparkles size={14} /> Public Demo Account
            </span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono">
              Pre-loaded Lead
            </span>
          </div>
          <p className="text-xs text-emerald-800">
            For evaluation, you can sign in directly or use credentials:
            <br />
            <strong>demo@relay.local</strong> / <strong>DemoUser2026!</strong>
          </p>
          <button
            type="button"
            className="button secondary text-xs py-1.5 font-medium flex items-center justify-center gap-1 bg-white hover:bg-emerald-100"
            disabled={busy}
            onClick={async () => {
              const ok = await onDemoLogin();
              if (ok) onClose();
            }}
          >
            Sign in as Demo Lead (1-Click) <ArrowRight size={13} />
          </button>
        </div>

        {error && <div className="p-3 mb-3 bg-red-50 text-red-800 text-xs rounded-lg">{error}</div>}

        <div className="flex border-b border-stone-200 mb-4">
          <button
            className={`pb-2 text-sm font-semibold flex-1 text-center border-b-2 ${
              mode === "login" ? "border-emerald-800 text-emerald-900" : "border-transparent text-stone-500"
            }`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            className={`pb-2 text-sm font-semibold flex-1 text-center border-b-2 ${
              mode === "signup" ? "border-emerald-800 text-emerald-900" : "border-transparent text-stone-500"
            }`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Create Organisation
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium">
                Your Full Name *
                <input
                  type="text"
                  placeholder="e.g. Maya Patel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                Organisation Name *
                <input
                  type="text"
                  placeholder="e.g. Stripe Engineering"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="input-field"
                  required
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1 text-xs font-medium">
            Email Address *
            <input
              type="email"
              placeholder="e.g. you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium">
            Password *
            <input
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </label>

          <button type="submit" className="button primary mt-2 flex justify-center items-center gap-1.5" disabled={busy}>
            {busy ? "Processing…" : mode === "login" ? "Sign In" : "Create Account & Org"}
          </button>
        </form>

        <p className="text-[11px] text-stone-400 mt-4 text-center">
          Passwords are hashed with bcrypt. Email verification and password reset via email are not built.
        </p>
      </div>
    </div>
  );
}
