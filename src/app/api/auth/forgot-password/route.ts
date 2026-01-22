import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/password-reset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validazione input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email richiesta.' },
        { status: 400 }
      );
    }

    // Validazione email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Formato email non valido.' },
        { status: 400 }
      );
    }

    // Ottieni base URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3003';
    const baseUrl = `${protocol}://${host}`;

    // Log della richiesta
    console.log(`[API] Richiesta reset password - Email: ${email}`);

    // Richiedi reset
    const result = await requestPasswordReset(email.toLowerCase(), baseUrl);

    // Sempre 200 per non rivelare se l'email esiste
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] Errore forgot-password:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
