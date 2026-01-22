import { NextRequest, NextResponse } from 'next/server';
import { resetPassword, verifyResetToken } from '@/lib/password-reset';

// GET - Verifica validità token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    // Validazione input
    if (!token || !email) {
      return NextResponse.json(
        { valid: false, message: 'Token ed email richiesti.' },
        { status: 400 }
      );
    }

    // Verifica token
    const result = await verifyResetToken(email, token);

    return NextResponse.json(result, { status: result.valid ? 200 : 400 });
  } catch (error) {
    console.error('[API] Errore verifica reset-password:', error);
    return NextResponse.json(
      { valid: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}

// POST - Esegui reset password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, password, confirmPassword } = body;

    // Validazione input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email richiesta.' },
        { status: 400 }
      );
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Token richiesto.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Password richiesta.' },
        { status: 400 }
      );
    }

    // Validazione password
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'La password deve essere di almeno 8 caratteri.' },
        { status: 400 }
      );
    }

    // Verifica conferma password
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Le password non coincidono.' },
        { status: 400 }
      );
    }

    // Log della richiesta
    console.log(`[API] Reset password - Email: ${email}`);

    // Esegui reset
    const result = await resetPassword(email.toLowerCase(), token, password);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[API] Errore reset-password:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
