import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // Geist imports removed as variables are not directly used in className
import "./globals.css"; // Reverting to direct relative path for final test
// import Navigation from "@/components/Navigation"; // Navigation component removed
import AuthGuard from "@/components/AuthGuard"; // Restore AuthGuard

// const geistSans = Geist({ // No longer needed here if not applied to className
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({ // No longer needed here if not applied to className
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// Inter is now imported and applied globally via globals.css
// Geist font variables are defined in globals.css and used in tailwind.config.ts

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
      <body className="antialiased"> {/* Simplified className */}
        <div className="flex h-screen bg-gray-100"> {/* Ensure bg-gray-100 is on the main flex container */}
          {/* Fixed Sidebar */}
          <aside className="fixed top-0 left-0 h-full w-64 bg-gray-900 text-white p-6 space-y-6 shadow-lg z-10">
            <h2 className="text-2xl font-semibold border-b border-gray-700 pb-4">Capital Forecaster</h2>
            <nav className="space-y-3">
              <a href="/dashboard" className="block py-2 px-3 rounded-md hover:bg-gray-800 hover:text-blue-300 transition-colors duration-150">Dashboard</a>
              <a href="/portfolio" className="block py-2 px-3 rounded-md hover:bg-gray-800 hover:text-blue-300 transition-colors duration-150">Portfolio</a>
              <a href="/reports" className="block py-2 px-3 rounded-md hover:bg-gray-800 hover:text-blue-300 transition-colors duration-150">Reports</a>
              <a href="/settings" className="block py-2 px-3 rounded-md hover:bg-gray-800 hover:text-blue-300 transition-colors duration-150">Settings</a>
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
