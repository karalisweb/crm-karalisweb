import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { OtpType } from '@prisma/client';
import { sign } from 'jsonwebtoken';
import { db } from '@/lib/db';

// Secret per JWT temporaneo (per 2FA completato)
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, type = 'TWO_FACTOR' } = body;

    // Validazione input
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

    // Validazione formato codice (6 cifre)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(code)) {
      return NextResponse.json(
        { success: false, message: 'Il codice deve essere di 6 cifre.' },
        { status: 400 }
      );
    }

    // Validazione tipo OTP
    const validTypes: OtpType[] = ['TWO_FACTOR', 'PASSWORD_RESET'];
    if (!validTypes.includes(type as OtpType)) {
      return NextResponse.json(
        { success: false, message: 'Tipo OTP non valido.' },
        { status: 400 }
      );
    }

    // Log della richiesta
    console.log(`[API] Verifica OTP - Email: ${email}, Tipo: ${type}`);

    // Verifica OTP
    const result = await verifyOtp(email.toLowerCase(), code, type as OtpType);

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    // Se la verifica è riuscita, genera un token temporaneo
    // Questo token può essere usato per completare il login o il reset password
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utente non trovato.' },
        { status: 404 }
      );
    }

    // Genera token temporaneo (valido 5 minuti)
    const tempToken = sign(
      {
        userId: user.id,
        email: user.email,
        type: type === 'TWO_FACTOR' ? '2fa_verified' : 'password_reset',
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minuti
      },
      JWT_SECRET
    );

    return NextResponse.json({
      success: true,
      message: 'Verifica completata con successo.',
      token: tempToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[API] Errore verify-otp:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
