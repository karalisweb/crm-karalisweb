import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

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
    const { enabled } = body;

    // Validazione input
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { message: 'Valore non valido per enabled' },
        { status: 400 }
      );
    }

    // Aggiorna impostazione 2FA
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { twoFactorEnabled: enabled },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    console.log(
      `[API] 2FA ${enabled ? 'attivato' : 'disattivato'} per utente: ${session.user.email}`
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[API] Errore POST /api/profile/2fa:', error);
    return NextResponse.json(
      { message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
