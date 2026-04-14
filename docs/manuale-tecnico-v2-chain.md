# Manuale Tecnico — Catena 2 Prompt (v3.7.0)

## Architettura

La catena 2-prompt sostituisce il flusso singolo di `gemini-analysis.ts` con due funzioni separate, ciascuna con il proprio prompt, schema di risposta e gate di validazione.

```
Lead (FARE_VIDEO)
   |
   v
[run-analyst] ─── Scrapa HTML ─── extractStrategicData() ─── Gemini (Prompt 1) ─── analystOutput (Json)
   |
   ⛔ approve-analyst (manuale)
   |
   v
[run-scriptwriter] ─── Legge analystOutput ─── Gemini (Prompt 2) ─── geminiAnalysis (Json)
   |
   ⛔ approve-script (manuale)
   |
   v
[create-landing] ─── WordPress REST API ─── videoLandingUrl
   |
   v
[send-email / WA] ─── Messaggio con landing URL
```

---

## File Principali

### Backend

| File | Responsabilita |
|------|----------------|
| `src/lib/prompts-v2.ts` | Prompt default, placeholder definitions, `replacePlaceholders()` |
| `src/lib/gemini-analyst.ts` | `runAnalystPrompt(leadId, notes?)` — scrape + Gemini Prompt 1 |
| `src/lib/gemini-scriptwriter.ts` | `runScriptwriterPrompt(leadId, notes?)` — Gemini Prompt 2 |
| `src/lib/gemini-analysis.ts` | Legacy — ancora usato per lead gia processati |

### API Routes

| Route | Metodo | Gate | Scopo |
|-------|--------|------|-------|
| `/api/leads/[id]/run-analyst` | POST | Nessuno | Esegue Prompt 1 (scrape + analisi) |
| `/api/leads/[id]/approve-analyst` | POST | `analystOutput` esiste | Approva/modifica output Prompt 1 |
| `/api/leads/[id]/run-scriptwriter` | POST | `analystApprovedAt` | Esegue Prompt 2 |
| `/api/leads/[id]/approve-script` | POST | `geminiAnalysis` esiste | Approva/modifica script |
| `/api/leads/[id]/create-landing` | POST | `scriptApprovedAt` | Crea landing WordPress |

### Frontend

| File | Responsabilita |
|------|----------------|
| `src/components/leads/video-outreach-stepper.tsx` | Stepper a 5 step (componente principale, ~700 righe) |
| `src/components/leads/video-outreach-stepper-wrapper.tsx` | Wrapper client-side con fetch + refresh |
| `src/components/settings/prompt-editor.tsx` | Editor prompt riusabile con pill cliccabili |
| `src/components/settings/ai-config-tab.tsx` | Tab AI con 2 nuovi editor (Analista + Sceneggiatore) |

---

## Schema Database

### Campi Lead (nuovi)

```prisma
// 2-PROMPT CHAIN
analystOutput         Json?       @map("analyst_output")
analystApprovedAt     DateTime?   @map("analyst_approved_at")
analystApprovedBy     String?     @map("analyst_approved_by")
scriptApprovedAt      DateTime?   @map("script_approved_at")
scriptApprovedBy      String?     @map("script_approved_by")
puntoDoloreBreve      String?     @map("punto_dolore_breve") @db.Text
puntoDoloreLungo      String?     @map("punto_dolore_lungo") @db.Text
```

### Campi Settings (nuovi)

```prisma
analystPrompt         String?     @map("analyst_prompt") @db.Text
scriptwriterPrompt    String?     @map("scriptwriter_prompt") @db.Text
```

---

## Struttura Output Prompt 1 (analystOutput)

```typescript
interface AnalystOutput {
  pain_points: Array<{
    area: string;        // es. "Brand Positioning", "SEO", "Content"
    finding: string;     // Cosa ha trovato di problematico
    evidence: string;    // Citazione ESATTA dal sito
    severity: "high" | "medium" | "low";
  }>;
  primary_pattern: string;    // "Lista della Spesa" | "Sindrome dell'Ego" | "Target Fantasma" | "NESSUNO"
  cliche_found: string;       // Frase esatta o "NESSUNA_CLICHE_TROVATA"
  brand_positioning_score: number;  // 1-10
  communication_weakness: string;   // Sintesi debolezza principale
  punto_dolore_breve: string;       // 1-2 frasi per WhatsApp
  punto_dolore_lungo: string;       // Paragrafo per landing page
  // Metadata
  generatedAt: string;
  model: string;
  home_text_length: number;
  about_text_length: number;
  services_text_length: number;
  cliche_status: string;
  tracking_tools: string[];
}
```

## Struttura Output Prompt 2 (salvato in geminiAnalysis)

```typescript
interface ScriptwriterOutput {
  teleprompter_script: {
    atto_1: string;   // Ghiaccio e Metafora
    atto_2: string;   // La Scena del Crimine
    atto_3: string;   // I Soldi
    atto_4: string;   // La Soluzione
  };
  strategic_note: string;
  generatedAt: string;
  model: string;
  analysisVersion: string;  // "v2-scriptwriter"
}
```

---

## Placeholder Disponibili

### Prompt 1 "Analista"

| Placeholder | Sorgente |
|-------------|----------|
| `{{company_name}}` | `lead.name` |
| `{{home_text}}` | Estratto da homepage via `extractStrategicData()` |
| `{{about_text}}` | Estratto da pagina Chi Siamo |
| `{{services_text}}` | Estratto da pagina Servizi |
| `{{cliche_status}}` | "PASS" o "FAIL" dal cliche detector deterministico |
| `{{tracking_tools}}` | Lista tool trovati: GA4, GTM, Pixel, ecc. |

### Prompt 2 "Sceneggiatore"

| Placeholder | Sorgente |
|-------------|----------|
| `{{company_name}}` | `lead.name` |
| `{{analyst_output}}` | JSON completo dell'output approvato del Prompt 1 |
| `{{punto_dolore_breve}}` | Da `lead.puntoDoloreBreve` o da analystOutput |
| `{{ads_status}}` | CONFIRMED / NOT_FOUND / PENDING (da verifica manuale ads) |
| `{{cliche_found}}` | Da `analystOutput.cliche_found` |
| `{{primary_error_pattern}}` | Da `analystOutput.primary_pattern` |

---

## Logica Gate

```
Step 1 -> sempre attivo (se il lead ha un sito)
Step 2 -> attivo solo se analystApprovedAt != null
Step 3 -> attivo solo se scriptApprovedAt != null
Step 4 -> attivo solo se videoYoutubeUrl != null
Step 5 -> attivo solo se videoLandingUrl != null
```

Il reset funziona a cascata:
- Rigenerare Step 1 resetta: `analystApprovedAt`, `scriptApprovedAt`
- Rigenerare Step 2 resetta: `scriptApprovedAt`
- I dati downstream (landing, video sent) NON vengono resettati

---

## Backward Compatibility

- Il campo `geminiAnalysis` e riusato dal Prompt 2 (stesso formato base con `teleprompter_script`)
- Il campo `landingPuntoDolore` esistente viene usato come fallback se `puntoDoloreLungo` e vuoto
- I lead senza `analystOutput` continuano a mostrare la vecchia analisi nel tab "Analisi Strategica"
- Il prompt legacy v3.1 (`strategicAnalysisPrompt`) resta configurabile

---

## Cron Endpoints

| Endpoint | Frequenza | Scopo |
|----------|-----------|-------|
| `POST /api/cron/workflow-engine` | Ogni 15 min | Esegue step automatici del workflow (email/WA) |
| `POST /api/cron/batch-gemini-analysis` | Ogni ora | Batch analisi Gemini sui lead da analizzare |
| `POST /api/cron/check-recontact` | Ogni giorno 8:00 | Riporta lead archiviati in pipeline |
| `POST /api/cron/check-video-followup` | Ogni 30 min | Trigger follow-up post-video |
| `POST /api/cron/recover-stuck-jobs` | Ogni ora | Resetta job RUNNING bloccati >30min |
| `POST /api/cron/scheduled-searches` | Notturno | Esegue ricerche Apify programmate |
| `POST /api/cron/sync-calendar` | Ogni 15 min | Sincronizza appuntamenti Google Calendar → CRM |

Tutti protetti da `Authorization: Bearer $CRON_SECRET`.

### Sync Google Calendar (v3.11.0)

Sincronizza automaticamente gli appuntamenti prenotati dai prospect tramite Google Calendar appointment scheduling.

**Come funziona:**
1. Legge gli eventi delle ultime 24h dal calendario primario
2. Filtra solo eventi con attendees esterni (prenotati da fuori)
3. Cerca match nel DB per email, nome o telefono dell'attendee
4. Se trova un lead → lo sposta a `CALL_FISSATA` con `appointmentAt`
5. Crea Activity con `type=MEETING` e riferimento eventId per evitare duplicati

**Env vars necessarie:**
- `GOOGLE_CLIENT_ID` — OAuth2 client ID
- `GOOGLE_CLIENT_SECRET` — OAuth2 client secret
- `GOOGLE_REFRESH_TOKEN` — Refresh token con scope `calendar.readonly`

**File:** `src/lib/google-calendar.ts`, `src/app/api/cron/sync-calendar/route.ts`

---

## Action Quick-Log (v3.11.0)

`POST /api/leads/{id}/quick-log` supporta anche:

| Action | Effetto |
|--------|---------|
| `RESPONSE_RECEIVED` | Setta `respondedAt` e `respondedVia` (whatsapp/email/telefono), crea Activity `RESPONSE_RECEIVED` |

Parametri: `{ action: "RESPONSE_RECEIVED", respondedVia: "whatsapp" }`

---

## Come Testare

1. **Step 1**: `curl -X POST http://localhost:3000/api/leads/{id}/run-analyst`
2. **Approvazione**: `curl -X POST http://localhost:3000/api/leads/{id}/approve-analyst -H "Content-Type: application/json" -d '{"action":"approve"}'`
3. **Step 2**: `curl -X POST http://localhost:3000/api/leads/{id}/run-scriptwriter`
4. **Approvazione**: `curl -X POST http://localhost:3000/api/leads/{id}/approve-script -H "Content-Type: application/json" -d '{"action":"approve"}'`
5. **Landing**: `curl -X POST http://localhost:3000/api/leads/{id}/create-landing`

Per testare con note di rigenerazione:
```bash
curl -X POST http://localhost:3000/api/leads/{id}/run-analyst \
  -H "Content-Type: application/json" \
  -d '{"notes":"concentrati sul blog fermo da 2 anni"}'
```

Per modificare e approvare:
```bash
curl -X POST http://localhost:3000/api/leads/{id}/approve-analyst \
  -H "Content-Type: application/json" \
  -d '{"action":"edit","analystOutput":{"punto_dolore_breve":"Testo modificato","punto_dolore_lungo":"Testo lungo modificato","pain_points":[],"primary_pattern":"NESSUNO","cliche_found":"NESSUNA_CLICHE_TROVATA","brand_positioning_score":5,"communication_weakness":"Test"}}'
```
