import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvelopeSimple, LockSimple, User, Briefcase, UserCircle, UserPlus, CheckCircle } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import { TextInput, PasswordInput, Checkbox, FormError } from "../../components/ui/inputs";

const rolesConfig = [
  { id: "Employee", title: "Employee", description: "Work on tasks and submit expense claims.", icon: UserCircle },
  { id: "Manager", title: "Manager", description: "Assign tasks and approve team claims.", icon: Briefcase },
];

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
      setFormError("Fill in every field to continue.");
      return;
    }

    // First name validation: alphabetic only, 2 to 30 chars
    const nameRegex = /^[a-zA-Z]{2,30}$/;
    if (!nameRegex.test(name)) {
      setFormError("First name must be 2 to 30 letters, with no spaces or numbers.");
      return;
    }

    // Gmail address validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!emailRegex.test(email)) {
      setFormError("Use a Gmail address, for example name@gmail.com.");
      return;
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setFormError("Password needs 8+ characters with an uppercase letter, a lowercase letter, a number and one of @$!%*?&.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }

    if (!isNotRobot) {
      setFormError("Please confirm you're not a robot.");
      return;
    }

    // Block Admin self-registration on the frontend as an extra guard
    if (role === "Admin") {
      setFormError("Admin accounts can't be created here. Choose Employee or Manager.");
      return;
    }

    const result = await register(email, name, password, role);
    if (result.success) {
      navigate("/login");
    } else {
      setFormError(result.error || "Registration failed. Check your details and try again.");
    }
  };

  return (
    <div>
      <h1 className="display text-[1.875rem] font-semibold leading-tight text-fg">Create your account</h1>
      <p className="mt-2 text-[0.9375rem] text-fg-muted">Join your team's workspace. Admin accounts are set up by an administrator.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
        <FormError key={formError}>{formError}</FormError>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Field label="First name">
            {(p) => (
              <TextInput {...p} icon={User} type="text" autoComplete="given-name" placeholder="Aarav" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            )}
          </Field>
          <Field label="Gmail address">
            {(p) => (
              <TextInput {...p} icon={EnvelopeSimple} type="email" autoComplete="email" placeholder="aarav.mehta@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            )}
          </Field>
        </div>

        <fieldset disabled={loading}>
          <legend className="field-label">Role</legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rolesConfig.map((item) => {
              const Icon = item.icon;
              const selected = role === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(item.id)}
                  className={`relative flex items-start gap-3 rounded-[12px] border p-3 text-left transition-[border-color,background-color] duration-150 ${
                    selected ? "border-accent/60 bg-accent/[0.07]" : "border-line-strong bg-bg-sunken hover:border-fg-subtle/40"
                  }`}
                >
                  <Icon size={20} weight={selected ? "fill" : "regular"} className={`mt-0.5 shrink-0 ${selected ? "text-accent-text" : "text-fg-subtle"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{item.description}</span>
                  </span>
                  {selected && <CheckCircle size={16} weight="fill" className="absolute right-2.5 top-2.5 text-accent-text" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Field label="Password" hint="8+ characters with upper and lower case, a number and a symbol (@$!%*?&).">
          {(p) => (
            <PasswordInput {...p} icon={LockSimple} autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          )}
        </Field>

        <Field label="Confirm password">
          {(p) => (
            <PasswordInput {...p} icon={LockSimple} autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
          )}
        </Field>

        <Checkbox id="robot-check" checked={isNotRobot} onChange={(e) => setIsNotRobot(e.target.checked)} disabled={loading} label="I'm not a robot" className="mt-1" />

        <Button type="submit" variant="primary" size="lg" icon={UserPlus} loading={loading} className="mt-2 w-full" data-testid="register-submit">
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-fg hover:text-accent-text underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default Register;
