import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation"; // Import the Navigation component
import AuthGuard from "@/components/AuthGuard"; // Restore AuthGuard

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Capital Forecasting Tool", // Updated title
  description: "SaaS application for capital forecasting", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-white text-black`}
      >
        <Navigation /> {/* Add the Navigation component here */}
        <main className="flex-grow container mx-auto px-4 py-8"> {/* Add a main tag for content */}
          <AuthGuard>
            {children}
          </AuthGuard>
        </main>
        <footer className="bg-gray-50 text-center p-4 text-sm text-gray-700 border-t border-gray-200"> {/* Lighter footer, black text */}
          © {new Date().getFullYear()} Capital Forecaster. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
