import { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Logo from "./ui/Logo";
import * as api from "../lib/api";

export default function ForcePasswordChange({
  themeMode,
  onPasswordChanged,
}: {
  themeMode: "light" | "dark";
  onPasswordChanged: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setIsLoading(true);
    try {
      await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      onPasswordChanged();
    } catch (err: any) {
      setError(err.message || "Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 font-sans select-none transition-colors duration-200 ${themeMode === "dark" ? "dark bg-zinc-950 text-zinc-100" : "bg-surface-50 text-surface-900"}`}
      style={{
        backgroundImage:
          themeMode === "light"
            ? `linear-gradient(rgba(248, 249, 250, 0.94), rgba(248, 249, 250, 0.98)), url('/clean_space_chains_bg.png')`
            : `linear-gradient(rgba(9, 9, 11, 0.96), rgba(9, 9, 11, 0.98)), url('/clean_space_chains_bg.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md space-y-6 animate-float">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-brand-900 flex items-center justify-center p-2 mx-auto shadow-lg shadow-brand-900/20">
            <Logo className="w-full h-full text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans">
              Asset<span className="text-brand-900">Flow</span>
            </h1>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-8 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-extrabold text-surface-900 dark:text-white uppercase tracking-wider">
              Create New Password
            </h2>
            <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium leading-relaxed">
              Your administrator has set a temporary password for your account.
              <br />
              Please create a new secure password to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your temporary password"
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 pl-9 pr-10 text-xs focus:border-brand-900 dark:focus:border-brand-500 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-3 text-surface-400 hover:text-surface-600 cursor-pointer"
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a new secure password"
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 pl-9 pr-10 text-xs focus:border-brand-900 dark:focus:border-brand-500 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3 text-surface-400 hover:text-surface-600 cursor-pointer"
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[9px] text-surface-400 dark:text-zinc-500 font-mono">
                Minimum 6 characters
              </p>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 pl-9 pr-10 text-xs focus:border-brand-900 dark:focus:border-brand-500 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-surface-400 hover:text-surface-600 cursor-pointer"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-11 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition shadow-md shadow-brand-900/20"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password & Continue"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-surface-400 dark:text-zinc-600 font-mono">
          RBAC SECURITY PROTOCOL · ASSETFLOW v3.2
        </p>
      </div>
    </div>
  );
}
