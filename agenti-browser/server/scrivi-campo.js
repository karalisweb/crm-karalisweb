// Scrive nel Chrome del server quello che arriva da stdin, quando dalla vista la tastiera non passa bene
// (i simboli della tastiera italiana arrivano storpiati). Niente viene stampato né salvato.
//   node scrivi-campo.js codice   → stdin: il codice; lo scrive nel campo attivo (o nel primo visibile) e preme Invio
//   node scrivi-campo.js accesso  → stdin: email\npassword; li mette nei campi di accesso (LinkedIn, Instagram,
//                                   Facebook) e preme Invio
// Uso dal Mac: ./scripts/agente-server-scrivi.sh  e  ./scripts/agente-server-accesso.sh
const { chromium } = require("/usr/lib/node_modules/@playwright/mcp/node_modules/playwright-core");

const CAMPO_UTENTE = 'input[name="session_key"], #username, input[name="username"], input[name="email"], #email, input[type="email"]';
const CAMPO_PASSWORD = 'input[type="password"]';

(async () => {
  const modo = process.argv[2] === "accesso" ? "accesso" : "codice";
  let dati = "";
  for await (const pezzo of process.stdin) dati += pezzo;
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const pagine = browser.contexts().flatMap((c) => c.pages()).filter((p) => !p.url().startsWith("chrome"));
  const pagina = pagine[pagine.length - 1];
  if (!pagina) { console.log("Nessuna pagina aperta nel Chrome del server."); process.exit(1); }

  if (modo === "accesso") {
    const [utente, password] = dati.split("\n");
    if (!utente || !password) { console.log("Servono email e password."); process.exit(1); }
    await pagina.locator(CAMPO_UTENTE).locator("visible=true").first().fill(utente.trim());
    await pagina.locator(CAMPO_PASSWORD).locator("visible=true").first().fill(password);
    await pagina.locator(CAMPO_PASSWORD).locator("visible=true").first().press("Enter");
  } else {
    const testo = dati.trim();
    if (!testo) { console.log("Niente da scrivere."); process.exit(1); }
    const attivo = await pagina.evaluate(() => {
      const e = document.activeElement;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA");
    });
    if (!attivo) await pagina.locator("input:visible:not([type=hidden]):not([type=checkbox])").first().click();
    await pagina.keyboard.type(testo, { delay: 80 });
    await pagina.keyboard.press("Enter");
  }
  await pagina.waitForTimeout(5000);
  console.log("Fatto. Ora la pagina è: " + (await pagina.title()));
  await browser.close().catch(() => {});
  process.exit(0);
})().catch((e) => { console.log("Errore: " + e.message.split("\n")[0]); process.exit(1); });
