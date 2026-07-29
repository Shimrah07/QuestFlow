import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { Mail, Lock, LogIn, KeyRound, Sparkles, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const { login, logout, loading } = useAuth();
  const navigate = useNavigate();
  
  const [selectedRole, setSelectedRole] = useState("Employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Please enter all required fields.");
      return;
    }

    if (!isNotRobot) {
      setFormError("Please verify that you are not a robot.");
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      // Validate that the returned user role matches selectedRole!
      if (result.role !== selectedRole) {
        logout();
        setFormError(`Access Denied: The authenticated credentials do not belong to the selected '${selectedRole}' security role.`);
        return;
      }
      navigate("/dashboard");
    } else {
      setFormError(result.error || "Authentication failed.");
    }
  };

  return (
    <Card glowColor="violet" hoverEffect={false} className="w-full relative overflow-hidden bg-bg-card border-neon-violet/10">
      {/* Background glow header line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-violet to-neon-emerald" />

      <div className="flex flex-col gap-6">
        {/* Header Branding */}
        <div className="text-center">
          <h2 className="font-display font-extrabold text-2xl tracking-wide text-slate-100">
            SECURE ACCESS PORTAL
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
            Establish Secure Operations Session
          </p>
        </div>

        {/* Security Role Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
            Security Authorization Tier
          </label>
          <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-900">
            {["Admin", "Manager", "Employee"].map((roleOption) => (
              <button
                key={roleOption}
                type="button"
                onClick={() => {
                  setSelectedRole(roleOption);
                  setFormError("");
                }}
                className={`py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedRole === roleOption
                    ? roleOption === "Admin"
                      ? "bg-neon-violet/10 border border-neon-violet/40 text-neon-violet shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                      : roleOption === "Manager"
                      ? "bg-neon-emerald/10 border border-neon-emerald/40 text-neon-emerald shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                      : "bg-neon-amber/10 border border-neon-amber/40 text-neon-amber shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                    : "bg-transparent border border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {roleOption}
              </button>
            ))}
          </div>
        </div>

        {formError && (
          <div className="p-3 rounded-lg bg-neon-rose/10 border border-neon-rose/30 text-rose-400 text-xs font-semibold text-center animate-shake">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Ident Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="email"
                placeholder="developer@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Verification key
              </label>
              <Link
                to="/forgot-password"
                className="text-[9px] font-bold text-neon-violet hover:text-neon-violet-glow uppercase tracking-widest transition-colors"
              >
                Lost key?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-11 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
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

          {/* Robot Verification Checkbox */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="robot-check"
              checked={isNotRobot}
              onChange={(e) => setIsNotRobot(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-slate-900 bg-slate-950/60 text-neon-violet focus:ring-neon-violet/20 focus:ring-offset-0 focus:outline-none cursor-pointer"
            />
            <label htmlFor="robot-check" className="text-xs text-slate-400 select-none cursor-pointer uppercase tracking-wider">
              I'm not a robot
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl py-3.5 bg-neon-violet text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-violet/30 hover:bg-neon-violet/90 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Spinner size="sm" color="violet" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Establish Connection</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          First connection?{" "}
          <Link
            to="/register"
            className="font-bold text-neon-violet hover:underline tracking-wider"
          >
            Register Profile
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default Login;
