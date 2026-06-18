import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "QUIZ AI - Quiz Orquestrado por IA",
  description: "Jogo de quiz online multiplayer com perguntas geradas por IA. Crie salas, desafie amigos e divirta-se!",
  keywords: ["quiz", "AI", "multiplayer", "party game", "trivia", "perguntas", "jogo online"],
  authors: [{ name: "QUIZ AI Team" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "QUIZ AI - Quiz Orquestrado por IA",
    description: "Desafie seus amigos com perguntas geradas por IA!",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
