"use client";

import { useState, useEffect } from "react";
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
import { Users, Key, Settings, Plus, Trash2, Eye, EyeOff, Check, X, Search } from "lucide-react";
import { SearchConfigTab } from "@/components/settings/search-config-tab";

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
  inngestEventKey: string;
  inngestSigningKey: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    apifyToken: "",
    apifyWebhookSecret: "",
    inngestEventKey: "",
    inngestSigningKey: "",
  });
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "USER" });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchApiConfig();
  }, []);

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
        toast.success("Connessione Apify OK");
      } else {
        toast.error(data.message || "Connessione Apify fallita");
      }
    } catch (error) {
      toast.error("Errore nel test connessione");
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
                          <SelectItem value="USER">Utente</SelectItem>
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
                          {user.role}
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

          {/* Inngest */}
          <Card>
            <CardHeader>
              <CardTitle>Inngest</CardTitle>
              <CardDescription>
                Configurazione per job in background (audit).{" "}
                <a
                  href="https://app.inngest.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Ottieni chiavi
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inngestEventKey">Event Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="inngestEventKey"
                    type={showTokens.inngestEventKey ? "text" : "password"}
                    value={apiConfig.inngestEventKey}
                    onChange={(e) => setApiConfig({ ...apiConfig, inngestEventKey: e.target.value })}
                    placeholder="your-event-key"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("inngestEventKey")}
                  >
                    {showTokens.inngestEventKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inngestSigningKey">Signing Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="inngestSigningKey"
                    type={showTokens.inngestSigningKey ? "text" : "password"}
                    value={apiConfig.inngestSigningKey}
                    onChange={(e) => setApiConfig({ ...apiConfig, inngestSigningKey: e.target.value })}
                    placeholder="your-signing-key"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowToken("inngestSigningKey")}
                  >
                    {showTokens.inngestSigningKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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
          <SearchConfigTab />
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
                  <p className="text-sm text-muted-foreground">Inngest</p>
                  <div className="flex items-center gap-2 mt-1">
                    {apiConfig.inngestEventKey ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Configurato</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Non configurato (usa audit locale)</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Versione App</p>
                  <span className="font-medium">0.1.0</span>
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
