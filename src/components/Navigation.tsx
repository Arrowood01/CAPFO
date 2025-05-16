'use client'; // Required for Next.js App Router event handlers like onClick if we add them later, good practice for components.

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // To highlight active link

const navLinks = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Import', href: '/import' },
  { name: 'Settings', href: '/settings' },
];

const Navigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-[var(--primary-blue)] p-4 shadow-md"> {/* Primary blue background */}
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white"> {/* White text for title */}
          Capital Forecaster
        </Link>
        <ul className="flex space-x-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-[var(--primary-blue-hover)] text-white' // Darker blue for active, white text
                      : 'text-blue-100 hover:bg-[var(--primary-blue-hover)] hover:text-white' // Lighter blue text, darker blue hover
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;