import { Geist_Mono, IBM_Plex_Sans, Source_Sans_3 } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { ConvexClientProvider } from "@/components/convex-client-provider";

import { ToastProvider } from "@/components/ui/toast";

const sourceSans3Heading = Source_Sans_3({subsets:['latin'],variable:'--font-heading'});

const ibmPlexSans = IBM_Plex_Sans({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", ibmPlexSans.variable, sourceSans3Heading.variable)}
    >
      <body>
        <ConvexClientProvider>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}
