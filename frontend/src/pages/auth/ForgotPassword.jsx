import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import AuthService from "../../services/auth";
import { useToast } from "../../context/ToastContext";
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, ShieldAlert, Eye, EyeOff } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP, 3: Reset Password
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [generatedCodeHint, setGeneratedCodeHint] = useState("");

  // Step 1: Request OTP code
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!email) {
      setFormError("Please enter your registered Gmail address.");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!emailRegex.test(email)) {
      setFormError("Only valid Gmail addresses (e.g. user@gmail.com) are allowed.");
      return;
    }

    try {
      setLoading(true);
      const res = await AuthService.forgotPassword(email);
      showToast(`Verification code sent! (OTP: ${res.otp_code})`, "success");
      setGeneratedCodeHint(res.otp_code);
      setStep(2);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errMsg = Array.isArray(detail)
        ? detail.map((d) => d.msg?.replace(/^Value error, /, "") ?? JSON.stringify(d)).join(" | ")
        : detail || err.message || "Failed to request verification code.";
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!otpCode || otpCode.length !== 6) {
      setFormError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      await AuthService.verifyOTP(email, otpCode);
      showToast("Verification code validated! Set your new password.", "success");
      setStep(3);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errMsg = Array.isArray(detail)
        ? detail.map((d) => d.msg?.replace(/^Value error, /, "") ?? JSON.stringify(d)).join(" | ")
        : detail || err.message || "Invalid or expired verification code.";
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!newPassword || !confirmPassword) {
      setFormError("Please enter and confirm your new secret key.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setFormError("Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Secret keys do not match.");
      return;
    }

    try {
      setLoading(true);
      await AuthService.resetPassword(email, otpCode, newPassword);
      showToast("Secret Key successfully updated! Please log in.", "success");
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errMsg = Array.isArray(detail)
        ? detail.map((d) => d.msg?.replace(/^Value error, /, "") ?? JSON.stringify(d)).join(" | ")
        : detail || err.message || "Failed to reset password.";
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card glowColor="violet" hoverEffect={false} className="w-full relative overflow-hidden bg-bg-card border-neon-violet/10">
      {/* Header Accent Glow Bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-violet via-neon-amber to-neon-emerald" />

      <div className="flex flex-col gap-6">
        {/* Header Title */}
        <div className="text-center">
          <h2 className="font-display font-extrabold text-2xl tracking-wide text-slate-100">
            LOST KEY RECOVERY
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
            {step === 1 && "Step 1: Request Security Verification OTP"}
            {step === 2 && "Step 2: Enter 6-Digit OTP Code"}
            {step === 3 && "Step 3: Establish New Secret Key"}
          </p>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-neon-violet shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                  : s < step
                  ? "w-4 bg-neon-emerald"
                  : "w-4 bg-slate-900"
              }`}
            />
          ))}
        </div>

        {formError && (
          <div className="p-3 rounded-lg bg-neon-rose/10 border border-neon-rose/30 text-rose-400 text-xs font-semibold text-center animate-shake">
            {formError}
          </div>
        )}

        {/* STEP 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Registered Gmail Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="email"
                  placeholder="admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl py-3.5 bg-neon-violet text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-violet/30 hover:bg-neon-violet/90 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Spinner size="sm" color="white" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Security OTP</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
            <div className="p-3 rounded-xl bg-neon-violet/10 border border-neon-violet/20 flex flex-col gap-1 text-center">
              <span className="text-[10px] uppercase font-bold text-neon-violet tracking-widest">
                OTP Code Dispatched
              </span>
              <span className="text-xs text-slate-300">
                Enter the 6-digit OTP code generated for <strong className="text-white font-mono">{email}</strong>
              </span>
              {generatedCodeHint && (
                <div className="mt-1 inline-flex items-center justify-center gap-2">
                  <span className="text-[11px] text-slate-400">Test OTP Code:</span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(generatedCodeHint)}
                    className="px-2 py-0.5 rounded bg-neon-violet/20 text-neon-violet border border-neon-violet/40 font-mono text-xs font-bold hover:bg-neon-violet/30 transition-all cursor-pointer"
                  >
                    {generatedCodeHint} (Click to Auto-fill)
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                6-Digit Verification OTP
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                  className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 font-mono tracking-widest text-center focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 font-bold text-xs uppercase tracking-wider hover:text-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-3.5 rounded-xl bg-neon-violet text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-violet/30 hover:bg-neon-violet/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" color="white" /> : "Verify Security Code"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            {/* New Password input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                New Secret Key (Min 8 chars)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-11 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-neon-violet transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Confirm New Secret Key
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-11 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-neon-violet transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl py-3.5 bg-neon-emerald text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-emerald/30 hover:bg-neon-emerald/90 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Spinner size="sm" color="white" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Secret Key</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to Login Footer Link */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2 pt-2 border-t border-slate-900">
          <ArrowLeft className="w-3.5 h-3.5" />
          <Link
            to="/login"
            className="font-bold text-neon-violet hover:underline tracking-wider"
          >
            Return to Access Portal
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default ForgotPassword;
