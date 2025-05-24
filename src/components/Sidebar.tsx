'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, Briefcase, BarChart3, Settings as SettingsIcon } from 'lucide-react'; // Using specific names for clarity

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase }, // Assuming Portfolio page exists
  { href: '/reports', label: 'Reports', icon: BarChart3 },     // Assuming Reports page exists
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-primary text-white p-6 flex flex-col shadow-lg z-20">
      <div className="mb-10">
        <Link href="/dashboard" className="text-white text-2xl font-bold">
          ek
        </Link>
      </div>
      <nav className="flex-grow space-y-3">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const IconComponent = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'bg-sidebarActiveBg text-sidebarTextActive font-medium'
                  : 'text-sidebarTextInactive hover:bg-sidebarActiveBg hover:text-sidebarTextActive'
              }`}
            >
              <IconComponent className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {/* Optional: Add a logout or user profile section at the bottom if needed later */}
      {/* <div className="mt-auto">
        <Link href="/logout" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebarTextInactive hover:bg-sidebarActiveBg hover:text-sidebarTextActive transition-colors duration-150">
          <LogOut className="h-5 w-5" />
          Logout
        </Link>
      </div> */}
    </aside>
  );
};

export default Sidebar;