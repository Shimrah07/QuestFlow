import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, EnvelopeSimple, Key, LockSimple, PaperPlaneTilt, ShieldCheck, Check } from "@phosphor-icons/react";
import AuthService from "../../services/auth";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import { TextInput, PasswordInput, FormError } from "../../components/ui/inputs";

const STEPS = ["Email", "Code", "New password"];

const errorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  return Array.isArray(detail)
    ? detail.map((d) => d.msg?.replace(/^Value error, /, "") ?? JSON.stringify(d)).join(" | ")
    : detail || err.message || fallback;
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const reduce = useReducedMotion();

  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP, 3: Reset Password
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [generatedCodeHint, setGeneratedCodeHint] = useState("");

  // Step 1: Request OTP code
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!email) {
      setFormError("Enter the Gmail address you registered with.");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!emailRegex.test(email)) {
      setFormError("Use a Gmail address, for example name@gmail.com.");
      return;
    }

    try {
      setLoading(true);
      const res = await AuthService.forgotPassword(email);
      showToast(`Verification code sent (demo code ${res.otp_code}).`, "success");
      setGeneratedCodeHint(res.otp_code);
      setStep(2);
    } catch (err) {
      const errMsg = errorMessage(err, "Couldn't send a verification code.");
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
      setFormError("Enter the 6-digit code.");
      return;
    }

    try {
      setLoading(true);
      await AuthService.verifyOTP(email, otpCode);
      showToast("Code verified. Choose a new password.", "success");
      setStep(3);
    } catch (err) {
      const errMsg = errorMessage(err, "That code is invalid or has expired.");
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
      setFormError("Enter and confirm your new password.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setFormError("Password needs 8+ characters with an uppercase letter, a lowercase letter, a number and one of @$!%*?&.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }

    try {
      setLoading(true);
      await AuthService.resetPassword(email, otpCode, newPassword);
      showToast("Password updated. Sign in with your new password.", "success");
      navigate("/login");
    } catch (err) {
      const errMsg = errorMessage(err, "Couldn't reset your password.");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const slide = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, x: -16 },
    transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
  };

  return (
    <div>
      <h1 className="display text-[1.875rem] font-semibold leading-tight text-fg">Reset your password</h1>
      <p className="mt-2 text-[0.9375rem] text-fg-muted">We'll send a 6-digit code to your email, then you can set a new password.</p>

      {/* Stepper */}
      <ol className="mt-7 grid grid-cols-3 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const s = i + 1;
          const done = s < step;
          const current = s === step;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className="flex flex-col gap-2">
              <span className="relative h-1 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                  style={{ width: done || current ? "100%" : "0%" }}
                />
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${current ? "text-fg" : done ? "text-fg-muted" : "text-fg-subtle"}`}>
                {done && <Check size={12} weight="bold" className="text-accent-text" />}
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        <FormError key={formError}>{formError}</FormError>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {/* STEP 1: Request OTP */}
        {step === 1 && (
          <motion.form key="s1" {...slide} onSubmit={handleRequestOTP} noValidate className="mt-4 flex flex-col gap-4">
            <Field label="Registered Gmail address">
              {(p) => (
                <TextInput {...p} icon={EnvelopeSimple} type="email" autoComplete="email" placeholder="admin@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
              )}
            </Field>
            <Button type="submit" variant="primary" size="lg" icon={PaperPlaneTilt} loading={loading} className="mt-2 w-full">
              Send code
            </Button>
          </motion.form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <motion.form key="s2" {...slide} onSubmit={handleVerifyOTP} noValidate className="mt-4 flex flex-col gap-4">
            <div className="rounded-[12px] border border-line bg-surface p-3.5">
              <p className="text-sm text-fg-muted">
                Enter the code sent to <span className="font-semibold text-fg break-all">{email}</span>
              </p>
              {generatedCodeHint && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                  <span>Demo code</span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(generatedCodeHint)}
                    className="mono inline-flex items-center gap-1.5 rounded-[6px] border border-accent/30 bg-accent/10 px-2 py-1 text-[0.8125rem] font-semibold tracking-[0.12em] text-accent-text transition-colors hover:bg-accent/20"
                  >
                    {generatedCodeHint}
                    <span className="font-sans text-[0.6875rem] font-medium tracking-normal opacity-80">Use code</span>
                  </button>
                </div>
              )}
            </div>

            <Field label="6-digit code">
              {(p) => (
                <TextInput
                  {...p}
                  icon={Key}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                  className="mono text-center text-lg tracking-[0.5em]"
                  required
                />
              )}
            </Field>

            <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
              <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
              <Button type="submit" variant="primary" size="lg" icon={ShieldCheck} loading={loading}>
                Verify code
              </Button>
            </div>
          </motion.form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <motion.form key="s3" {...slide} onSubmit={handleResetPassword} noValidate className="mt-4 flex flex-col gap-4">
            <Field label="New password" hint="8+ characters with upper and lower case, a number and a symbol (@$!%*?&).">
              {(p) => (
                <PasswordInput {...p} icon={LockSimple} autoComplete="new-password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} required />
              )}
            </Field>
            <Field label="Confirm new password">
              {(p) => (
                <PasswordInput {...p} icon={LockSimple} autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} required />
              )}
            </Field>
            <Button type="submit" variant="primary" size="lg" icon={Check} loading={loading} className="mt-2 w-full">
              Update password
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-fg-muted transition-colors hover:text-fg">
          <ArrowLeft size={14} weight="bold" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
