import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { UiPreferencesProvider } from "@/components/UiPreferencesProvider";
import { ThemePaletteProvider } from "@/components/ThemePaletteProvider";
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nessus Compare",
  description: "Compare up to 3 Nessus vulnerability scan files side by side",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ThemePaletteProvider>
            <UiPreferencesProvider>
              <AppShell>
                {children}
              </AppShell>
              <Toaster richColors position="top-right" />
            </UiPreferencesProvider>
          </ThemePaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
