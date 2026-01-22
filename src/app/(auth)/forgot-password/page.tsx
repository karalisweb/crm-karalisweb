"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-xl bg-[#0f1419] flex items-center justify-center border border-border">
              <span className="text-primary font-bold text-3xl">K</span>
              <span className="text-primary text-lg mt-1">sc</span>
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {submitted ? "Email Inviata" : "Password Dimenticata"}
            </CardTitle>
            <CardDescription className="text-center">
              {submitted
                ? "Controlla la tua casella di posta"
                : "Inserisci la tua email per reimpostare la password"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Se l&apos;email <strong>{email}</strong> è registrata, riceverai le istruzioni per reimpostare la password.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
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
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Torna al login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Invio in corso..." : "Invia link di reset"}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna al login
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
