"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Globe,
  MapPin,
  ExternalLink,
  MessageCircle,
  Mail,
  Check,
  X,
  Pencil,
  Trash2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ContactInfoEditorProps {
  lead: {
    id: string;
    address: string | null;
    phone: string | null;
    phoneVerified: boolean;
    whatsappNumber: string | null;
    whatsappSource: string | null;
    email: string | null;
    website: string | null;
    socialUrl: string | null;
    googleMapsUrl: string | null;
    notes: string | null;
  };
}

export function ContactInfoEditor({ lead }: ContactInfoEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  // WhatsApp editing
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [whatsappValue, setWhatsappValue] = useState(lead.whatsappNumber || lead.phone || "");

  // Email editing
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState(lead.email || "");

  // Phone editing
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState(lead.phone || "");

  async function updateLead(data: Record<string, unknown>, field: string) {
    setSaving(field);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      toast.success("Salvato");
      router.refresh();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(null);
    }
  }

  // Confirm WhatsApp number as verified
  async function confirmWhatsapp() {
    const num = whatsappValue.replace(/\D/g, "");
    if (!num) return;
    await updateLead(
      { whatsappNumber: num, whatsappSource: "manual", phoneVerified: true },
      "whatsapp"
    );
    setEditingWhatsapp(false);
  }

  // Mark as "no WhatsApp"
  async function removeWhatsapp() {
    await updateLead(
      { whatsappNumber: null, whatsappSource: "none" },
      "whatsapp-remove"
    );
    setEditingWhatsapp(false);
  }

  // Save email
  async function saveEmail() {
    await updateLead({ email: emailValue || null }, "email");
    setEditingEmail(false);
  }

  // Save phone
  async function savePhone() {
    await updateLead(
      { phone: phoneValue || null, phoneVerified: !!phoneValue },
      "phone"
    );
    setEditingPhone(false);
  }

  const isSaving = (field: string) => saving === field;

  return (
    <div className="space-y-4">
      {/* Indirizzo */}
      {lead.address && (
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-sm">Indirizzo</p>
            <p className="text-sm text-muted-foreground">{lead.address}</p>
          </div>
        </div>
      )}

      {/* Telefono - editabile */}
      <div className="flex items-start gap-3">
        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">Telefono</p>
            {lead.phoneVerified && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 text-green-500 border-green-500/30">
                <ShieldCheck className="h-3 w-3 mr-0.5" />
                verificato
              </Badge>
            )}
          </div>

          {editingPhone ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                placeholder="Numero di telefono..."
                className="h-8 text-sm max-w-[220px]"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-green-500 hover:text-green-400"
                onClick={savePhone}
                disabled={isSaving("phone")}
              >
                {isSaving("phone") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground"
                onClick={() => { setEditingPhone(false); setPhoneValue(lead.phone || ""); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {lead.phone ? (
                <a href={`tel:${lead.phone}`} className="text-sm text-blue-400 hover:underline">
                  {lead.phone}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground italic">Nessun numero</span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setEditingPhone(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp - editabile con verifica */}
      <div className="flex items-start gap-3">
        <MessageCircle className="h-5 w-5 text-green-500 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">WhatsApp</p>
            {lead.whatsappSource === "website" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 text-green-500 border-green-500/30">
                dal sito
              </Badge>
            )}
            {lead.whatsappSource === "google_maps" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 text-yellow-500 border-yellow-500/30">
                da Google Maps
              </Badge>
            )}
            {lead.whatsappSource === "manual" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 text-green-500 border-green-500/30">
                <ShieldCheck className="h-3 w-3 mr-0.5" />
                confermato
              </Badge>
            )}
            {lead.whatsappSource === "none" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 text-red-400 border-red-400/30">
                non disponibile
              </Badge>
            )}
            {!lead.whatsappSource && !lead.whatsappNumber && lead.phone && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 text-gray-400 border-gray-500/30">
                da verificare
              </Badge>
            )}
          </div>

          {lead.whatsappSource === "none" ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground italic">WhatsApp non disponibile</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setWhatsappValue(lead.phone || "");
                  setEditingWhatsapp(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          ) : editingWhatsapp ? (
            <div className="space-y-2 mt-1">
              <div className="flex items-center gap-2">
                <Input
                  value={whatsappValue}
                  onChange={(e) => setWhatsappValue(e.target.value)}
                  placeholder="Numero WhatsApp..."
                  className="h-8 text-sm max-w-[220px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                  onClick={confirmWhatsapp}
                  disabled={isSaving("whatsapp")}
                >
                  {isSaving("whatsapp") ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Conferma numero
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={removeWhatsapp}
                  disabled={isSaving("whatsapp-remove")}
                >
                  {isSaving("whatsapp-remove") ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3 w-3 mr-1" />
                  )}
                  Non ha WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setEditingWhatsapp(false);
                    setWhatsappValue(lead.whatsappNumber || lead.phone || "");
                  }}
                >
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {(lead.whatsappNumber || lead.phone) ? (
                <a
                  href={`https://wa.me/${(lead.whatsappNumber || lead.phone)?.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-400 hover:underline flex items-center gap-1"
                >
                  +{(lead.whatsappNumber || lead.phone)?.replace(/\D/g, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-sm text-muted-foreground italic">Nessun numero</span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setWhatsappValue(lead.whatsappNumber || lead.phone || "");
                  setEditingWhatsapp(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Email - editabile */}
      <div className="flex items-start gap-3">
        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-sm">Email</p>

          {editingEmail ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="email@esempio.it"
                className="h-8 text-sm max-w-[260px]"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-green-500 hover:text-green-400"
                onClick={saveEmail}
                disabled={isSaving("email")}
              >
                {isSaving("email") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground"
                onClick={() => { setEditingEmail(false); setEmailValue(lead.email || ""); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="text-sm text-blue-400 hover:underline">
                  {lead.email}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground italic">Nessuna email</span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setEditingEmail(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sito Web */}
      {lead.website && (
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-sm">Sito Web</p>
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline flex items-center gap-1"
            >
              {lead.website}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Profilo Social */}
      {lead.socialUrl && (
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-sm">Profilo Social</p>
            <a
              href={lead.socialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline flex items-center gap-1"
            >
              {lead.socialUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Google Maps */}
      {lead.googleMapsUrl && (
        <div className="flex items-start gap-3">
          <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-sm">Google Maps</p>
            <a
              href={lead.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline flex items-center gap-1"
            >
              Apri su Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Note */}
      {lead.notes && (
        <>
          <Separator />
          <div>
            <p className="font-medium text-sm mb-2">Note</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {lead.notes}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
