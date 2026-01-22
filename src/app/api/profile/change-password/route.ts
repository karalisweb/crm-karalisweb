import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Non autenticato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validazione input
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { message: 'Password attuale richiesta' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { message: 'Nuova password richiesta' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: 'La password deve essere di almeno 8 caratteri' },
        { status: 400 }
      );
    }

    // Ottieni utente con password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Verifica password attuale
    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Password attuale non corretta' },
        { status: 400 }
      );
    }

    // Hash nuova password
    const hashedPassword = await hash(newPassword, 12);

    // Aggiorna password
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    console.log(`[API] Password cambiata per utente: ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password modificata con successo',
    });
  } catch (error) {
    console.error('[API] Errore POST /api/profile/change-password:', error);
    return NextResponse.json(
      { message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
