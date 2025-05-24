'use client';

import React from 'react';
import { Search, Bookmark, Bell, UserCircle } from 'lucide-react'; // UserCircle as a placeholder for avatar

// This component will need to get the page title dynamically,
// possibly via props or a context/ Zustand store updated by each page.
interface TopBarProps {
  pageTitle?: string;
}

const TopBar: React.FC<TopBarProps> = ({ pageTitle = "Dashboard" }) => {
  return (
    <header className="bg-whiteCardBg px-6 py-4 border-b border-tableDivider flex items-center justify-between sticky top-0 z-10">
      {/* Left Side: Page Title */}
      <div>
        <h1 className="text-2xl font-semibold text-titleText">{pageTitle}</h1>
      </div>

      {/* Right Side: Search and Icons */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-searchText" />
          </div>
          <input
            type="search"
            placeholder="Search..."
            className="bg-gray-100 text-sm rounded-lg pl-10 pr-4 py-2 w-64 focus:ring-primary focus:border-primary placeholder-searchText text-defaultText"
          />
        </div>
        
        <button className="text-iconGray hover:text-primary transition-colors" aria-label="Bookmarks">
          <Bookmark className="h-5 w-5" />
        </button>
        <button className="text-iconGray hover:text-primary transition-colors" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>
        <button className="text-iconGray hover:text-primary transition-colors" aria-label="User profile">
          <UserCircle className="h-7 w-7" /> {/* Placeholder for avatar */}
        </button>
      </div>
    </header>
  );
};

export default TopBar;