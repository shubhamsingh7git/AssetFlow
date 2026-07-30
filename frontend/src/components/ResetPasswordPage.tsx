import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle, ShieldAlert } from "lucide-react";
import Logo from "./ui/Logo";
import * as api from "../lib/api";

export function ResetPasswordPage({
  token: initialToken,
  onComplete,
}: {
  token?: string;
  onComplete?: () => void;
}) {
  const [token, setToken] = useState(initialToken || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!initialToken) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, [initialToken]);

  const validateStrongPassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(pwd)) return "Password must contain at least one number.";
    if (!/[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return "Password must contain at least one special character.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!token) {
      setError("Reset token is missing or invalid. Please check your email link.");
      return;
    }

    const pwdErr = validateStrongPassword(newPassword);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res: any = await api.resetAdminPassword({
        token,
        newPassword,
        confirmPassword,
      });
      setSuccessMsg(res?.message || "Password reset successful! Redirecting to login...");
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          window.location.href = "/";
        }
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Invalid or expired reset token. Please request a new password reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-zinc-950 text-surface-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 font-sans select-none">
      {/* Background container */}
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Top Header Logo */}
        <div className="flex items-center gap-3 justify-center pb-2">
          <div className="w-9 h-9 rounded-lg bg-brand-900 flex items-center justify-center p-1.5 shrink-0 shadow-md">
            <Logo className="w-full h-full text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white font-sans">
            Asset<span className="text-brand-900">Flow</span>
          </span>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-extrabold text-surface-900 dark:text-white uppercase tracking-wider font-sans">
            Set New Admin Password
          </h2>
          <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium">
            Cryptographically tokenized password recovery for Company Administrators.
          </p>
        </div>

        {successMsg ? (
          <div className="space-y-4 p-4 text-center bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-sm uppercase text-green-900 dark:text-green-200">Password Reset Successful!</h4>
            <p className="text-xs text-green-800 dark:text-green-300 font-medium leading-relaxed">
              {successMsg}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-11 pl-3 pr-10 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-surface-400 hover:text-surface-700 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-11 pl-3 pr-10 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-surface-400 hover:text-surface-700 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Validation criteria info */}
            <div className="p-3 bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-xl text-[11px] text-surface-600 dark:text-zinc-400 space-y-1">
              <div className="font-extrabold uppercase text-[10px] text-surface-700 dark:text-zinc-300">Password Requirements:</div>
              <ul className="list-disc pl-4 space-y-0.5 font-medium">
                <li className={newPassword.length >= 8 ? "text-green-600 font-bold" : ""}>At least 8 characters long</li>
                <li className={/[A-Z]/.test(newPassword) ? "text-green-600 font-bold" : ""}>One uppercase letter (A-Z)</li>
                <li className={/[a-z]/.test(newPassword) ? "text-green-600 font-bold" : ""}>One lowercase letter (a-z)</li>
                <li className={/\d/.test(newPassword) ? "text-green-600 font-bold" : ""}>One number (0-9)</li>
                <li className={/[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? "text-green-600 font-bold" : ""}>One special character (@$!%*?&...)</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-11 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-brand-900/20 disabled:opacity-60 flex items-center justify-center"
            >
              {isLoading ? "Updating Password..." : "Update Password & Log In"}
            </button>
          </form>
        )}

        <div className="pt-2 text-center border-t border-surface-200 dark:border-zinc-800">
          <a href="/" className="text-xs font-bold text-surface-500 hover:text-brand-900 dark:hover:text-white transition">
            ← Return to AssetFlow Portal
          </a>
        </div>
      </div>
    </div>
  );
}
