import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { OtpType } from '@prisma/client';

/**
 * Verifica un codice OTP (single-use).
 *
 * NB sicurezza: questo endpoint NON emette più token di sessione.
 * - Per il 2FA al LOGIN il codice viene verificato direttamente in `authorize()`
 *   (vedi src/lib/auth.ts), così la sessione non può essere creata senza un OTP valido.
 * - Questo endpoint serve ai flussi GIÀ autenticati (es. attivazione/disattivazione
 *   2FA dal profilo) per confermare che l'utente possiede la mailbox.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, type = 'TWO_FACTOR' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email richiesta.' },
        { status: 400 }
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Codice OTP richiesto.' },
        { status: 400 }
      );
    }

    // Formato codice (6 cifre)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, message: 'Il codice deve essere di 6 cifre.' },
        { status: 400 }
      );
    }

    // Tipo OTP valido
    const validTypes: OtpType[] = ['TWO_FACTOR', 'PASSWORD_RESET'];
    if (!validTypes.includes(type as OtpType)) {
      return NextResponse.json(
        { success: false, message: 'Tipo OTP non valido.' },
        { status: 400 }
      );
    }

    // Verifica OTP (gestisce scadenza, tentativi massimi, single-use)
    const result = await verifyOtp(email.toLowerCase(), code, type as OtpType);

    if (!result.success) {
      // Messaggio volutamente generico: nessuna user-enumeration.
      return NextResponse.json(
        { success: false, message: result.message || 'Codice non valido o scaduto.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verifica completata con successo.',
    });
  } catch (error) {
    console.error('[API] Errore verify-otp:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
