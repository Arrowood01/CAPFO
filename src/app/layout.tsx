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
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen">
          <aside className="w-64 bg-gray-900 text-white p-6 space-y-4 flex-shrink-0">
            <h2 className="text-xl font-semibold">Capital Forecaster</h2>
            <nav className="space-y-2">
              <a href="/dashboard" className="block hover:text-blue-400">Dashboard</a>
              <a href="/portfolio" className="block hover:text-blue-400">Portfolio</a>
              <a href="/reports" className="block hover:text-blue-400">Reports</a>
              <a href="/settings" className="block hover:text-blue-400">Settings</a>
            </nav>
          </aside>
          <div className="flex-1 flex flex-col overflow-hidden"> {/* Main content area wrapper */}
            <Navigation /> {/* Existing top navigation */}
            <main className="flex-1 overflow-y-auto bg-white container mx-auto px-4 py-8">
              <AuthGuard>
                {children}
              </AuthGuard>
            </main>
            <footer className="bg-gray-50 text-center p-4 text-sm text-gray-700 border-t border-gray-200 flex-shrink-0">
              © {new Date().getFullYear()} Capital Forecaster. All rights reserved.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
