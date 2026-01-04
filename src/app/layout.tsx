import type { Metadata } from "next";
import { Roboto, Caveat } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConditionalHeader } from "@/components/ConditionalHeader";
import { Toaster } from "@/components/ui/sonner";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fore Genomics Parent Portal",
  description: "Genetic testing portal for parents",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider dynamic>
      <html lang="en">
        <body
          className={`${roboto.variable} ${caveat.variable} antialiased safe-top safe-bottom font-sans`}
        >
          <ConditionalHeader />
          <main className="min-h-screen px-1 sm:px-0">{children}</main>
          <Toaster position="top-center" richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
