/**
 * Il calendario di Alessio → gli incontri BNI.
 *
 * Alessio incolla una volta il "link segreto in formato iCal" del suo Google Calendar. Ogni mezz'ora
 * il CRM lo legge: chi ha prenotato un 121 (col link delle disponibilità, "Un caffè con Alessio…",
 * o un evento che parla di 121) e risulta membro BNI diventa "incontro fissato"; quando la data è
 * passata l'incontro diventa "fatto". Un evento annullato toglie l'incontro dal calendario.
 */
import { db } from "@/lib/db";
import { safeFetch } from "@/lib/safe-fetch";
import { chiudiRichiesteSuperate } from "@/lib/agents/bni";
import { norm } from "@/lib/agents/bni-regole";

export interface EventoIcs {
  uid: string;
  inizio: Date;
  titolo: string;
  descrizione: string;
  luogo: string;
  annullato: boolean;
  online: boolean;
  partecipanti: { nome: string | null; email: string | null }[];
}

// ─── Lettura del formato iCal (solo quello che serve) ───────────────────────

function testoIcs(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

/** Ora locale di Roma → istante UTC (gestisce ora legale e solare). */
export function romaAUtc(anno: number, mese: number, giorno: number, ore: number, minuti: number): Date {
  const ipotesi = Date.UTC(anno, mese - 1, giorno, ore, minuti);
  const scartoDi = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
        .formatToParts(new Date(t))
        .map((x) => [x.type, x.value])
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - t;
  };
  const primo = ipotesi - scartoDi(ipotesi);
  return new Date(ipotesi - scartoDi(primo));
}

function dataIcs(param: string, valore: string): Date | null {
  const m = valore.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m || !m[4]) return null; // eventi di un giorno intero: non sono incontri
  const [, a, me, g, h, mi, , z] = m;
  if (z) return new Date(Date.UTC(+a, +me - 1, +g, +h, +mi));
  // Con TZID o senza: il calendario di Alessio è in ora di Roma.
  void param;
  return romaAUtc(+a, +me, +g, +h, +mi);
}

export function leggiIcs(ics: string): EventoIcs[] {
  const righe = ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const eventi: EventoIcs[] = [];
  let e: Partial<EventoIcs> & { partecipanti: EventoIcs["partecipanti"] } | null = null;
  let ricorrente = false;
  for (const riga of righe) {
    if (riga === "BEGIN:VEVENT") {
      e = { partecipanti: [], titolo: "", descrizione: "", luogo: "", annullato: false, online: false };
      ricorrente = false;
      continue;
    }
    if (riga === "END:VEVENT") {
      if (e?.uid && e.inizio && !ricorrente) eventi.push(e as EventoIcs);
      e = null;
      continue;
    }
    if (!e) continue;
    const i = riga.indexOf(":");
    if (i < 0) continue;
    const testa = riga.slice(0, i);
    const valore = riga.slice(i + 1);
    const [nome, ...parametri] = testa.split(";");
    switch (nome) {
      case "UID": e.uid = valore; break;
      case "SUMMARY": e.titolo = testoIcs(valore); break;
      case "DESCRIPTION": e.descrizione = testoIcs(valore); break;
      case "LOCATION": e.luogo = testoIcs(valore); break;
      case "STATUS": e.annullato = valore.toUpperCase() === "CANCELLED"; break;
      case "RRULE": ricorrente = true; break;
      case "X-GOOGLE-CONFERENCE": e.online = true; break;
      case "DTSTART": e.inizio = dataIcs(parametri.join(";"), valore) ?? undefined; break;
      case "ATTENDEE": {
        const cn = parametri.find((p) => p.startsWith("CN="))?.slice(3).replace(/^"|"$/g, "") ?? null;
        const email = valore.toLowerCase().startsWith("mailto:") ? valore.slice(7).toLowerCase() : null;
        e.partecipanti.push({ nome: cn && !cn.includes("@") ? cn : null, email });
        break;
      }
    }
  }
  return eventi;
}

// ─── Quali eventi sono 121 e con chi ────────────────────────────────────────

/** Un 121: prenotato col link delle disponibilità o un evento che parla di 121. */
export function eUn121(ev: EventoIcs): boolean {
  return /un caff[eè] con alessio/i.test(ev.titolo) || /\b121\b|one ?to ?one/i.test(`${ev.titolo}\n${ev.descrizione}`);
}

/** I nomi possibili di chi ha prenotato: tra parentesi nel titolo, "Prenotato da", i partecipanti. */
export function nomiCandidati(ev: EventoIcs): string[] {
  const nomi = new Set<string>();
  const tra = ev.titolo.match(/\(([^)]+)\)\s*$/);
  if (tra) nomi.add(tra[1].trim());
  const pren = ev.descrizione.replace(/<[^>]+>/g, "\n").match(/Prenotato da\s*\n+\s*([^\n]+)/i);
  if (pren) nomi.add(pren[1].trim());
  for (const p of ev.partecipanti) if (p.nome) nomi.add(p.nome);
  // Un evento creato a mano col solo nome nel titolo ("Isabel Hosfer").
  if (!/caff|121|bni/i.test(ev.titolo) && ev.titolo.trim().split(/\s+/).length <= 4) nomi.add(ev.titolo.trim());
  return [...nomi].filter((n) => n.length >= 5);
}

interface MembroPerAbbinamento {
  id: string;
  name: string;
  email: string | null;
}

/** Il membro BNI di questo evento: per email, oppure per nome e cognome (uno solo). */
export function abbinaMembro(ev: EventoIcs, membri: MembroPerAbbinamento[]): MembroPerAbbinamento | null {
  const email = ev.partecipanti.map((p) => p.email).filter(Boolean) as string[];
  const perEmail = membri.find((m) => m.email && email.includes(m.email.toLowerCase()));
  if (perEmail) return perEmail;
  for (const nome of nomiCandidati(ev)) {
    const parole = norm(nome).split(/[^a-z]+/).filter((p) => p.length >= 2);
    if (parole.length < 2) continue;
    const trovati = membri.filter((m) => {
      const pm = norm(m.name).split(/[^a-z]+/).filter((p) => p.length >= 2);
      return parole.every((p) => pm.includes(p)) || (pm.length >= 2 && pm.every((p) => parole.includes(p)));
    });
    if (trovati.length === 1) return trovati[0];
  }
  return null;
}

// ─── La sincronizzazione ───────────────────────────────────────────────────

export interface EsitoCalendario {
  collegato: boolean;
  eventi121: number;
  fissati: number;
  fatti: number;
  annullati: number;
  nonAbbinati: string[];
  errore?: string;
}

const GIORNI_INDIETRO = 14;
const GIORNI_AVANTI = 60;

export async function sincronizzaIncontri(oggi = new Date()): Promise<EsitoCalendario> {
  const impostazioni = await db.settings.findUnique({ where: { id: "default" }, select: { calendarIcsUrl: true } });
  const url = impostazioni?.calendarIcsUrl;
  const esito: EsitoCalendario = { collegato: !!url, eventi121: 0, fissati: 0, fatti: 0, annullati: 0, nonAbbinati: [] };
  if (!url) return esito;

  let ics: string;
  try {
    const res = await safeFetch(url);
    if (!res.ok) throw new Error(`il calendario risponde ${res.status}`);
    ics = await res.text();
    if (!ics.includes("BEGIN:VCALENDAR")) throw new Error("il link non è un calendario iCal");
  } catch (err) {
    esito.errore = err instanceof Error ? err.message : String(err);
    await db.settings.update({ where: { id: "default" }, data: { calendarSyncedAt: oggi, calendarSyncError: esito.errore } });
    return esito;
  }

  const da = oggi.getTime() - GIORNI_INDIETRO * 86400_000;
  const a = oggi.getTime() + GIORNI_AVANTI * 86400_000;
  // Gli eventi del periodo che sono 121, più quelli creati a mano col solo nome di un membro nel titolo.
  const titoloCorto = (e: EventoIcs) => !/caff|121|bni/i.test(e.titolo) && e.titolo.trim().split(/\s+/).length <= 4;
  const eventi = leggiIcs(ics).filter((e) => e.inizio.getTime() >= da && e.inizio.getTime() <= a && (eUn121(e) || titoloCorto(e)));
  const membri = await db.bniMembro.findMany({
    where: { status: "ATTIVO" },
    select: { id: true, name: true, email: true, next121At: true, conosciutoAt: true, oneToOneCount: true, lastOneToOneAt: true },
  });

  for (const ev of eventi) {
    const m = abbinaMembro(ev, membri);
    if (!m) {
      const n = nomiCandidati(ev)[0];
      if (eUn121(ev) && n && !ev.annullato) esito.nonAbbinati.push(n);
      continue;
    }
    esito.eventi121++;
    const membro = membri.find((x) => x.id === m.id)!;
    const stessoMomento = membro.next121At && Math.abs(membro.next121At.getTime() - ev.inizio.getTime()) < 60_000;

    if (ev.annullato) {
      if (stessoMomento) {
        await db.bniMembro.update({ where: { id: m.id }, data: { next121At: null } });
        esito.annullati++;
      }
      continue;
    }

    if (ev.inizio.getTime() > oggi.getTime()) {
      // In calendario: incontro fissato.
      if (!stessoMomento) {
        await db.bniMembro.update({ where: { id: m.id }, data: { next121At: ev.inizio, bniStage: "RICHIESTA_121" } });
        membro.next121At = ev.inizio;
      }
      await chiudiRichiesteSuperate(m.id, "Superata: il 121 è nel calendario", oggi);
      esito.fissati++;
      continue;
    }

    // Passato: l'incontro è fatto (una volta sola per giorno).
    const giorno = new Date(Date.UTC(ev.inizio.getUTCFullYear(), ev.inizio.getUTCMonth(), ev.inizio.getUTCDate()));
    const gia = await db.oneToOne.findFirst({
      where: { membroId: m.id, date: { gte: new Date(giorno.getTime() - 12 * 3600_000), lt: new Date(giorno.getTime() + 36 * 3600_000) } },
      select: { id: true },
    });
    if (gia) continue;
    await db.oneToOne.create({
      data: {
        membroId: m.id,
        date: ev.inizio,
        formato: ev.online || /meet|zoom|teams|online/i.test(ev.luogo) ? "ONLINE" : "PRESENZA",
        location: ev.luogo || null,
        notes: "Dal calendario",
        createdBy: "calendario",
      },
    });
    await db.bniMembro.update({
      where: { id: m.id },
      data: {
        conosciutoAt: membro.conosciutoAt ?? ev.inizio,
        oneToOneCount: { increment: 1 },
        lastOneToOneAt: !membro.lastOneToOneAt || membro.lastOneToOneAt < ev.inizio ? ev.inizio : membro.lastOneToOneAt,
        ...(stessoMomento ? { next121At: null } : {}),
        bniStage: "FATTO_121",
      },
    });
    await chiudiRichiesteSuperate(m.id, "Superata: il 121 è stato fatto", oggi);
    esito.fatti++;
  }

  esito.nonAbbinati = [...new Set(esito.nonAbbinati)].slice(0, 20);
  await db.settings.update({
    where: { id: "default" },
    data: { calendarSyncedAt: oggi, calendarSyncError: null, calendarSyncInfo: `${esito.fissati} fissati, ${esito.fatti} fatti, ${esito.annullati} annullati` },
  });
  return esito;
}
