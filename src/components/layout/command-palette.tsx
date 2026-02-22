"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Search,
  FolderSearch,
  ClipboardCheck,
  UserCheck,
  Video,
  Send,
  Repeat,
  MessageCircle,
  Calendar,
  FileText,
  Trophy,
  Archive,
  Settings,
  User,
  BookOpen,
  Flame,
  Plus,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, group: "Navigazione" },
  { href: "/search", label: "Nuova Ricerca", icon: Search, group: "Navigazione" },
  { href: "/searches", label: "Ricerche", icon: FolderSearch, group: "Navigazione" },
  { href: "/da-qualificare", label: "Da Qualificare", icon: ClipboardCheck, group: "Navigazione" },
  { href: "/qualificati", label: "Qualificati", icon: UserCheck, group: "Navigazione" },
  { href: "/video-da-fare", label: "Video da Fare", icon: Video, group: "Navigazione" },
  { href: "/video-inviati", label: "Video Inviati", icon: Send, group: "Navigazione" },
  { href: "/follow-up", label: "Follow-up", icon: Repeat, group: "Navigazione" },
  { href: "/risposto", label: "Ha Risposto", icon: MessageCircle, group: "Navigazione" },
  { href: "/appuntamenti", label: "Call Fissate", icon: Calendar, group: "Navigazione" },
  { href: "/proposte", label: "Proposte", icon: FileText, group: "Navigazione" },
  { href: "/clienti", label: "Clienti", icon: Trophy, group: "Navigazione" },
  { href: "/archivio", label: "Archivio", icon: Archive, group: "Navigazione" },
  { href: "/settings", label: "Impostazioni", icon: Settings, group: "Navigazione" },
  { href: "/profile", label: "Profilo", icon: User, group: "Navigazione" },
  { href: "/guida", label: "Guida", icon: BookOpen, group: "Navigazione" },
];

interface LeadResult {
  id: string;
  name: string;
  category: string | null;
  opportunityScore: number | null;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search leads with debounce
  useEffect(() => {
    if (!search || search.length < 2) {
      setLeads([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/leads?search=${encodeURIComponent(search)}&pageSize=8`
        );
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setSearch("");
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-[540px] px-4">
        <Command
          className="rounded-xl border border-[#2a2a35] bg-[#132032] shadow-2xl overflow-hidden"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-[#2a2a35] px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Cerca lead, pagine, azioni..."
              className="flex-1 bg-transparent px-3 py-3.5 text-sm text-[#f5f5f7] outline-none placeholder:text-[#71717a]"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#2a2a35] bg-[#1a2d44] px-1.5 text-[10px] text-[#71717a]">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-[#71717a]">
              {loading ? "Cercando..." : "Nessun risultato."}
            </Command.Empty>

            {/* Lead search results */}
            {leads.length > 0 && (
              <Command.Group
                heading="Lead"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.7rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#71717a]"
              >
                {leads.map((lead) => (
                  <Command.Item
                    key={lead.id}
                    value={`lead-${lead.name}`}
                    onSelect={() => navigate(`/leads/${lead.id}`)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a1a1aa] cursor-pointer data-[selected=true]:bg-[rgba(212,167,38,0.1)] data-[selected=true]:text-[#d4a726]"
                  >
                    {lead.opportunityScore && lead.opportunityScore >= 80 ? (
                      <Flame className="h-4 w-4 text-red-500 shrink-0" />
                    ) : (
                      <User className="h-4 w-4 shrink-0 opacity-70" />
                    )}
                    <span className="flex-1 truncate">{lead.name}</span>
                    {lead.category && (
                      <span className="text-xs text-[#71717a] truncate max-w-[120px]">
                        {lead.category}
                      </span>
                    )}
                    {lead.opportunityScore && (
                      <span
                        className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${
                          lead.opportunityScore >= 80
                            ? "bg-red-500/20 text-red-400"
                            : lead.opportunityScore >= 60
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {lead.opportunityScore}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Navigation */}
            <Command.Group
              heading="Navigazione"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.7rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#71717a]"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => navigate(item.href)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a1a1aa] cursor-pointer data-[selected=true]:bg-[rgba(212,167,38,0.1)] data-[selected=true]:text-[#d4a726]"
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" />
                    <span>{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group
              heading="Azioni Rapide"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.7rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#71717a]"
            >
              <Command.Item
                value="Nuova Ricerca Google Maps"
                onSelect={() => navigate("/search")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a1a1aa] cursor-pointer data-[selected=true]:bg-[rgba(212,167,38,0.1)] data-[selected=true]:text-[#d4a726]"
              >
                <Plus className="h-4 w-4 shrink-0 opacity-70" />
                <span>Nuova Ricerca Google Maps</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#2a2a35] px-4 py-2">
            <span className="text-[10px] text-[#71717a]">
              Naviga con le frecce, Invio per selezionare
            </span>
            <div className="flex items-center gap-2">
              <kbd className="inline-flex h-5 items-center rounded border border-[#2a2a35] bg-[#1a2d44] px-1.5 text-[10px] text-[#71717a]">
                &uarr;&darr;
              </kbd>
              <kbd className="inline-flex h-5 items-center rounded border border-[#2a2a35] bg-[#1a2d44] px-1.5 text-[10px] text-[#71717a]">
                &crarr;
              </kbd>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
