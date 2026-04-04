"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.message || "Si è verificato un errore");
      }
    } catch {
      setError("Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  };

  return (
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

        <h1
          className="text-center text-[1.6rem] font-semibold mb-1"
          style={{
            background: 'linear-gradient(135deg, #d4a726, #2d7d9a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {submitted ? "Email Inviata" : "Password Dimenticata"}
        </h1>
        <p className="text-center text-[0.85rem] text-[#a1a1aa] mb-8">
          {submitted
            ? "Controlla la tua casella di posta"
            : "Inserisci la tua email per reimpostare la password"}
        </p>

        {submitted ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                <CheckCircle className="h-7 w-7 text-[#22c55e]" />
              </div>
              <p className="text-sm text-[#a1a1aa] text-center">
                Se l&apos;email <strong className="text-[#e4e4e7]">{email}</strong> è registrata, riceverai le istruzioni per reimpostare la password.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-[#a1a1aa] text-center">
                Non hai ricevuto l&apos;email?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Riprova con un&apos;altra email
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-[#a1a1aa]">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna al login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-[#e4e4e7]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nome@karalisweb.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
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
                  Invio in corso...
                </>
              ) : (
                "Invia link di reset"
              )}
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full text-[#a1a1aa]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna al login
              </Button>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
