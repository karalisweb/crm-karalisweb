import nodemailer from 'nodemailer';

// Configurazione SMTP da variabili d'ambiente
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

const smtpConfig = {
  host: process.env.SMTP_HOST || 'mail.karalisweb.net',
  port: smtpPort,
  secure: smtpSecure, // true per porta 465 (SSL), false per altre porte (usa STARTTLS)
  auth: {
    user: process.env.SMTP_USER || 'alessio@karalisweb.net',
    pass: process.env.SMTP_PASSWORD || '',
  },
  tls: {
    rejectUnauthorized: false, // Per server self-signed
    ciphers: 'SSLv3',
  },
  connectionTimeout: 10000, // 10 secondi timeout connessione
  greetingTimeout: 10000,
  socketTimeout: 15000,
};

console.log('[EMAIL] Configurazione SMTP:', {
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: smtpConfig.secure,
  user: smtpConfig.auth.user,
});

// Crea il transporter
const transporter = nodemailer.createTransport(smtpConfig);

// Verifica la connessione SMTP
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('[EMAIL] Connessione SMTP verificata');
    return true;
  } catch (error) {
    console.error('[EMAIL] Errore connessione SMTP:', error);
    return false;
  }
}

// Invia email OTP per 2FA
export async function sendOtpEmail(
  to: string,
  code: string,
  userName?: string
): Promise<boolean> {
  const fromEmail = process.env.SMTP_FROM || 'noreply@karalisweb.net';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codice di Verifica - Sales CRM</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1419; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f1419;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #192230; border-radius: 16px; overflow: hidden;">

          <!-- Header con logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <div style="display: inline-block; background-color: #f5a623; color: #0f1419; font-weight: 700; font-size: 18px; padding: 8px 16px; border-radius: 8px; letter-spacing: 1px;">
                Ksc
              </div>
              <h1 style="margin: 16px 0 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Sales CRM
              </h1>
              <p style="margin: 4px 0 0; color: #8899a6; font-size: 14px;">
                by Karalisweb
              </p>
            </td>
          </tr>

          <!-- Contenuto -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 20px; font-weight: 600;">
                Ciao${userName ? ` ${userName}` : ''}!
              </h2>
              <p style="margin: 0 0 24px; color: #8899a6; font-size: 15px; line-height: 1.5;">
                Ecco il tuo codice di verifica per accedere a Sales CRM:
              </p>

              <!-- Codice OTP -->
              <div style="background-color: #0f1419; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #f5a623; font-family: 'Courier New', monospace;">
                  ${code}
                </div>
              </div>

              <p style="margin: 0 0 8px; color: #8899a6; font-size: 14px; line-height: 1.5;">
                <strong style="color: #ffffff;">Nota importante:</strong>
              </p>
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #8899a6; font-size: 14px; line-height: 1.8;">
                <li>Il codice scade tra <strong style="color: #ffffff;">10 minuti</strong></li>
                <li>Non condividere questo codice con nessuno</li>
                <li>Se non hai richiesto questo codice, ignora questa email</li>
              </ul>

              <p style="margin: 0; color: #8899a6; font-size: 13px; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
                Se hai problemi ad accedere, contatta il supporto.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.2); text-align: center;">
              <p style="margin: 0; color: #8899a6; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Karalisweb. Tutti i diritti riservati.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Sales CRM - Codice di Verifica

Ciao${userName ? ` ${userName}` : ''}!

Il tuo codice di verifica è: ${code}

Nota importante:
- Il codice scade tra 10 minuti
- Non condividere questo codice con nessuno
- Se non hai richiesto questo codice, ignora questa email

© ${new Date().getFullYear()} Karalisweb. Tutti i diritti riservati.
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"Sales CRM" <${fromEmail}>`,
      to,
      subject: `${code} - Codice di Verifica Sales CRM`,
      text,
      html,
    });

    console.log(`[EMAIL] OTP inviato a ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Errore invio OTP:', error);
    return false;
  }
}

// Invia email per reset password
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  userName?: string
): Promise<boolean> {
  const fromEmail = process.env.SMTP_FROM || 'noreply@karalisweb.net';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - Sales CRM</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1419; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f1419;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #192230; border-radius: 16px; overflow: hidden;">

          <!-- Header con logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <div style="display: inline-block; background-color: #f5a623; color: #0f1419; font-weight: 700; font-size: 18px; padding: 8px 16px; border-radius: 8px; letter-spacing: 1px;">
                Ksc
              </div>
              <h1 style="margin: 16px 0 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Sales CRM
              </h1>
              <p style="margin: 4px 0 0; color: #8899a6; font-size: 14px;">
                by Karalisweb
              </p>
            </td>
          </tr>

          <!-- Contenuto -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 20px; font-weight: 600;">
                Reset Password
              </h2>
              <p style="margin: 0 0 24px; color: #8899a6; font-size: 15px; line-height: 1.5;">
                Ciao${userName ? ` ${userName}` : ''}! Abbiamo ricevuto una richiesta per reimpostare la password del tuo account.
              </p>

              <!-- Pulsante -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${resetLink}" style="display: inline-block; background-color: #f5a623; color: #0f1419; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                  Reimposta Password
                </a>
              </div>

              <p style="margin: 0 0 16px; color: #8899a6; font-size: 14px; line-height: 1.5;">
                Oppure copia e incolla questo link nel browser:
              </p>
              <div style="background-color: #0f1419; border-radius: 8px; padding: 12px; margin-bottom: 24px; word-break: break-all;">
                <code style="color: #f5a623; font-size: 12px;">${resetLink}</code>
              </div>

              <p style="margin: 0 0 8px; color: #8899a6; font-size: 14px; line-height: 1.5;">
                <strong style="color: #ffffff;">Nota importante:</strong>
              </p>
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #8899a6; font-size: 14px; line-height: 1.8;">
                <li>Il link scade tra <strong style="color: #ffffff;">1 ora</strong></li>
                <li>Se non hai richiesto il reset, ignora questa email</li>
                <li>La tua password attuale resta invariata</li>
              </ul>

              <p style="margin: 0; color: #8899a6; font-size: 13px; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
                Se hai problemi, contatta il supporto.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.2); text-align: center;">
              <p style="margin: 0; color: #8899a6; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Karalisweb. Tutti i diritti riservati.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Sales CRM - Reset Password

Ciao${userName ? ` ${userName}` : ''}!

Abbiamo ricevuto una richiesta per reimpostare la password del tuo account.

Clicca su questo link per reimpostare la password:
${resetLink}

Nota importante:
- Il link scade tra 1 ora
- Se non hai richiesto il reset, ignora questa email
- La tua password attuale resta invariata

© ${new Date().getFullYear()} Karalisweb. Tutti i diritti riservati.
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"Sales CRM" <${fromEmail}>`,
      to,
      subject: 'Reset Password - Sales CRM',
      text,
      html,
    });

    console.log(`[EMAIL] Reset password inviato a ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Errore invio reset password:', error);
    return false;
  }
}
