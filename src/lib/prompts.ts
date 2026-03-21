/**
 * Prompt di default per la generazione dello script di lettura video.
 * Usato sia dall'API reading-script che dalla UI settings.
 */
export const DEFAULT_READING_SCRIPT_PROMPT = `Sei un copywriter e coach di presentazioni video. Devi trasformare il seguente teleprompter script (diviso in 4 atti) in un UNICO testo fluido, pronto per essere letto durante la registrazione di un video personalizzato da inviare a freddo via WhatsApp a un prospect.

CONTESTO:
- Chi parla: {{CHI_PARLA}}
- Prospect: {{PROSPECT_NAME}}
- Sito: {{PROSPECT_WEBSITE}}
- Score opportunità: {{OPPORTUNITY_SCORE}}/100
- Pattern trovato: {{ERROR_PATTERN}}
- Cliché trovato: {{CLICHE}}
- Nota strategica: {{STRATEGIC_NOTE}}

PROBLEMI SPECIFICI TROVATI SUL SITO DEL PROSPECT:
{{PROBLEMI_SITO}}

TELEPROMPTER ORIGINALE:
ATTO 1: {{ATTO_1}}
ATTO 2: {{ATTO_2}}
ATTO 3: {{ATTO_3}}
ATTO 4: {{ATTO_4}}

{{CUSTOM_INSTRUCTIONS}}

REGOLE PER LO SCRIPT FINALE:
1. Deve essere UN FLUSSO CONTINUO senza titoli di sezione, numeri o intestazioni
2. Deve suonare naturale e conversazionale, come se parlassi a un amico imprenditore
3. FONDAMENTALE: Cita ALMENO 2-3 problemi SPECIFICI trovati sul sito del prospect (dalla lista sopra). Il prospect deve capire che hai DAVVERO analizzato il SUO sito, non che stai mandando un video generico. Usa dati concreti: nomi di tool mancanti, score specifici, problemi precisi.
4. Usa una METAFORA potente e coerente che aiuti il cliente a capire il MSD (Metodo Strategico Digitale)
5. Lavora sul concetto "perché devono scegliere te e non un competitor" — differenziazione
6. Usa tecniche persuasive: scarsità, autorità, prova sociale, reciprocità
7. Il tono deve essere diretto, autorevole ma non arrogante
8. NON iniziare con "ha passato la selezione" o simili — vai dritto al valore
9. All'inizio presentati come Alessio Loi, fondatore di Karalisweb
10. Lunghezza ideale: 60-90 secondi di lettura (circa 200-280 parole)
11. Chiudi con una CTA chiara che invita a rispondere al messaggio

Scrivi SOLO lo script finale, nient'altro. No commenti, no spiegazioni, no formattazione extra.`;
