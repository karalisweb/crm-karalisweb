"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      if (!token || !email) {
        setTokenValid(false);
        setVerifying(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        );
        const data = await res.json();
        setTokenValid(data.valid);
      } catch {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password, confirmPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.message || "Si è verificato un errore");
      }
    } catch {
      setError("Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  };

  const AuthBox = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ background: '#0d1521' }}>
      <div
        className="w-full max-w-[420px] rounded-2xl p-10"
        style={{
          background: '#132032',
          border: '1px solid rgba(212, 167, 38, 0.15)',
          boxShadow: '0 0 40px rgba(212, 167, 38, 0.06), 0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-kw-negativo.png"
            alt="Karalisweb"
            width={180}
            height={60}
            className="max-w-[180px] h-auto"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );

  if (verifying) {
    return (
      <AuthBox>
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#d4a726]" />
          <p className="text-[#a1a1aa]">Verifica del link in corso...</p>
        </div>
      </AuthBox>
    );
  }

  if (!tokenValid && !success) {
    return (
      <AuthBox>
        <div className="flex flex-col items-center gap-4 py-4 mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <XCircle className="h-7 w-7 text-[#ef4444]" />
          </div>
          <h2
            className="text-center text-[1.4rem] font-semibold"
            style={{
              background: 'linear-gradient(135deg, #d4a726, #2d7d9a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Link Non Valido
          </h2>
          <p className="text-sm text-[#a1a1aa] text-center">
            Il link per reimpostare la password non è valido o è scaduto.
          </p>
        </div>
        <div className="space-y-3">
          <Link href="/forgot-password">
            <Button
              className="w-full h-11 text-sm font-semibold text-[#1a1a2e] border-0 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #d4a726, #c4922a, #b87d2e)',
                boxShadow: '0 2px 12px rgba(212, 167, 38, 0.3)',
              }}
            >
              Richiedi un nuovo link
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="w-full text-[#a1a1aa]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al login
            </Button>
          </Link>
        </div>
      </AuthBox>
    );
  }

  if (success) {
    return (
      <AuthBox>
        <div className="flex flex-col items-center gap-4 py-4 mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
            <CheckCircle className="h-7 w-7 text-[#22c55e]" />
          </div>
          <h2
            className="text-center text-[1.4rem] font-semibold"
            style={{
              background: 'linear-gradient(135deg, #d4a726, #2d7d9a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Password Reimpostata
          </h2>
          <p className="text-sm text-[#a1a1aa] text-center">
            La tua password è stata reimpostata con successo.
          </p>
        </div>
        <Button
          className="w-full h-11 text-sm font-semibold text-[#1a1a2e] border-0 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #d4a726, #c4922a, #b87d2e)',
            boxShadow: '0 2px 12px rgba(212, 167, 38, 0.3)',
          }}
          onClick={() => router.push("/login")}
        >
          Accedi con la nuova password
        </Button>
      </AuthBox>
    );
  }

  return (
    <AuthBox>
      <h1
        className="text-center text-[1.6rem] font-semibold mb-1"
        style={{
          background: 'linear-gradient(135deg, #d4a726, #2d7d9a)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Nuova Password
      </h1>
      <p className="text-center text-[0.85rem] text-[#a1a1aa] mb-8">
        Inserisci la tua nuova password
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-[#e4e4e7]">
            Nuova Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={8}
          />
          <p className="text-xs text-[#a1a1aa] mt-1">Minimo 8 caratteri</p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5 text-[#e4e4e7]">
            Conferma Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            minLength={8}
          />
        </div>
        {error && (
          <p className="text-sm text-[#ef4444] text-center">{error}</p>
        )}
        <Button
          type="submit"
          className="w-full h-11 text-sm font-semibold text-[#1a1a2e] border-0 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #d4a726, #c4922a, #b87d2e)',
            boxShadow: '0 2px 12px rgba(212, 167, 38, 0.3)',
          }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            "Reimposta Password"
          )}
        </Button>
        <Link href="/login">
          <Button variant="ghost" className="w-full text-[#a1a1aa]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna al login
          </Button>
        </Link>
      </form>
    </AuthBox>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-8" style={{ background: '#0d1521' }}>
          <div
            className="w-full max-w-[420px] rounded-2xl p-10"
            style={{
              background: '#132032',
              border: '1px solid rgba(212, 167, 38, 0.15)',
              boxShadow: '0 0 40px rgba(212, 167, 38, 0.06), 0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#d4a726]" />
              <p className="text-[#a1a1aa]">Caricamento...</p>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
