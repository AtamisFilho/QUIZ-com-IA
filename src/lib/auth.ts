import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        // Check if user exists
        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { profile: true },
        })

        // If user doesn't exist and name is provided, create new user (register)
        if (!user) {
          if (!credentials.name) return null

          const hashedPassword = credentials.password
            ? await bcrypt.hash(credentials.password, 12)
            : undefined

          const newUser = await db.user.create({
            data: {
              email: credentials.email,
              name: credentials.name,
              profile: {
                create: {
                  displayName: credentials.name,
                },
              },
              ...(hashedPassword && {
                accounts: {
                  create: {
                    type: 'credentials',
                    provider: 'credentials',
                    providerAccountId: credentials.email,
                  },
                },
              }),
            },
            include: { profile: true },
          })

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
}
