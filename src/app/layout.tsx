import type { Metadata } from "next";
import { Inter } from 'next/font/google';
// import Link from 'next/link'; // Link is used in Sidebar component
// import { HomeIcon } from 'lucide-react'; // Icons are used in Sidebar component
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from '@/components/Sidebar'; // Import new Sidebar
import TopBar from '@/components/TopBar';   // Import new TopBar

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Capital Forecasting Tool",
  description: "SaaS application for capital forecasting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-contentBg text-defaultText`}> {/* Body bg and text from globals */}
        <div className="flex h-screen">
          <Sidebar />
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col ml-64"> {/* Offset for the sidebar width */}
            <TopBar /> {/* Add TopBar here */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8"> {/* Adjusted padding */}
              <AuthGuard>
                {children}
              </AuthGuard>
            </main>
            {/* Footer can be kept or removed based on final design preference */}
            {/* <footer className="bg-gray-200 text-center p-4 text-sm text-gray-700 border-t border-gray-300 flex-shrink-0">
              © {new Date().getFullYear()} Capital Forecaster. All rights reserved.
            </footer> */}
          </div>
        </div>
      </body>
    </html>
  );
}
