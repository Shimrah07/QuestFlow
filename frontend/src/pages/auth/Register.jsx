import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { Mail, Lock, User, UserPlus, Shield, Eye, EyeOff, ChevronDown, Check, Briefcase } from "lucide-react";

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Employee");
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const rolesConfig = [
    {
      id: "Employee",
      title: "Employee",
      description: "Standard access for task tracking & expense submissions",
      icon: User,
      badge: "Standard",
    },
    {
      id: "Manager",
      title: "Manager",
      description: "Elevated access for project oversight & approval workflows",
      icon: Briefcase,
      badge: "Management",
    },
  ];

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

    // Block Admin self-registration on the frontend as an extra guard
    if (role === "Admin") {
      setFormError("Admin accounts cannot be self-registered. Only Employee and Manager roles are available.");
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

          {/* Custom Role Selection Dropdown */}
          <div className="flex flex-col gap-1.5" ref={roleDropdownRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Security Role / Tier
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => !loading && setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                disabled={loading}
                className={`w-full bg-slate-950/70 border ${
                  isRoleDropdownOpen ? "border-neon-violet shadow-[0_0_15px_rgba(139,92,246,0.2)]" : "border-slate-900 hover:border-slate-700"
                } rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 flex items-center justify-between transition-all cursor-pointer text-left`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neon-violet" />
                  <span className="font-semibold text-slate-100">{role}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-violet/10 text-neon-violet border border-neon-violet/20 font-medium">
                    {role === "Manager" ? "Management" : "Standard"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isRoleDropdownOpen ? "rotate-180 text-neon-violet" : ""
                  }`}
                />
              </button>

              {/* Custom Dropdown Menu */}
              {isRoleDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 animate-in fade-in-50 zoom-in-95">
                  {rolesConfig.map((item) => {
                    const Icon = item.icon;
                    const isSelected = role === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setRole(item.id);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-neon-violet/15 border border-neon-violet/30 text-white"
                            : "hover:bg-slate-900/80 text-slate-300 hover:text-slate-100 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? "bg-neon-violet/20 text-neon-violet" : "bg-slate-900 text-slate-400"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{item.title}</span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                {item.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-neon-violet/20 text-neon-violet flex items-center justify-center border border-neon-violet/40 shrink-0 ml-2">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
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

          {/* Confirm Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Confirm Secret Key
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
