import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - Ottieni profilo utente corrente
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Non autenticato' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Utente non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('[API] Errore GET /api/profile:', error);
    return NextResponse.json(
      { message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna profilo utente
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Non autenticato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Validazione
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json(
        { message: 'Nome non valido' },
        { status: 400 }
      );
    }

    // Aggiorna utente
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[API] Errore PUT /api/profile:', error);
    return NextResponse.json(
      { message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
