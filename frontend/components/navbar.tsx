"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Map, Upload, User, LogOut } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

export default function FlowerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M24.0984 0.590614C25.0213 -0.196873 26.3864 -0.19687 27.3093 0.590614L28.0603 1.24784C30.1094 3.08576 31.8857 5.0633 33.3914 7.1414C36.2308 6.68769 39.2214 6.56579 42.3259 6.81132C43.5353 6.90707 44.5007 7.8724 44.5964 9.08183C44.8419 12.1861 44.719 15.1762 44.2654 18.0154C46.5938 19.7024 48.7956 21.7297 50.8171 24.0984C51.6046 25.0213 51.6046 26.3865 50.8171 27.3094C48.7957 29.678 46.5937 31.7045 44.2654 33.3914C44.7191 36.2309 44.842 39.2214 44.5964 42.326C44.5007 43.5354 43.5353 44.5007 42.3259 44.5965C39.2213 44.842 36.2308 44.7191 33.3914 44.2654C31.7045 46.5937 29.6779 48.7958 27.3093 50.8172C26.3864 51.6046 25.0213 51.6046 24.0984 50.8172C21.7296 48.7957 19.7023 46.5939 18.0154 44.2654C15.1762 44.719 12.186 44.842 9.08179 44.5965C7.87237 44.5007 6.90703 43.5354 6.81128 42.326L6.74487 41.3308C6.5955 38.5816 6.73636 35.9261 7.14136 33.3914C4.8133 31.7046 2.61178 29.6778 0.590576 27.3094C-0.196904 26.3865 -0.196885 25.0213 0.590576 24.0984L1.2478 23.3475C3.08585 21.2982 5.06311 19.5212 7.14136 18.0154C6.68777 15.1763 6.56578 12.186 6.81128 9.08183C6.90703 7.8724 7.87236 6.90707 9.08179 6.81132L10.0769 6.74491C12.8258 6.59556 15.4809 6.73651 18.0154 7.1414C19.7022 4.81316 21.7298 2.61196 24.0984 0.590614ZM25.7039 42.0838C24.2821 42.6825 22.8012 43.1864 21.2664 43.5867C22.5516 45.2127 24.029 46.7705 25.7039 48.2351C27.3786 46.7707 28.8552 45.2125 30.1404 43.5867C28.6059 43.1864 27.1253 42.6823 25.7039 42.0838ZM9.91968 35.2107C9.6786 37.2696 9.6225 39.4162 9.77124 41.6365C11.9913 41.7852 14.1374 41.7281 16.196 41.4871C15.3937 40.1186 14.7029 38.7147 14.1208 37.2859C12.692 36.7038 11.2882 36.0131 9.91968 35.2107ZM41.4861 35.2117C40.1179 36.0138 38.7143 36.704 37.2859 37.2859C36.704 38.7144 36.0137 40.118 35.2117 41.4861C37.27 41.727 39.4158 41.7842 41.6355 41.6355C41.7841 39.4158 41.727 37.27 41.4861 35.2117ZM18.0261 38.5887C18.4399 39.3869 18.8936 40.1751 19.3884 40.951C20.2867 40.7522 21.1644 40.5147 22.0212 40.243C21.3876 39.8717 20.7706 39.4774 20.1687 39.0642C19.4513 38.9308 18.7364 38.7741 18.0261 38.5887ZM33.3806 38.5887C32.6703 38.7741 31.9555 38.9308 31.238 39.0642C30.6361 39.4774 30.0192 39.8717 29.3855 40.243C30.2426 40.5148 31.1207 40.7512 32.0193 40.95C32.5139 40.1745 32.967 39.3865 33.3806 38.5887ZM25.7039 14.8289C24.2495 14.8289 22.7933 14.9475 21.3455 15.1824C20.1557 16.04 19.0427 16.9861 18.0144 18.0144C16.9861 19.0427 16.04 20.1558 15.1824 21.3455C14.9475 22.7933 14.8289 24.2495 14.8289 25.7039C14.8289 27.158 14.9476 28.6138 15.1824 30.0613C16.0401 31.2513 16.9859 32.3649 18.0144 33.3933C19.0426 34.4215 20.1559 35.3669 21.3455 36.2244C22.7934 36.4593 24.2494 36.5789 25.7039 36.5789C27.158 36.5789 28.6137 36.4592 30.0613 36.2244C31.2511 35.3667 32.365 34.4217 33.3933 33.3933C34.4217 32.365 35.3667 31.2511 36.2244 30.0613C36.4592 28.6138 36.5789 27.158 36.5789 25.7039C36.5789 24.2495 36.4593 22.7934 36.2244 21.3455C35.3669 20.1559 34.4215 19.0426 33.3933 18.0144C32.3648 16.986 31.2512 16.0402 30.0613 15.1824C28.6138 14.9476 27.1579 14.8289 25.7039 14.8289ZM11.1638 29.3855C10.892 30.2424 10.6546 31.1201 10.4558 32.0183C11.2317 32.5132 12.0199 32.9668 12.8181 33.3807C12.6326 32.67 12.475 31.9549 12.3416 31.2371C11.9287 30.6355 11.5348 30.0188 11.1638 29.3855ZM40.2429 29.3855C39.8719 30.0189 39.4781 30.6355 39.0652 31.2371C38.9317 31.9549 38.7742 32.67 38.5886 33.3807C39.3866 32.9669 40.1743 32.513 40.95 32.0183C40.7512 31.1201 40.5147 30.2423 40.2429 29.3855ZM7.82007 21.2654C6.19388 22.5507 4.63637 24.0288 3.17163 25.7039C4.63674 27.3794 6.19539 28.8568 7.82202 30.1424C8.22231 28.6074 8.72431 27.1257 9.323 25.7039C8.72424 24.2819 8.22039 22.8005 7.82007 21.2654ZM43.5867 21.2664C43.1864 22.8012 42.6824 24.2822 42.0837 25.7039C42.6823 27.1253 43.1864 28.6059 43.5867 30.1404C45.2125 28.8553 46.7706 27.3786 48.2351 25.7039C46.7705 24.029 45.2127 22.5516 43.5867 21.2664ZM12.8181 18.0262C12.0199 18.44 11.2317 18.8937 10.4558 19.3885C10.6547 20.2877 10.8917 21.1665 11.1638 22.0242C11.5356 21.3895 11.9287 20.7706 12.3425 20.1678C12.4759 19.4507 12.6327 18.7361 12.8181 18.0262ZM38.5857 18.0252C38.7715 18.7367 38.9316 19.452 39.0652 20.1707C39.4779 20.772 39.872 21.3882 40.2429 22.0213C40.5147 21.1642 40.7512 20.2861 40.95 19.3875C40.1736 18.8924 39.3844 18.4392 38.5857 18.0252ZM16.196 9.91972C14.1375 9.67873 11.9912 9.62256 9.77124 9.77128C9.62247 11.992 9.67946 14.1388 9.92065 16.198C11.2891 15.3957 12.692 14.703 14.1208 14.1209C14.7029 12.6921 15.3937 11.2882 16.196 9.91972ZM41.6355 9.77225C39.4148 9.62354 37.2679 9.67951 35.2087 9.92069C36.0112 11.2892 36.7038 12.692 37.2859 14.1209C38.7143 14.7028 40.118 15.3931 41.4861 16.1951C41.7269 14.1371 41.7841 11.9916 41.6355 9.77225ZM19.3884 10.4558C18.893 11.2327 18.4384 12.0218 18.0242 12.8211C18.736 12.6351 19.4517 12.4753 20.1707 12.3416C20.772 11.9289 21.3882 11.5348 22.0212 11.1639C21.1644 10.8921 20.2867 10.6546 19.3884 10.4558ZM32.0193 10.4568C31.1197 10.6558 30.2406 10.8926 29.3826 11.1648C30.0171 11.5365 30.6363 11.9289 31.239 12.3426C31.9561 12.4759 32.6707 12.6328 33.3806 12.8182C32.967 12.0203 32.5138 11.2323 32.0193 10.4568ZM25.7039 3.17167C24.028 4.63707 22.5491 6.19508 21.2634 7.82206C22.7987 8.22235 24.2807 8.72426 25.7029 9.32304C27.1248 8.72424 28.6063 8.22047 30.1414 7.82011C28.8561 6.19408 27.3788 4.63628 25.7039 3.17167Z" fill="currentColor"/>
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfile]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setShowProfile(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const links = [
    { href: "/chat", label: "Home", icon: FlowerIcon },
    { href: "/paths", label: "Paths", icon: Map },
    { href: "/upload", label: "Upload", icon: Upload },
  ];

  return (
    <nav className="sticky top-0 w-full z-50 bg-200 px-3 pt-3">
      <div className="w-full flex items-center justify-between px-6 py-3 bg-100 backdrop-blur rounded-2xl">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-xl text-text font-bold font-serif tracking-tight">
            Ikig.<span className="text-primary group-hover:italic transition-all">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-8">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            const isHome = label === "Home";
            return (
              <Link 
                key={href}
                href={href} 
                className={`flex items-center gap-2 transition-colors ${
                  isActive ? "text-primary" : "text-text hover:text-primary"
                }`}
              >
                <Icon className={`${isHome ? "w-6 h-6" : "w-5 h-5"}`} />
                <span className="text-sm font-medium hidden sm:block">{label}</span>
              </Link>
            );
          })}

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className={`flex items-center gap-2 transition-colors ${
                  showProfile ? "text-primary" : "text-text hover:text-primary"
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:block">Profile</span>
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-64 bg-200 backdrop-blur border border-border rounded-xl shadow-lg p-4 z-50">
                  <div className="mb-4">
                    <p className="text-xs text-secondary-text font-medium uppercase tracking-wider">Account</p>
                    <p className="text-sm text-text font-semibold truncate">{user.email}</p>
                    <p className="text-[10px] text-secondary-text mt-1">ID: {user.id.slice(0, 8)}...</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full text-left text-sm text-danger hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link 
              href="/login" 
              className={`flex items-center gap-2 transition-colors ${
                pathname === "/login" ? "text-primary" : "text-text hover:text-primary"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:block">Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
