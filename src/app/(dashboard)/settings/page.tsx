"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Key, Settings, Plus, Trash2, Eye, EyeOff, Check, X, Search, Loader2, ShieldAlert, Target, Clock, BarChart3, Sparkles, Building2, MapPin, History, Mail } from "lucide-react";
import { SearchConfigTab } from "@/components/settings/search-config-tab";
import { CrmConfigTab } from "@/components/settings/crm-config-tab";
import { ScheduledSearchesTab } from "@/components/settings/scheduled-searches-tab";
import { SearchHistoryTab } from "@/components/settings/search-history-tab";
import { ScoringConfigTab } from "@/components/settings/scoring-config-tab";
import { AiConfigTab } from "@/components/settings/ai-config-tab";
import { EmailMessagingConfigTab } from "@/components/settings/email-messaging-config-tab";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface ApiConfig {
  apifyToken: string;
  apifyWebhookSecret: string;
  cronSecret: string;
  geminiApiKey: string;
  geminiModel: string;
  wpUrl: string;
  wpUser: string;
  wpAppPassword: string;
  youtubeClientId: string;
  youtubeClientSecret: string;
  youtubeRedirectUri: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    apifyToken: "",
    apifyWebhookSecret: "",
    cronSecret: "",
    geminiApiKey: "",
    geminiModel: "",
    wpUrl: "",
    wpUser: "",
    wpAppPassword: "",
    youtubeClientId: "",
    youtubeClientSecret: "",
    youtubeRedirectUri: "",
  });
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "USER" });
  const [dialogOpen, setDialogOpen] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.push("/profile");
      return;
    }
    if (status === "authenticated" && isAdmin) {
      fetchUsers();
      fetchApiConfig();
    }
  }, [status, isAdmin, router]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchApiConfig() {
    try {
      const res = await fetch("/api/settings/api-config");
      if (res.ok) {
        const data = await res.json();
        setApiConfig(data);
      }
    } catch (error) {
      console.error("Error fetching API config:", error);
    }
  }

  async function createUser() {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        toast.success("Utente creato con successo");
        setNewUser({ email: "", name: "", password: "", role: "USER" });
        setDialogOpen(false);
        fetchUsers();
      } else {
        const error = await res.json();
        toast.error(error.message || "Errore nella creazione utente");
      }
    } catch (error) {
      toast.error("Errore nella creazione utente");
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Utente eliminato");
        fetchUsers();
      } else {
        toast.error("Errore nell'eliminazione utente");
      }
    } catch (error) {
      toast.error("Errore nell'eliminazione utente");
    }
  }

  async function saveApiConfig() {
    try {
      const res = await fetch("/api/settings/api-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiConfig),
      });

      if (res.ok) {
        toast.success("Configurazione salvata");
      } else {
        toast.error("Errore nel salvataggio");
      }
    } catch (error) {
      toast.error("Errore nel salvataggio");
    }
  }

  async function testApifyConnection() {
    try {
      const res = await fetch("/api/settings/test-apify");
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Connessione Apify OK");
      } else {
        toast.error(data.message || "Connessione Apify fallita");
      }
    } catch (error) {
      toast.error("Errore nel test connessione");
    }
  }

  async function testGeminiConnection() {
    try {
      toast.info("Test Gemini in corso...");
      const res = await fetch("/api/settings/test-gemini");
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Connessione Gemini OK");
      } else {
        toast.error(data.message || "Connessione Gemini fallita");
      }
    } catch (error) {
      toast.error("Errore nel test connessione Gemini");
    }
  }

  async function testWordPressConnection() {
    try {
      toast.info("Test WordPress in corso...");
      const res = await fetch("/api/settings/test-wordpress");
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Connessione WordPress OK");
      } else {
        toast.error(data.message || "Connessione WordPress fallita");
      }
    } catch {
      toast.error("Errore nel test connessione WordPress");
    }
  }

  async function testYouTubeConnection() {
    try {
      toast.info("Test YouTube in corso...");
      const res = await fetch("/api/settings/test-youtube");
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Connessione YouTube OK");
      } else {
        if (data.needsAuth) {
          toast.error(data.message || "Serve autorizzazione YouTube");
        } else {
          toast.error(data.message || "Connessione YouTube fallita");
        }
      }
    } catch {
      toast.error("Errore nel test connessione YouTube");
    }
  }

  function toggleShowToken(key: string) {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function maskToken(token: string): string {
    if (!token) return "";
    if (token.length <= 8) return "••••••••";
    return token.substring(0, 4) + "••••••••" + token.substring(token.length - 4);
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non-admin users get redirected, but show message just in case
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Accesso Negato</h2>
        <p className="text-muted-foreground">Non hai i permessi per accedere a questa pagina.</p>
        <Button onClick={() => router.push("/profile")}>Vai al Profilo</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Impostazioni</h1>
        <p className="text-muted-foreground">Gestisci utenti, API e configurazioni</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API & Token
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Ricerca
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="crm" className="gap-2">
            <Target className="h-4 w-4" />
            CRM
          </TabsTrigger>
          {/* Programmate ora dentro tab Ricerca */}
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email & Messaggi
          </TabsTrigger>
          <TabsTrigger value="scoring" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            Generale
          </TabsTrigger>
        </TabsList>

        {/* TAB UTENTI */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestione Utenti</CardTitle>
                <CardDescription>Aggiungi, modifica o rimuovi utenti dal sistema</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Utente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crea Nuovo Utente</DialogTitle>
                    <DialogDescription>
                      Inserisci i dati del nuovo utente
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="Mario Rossi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="mario@agenzia.it"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Ruolo</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">Commerciale</SelectItem>
                          <SelectItem value="ADMIN">Amministratore</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={createUser}>Crea Utente</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Caricamento...</p>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground">Nessun utente trovato</p>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.name || "Nome non impostato"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                          {user.role === "ADMIN" ? "Amministratore" : "Commerciale"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB API & TOKEN */}
        <TabsContent value="api" className="space-y-4">
          {/* Apify */}
          <Card>
            <CardHeader>
              <CardTitle>Apify</CardTitle>
              <CardDescription>
                Configurazione per lo scraping Google Maps.{" "}
                <a
                  href="https://console.apify.com/account/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Ottieni token
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apifyToken">API Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="apifyToken"
                    type={showTokens.apifyToken ? "text" : "password"}
                    value={apiConfig.apifyToken}
                    onChange={(e) => setApiConfig({ ...apiConfig, apifyToken: e.target.value })}
                    placeholder="apify_api_xxxxx"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("apifyToken")}
                  >
                    {showTokens.apifyToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apifyWebhookSecret">Webhook Secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="apifyWebhookSecret"
                    type={showTokens.apifyWebhookSecret ? "text" : "password"}
                    value={apiConfig.apifyWebhookSecret}
                    onChange={(e) => setApiConfig({ ...apiConfig, apifyWebhookSecret: e.target.value })}
                    placeholder="your-webhook-secret"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("apifyWebhookSecret")}
                  >
                    {showTokens.apifyWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={testApifyConnection} variant="outline">
                  Test Connessione
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cron Secret */}
          <Card>
            <CardHeader>
              <CardTitle>Cron Jobs</CardTitle>
              <CardDescription>
                Secret per autenticare le chiamate cron dal server VPS.
                Usato negli header Authorization: Bearer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cronSecret">Cron Secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="cronSecret"
                    type={showTokens.cronSecret ? "text" : "password"}
                    value={apiConfig.cronSecret}
                    onChange={(e) => setApiConfig({ ...apiConfig, cronSecret: e.target.value })}
                    placeholder="secret-per-cron-jobs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("cronSecret")}
                  >
                    {showTokens.cronSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Gemini AI */}
          <Card>
            <CardHeader>
              <CardTitle>Google Gemini AI</CardTitle>
              <CardDescription>
                Analisi marketing con AI generativa (coerenza, errori, prompt HeyGen).{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Ottieni API key
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="geminiApiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="geminiApiKey"
                    type={showTokens.geminiApiKey ? "text" : "password"}
                    value={apiConfig.geminiApiKey}
                    onChange={(e) => setApiConfig({ ...apiConfig, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("geminiApiKey")}
                  >
                    {showTokens.geminiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="geminiModel">Modello</Label>
                <Select
                  value={apiConfig.geminiModel || "gemini-2.5-flash"}
                  onValueChange={(value) => setApiConfig({ ...apiConfig, geminiModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona modello" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (raccomandato)</SelectItem>
                    <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (piu veloce)</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (piu potente)</SelectItem>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (legacy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={testGeminiConnection} variant="outline">
                  Test Connessione
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* WordPress Landing Page */}
          <Card>
            <CardHeader>
              <CardTitle>WordPress Landing Page</CardTitle>
              <CardDescription>
                Connessione al sito WordPress per creare landing page video automaticamente.
                Serve una Application Password (WordPress &rarr; Utenti &rarr; Profilo &rarr; Password per le applicazioni).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wpUrl">URL Sito WordPress</Label>
                <Input
                  id="wpUrl"
                  value={apiConfig.wpUrl}
                  onChange={(e) => setApiConfig({ ...apiConfig, wpUrl: e.target.value })}
                  placeholder="https://karalisweb.net"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wpUser">Username WordPress</Label>
                <Input
                  id="wpUser"
                  value={apiConfig.wpUser}
                  onChange={(e) => setApiConfig({ ...apiConfig, wpUser: e.target.value })}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wpAppPassword">Application Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="wpAppPassword"
                    type={showTokens.wpAppPassword ? "text" : "password"}
                    value={apiConfig.wpAppPassword}
                    onChange={(e) => setApiConfig({ ...apiConfig, wpAppPassword: e.target.value })}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("wpAppPassword")}
                  >
                    {showTokens.wpAppPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={testWordPressConnection} variant="outline">
                  Test Connessione
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* YouTube Video Upload */}
          <Card>
            <CardHeader>
              <CardTitle>YouTube Video Upload</CardTitle>
              <CardDescription>
                Connessione a YouTube per caricare i video analisi direttamente dal CRM come &quot;Non in elenco&quot;.
                Serve un progetto Google Cloud con YouTube Data API v3 abilitata e credenziali OAuth 2.0.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtubeClientId">Client ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="youtubeClientId"
                    type={showTokens.youtubeClientId ? "text" : "password"}
                    value={apiConfig.youtubeClientId}
                    onChange={(e) => setApiConfig({ ...apiConfig, youtubeClientId: e.target.value })}
                    placeholder="xxx.apps.googleusercontent.com"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("youtubeClientId")}
                  >
                    {showTokens.youtubeClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtubeClientSecret">Client Secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="youtubeClientSecret"
                    type={showTokens.youtubeClientSecret ? "text" : "password"}
                    value={apiConfig.youtubeClientSecret}
                    onChange={(e) => setApiConfig({ ...apiConfig, youtubeClientSecret: e.target.value })}
                    placeholder="GOCSPx-xxx"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("youtubeClientSecret")}
                  >
                    {showTokens.youtubeClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtubeRedirectUri">Redirect URI</Label>
                <Input
                  id="youtubeRedirectUri"
                  value={apiConfig.youtubeRedirectUri}
                  onChange={(e) => setApiConfig({ ...apiConfig, youtubeRedirectUri: e.target.value })}
                  placeholder="http://localhost:3003/api/youtube/callback"
                />
                <p className="text-xs text-muted-foreground">
                  Deve corrispondere a quello configurato in Google Cloud Console → Credenziali OAuth 2.0
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={testYouTubeConnection} variant="outline">
                  Test Connessione
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("/api/youtube/auth", "_blank")}
                >
                  Autorizza YouTube
                </Button>
              </div>
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground space-y-1">
                <p><strong>Setup:</strong> Google Cloud Console → API &amp; Services → Abilita &quot;YouTube Data API v3&quot;</p>
                <p>Crea credenziali OAuth 2.0 (Web application) → aggiungi il Redirect URI qui sopra</p>
                <p>Aggiungi il tuo account Google come Test User nel Consent Screen</p>
              </div>
            </CardContent>
          </Card>

          {/* Salva tutto */}
          <div className="flex justify-end">
            <Button onClick={saveApiConfig} size="lg">
              Salva Configurazione API
            </Button>
          </div>
        </TabsContent>

        {/* TAB RICERCA */}
        <TabsContent value="search" className="space-y-4">
          <Tabs defaultValue="categorie" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="categorie" className="gap-1.5 text-xs sm:text-sm">
                <Building2 className="h-3.5 w-3.5" />
                Categorie
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-1.5 text-xs sm:text-sm">
                <MapPin className="h-3.5 w-3.5" />
                Location
              </TabsTrigger>
              <TabsTrigger value="programmate" className="gap-1.5 text-xs sm:text-sm">
                <Clock className="h-3.5 w-3.5" />
                Programmate
              </TabsTrigger>
              <TabsTrigger value="storico" className="gap-1.5 text-xs sm:text-sm">
                <History className="h-3.5 w-3.5" />
                Storico
              </TabsTrigger>
            </TabsList>
            <TabsContent value="categorie">
              <SearchConfigTab section="categories" />
            </TabsContent>
            <TabsContent value="location">
              <SearchConfigTab section="locations" />
            </TabsContent>
            <TabsContent value="programmate">
              <ScheduledSearchesTab />
            </TabsContent>
            <TabsContent value="storico">
              <SearchHistoryTab />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* TAB AI */}
        <TabsContent value="ai" className="space-y-4">
          <AiConfigTab />
        </TabsContent>

        {/* TAB CRM */}
        <TabsContent value="crm" className="space-y-4">
          <CrmConfigTab />
        </TabsContent>

        {/* TAB RICERCHE PROGRAMMATE */}
        {/* Programmate ora dentro tab Ricerca */}

        {/* TAB EMAIL & MESSAGGI */}
        <TabsContent value="email" className="space-y-4">
          <EmailMessagingConfigTab />
        </TabsContent>

        {/* TAB SCORING */}
        <TabsContent value="scoring" className="space-y-4">
          <ScoringConfigTab />
        </TabsContent>

        {/* TAB GENERALE */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Sistema</CardTitle>
              <CardDescription>Stato e informazioni del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Database</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-medium">PostgreSQL Connesso</span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Apify</p>
                  <div className="flex items-center gap-2 mt-1">
                    {apiConfig.apifyToken ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Configurato</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Non configurato</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Cron Jobs</p>
                  <div className="flex items-center gap-2 mt-1">
                    {apiConfig.cronSecret ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Configurato</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Non configurato</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Meta Ad Library</p>
                  <div className="flex items-center gap-2 mt-1">
                    {apiConfig.apifyToken ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Via Apify</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Richiede Apify</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Gemini AI</p>
                  <div className="flex items-center gap-2 mt-1">
                    {apiConfig.geminiApiKey ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Configurato</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Non configurato</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Versione App</p>
                  <span className="font-medium">Sales CRM by Karalisweb v3.1.1</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Generali</CardTitle>
              <CardDescription>Configurazioni generali dell&apos;applicazione</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL Webhook Apify</Label>
                <Input
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/api/apify/webhook` : ""}
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Configura questo URL nelle impostazioni del tuo actor Apify
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
