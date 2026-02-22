"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle,
  RefreshCw,
  Loader2,
  Calendar,
  MessagesSquare,
  AlertTriangle,
  ChevronRight,
  Phone,
  Mail,
  Linkedin as LinkedinIcon,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  opportunityScore: number | null;
  respondedAt: string | null;
  respondedVia: string | null;
}

function getChannelIcon(channel: string | null) {
  switch (channel) {
    case "email": return <Mail className="h-3.5 w-3.5" />;
    case "telefono": return <Phone className="h-3.5 w-3.5" />;
    case "linkedin": return <LinkedinIcon className="h-3.5 w-3.5" />;
    case "whatsapp": return <MessagesSquare className="h-3.5 w-3.5" />;
    default: return <MessageCircle className="h-3.5 w-3.5" />;
  }
}

function RispostoCard({ lead, onAction }: { lead: Lead; onAction: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("10:00");

  const handleCallScheduled = async () => {
    if (!appointmentDate) {
      setShowDatePicker(true);
      return;
    }
    setLoading("call");
    try {
      const dateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CALL_SCHEDULED",
          appointmentAt: dateTime.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`Call fissata per ${lead.name}!`);
      onAction();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setLoading(null);
    }
  };

  const handleInConversation = async () => {
    setLoading("conversation");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: "IN_CONVERSAZIONE" }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`${lead.name} spostato in Conversazione`);
      onAction();
    } catch {
      toast.error("Errore nello spostamento");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${lead.id}`}>
              <h3 className="font-semibold text-sm truncate hover:underline">{lead.name}</h3>
            </Link>
            <p className="text-xs text-muted-foreground">
              {lead.category}
              {lead.opportunityScore && ` · Score: ${lead.opportunityScore}`}
            </p>
            {lead.respondedAt && (
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1 text-xs text-green-500">
                  {getChannelIcon(lead.respondedVia)}
                  Risposto {lead.respondedVia ? `via ${lead.respondedVia}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(lead.respondedAt).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            )}
          </div>
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
            Risposto
          </Badge>
        </div>

        {/* Date picker per call */}
        {showDatePicker && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Quando fissare la call?
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="flex-1 text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-24 text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button
            onClick={handleCallScheduled}
            disabled={!!loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            {loading === "call" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Fissa Call
          </Button>
          <Button
            onClick={handleInConversation}
            disabled={!!loading}
            variant="outline"
            size="sm"
          >
            {loading === "conversation" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <MessagesSquare className="h-4 w-4 mr-2" />
            )}
            In Conversazione
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/leads/${lead.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RispostoPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads?stage=RISPOSTO&pageSize=50");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setLeads(json.leads || []);
      setTotal(json.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ha Risposto</h1>
          <p className="text-sm text-muted-foreground">
            Lead che hanno risposto ai touchpoint
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{total} lead</Badge>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Aggiorna
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">
            <AlertTriangle className="h-5 w-5 inline mr-2" />
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessuna risposta ancora</h3>
            <p className="text-sm text-muted-foreground">
              I lead che rispondono ai tuoi touchpoint appariranno qui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <RispostoCard key={lead.id} lead={lead} onAction={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
