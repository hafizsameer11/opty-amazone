import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ToastProvider } from "@/components/ui/Toast";
import PageLoader from "@/components/ui/PageLoader";
import GoogleTranslateWidget from "@/components/ui/GoogleTranslateWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Optical Marketplace - Buyer",
  description: "Optical marketplace for buyers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-poppins), var(--font-inter), system-ui, -apple-system, sans-serif' }}
        suppressHydrationWarning
      >
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <ToastProvider>
                <PageLoader />
                {children}
                <GoogleTranslateWidget />
              </ToastProvider>
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
