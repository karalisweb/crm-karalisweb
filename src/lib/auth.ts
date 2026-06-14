import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { authConfig } from "./auth.config";
import { verifyOtp } from "./otp";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Codice 2FA: presente solo se l'utente ha il 2FA attivo.
        otpCode: { label: "Codice 2FA", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Email sempre in minuscolo: coerente con request-otp/verify-otp,
        // altrimenti il 2FA non troverebbe il codice.
        const email = (credentials.email as string).toLowerCase();

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // === 2FA ENFORCEMENT (server-side) ===
        // Se l'utente ha il 2FA attivo, un codice OTP valido è OBBLIGATORIO.
        // La verifica avviene QUI (single-use, gestita da verifyOtp): senza un OTP
        // valido la sessione NON viene creata, anche con email+password corrette.
        // Questo impedisce di bypassare il 2FA chiamando direttamente il callback.
        if (user.twoFactorEnabled) {
          const otpCode = credentials.otpCode as string | undefined;
          if (!otpCode || !/^\d{6}$/.test(otpCode)) {
            return null;
          }
          const otpResult = await verifyOtp(email, otpCode, "TWO_FACTOR");
          if (!otpResult.success) {
            return null;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
