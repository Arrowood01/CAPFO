import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { HomeIcon } from 'lucide-react'; // Assuming other icons like Briefcase, BarChart, Settings might be used
// import { Geist, Geist_Mono } from "next/font/google"; // Geist can be added back if needed
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

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
      <body className={`${inter.className} antialiased`}>
        <div className="flex h-screen bg-gray-100">
          {/* Fixed Sidebar */}
          <aside className="w-64 bg-white h-screen border-r px-6 py-4 shadow-sm">
            <h2 className="text-xl font-bold text-gray-700 mb-6">Capital Forecaster</h2>
            <nav className="space-y-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-primary">
                <HomeIcon className="h-5 w-5" />
                Dashboard
              </Link>
              <Link href="/portfolio" className="flex items-center gap-2 text-gray-600 hover:text-primary">
                {/* <BriefcaseIcon className="h-5 w-5" /> Placeholder */}
                Portfolio
              </Link>
              <Link href="/reports" className="flex items-center gap-2 text-gray-600 hover:text-primary">
                {/* <BarChartIcon className="h-5 w-5" /> Placeholder */}
                Reports
              </Link>
              <Link href="/settings" className="flex items-center gap-2 text-gray-600 hover:text-primary">
                {/* <SettingsIcon className="h-5 w-5" /> Placeholder */}
                Settings
              </Link>
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col ml-64"> {/* Offset for the sidebar, REMOVED RED BACKGROUND TEST */}
            <main className="flex-1 overflow-y-auto p-6 bg-white"> {/* Main content scrolls, has white background and padding */}
              <AuthGuard>
                {children}
              </AuthGuard>
            </main>
            <footer className="bg-gray-200 text-center p-4 text-sm text-gray-700 border-t border-gray-300 flex-shrink-0">
              © {new Date().getFullYear()} Capital Forecaster. All rights reserved.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
