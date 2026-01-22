import { randomInt, createHash } from 'crypto';
import { db } from './db';
import { sendOtpEmail } from './email';
import { OtpType } from '@prisma/client';

// Configurazione
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_REQUESTS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_VERIFY_ATTEMPTS = 5;

// Genera codice OTP crittograficamente sicuro (6 cifre)
export function generateOtpCode(): string {
  // Genera un numero casuale tra 0 e 999999
  const code = randomInt(0, 1000000);
  // Padding con zeri per avere sempre 6 cifre
  return code.toString().padStart(OTP_LENGTH, '0');
}

// Hash del codice per storage sicuro
export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// Verifica rate limiting
async function checkRateLimit(email: string, type: OtpType): Promise<{ allowed: boolean; remainingTime?: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);

  // Conta le richieste OTP negli ultimi 15 minuti
  const recentRequests = await db.otpCode.count({
    where: {
      email,
      type,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (recentRequests >= MAX_REQUESTS_PER_WINDOW) {
    // Trova la richiesta più vecchia nel window
    const oldestRequest = await db.otpCode.findFirst({
      where: {
        email,
        type,
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
      resetTime.setMinutes(resetTime.getMinutes() + RATE_LIMIT_WINDOW_MINUTES);
      const remainingMs = resetTime.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return { allowed: false, remainingTime: remainingMinutes };
    }

    return { allowed: false, remainingTime: RATE_LIMIT_WINDOW_MINUTES };
  }

  return { allowed: true };
}

// Richiedi OTP per 2FA
export async function requestOtp(
  email: string,
  type: OtpType = 'TWO_FACTOR'
): Promise<{ success: boolean; message: string }> {
  try {
    // Verifica che l'utente esista
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Non rivelare se l'utente esiste o meno
      console.log(`[OTP] Richiesta per email non esistente: ${email}`);
      // Simula un delay per evitare timing attacks
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, message: 'Se l\'email è registrata, riceverai un codice di verifica.' };
    }

    // Verifica rate limiting
    const rateCheck = await checkRateLimit(email, type);
    if (!rateCheck.allowed) {
      console.log(`[OTP] Rate limit superato per: ${email}`);
      return {
        success: false,
        message: `Hai raggiunto il limite di richieste. Riprova tra ${rateCheck.remainingTime} minuti.`,
      };
    }

    // Invalida eventuali OTP precedenti non usati
    await db.otpCode.updateMany({
      where: {
        email,
        type,
        used: false,
        expiresAt: { gte: new Date() },
      },
      data: {
        used: true,
      },
    });

    // Genera nuovo OTP
    const plainCode = generateOtpCode();
    const hashedCode = hashCode(plainCode);

    // Calcola scadenza
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Salva in database
    await db.otpCode.create({
      data: {
        code: hashedCode,
        email,
        type,
        expiresAt,
        userId: user.id,
      },
    });

    console.log(`[OTP] Codice generato per ${email}: ${plainCode} (hash: ${hashedCode.substring(0, 8)}...)`);

    // Invia email
    const emailSent = await sendOtpEmail(email, plainCode, user.name || undefined);

    if (!emailSent) {
      console.error(`[OTP] Errore invio email a: ${email}`);
      return {
        success: false,
        message: 'Errore nell\'invio dell\'email. Riprova più tardi.',
      };
    }

    console.log(`[OTP] Email inviata con successo a: ${email}`);
    return { success: true, message: 'Codice di verifica inviato alla tua email.' };
  } catch (error) {
    console.error('[OTP] Errore requestOtp:', error);
    return { success: false, message: 'Errore interno. Riprova più tardi.' };
  }
}

// Verifica OTP
export async function verifyOtp(
  email: string,
  code: string,
  type: OtpType = 'TWO_FACTOR'
): Promise<{ success: boolean; message: string; userId?: string }> {
  try {
    // Trova l'OTP valido più recente
    const otpRecord = await db.otpCode.findFirst({
      where: {
        email,
        type,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
      },
    });

    if (!otpRecord) {
      console.log(`[OTP] Nessun OTP valido trovato per: ${email}`);
      return { success: false, message: 'Codice non valido o scaduto.' };
    }

    // Verifica tentativi massimi
    if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
      // Invalida l'OTP
      await db.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });
      console.log(`[OTP] Troppi tentativi per: ${email}`);
      return { success: false, message: 'Troppi tentativi errati. Richiedi un nuovo codice.' };
    }

    // Hash del codice inserito
    const hashedInput = hashCode(code);

    // Confronta gli hash
    if (hashedInput !== otpRecord.code) {
      // Incrementa tentativi
      await db.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      console.log(`[OTP] Codice errato per ${email}, tentativo ${otpRecord.attempts + 1}/${MAX_VERIFY_ATTEMPTS}`);
      return {
        success: false,
        message: `Codice non valido. Tentativi rimasti: ${MAX_VERIFY_ATTEMPTS - otpRecord.attempts - 1}`,
      };
    }

    // OTP valido - marcalo come usato
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    console.log(`[OTP] Verifica completata con successo per: ${email}`);
    return {
      success: true,
      message: 'Verifica completata con successo.',
      userId: otpRecord.userId || undefined,
    };
  } catch (error) {
    console.error('[OTP] Errore verifyOtp:', error);
    return { success: false, message: 'Errore interno. Riprova più tardi.' };
  }
}

// Pulizia OTP scaduti (da chiamare periodicamente)
export async function cleanupExpiredOtps(): Promise<number> {
  const result = await db.otpCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true },
      ],
    },
  });

  console.log(`[OTP] Puliti ${result.count} OTP scaduti/usati`);
  return result.count;
}
