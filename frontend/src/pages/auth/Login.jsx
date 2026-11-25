import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { EnvelopeSimple, LockSimple, SignIn } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import { TextInput, PasswordInput, Checkbox, FormError } from "../../components/ui/inputs";

const ROLES = ["Admin", "Manager", "Employee"];
const EMAIL_HINT = { Admin: "admin@gmail.com", Manager: "manager@gmail.com", Employee: "employee@gmail.com" };

const Login = () => {
  const { login, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("Employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Enter your email and password.");
      return;
    }

    if (!isNotRobot) {
      setFormError("Please confirm you're not a robot.");
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      // The signed-in account must match the role picked above.
      if (result.role !== selectedRole) {
        logout();
        setFormError(`This account isn't a ${selectedRole} account. Pick the matching role and try again.`);
        return;
      }
      navigate("/dashboard");
    } else {
      setFormError(result.error || "Sign in failed.");
    }
  };

  return (
    <div>
      <h1 className="display text-[1.875rem] font-semibold leading-tight text-fg">Sign in</h1>
      <p className="mt-2 text-[0.9375rem] text-fg-muted">Welcome back. Choose your role, then sign in to your workspace.</p>

      {/* Role selector: plain buttons (aria-pressed) so each role is a named button */}
      <div className="mt-7">
        <span className="field-label" id="role-label">Sign in as</span>
        <div role="group" aria-labelledby="role-label" className="grid grid-cols-3 gap-1 rounded-[12px] border border-line bg-surface-2 p-1">
          {ROLES.map((roleOption) => {
            const active = selectedRole === roleOption;
            return (
              <button
                key={roleOption}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedRole(roleOption);
                  setFormError("");
                }}
                className={`relative h-9 rounded-[8px] text-[0.8125rem] font-semibold transition-colors duration-150 ${active ? "text-fg" : "text-fg-subtle hover:text-fg-muted"}`}
              >
                {active && (
                  <motion.span
                    layoutId="login-role"
                    className="absolute inset-0 rounded-[8px] border border-line-strong bg-surface shadow-sm"
                    transition={{ type: "spring", duration: 0.3, bounce: 0.12 }}
                  />
                )}
                <span className="relative">{roleOption}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
        <FormError key={formError}>{formError}</FormError>

        <Field label="Email">
          {(p) => (
            <TextInput
              {...p}
              icon={EnvelopeSimple}
              type="email"
              autoComplete="email"
              placeholder={EMAIL_HINT[selectedRole]}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          )}
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="field-label !mb-0">Password</label>
            <Link to="/forgot-password" className="text-[0.8125rem] font-medium text-accent-text hover:underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            icon={LockSimple}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <Checkbox
          id="robot-check"
          checked={isNotRobot}
          onChange={(e) => setIsNotRobot(e.target.checked)}
          disabled={loading}
          label="I'm not a robot"
          className="mt-1"
        />

        <Button type="submit" variant="primary" size="lg" icon={SignIn} loading={loading} className="mt-2 w-full" data-testid="login-submit">
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-fg-muted">
        New to QuestFlow?{" "}
        <Link to="/register" className="font-semibold text-fg hover:text-accent-text underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default Login;
