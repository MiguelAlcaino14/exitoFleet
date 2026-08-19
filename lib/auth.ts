import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_INTENTOS_LOGIN = 10;
const REVALIDAR_CADA_SEGUNDOS = 300; // 5 minutos

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // A10: rate limiting por email para evitar brute force
        const { allowed } = checkRateLimit(`nextauth_login:${credentials.email.toLowerCase()}`, MAX_INTENTOS_LOGIN);
        if (!allowed) return null;

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.activo) return null;
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.nombre, role: user.rol, tallerId: user.tallerId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.tallerId = (user as any).tallerId ?? null;
        token.checkedAt = Math.floor(Date.now() / 1000);
      }

      // M5: re-verificar estado del usuario en DB cada hora
      const now = Math.floor(Date.now() / 1000);
      const checkedAt = (token.checkedAt as number) ?? 0;
      if (token.id && now - checkedAt > REVALIDAR_CADA_SEGUNDOS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { activo: true, rol: true, tallerId: true },
        });
        if (!dbUser || !dbUser.activo) {
          token.error = 'USER_INACTIVE';
        } else {
          token.role = dbUser.rol;
          token.tallerId = dbUser.tallerId;
          token.checkedAt = now;
          delete token.error;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if ((token as any).error === 'USER_INACTIVE') {
        return { ...session, error: 'USER_INACTIVE' };
      }
      if (session.user && token?.id) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).tallerId = token.tallerId as string | null;
      }
      return session;
    },
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 horas
  pages: { signIn: '/auth/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
