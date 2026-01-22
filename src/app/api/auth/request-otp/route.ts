import { NextRequest, NextResponse } from 'next/server';
import { requestOtp } from '@/lib/otp';
import { OtpType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type = 'TWO_FACTOR' } = body;

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

    // Validazione tipo OTP
    const validTypes: OtpType[] = ['TWO_FACTOR', 'PASSWORD_RESET'];
    if (!validTypes.includes(type as OtpType)) {
      return NextResponse.json(
        { success: false, message: 'Tipo OTP non valido.' },
        { status: 400 }
      );
    }

    // Log della richiesta
    console.log(`[API] Richiesta OTP - Email: ${email}, Tipo: ${type}`);

    // Richiedi OTP
    const result = await requestOtp(email.toLowerCase(), type as OtpType);

    // Status code basato sul risultato
    const statusCode = result.success ? 200 : 429; // 429 per rate limiting

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error('[API] Errore request-otp:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
