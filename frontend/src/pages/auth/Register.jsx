import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { Mail, Lock, User, UserPlus, Shield } from "lucide-react";

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Employee");
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!name || !email || !password || !confirmPassword) {
      setFormError("Please enter all required fields.");
      return;
    }

    // First name validation: alphabetic only, 2 to 30 chars
    const nameRegex = /^[a-zA-Z]{2,30}$/;
    if (!nameRegex.test(name)) {
      setFormError("First Name must contain only alphabetic characters and be between 2 and 30 characters long.");
      return;
    }

    // Gmail address validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!emailRegex.test(email)) {
      setFormError("Only valid Gmail addresses (e.g. user@gmail.com) are allowed.");
      return;
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setFormError("Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (!isNotRobot) {
      setFormError("Please verify that you are not a robot.");
      return;
    }

    const result = await register(email, name, password, role);
    if (result.success) {
      navigate("/login");
    } else {
      setFormError(result.error || "Registration failed. Please check inputs.");
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
            REGISTER PROFILE
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
            Authorize New Workspace Identity
          </p>
        </div>

        {formError && (
          <div className="p-3 rounded-lg bg-neon-rose/10 border border-neon-rose/30 text-rose-400 text-xs font-semibold text-center animate-shake">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* First Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="John"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
              />
            </div>
          </div>

          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Gmail Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="email"
                placeholder="john.doe@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
              />
            </div>
          </div>

          {/* Role selection dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Security Role / Tier
            </label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all appearance-none cursor-pointer"
              >
                <option value="Employee" className="bg-slate-950 text-slate-200">Employee</option>
                <option value="Manager" className="bg-slate-950 text-slate-200">Manager</option>
                <option value="Admin" className="bg-slate-950 text-slate-200">Admin</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Secret Key (Min 8 chars)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
              />
            </div>
          </div>

          {/* Confirm Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Confirm Secret Key
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-violet/60 focus:ring-1 focus:ring-neon-violet/20 transition-all"
              />
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
            className="w-full mt-2 rounded-xl py-3.5 bg-transparent text-neon-violet font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-violet/40 hover:bg-neon-violet/10 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Spinner size="sm" color="violet" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Initialize Profile</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link
            to="/login"
            className="font-bold text-neon-violet hover:underline tracking-wider"
          >
            Access Portal
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default Register;
