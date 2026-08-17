"use client";

import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { Button, Card, IconCircleButton } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { cn } from "@/lib/utils/cn";

type AuthMode = "sign-in" | "sign-up";

type AuthPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
};

type SignInFormProps = {
  onSuccess: () => void;
};

type SignUpFormProps = {
  onSuccess: () => void;
};

function SocialButtons() {
  return (
    <div className="flex justify-center gap-2" aria-label="Accesos sociales decorativos">
      <IconCircleButton
        aria-label="Facebook decorativo"
        icon={<span className="text-xs font-medium text-social-facebook">f</span>}
        size="social"
        surface="light"
        disabled
      />
      <IconCircleButton
        aria-label="X decorativo"
        icon={<span className="text-xs font-medium text-text-primary-on-light">X</span>}
        size="social"
        surface="light"
        disabled
      />
      <IconCircleButton
        aria-label="Google decorativo"
        icon={<span className="text-xs font-medium text-social-google">G</span>}
        size="social"
        surface="light"
        disabled
      />
    </div>
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isElementVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);

  return (
    !element.closest('[aria-hidden="true"], [inert]') &&
    rect.width > 0 &&
    rect.height > 0 &&
    styles.display !== "none" &&
    styles.visibility !== "hidden"
  );
}

function getVisibleFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );

  return Array.from(focusableElements).filter(isElementVisible);
}

function SignInForm({ onSuccess }: SignInFormProps) {
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState("cliente@artech.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedEmail = email.trim().toLocaleLowerCase("es-GT");

    if (!isValidEmail(normalizedEmail)) {
      setStatusMessage("");
      setError("Ingresa un correo válido para continuar.");
      return;
    }

    if (password.length < 6) {
      setStatusMessage("");
      setError("La contraseña mock debe tener al menos 6 caracteres.");
      return;
    }

    setError("");
    setStatusMessage("Verificando tus datos...");
    setIsSubmitting(true);

    try {
      signIn(normalizedEmail);
      onSuccess();
    } catch {
      setError("No pudimos iniciar sesión. Intenta nuevamente.");
      setStatusMessage("");
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto grid w-full max-w-xs gap-4"
    >
      <div className="text-center">
        <p className="inline-flex items-center gap-2 text-2xl font-medium text-text-primary-on-light">
          <LogoMark />
          <span>Artech</span>
        </p>
        <h2 className="mt-4 text-2xl font-medium">Iniciar sesión</h2>
      </div>
      <SocialButtons />
      <p className="text-center text-sm text-text-secondary-on-light">
        O con tu correo
      </p>
      <label className="grid gap-2 text-sm text-text-secondary-on-light">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          aria-invalid={Boolean(error) && !isValidEmail(email)}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
            setStatusMessage("");
          }}
          className="h-11 rounded-input border border-border-on-light px-3 text-text-primary-on-light"
        />
      </label>
      <label className="grid gap-2 text-sm text-text-secondary-on-light">
        Contraseña
        <input
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          value={password}
          aria-invalid={Boolean(error) && password.length < 6}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
            setStatusMessage("");
          }}
          className="h-11 rounded-input border border-border-on-light px-3 text-text-primary-on-light"
        />
      </label>
      {error ? (
        <p className="text-sm leading-5 text-text-secondary-on-light" role="alert">
          {error}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="text-sm leading-5 text-text-secondary-on-light" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      <Button
        variant="primary-on-light"
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        loadingLabel="Verificando..."
      >
        Entrar
      </Button>
    </form>
  );
}

function SignUpForm({ onSuccess }: SignUpFormProps) {
  const signUp = useAuthStore((state) => state.signUp);
  const [name, setName] = useState("Cliente Artech");
  const [email, setEmail] = useState("nuevo@artech.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLocaleLowerCase("es-GT");

    if (normalizedName.length < 2) {
      setStatusMessage("");
      setError("Ingresa tu nombre para crear la cuenta mock.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setStatusMessage("");
      setError("Ingresa un correo válido para continuar.");
      return;
    }

    if (password.length < 6) {
      setStatusMessage("");
      setError("La contraseña mock debe tener al menos 6 caracteres.");
      return;
    }

    setError("");
    setStatusMessage("Creando cuenta...");
    setIsSubmitting(true);

    try {
      signUp(normalizedName, normalizedEmail);
      onSuccess();
    } catch {
      setError("No pudimos crear la cuenta. Intenta nuevamente.");
      setStatusMessage("");
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto grid w-full max-w-xs gap-4"
    >
      <div className="text-center">
        <p className="inline-flex items-center gap-2 text-2xl font-medium text-text-primary-on-light">
          <LogoMark />
          <span>Artech</span>
        </p>
        <h2 className="mt-4 text-2xl font-medium">Crear cuenta</h2>
      </div>
      <SocialButtons />
      <p className="text-center text-sm text-text-secondary-on-light">
        O con tu correo
      </p>
      <label className="grid gap-2 text-sm text-text-secondary-on-light">
        Nombre
        <input
          type="text"
          required
          autoComplete="name"
          value={name}
          aria-invalid={Boolean(error) && name.trim().length < 2}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
            setStatusMessage("");
          }}
          className="h-11 rounded-input border border-border-on-light px-3 text-text-primary-on-light"
        />
      </label>
      <label className="grid gap-2 text-sm text-text-secondary-on-light">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          aria-invalid={Boolean(error) && !isValidEmail(email)}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
            setStatusMessage("");
          }}
          className="h-11 rounded-input border border-border-on-light px-3 text-text-primary-on-light"
        />
      </label>
      <label className="grid gap-2 text-sm text-text-secondary-on-light">
        Contraseña
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          aria-invalid={Boolean(error) && password.length < 6}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
            setStatusMessage("");
          }}
          className="h-11 rounded-input border border-border-on-light px-3 text-text-primary-on-light"
        />
      </label>
      {error ? (
        <p className="text-sm leading-5 text-text-secondary-on-light" role="alert">
          {error}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="text-sm leading-5 text-text-secondary-on-light" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      <Button
        variant="primary-on-light"
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        loadingLabel="Creando cuenta..."
      >
        Registrarme
      </Button>
    </form>
  );
}

export function AuthPanel({ isOpen, onClose, redirectTo = "/cuenta" }: AuthPanelProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<AuthMode>("sign-in");

  const handleSuccess = useCallback(() => {
    setMode("sign-in");
    onClose();
    router.push(redirectTo);
  }, [onClose, redirectTo, router]);

  const handleClose = useCallback(() => {
    setMode("sign-in");
    onClose();
  }, [onClose]);

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getVisibleFocusableElements(dialogRef.current);

    if (!focusableElements.length) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => {
      const focusableElements = getVisibleFocusableElements(dialogRef.current);
      const firstInput = focusableElements.find(
        (element) => element.tagName === "INPUT",
      );
      const firstButton = focusableElements.find(
        (element) => element.tagName === "BUTTON",
      );

      (firstInput ?? firstButton)?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="auth-backdrop fixed inset-0 z-[90] flex items-center justify-center px-4 py-8"
      onMouseDown={handleBackdropMouseDown}
    >
      <Card
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Autenticación"
        className="auth-surface relative grid max-h-[90vh] w-full max-w-4xl overflow-y-auto p-0"
        onKeyDown={handleDialogKeyDown}
      >
        <IconCircleButton
          aria-label="Cerrar autenticación"
          icon={<X strokeWidth={1.5} />}
          surface="light"
          className="absolute right-4 top-4 z-20"
          onClick={handleClose}
        />
        <div className="lg:hidden">
          <div className="relative overflow-hidden bg-surface-panel-dark px-8 py-10 text-center text-text-primary-on-dark">
            <span className="absolute -left-10 -top-10 size-28 rounded-full border border-border-on-dark" />
            <span className="absolute -bottom-12 -right-12 size-32 rounded-full border border-border-on-dark" />
            <h2 className="text-2xl font-medium">
              {mode === "sign-in" ? "Bienvenido" : "Crea tu cuenta"}
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-text-secondary-on-dark">
              {mode === "sign-in"
                ? "Accede con una sesión mock para continuar."
                : "Registra una cuenta visual para probar el flujo."}
            </p>
            <Button
              variant="primary-on-dark"
              className="mt-6 active:bg-btn-primary-on-light-bg active:text-btn-primary-on-light-text"
              onClick={() =>
                setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))
              }
            >
              {mode === "sign-in" ? "Crear cuenta" : "Iniciar sesión"}
            </Button>
          </div>
          <div className="px-6 py-12">
            <div className={mode === "sign-in" ? "block" : "hidden"}>
              <SignInForm onSuccess={handleSuccess} />
            </div>
            <div className={mode === "sign-up" ? "block" : "hidden"}>
              <SignUpForm onSuccess={handleSuccess} />
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-[560px] overflow-hidden lg:grid lg:grid-cols-2">
          <div
            className="px-6 py-16 lg:py-20"
            aria-hidden={mode !== "sign-up"}
            inert={mode !== "sign-up" ? true : undefined}
          >
            <SignUpForm onSuccess={handleSuccess} />
          </div>
          <div
            className="px-6 py-16 lg:py-20"
            aria-hidden={mode !== "sign-in"}
            inert={mode !== "sign-in" ? true : undefined}
          >
            <SignInForm onSuccess={handleSuccess} />
          </div>

          <div
            className={cn(
              "absolute inset-x-0 top-0 z-10 flex min-h-[220px] flex-col items-center justify-center overflow-hidden bg-surface-panel-dark px-8 text-center text-text-primary-on-dark transition-transform duration-[600ms] ease-[cubic-bezier(0.65,0,0.35,1)] lg:inset-y-0 lg:left-0 lg:right-auto lg:h-full lg:w-1/2",
              mode === "sign-up"
                ? "lg:translate-x-full lg:translate-y-0"
                : "lg:translate-x-0",
            )}
          >
            <span className="absolute -left-10 -top-10 size-28 rounded-full border border-border-on-dark" />
            <span className="absolute -bottom-12 -right-12 size-32 rounded-full border border-border-on-dark" />
            <h2 className="text-2xl font-medium">
              {mode === "sign-in" ? "¿Eres nuevo?" : "¿Ya tienes cuenta?"}
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-6 text-text-secondary-on-dark">
              {mode === "sign-in"
                ? "Crea una cuenta mock para continuar tu experiencia."
                : "Vuelve al acceso de clientes existentes."}
            </p>
            <Button
              variant="primary-on-dark"
              className="mt-6 active:bg-btn-primary-on-light-bg active:text-btn-primary-on-light-text"
              onClick={() =>
                setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))
              }
            >
              {mode === "sign-in" ? "Crear cuenta" : "Iniciar sesión"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
