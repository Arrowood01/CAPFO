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
    <nav className="bg-gray-800 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white">
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
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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