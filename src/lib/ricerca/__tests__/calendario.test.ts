import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { leggiIcs, eUn121, abbinaMembro, nomiCandidati, romaAUtc } from "../calendario";

const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART:20261019T150000Z",
  "UID:a1@google.com",
  "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=bullita",
  " .mauro@gmail.com;X-NUM-GUESTS=0:mailto:bullita.mauro@gmail.com",
  "DESCRIPTION:<b>Prenotato da</b>\\nMauro Bullita\\nbullita.mauro@gmail.com\\n<br><b>M",
  " otivo dell'appuntamento</b>\\n121 BNI",
  "SUMMARY:☕️ Un caffè con Alessio Loi - Metodo SD™  (Mauro Bullita)",
  "X-GOOGLE-CONFERENCE:https://meet.google.com/cib-wger-msz",
  "STATUS:CONFIRMED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Rome:20261019T153000",
  "UID:a2@google.com",
  "SUMMARY:Isabel Hosfer",
  "LOCATION:T Hotel\\, Via dei Giudicati 66",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Rome:20261021T181500",
  "RRULE:FREQ=WEEKLY",
  "UID:a3@google.com",
  "SUMMARY:BNI Atlantide",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261022",
  "UID:a4@google.com",
  "SUMMARY:Ferie",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("Calendario iCal", () => {
  const ev = leggiIcs(ICS);

  it("legge eventi, righe spezzate, fusi orari; salta ricorrenti e giornate intere", () => {
    expect(ev.map((e) => e.uid)).toEqual(["a1@google.com", "a2@google.com"]);
    expect(ev[0].inizio.toISOString()).toBe("2026-10-19T15:00:00.000Z");
    expect(ev[1].inizio.toISOString()).toBe("2026-10-19T13:30:00.000Z"); // 15:30 a Roma, ora legale
    expect(ev[0].online).toBe(true);
    expect(ev[1].luogo).toBe("T Hotel, Via dei Giudicati 66");
    expect(ev[0].partecipanti[0].email).toBe("bullita.mauro@gmail.com");
  });

  it("riconosce i 121 e chi ha prenotato", () => {
    expect(eUn121(ev[0])).toBe(true);
    expect(eUn121(ev[1])).toBe(false);
    expect(nomiCandidati(ev[0])).toContain("Mauro Bullita");
    const membri = [
      { id: "1", name: "Mauro Bullita", email: null },
      { id: "2", name: "Isabel Hosfer", email: null },
      { id: "3", name: "Mauro Rossi", email: null },
    ];
    expect(abbinaMembro(ev[0], membri)?.id).toBe("1");
    expect(abbinaMembro(ev[1], membri)?.id).toBe("2");
  });

  it("ora di Roma in inverno", () => {
    expect(romaAUtc(2026, 12, 7, 10, 0).toISOString()).toBe("2026-12-07T09:00:00.000Z");
  });
});
