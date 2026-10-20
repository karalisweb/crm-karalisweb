# Motore 121: criticità (v3.52.0, 20 ottobre 2026)

Per ogni punto: cosa può andare storto, cosa ho già fatto e, se serve, cosa devi decidere tu.

## Da decidere

**1. Il drip email a freddo: SPENTO il 2026-10-20 (deciso da Alessio).**
La riga del crontab che lo lanciava è commentata (backup in `/root/crontab-backup-*-pre-stop-optin.txt`).
Il codice resta, ma nessun invio parte. In più, le aziende trovate dalla ricerca e quelle BNI sono escluse
anche dal codice.

**2. Il limite di LinkedIn è mensile e non lo conosciamo.**
LinkedIn gratuito ha un limite di ricerche al mese che non pubblica. Ieri l'avviso è comparso dopo una decina di ricerche. Se lo superiamo, l'incrocio e "chi decide" si fermano fino al mese dopo.
- *Fatto:* al massimo 25 letture al giorno fra tutti gli agenti. I lavori BNI passano per primi. Dopo un CAPTCHA o una verifica tutto si ferma 48 ore e il cruscotto lo segnala.
- *Da decidere:* se il blocco arriva, valutiamo LinkedIn Premium. Sales Navigator (circa 90 €/mese) da solo sfora il tetto di 100 €.

## Da sapere

**3. I lavori su LinkedIn li fa il tuo Mac.**
Servono il Mac acceso, Chrome aperto con l'estensione Claude collegata e l'attività programmata attiva. Ieri all'inizio l'estensione non era collegata.

**4. 210 membri non hanno ancora il profilo LinkedIn nel CRM.**
Con 8 profili al giorno ci vogliono circa 5 settimane. Senza collegamento non si vede la rete del membro, quindi per quei membri l'incrocio aspetta.

**5. Molti membri non hanno il sito nella scheda.**
Lo studio dell'azienda prima del 121 prova a trovarlo da solo. Se non lo trova, la pagina del 121 resta senza la parte "la sua azienda vista da fuori".

**6. La parte AI è provata solo in produzione.**
Sul Mac non c'è la chiave dell'AI. La logica l'ho provata sulla copia dei dati veri. I testi scritti dall'AI (contatti da segnalare, ponti confermati dal vocale) partiranno la prima volta con il prossimo 121.

**7. Meta non dice chi conosci.**
Il collegamento si controlla solo su LinkedIn. Vedere quali tuoi amici seguono una pagina Facebook non è affidabile e Facebook blocca facilmente.

**8. Le newsletter le scrive Orchestra.**
Il CRM segna solo chi hai invitato. Non c'è un collegamento automatico con Orchestra.

**9. I siti sbagliati.**
La prova di ieri ha trovato 2 siti sbagliati: Piscine in Sardegna, che è di un'azienda lombarda, e iBlue, il sito del marchio nazionale. Le ho messe da parte. L'agente "trova sito" va migliorato in un prossimo lavoro.

**10. Restano fuori dal motore.**
- Gli ex clienti, che sono l'altra strada che porta soldi.
- Le referenze, che stanno nell'app BNI: il CRM non vede quali portano clienti.
- Sconti e condizioni: li gestisci tu, come deciso.

## Cosa ho fatto in produzione

- Backup del database prima di tutto: `/root/crm-db-backups/pre-v3.52.0-20261020-0540.sql.gz`.
- Migrazione aggiuntiva: provata due volte sulla copia, poi applicata.
- Orari sul server:
  - 07:00 il turno del mattino;
  - 14:00 nei feriali le richieste di 121;
  - venerdì alle 17:00 il cruscotto per mail.
  Il backup degli orari vecchi è in `/root/crontab-backup-*-pre-v3.52.txt`.
- La prova LinkedIn di ieri è registrata nel CRM: 7 aziende collegate e 7 senza collegamento. Fra le collegate, il socio di Accadueo ha in comune Giorgio Fodde (BNI): la presentazione è già pronta nella sua scheda.
