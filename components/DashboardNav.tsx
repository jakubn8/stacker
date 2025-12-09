"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardNavProps {
  companyId: string;
}

export default function DashboardNav({ companyId }: DashboardNavProps) {
  const pathname = usePathname();
  const [showEditorMessage, setShowEditorMessage] = useState(false);

  const navItems = [
    {
      name: "Home",
      href: `/dashboard/${companyId}`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Dashboard",
      href: `/dashboard/${companyId}/settings`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: "Billing",
      href: `/dashboard/${companyId}/billing`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      name: "Editor",
      href: `/dashboard/${companyId}/editor`,
      mobileDisabled: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    if (href === `/dashboard/${companyId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleEditorClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.mobileDisabled && window.innerWidth < 640) {
      e.preventDefault();
      setShowEditorMessage(true);
      setTimeout(() => setShowEditorMessage(false), 3000);
    }
  };

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 relative">
      <div className="flex items-center justify-center h-14">
        {/* Centered Nav Items */}
        <div className="flex items-center gap-1 max-sm:gap-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleEditorClick(e, item)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors max-sm:px-2 max-sm:py-1.5 max-sm:gap-1.5 max-sm:text-xs ${
                isActive(item.href)
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Editor Message */}
      {showEditorMessage && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl max-w-[280px] text-center">
          <p className="text-white text-sm font-medium mb-1">Desktop Required</p>
          <p className="text-zinc-400 text-xs">The editor is only available on desktop devices.</p>
        </div>
      )}
    </nav>
  );
}
