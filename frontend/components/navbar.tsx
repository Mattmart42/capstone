"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, Map, Upload, User } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/paths", label: "Paths", icon: Map },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/login", label: "Login", icon: User },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-6 px-6 py-3 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-2xl">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link 
              key={href}
              href={href} 
              className={`flex items-center gap-2 transition-colors ${
                isActive ? "text-indigo-600" : "text-slate-600 hover:text-indigo-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:block">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
