"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2, ArrowLeft, Mail, Target } from "lucide-react";

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
        otpVerified: "true", // Flag per indicare che 2FA è stato completato
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
        setError(""); // Clear any previous errors
        // Mostra un messaggio temporaneo (si potrebbe usare toast ma per semplicità)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          {/* Logo - Design System Standard */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-[1.75rem] font-semibold text-center bg-gradient-to-r from-[#d4a726] to-[#2d7d9a] bg-clip-text text-transparent">
              KW Sales CRM
            </CardTitle>
            <CardDescription className="text-center text-[0.9rem]">
              Pipeline commerciale
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@agenzia.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <p className={`text-sm text-center ${error.includes("inviato") ? "text-green-500" : "text-red-500"}`}>
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Accesso in corso..." : "Accedi"}
              </Button>
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Password dimenticata?
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Verifica la tua identità</h3>
                <p className="text-sm text-muted-foreground">
                  Abbiamo inviato un codice di verifica a<br />
                  <strong>{email}</strong>
                </p>
              </div>

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
                <p className={`text-sm text-center ${error.includes("inviato") ? "text-green-500" : "text-red-500"}`}>
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Verifica in corso..." : "Verifica"}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Torna indietro
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                >
                  Rinvia codice
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
