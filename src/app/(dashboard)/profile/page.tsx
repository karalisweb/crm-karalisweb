"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Lock, Shield, Settings, Loader2, Mail, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  twoFactorEnabled: boolean;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpAction, setOtpAction] = useState<"enable" | "disable">("enable");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || "");
        setTwoFactorEnabled(data.twoFactorEnabled || false);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        toast.success("Profilo aggiornato con successo");
        // Aggiorna la sessione
        await updateSession({ name });
      } else {
        const error = await res.json();
        toast.error(error.message || "Errore nel salvataggio");
      }
    } catch (error) {
      toast.error("Errore nel salvataggio del profilo");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Le password non coincidono");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("La password deve essere di almeno 8 caratteri");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        toast.success("Password modificata con successo");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await res.json();
        toast.error(error.message || "Errore nel cambio password");
      }
    } catch (error) {
      toast.error("Errore nel cambio password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function toggle2FA(enable: boolean) {
    setOtpAction(enable ? "enable" : "disable");
    setOtpSending(true);

    try {
      // Richiedi OTP
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile?.email,
          type: "TWO_FACTOR",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Codice di verifica inviato alla tua email");
        setShowOtpDialog(true);
      } else {
        toast.error(data.message || "Errore nell'invio del codice");
        // Ripristina lo stato dello switch
        setTwoFactorEnabled(!enable);
      }
    } catch (error) {
      toast.error("Errore nell'invio del codice");
      setTwoFactorEnabled(!enable);
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyOtpAndToggle2FA() {
    if (otpCode.length !== 6) {
      toast.error("Inserisci il codice completo");
      return;
    }

    setOtpVerifying(true);
    try {
      // Verifica OTP
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile?.email,
          code: otpCode,
          type: "TWO_FACTOR",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        toast.error(verifyData.message || "Codice non valido");
        return;
      }

      // Aggiorna impostazione 2FA
      const updateRes = await fetch("/api/profile/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: otpAction === "enable",
        }),
      });

      if (updateRes.ok) {
        const updatedProfile = await updateRes.json();
        setProfile(updatedProfile);
        setTwoFactorEnabled(updatedProfile.twoFactorEnabled);
        toast.success(
          otpAction === "enable"
            ? "Autenticazione a due fattori attivata"
            : "Autenticazione a due fattori disattivata"
        );
        setShowOtpDialog(false);
        setOtpCode("");
      } else {
        const error = await updateRes.json();
        toast.error(error.message || "Errore nell'aggiornamento");
        setTwoFactorEnabled(!twoFactorEnabled);
      }
    } catch (error) {
      toast.error("Errore nella verifica");
      setTwoFactorEnabled(!twoFactorEnabled);
    } finally {
      setOtpVerifying(false);
    }
  }

  function handleOtpDialogClose() {
    setShowOtpDialog(false);
    setOtpCode("");
    // Ripristina lo stato precedente
    setTwoFactorEnabled(profile?.twoFactorEnabled || false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold">Impostazioni</h1>
          <p className="text-muted-foreground">Gestisci il tuo profilo e le preferenze</p>
        </div>
      </div>

      {/* Profile Card Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-card border-2 border-border flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{profile?.name || "Nome non impostato"}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
              <Badge className="mt-1 bg-primary/20 text-primary border-primary/30">
                {profile?.role === "ADMIN" ? "Amministratore" : "Commerciale"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profilo
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <Lock className="h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Sicurezza
          </TabsTrigger>
        </TabsList>

        {/* TAB PROFILO */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modifica profilo</CardTitle>
              <CardDescription>Aggiorna le informazioni del tuo account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Il tuo nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  L&apos;email non può essere modificata
                </p>
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salva modifiche
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PASSWORD */}
        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cambia password</CardTitle>
              <CardDescription>
                Aggiorna la password del tuo account. Usa una password sicura di almeno 8 caratteri.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password attuale</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma nuova password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button
                onClick={changePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cambia password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB SICUREZZA */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Autenticazione a due fattori (2FA)</CardTitle>
              <CardDescription>
                Aggiungi un livello extra di sicurezza al tuo account. Quando attiva, ti verrà richiesto un codice via email ad ogni accesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${twoFactorEnabled ? 'bg-green-500/20' : 'bg-muted'}`}>
                    <Mail className={`h-5 w-5 ${twoFactorEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">Verifica via Email</p>
                    <p className="text-sm text-muted-foreground">
                      Ricevi un codice a 6 cifre via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={(checked) => {
                    setTwoFactorEnabled(checked);
                    toggle2FA(checked);
                  }}
                  disabled={otpSending}
                />
              </div>

              {twoFactorEnabled ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-500">
                    L&apos;autenticazione a due fattori è attiva
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-yellow-500">
                    L&apos;autenticazione a due fattori non è attiva
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessioni attive</CardTitle>
              <CardDescription>
                Gestisci le sessioni attive del tuo account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Sessione corrente</p>
                  <p className="text-sm text-muted-foreground">
                    Questo dispositivo
                  </p>
                </div>
                <Badge variant="outline" className="text-green-500 border-green-500/30">
                  Attiva
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={handleOtpDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verifica la tua identità</DialogTitle>
            <DialogDescription>
              Abbiamo inviato un codice di verifica a <strong>{profile?.email}</strong>.
              Inserisci il codice per {otpAction === "enable" ? "attivare" : "disattivare"} l&apos;autenticazione a due fattori.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
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
            <p className="text-xs text-muted-foreground">
              Il codice scade tra 10 minuti
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleOtpDialogClose}>
              Annulla
            </Button>
            <Button onClick={verifyOtpAndToggle2FA} disabled={otpVerifying || otpCode.length !== 6}>
              {otpVerifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verifica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
