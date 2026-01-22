import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validazione input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Email richiesta' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { message: 'Password richiesta' },
        { status: 400 }
      );
    }

    // Trova utente
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      // Non rivelare se l'utente esiste
      return NextResponse.json(
        { message: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Verifica password
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Credenziali valide - controlla se 2FA è attivo
    return NextResponse.json({
      success: true,
      requires2FA: user.twoFactorEnabled,
      email: user.email,
    });
  } catch (error) {
    console.error('[API] Errore check-2fa:', error);
    return NextResponse.json(
      { message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
