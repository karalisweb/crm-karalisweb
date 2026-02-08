"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

type LoginStep = "credentials" | "2fa";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Prima verifica le credenziali e controlla se 2FA è attivo
      const checkRes = await fetch("/api/auth/check-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setError(checkData.message || "Credenziali non valide");
        return;
      }

      if (checkData.requires2FA) {
        // L'utente ha 2FA attivo - invia OTP e mostra form
        const otpRes = await fetch("/api/auth/request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, type: "TWO_FACTOR" }),
        });

        const otpData = await otpRes.json();
        if (otpData.success) {
          setStep("2fa");
        } else {
          setError(otpData.message || "Errore nell'invio del codice");
        }
      } else {
        // Nessun 2FA - procedi con il login normale
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Credenziali non valide");
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch {
      setError("Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError("Inserisci il codice completo");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Verifica OTP
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, type: "TWO_FACTOR" }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setError(verifyData.message || "Codice non valido");
        return;
      }

      // OTP verificato - completa il login
      const result = await signIn("credentials", {
        email,
        password,
        otpVerified: "true",
        redirect: false,
      });

      if (result?.error) {
        setError("Errore durante l'accesso");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "TWO_FACTOR" }),
      });

      const data = await res.json();
      if (data.success) {
        setError("");
        setError("Nuovo codice inviato!");
        setTimeout(() => setError(""), 3000);
      } else {
        setError(data.message || "Errore nell'invio del codice");
      }
    } catch {
      setError("Errore nell'invio del codice");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setOtpCode("");
    setError("");
  };

  const getDescription = () => {
    switch (step) {
      case "credentials":
        return "Pipeline commerciale";
      case "2fa":
        return "Verifica in due passaggi";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ background: '#0d1521' }}>
      {/* Login Box - Ref: DESIGN-SYSTEM.md sezione 6.1 */}
      <div
        className="w-full max-w-[400px] rounded-xl p-12"
        style={{
          background: '#132032',
          border: '1px solid #2a2a35',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Logo negativo Karalisweb (giallo su sfondo scuro) */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-kw-negativo.png"
            alt="Karalisweb"
            width={180}
            height={60}
            className="max-w-[180px] h-auto"
            priority
          />
        </div>

        {/* Titolo app con gradiente oro > teal */}
        <h1
          className="text-center text-[1.75rem] font-semibold mb-1"
          style={{
            background: 'linear-gradient(135deg, #d4a726, #2d7d9a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          KW Sales CRM
        </h1>
        <p className="text-center text-[0.9rem] text-[#a1a1aa] mb-8">
          {getDescription()}
        </p>

        {/* Step: Credentials */}
        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nome@agenzia.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-[#ef4444] text-sm text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-[#a1a1aa] hover:text-[#d4a726] transition-colors"
              >
                Password dimenticata?
              </Link>
            </div>
          </form>
        )}

        {/* Step: 2FA - Verifica OTP email */}
        {step === "2fa" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(212, 167, 38, 0.2)' }}>
                <Mail className="h-6 w-6 text-[#d4a726]" />
              </div>
            </div>
            <p className="text-sm text-[#a1a1aa] text-center mb-4">
              Abbiamo inviato un codice di verifica a<br />
              <strong>{email}</strong>
            </p>

            <div className="flex justify-center py-4">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={loading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <div className={`text-sm text-center ${error.includes("inviato") ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
              {loading ? "Verifica in corso..." : "Verifica"}
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleResendOtp}
                disabled={loading}
              >
                Reinvia codice
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleBackToCredentials}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna al login
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
