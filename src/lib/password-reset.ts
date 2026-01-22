import { randomBytes, createHash } from 'crypto';
import { db } from './db';
import { sendPasswordResetEmail } from './email';
import { hash } from 'bcryptjs';

// Configurazione
const TOKEN_LENGTH = 32; // 32 bytes = 64 caratteri hex
const TOKEN_EXPIRY_HOURS = 1;
const MAX_REQUESTS_PER_HOUR = 3;

// Genera token sicuro
function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex');
}

// Hash del token per storage sicuro
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Verifica rate limiting per reset password
async function checkRateLimit(email: string): Promise<{ allowed: boolean; remainingTime?: number }> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - 1);

  const recentRequests = await db.passwordReset.count({
    where: {
      email,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (recentRequests >= MAX_REQUESTS_PER_HOUR) {
    // Trova la richiesta più vecchia
    const oldestRequest = await db.passwordReset.findFirst({
      where: {
        email,
        createdAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (oldestRequest) {
      const resetTime = new Date(oldestRequest.createdAt);
      resetTime.setHours(resetTime.getHours() + 1);
      const remainingMs = resetTime.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return { allowed: false, remainingTime: remainingMinutes };
    }

    return { allowed: false, remainingTime: 60 };
  }

  return { allowed: true };
}

// Richiedi reset password
export async function requestPasswordReset(
  email: string,
  baseUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verifica che l'utente esista
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Non rivelare se l'utente esiste - simula delay
      console.log(`[PASSWORD-RESET] Richiesta per email non esistente: ${email}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'Se l\'email è registrata, riceverai le istruzioni per reimpostare la password.',
      };
    }

    // Verifica rate limiting
    const rateCheck = await checkRateLimit(email.toLowerCase());
    if (!rateCheck.allowed) {
      console.log(`[PASSWORD-RESET] Rate limit superato per: ${email}`);
      return {
        success: false,
        message: `Hai raggiunto il limite di richieste. Riprova tra ${rateCheck.remainingTime} minuti.`,
      };
    }

    // Invalida eventuali token precedenti
    await db.passwordReset.updateMany({
      where: {
        email: email.toLowerCase(),
        used: false,
        expiresAt: { gte: new Date() },
      },
      data: {
        used: true,
      },
    });

    // Genera nuovo token
    const plainToken = generateToken();
    const hashedToken = hashToken(plainToken);

    // Calcola scadenza
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    // Salva in database
    await db.passwordReset.create({
      data: {
        token: hashedToken,
        email: email.toLowerCase(),
        expiresAt,
        userId: user.id,
      },
    });

    // Costruisci link di reset
    const resetLink = `${baseUrl}/reset-password?token=${plainToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    console.log(`[PASSWORD-RESET] Token generato per ${email}, link: ${resetLink}`);

    // Invia email
    const emailSent = await sendPasswordResetEmail(
      email.toLowerCase(),
      resetLink,
      user.name || undefined
    );

    if (!emailSent) {
      console.error(`[PASSWORD-RESET] Errore invio email a: ${email}`);
      return {
        success: false,
        message: 'Errore nell\'invio dell\'email. Riprova più tardi.',
      };
    }

    console.log(`[PASSWORD-RESET] Email inviata con successo a: ${email}`);
    return {
      success: true,
      message: 'Se l\'email è registrata, riceverai le istruzioni per reimpostare la password.',
    };
  } catch (error) {
    console.error('[PASSWORD-RESET] Errore requestPasswordReset:', error);
    return { success: false, message: 'Errore interno. Riprova più tardi.' };
  }
}

// Verifica token di reset
export async function verifyResetToken(
  email: string,
  token: string
): Promise<{ valid: boolean; message: string; userId?: string }> {
  try {
    const hashedToken = hashToken(token);

    const resetRecord = await db.passwordReset.findFirst({
      where: {
        email: email.toLowerCase(),
        token: hashedToken,
        used: false,
        expiresAt: { gte: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!resetRecord) {
      console.log(`[PASSWORD-RESET] Token non valido per: ${email}`);
      return { valid: false, message: 'Link non valido o scaduto. Richiedi un nuovo reset.' };
    }

    return {
      valid: true,
      message: 'Token valido.',
      userId: resetRecord.userId,
    };
  } catch (error) {
    console.error('[PASSWORD-RESET] Errore verifyResetToken:', error);
    return { valid: false, message: 'Errore interno. Riprova più tardi.' };
  }
}

// Esegui reset password
export async function resetPassword(
  email: string,
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verifica token
    const tokenCheck = await verifyResetToken(email, token);
    if (!tokenCheck.valid) {
      return { success: false, message: tokenCheck.message };
    }

    // Validazione password
    if (newPassword.length < 8) {
      return { success: false, message: 'La password deve essere di almeno 8 caratteri.' };
    }

    // Hash della nuova password
    const hashedPassword = await hash(newPassword, 12);

    // Aggiorna password utente
    await db.user.update({
      where: { email: email.toLowerCase() },
      data: { password: hashedPassword },
    });

    // Invalida il token
    const hashedToken = hashToken(token);
    await db.passwordReset.updateMany({
      where: {
        email: email.toLowerCase(),
        token: hashedToken,
      },
      data: {
        used: true,
      },
    });

    // Invalida tutti i token di reset per questo utente
    await db.passwordReset.updateMany({
      where: {
        email: email.toLowerCase(),
        used: false,
      },
      data: {
        used: true,
      },
    });

    console.log(`[PASSWORD-RESET] Password resettata con successo per: ${email}`);
    return { success: true, message: 'Password reimpostata con successo. Puoi effettuare il login.' };
  } catch (error) {
    console.error('[PASSWORD-RESET] Errore resetPassword:', error);
    return { success: false, message: 'Errore interno. Riprova più tardi.' };
  }
}

// Pulizia token scaduti
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await db.passwordReset.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true },
      ],
    },
  });

  console.log(`[PASSWORD-RESET] Puliti ${result.count} token scaduti/usati`);
  return result.count;
}
