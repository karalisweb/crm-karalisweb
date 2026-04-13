const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// Colors
const PRIMARY = "1A365D";    // Dark blue
const ACCENT = "E8735A";     // Karalisweb orange
const LIGHT_BG = "F0F4F8";   // Light gray-blue
const HEADER_BG = "1A365D";  // Dark blue for table headers

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text, font: "Arial", size: 20, bold: opts.bold || false, color: opts.color || "333333" })],
    })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 22, ...opts })],
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: PRIMARY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: PRIMARY },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [
    // ============ COVER PAGE ============
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "KW Sales CRM", font: "Arial", size: 56, bold: true, color: PRIMARY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Workflow Operativo", font: "Arial", size: 36, color: ACCENT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 1 } },
          children: [new TextRun({ text: "Guida per il team commerciale", font: "Arial", size: 24, color: "666666", italics: true })],
        }),
        spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Karalisweb", font: "Arial", size: 28, bold: true, color: PRIMARY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `Versione 1.0 \u2014 Aprile 2026`, font: "Arial", size: 20, color: "999999" })],
        }),
        new PageBreak(),
      ],
    },

    // ============ CONTENT ============
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
            children: [
              new TextRun({ text: "KW Sales CRM \u2014 Workflow Operativo", font: "Arial", size: 16, color: "999999" }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
            children: [
              new TextRun({ text: "Karalisweb \u2014 Pagina ", font: "Arial", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" }),
            ],
          })],
        }),
      },
      children: [
        // === 1. PANORAMICA ===
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Panoramica del flusso")] }),
        bodyText("Il CRM gestisce il ciclo di vita del lead dalla ricerca alla conversione in cliente. Ogni lead passa attraverso stati chiari e sequenziali. Il sistema invia email e WhatsApp automaticamente (o manualmente, a scelta) seguendo il copy approvato dal team."),
        bodyText("Il flusso principale \u00E8:"),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
          children: [new TextRun({
            text: "Scouting \u2192 Fare Video \u2192 Video Inviato \u2192 Follow-up 1 \u2192 Follow-up 2 \u2192 LinkedIn + Telefono \u2192 Call Fissata \u2192 In Trattativa \u2192 Cliente",
            font: "Arial", size: 20, bold: true, color: PRIMARY,
          })],
        }),
        spacer(),

        // === 2. STATI DEL LEAD ===
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Gli stati del lead (pipeline)")] }),
        bodyText("Ogni lead si trova sempre in uno e un solo stato. Lo stato indica con chiarezza cosa \u00E8 successo e cosa deve succedere dopo."),
        spacer(),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2200, 4026, 2800],
          rows: [
            new TableRow({ children: [headerCell("Stato", 2200), headerCell("Significato", 4026), headerCell("Chi agisce", 2800)] }),
            new TableRow({ children: [cell("DA ANALIZZARE", 2200, { bold: true }), cell("Appena importato da Google Maps", 4026), cell("Sistema (audit automatico)", 2800)] }),
            new TableRow({ children: [cell("HOT / WARM / COLD", 2200, { bold: true, shading: "FFF8E1" }), cell("Qualificato in base allo score dell\u2019audit", 4026, { shading: "FFF8E1" }), cell("Alessio (sceglie chi lavorare)", 2800, { shading: "FFF8E1" })] }),
            new TableRow({ children: [cell("FARE VIDEO", 2200, { bold: true }), cell("Video da registrare per questo lead", 4026), cell("Alessio", 2800)] }),
            new TableRow({ children: [cell("VIDEO INVIATO", 2200, { bold: true, shading: "E3F2FD" }), cell("Primo contatto fatto (email + WhatsApp)", 4026, { shading: "E3F2FD" }), cell("Sistema (attende 3 giorni)", 2800, { shading: "E3F2FD" })] }),
            new TableRow({ children: [cell("FOLLOW-UP 1", 2200, { bold: true }), cell("Secondo messaggio inviato (casi studio)", 4026), cell("Sistema (attende 3 giorni)", 2800)] }),
            new TableRow({ children: [cell("FOLLOW-UP 2", 2200, { bold: true, shading: "E3F2FD" }), cell("Terzo messaggio inviato + task LinkedIn e telefono", 4026, { shading: "E3F2FD" }), cell("Alessio/Francesca", 2800, { shading: "E3F2FD" })] }),
            new TableRow({ children: [cell("CALL FISSATA", 2200, { bold: true }), cell("Appuntamento preso via Google Calendar", 4026), cell("Alessio (fa la call)", 2800)] }),
            new TableRow({ children: [cell("IN TRATTATIVA", 2200, { bold: true, shading: "E8F5E9" }), cell("Offerta inviata al prospect", 4026, { shading: "E8F5E9" }), cell("Alessio (attende risposta)", 2800, { shading: "E8F5E9" })] }),
            new TableRow({ children: [cell("CLIENTE", 2200, { bold: true, color: "2E7D32" }), cell("Ha pagato acconto \u2014 Chiuso vinto!", 4026), cell("Completato", 2800)] }),
            new TableRow({ children: [cell("PERSO", 2200, { bold: true, color: "C62828" }), cell("Non interessato (con motivo specificato)", 4026), cell("Fine", 2800)] }),
            new TableRow({ children: [cell("ARCHIVIATO", 2200, { bold: true, shading: "F5F5F5" }), cell("Da ricontattare dopo X mesi (automatico)", 4026, { shading: "F5F5F5" }), cell("Sistema (riporta in pipeline)", 2800, { shading: "F5F5F5" })] }),
            new TableRow({ children: [cell("NON TARGET", 2200, { bold: true, shading: "F5F5F5" }), cell("Non in target per l\u2019agenzia", 4026, { shading: "F5F5F5" }), cell("Escluso", 2800, { shading: "F5F5F5" })] }),
          ],
        }),
        spacer(),

        // === 3. WORKFLOW EMAIL/WA ===
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Il workflow email/WhatsApp (3 step)")] }),
        bodyText("Il workflow invia 3 messaggi in sequenza, con 3 giorni di attesa tra uno e l\u2019altro. Ogni step ha una versione email e una versione WhatsApp."),
        spacer(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Step 1 \u2014 Primo contatto (giorno 0)")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Alessio finisce il video, lo carica su YouTube, crea la landing page", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Dal CRM apre il lead \u2192 tab Messaggi \u2192 seleziona \u201CStep 1 \u2014 Primo contatto\u201D", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Il messaggio \u00E8 gi\u00E0 pre-compilato con il copy approvato, personalizzato con nome azienda, settore e link video", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Clicca \u201CInvia Email\u201D \u2192 parte l\u2019email via SMTP", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Clicca \u201CApri WhatsApp\u201D \u2192 si apre WA con messaggio pre-compilato", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 200 }, children: [new TextRun({ text: "Il lead passa automaticamente a VIDEO INVIATO", font: "Arial", size: 22, bold: true })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Step 2 \u2014 Casi studio (giorno 3)")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "3 giorni dopo il primo contatto", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Email/WA con dati sul mercato locale e social proof", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Se MANUALE: il sistema crea un task per revisione prima dell\u2019invio", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Se AUTO: l\u2019email parte automaticamente alle 9:00", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 200 }, children: [new TextRun({ text: "Il lead passa a FOLLOW-UP 1", font: "Arial", size: 22, bold: true })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Step 3 \u2014 Chiusura ciclo (giorno 6)")] }),
        bodyText("Il sistema sceglie automaticamente la variante giusta in base al comportamento del prospect:"),
        new Paragraph({
          spacing: { before: 100, after: 100 },
          shading: { fill: "E8F5E9", type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "Variante A \u2014 Se ha VISTO il video: ", font: "Arial", size: 22, bold: true, color: "2E7D32" }),
            new TextRun({ text: "messaggio di urgenza da Francesca, chiusura ciclo tra 5 giorni", font: "Arial", size: 22 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          shading: { fill: "FFF3E0", type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "Variante B \u2014 Se NON ha visto il video: ", font: "Arial", size: 22, bold: true, color: "E65100" }),
            new TextRun({ text: "caso studio concreto da Francesca con dati di un cliente simile", font: "Arial", size: 22 }),
          ],
        }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 200 }, children: [new TextRun({ text: "Il lead passa a FOLLOW-UP 2", font: "Arial", size: 22, bold: true })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Dopo il workflow email")] }),
        bodyText("Quando il lead arriva in FOLLOW-UP 2, il sistema crea automaticamente due task:"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "\uD83D\uDD17 \u201CCerca su LinkedIn \u2014 [nome azienda]\u201D", font: "Arial", size: 22, bold: true })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 200 }, children: [new TextRun({ text: "\uD83D\uDCDE \u201CChiama \u2014 [nome azienda]\u201D", font: "Arial", size: 22, bold: true })] }),
        spacer(),

        // === 4. PLACEHOLDER ===
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. I placeholder nelle email")] }),
        bodyText("Ogni template usa dei placeholder che vengono sostituiti automaticamente con i dati reali del lead:"),
        spacer(),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2400, 3326, 3300],
          rows: [
            new TableRow({ children: [headerCell("Placeholder", 2400), headerCell("Cosa diventa", 3326), headerCell("Esempio", 3300)] }),
            new TableRow({ children: [cell("{nome}", 2400, { bold: true }), cell("Nome di battesimo", 3326), cell("Marco", 3300)] }),
            new TableRow({ children: [cell("{azienda}", 2400, { bold: true, shading: LIGHT_BG }), cell("Nome completo azienda", 3326, { shading: LIGHT_BG }), cell("Cameroni Infissi", 3300, { shading: LIGHT_BG })] }),
            new TableRow({ children: [cell("{settore}", 2400, { bold: true }), cell("Settore di mercato", 3326), cell("Infissi e Serramenti", 3300)] }),
            new TableRow({ children: [cell("{landingUrl}", 2400, { bold: true, shading: LIGHT_BG }), cell("Link alla video analisi", 3326, { shading: LIGHT_BG }), cell("https://landing.karalisweb.net/...", 3300, { shading: LIGHT_BG })] }),
            new TableRow({ children: [cell("{linkPrenotazione}", 2400, { bold: true }), cell("Link prenotazione consulenza", 3326), cell("https://calendar.app.google/...", 3300)] }),
            new TableRow({ children: [cell("{firma}", 2400, { bold: true, shading: LIGHT_BG }), cell("Firma email (Alessio o Francesca)", 3326, { shading: LIGHT_BG }), cell("Alessio Loi - Karalisweb", 3300, { shading: LIGHT_BG })] }),
            new TableRow({ children: [cell("{casiStudio}", 2400, { bold: true }), cell("Blocco casi studio", 3326), cell("(configurabile nelle impostazioni)", 3300)] }),
          ],
        }),
        spacer(),

        // === 5. AUTO vs MANUALE ===
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. Modalit\u00E0 Auto vs Manuale")] }),
        bodyText("Ogni step del workflow pu\u00F2 essere impostato in due modalit\u00E0:"),
        new Paragraph({
          spacing: { before: 100, after: 100 },
          shading: { fill: "E3F2FD", type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "MANUALE (default): ", font: "Arial", size: 22, bold: true }),
            new TextRun({ text: "il sistema crea un task di promemoria. Tu rivedi il messaggio, puoi modificarlo, e poi clicchi \u201CInvia\u201D.", font: "Arial", size: 22 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          shading: { fill: "E8F5E9", type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "AUTO: ", font: "Arial", size: 22, bold: true }),
            new TextRun({ text: "l\u2019email parte automaticamente alle 9:00 del mattino senza intervento umano. Il WhatsApp non pu\u00F2 essere automatico \u2014 viene creato un task con il link wa.me pronto.", font: "Arial", size: 22 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          shading: { fill: "FFF8E1", type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "Consiglio: ", font: "Arial", size: 22, bold: true, italics: true }),
            new TextRun({ text: "iniziare tutto in MANUALE, validare che il copy funzioni bene, poi switchare ad AUTO step per step.", font: "Arial", size: 22, italics: true }),
          ],
        }),

        // === 6. USCITE ===
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Punti di uscita dalla pipeline")] }),
        bodyText("Da qualsiasi stato, un lead pu\u00F2 uscire dalla pipeline:"),
        new Paragraph({
          spacing: { before: 100, after: 100 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "PERSO: ", font: "Arial", size: 22, bold: true, color: "C62828" }),
            new TextRun({ text: "il prospect ha detto esplicitamente no. Va specificato il motivo.", font: "Arial", size: 22 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "ARCHIVIATO: ", font: "Arial", size: 22, bold: true, color: "616161" }),
            new TextRun({ text: "nessuna risposta dopo tutti i tentativi. Se si imposta una data di ricontatto, il sistema lo riporta in pipeline automaticamente dopo X mesi.", font: "Arial", size: 22 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "NON TARGET: ", font: "Arial", size: 22, bold: true, color: "616161" }),
            new TextRun({ text: "l\u2019azienda non \u00E8 in target per i servizi dell\u2019agenzia.", font: "Arial", size: 22 }),
          ],
        }),

        // === 7. CONFIGURAZIONE ===
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Dove configurare tutto")] }),
        bodyText("Tutto si gestisce da Impostazioni \u2192 tab \u201CWorkflow\u201D:"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Switch globale on/off per il workflow automatico", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Modifica il testo di ogni email e WhatsApp", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Toggle auto/manuale per ogni singolo step", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Link prenotazione Google Calendar", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Firme email (Alessio e Francesca)", font: "Arial", size: 22 })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Blocco casi studio riutilizzabile con il placeholder {casiStudio}", font: "Arial", size: 22 })] }),
        spacer(),
        new Paragraph({
          spacing: { before: 200 },
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 8 } },
          children: [new TextRun({ text: "Karalisweb \u2014 Agenzia di Web Marketing", font: "Arial", size: 18, color: "999999", italics: true })],
        }),
      ],
    },
  ],
});

const OUTPUT = "/Users/alessio/Desktop/Sviluppo App Claude Code/CRM /sales-app/docs/workflow-operativo-francesca.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("Documento creato: " + OUTPUT);
});
