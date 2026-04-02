'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/store';
import { LogOut, CircleUser, Lock } from 'lucide-react';

/**
 * User Menu Dropdown Component
 * Shows user info and logout button
 */
export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button - Matched to topbar style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all duration-200 ease-in-out rounded-md px-2 py-1.5 hover:bg-muted/50"
      >
        <span className="text-xs text-muted-foreground hidden md:inline">
          {user.name}
        </span>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-border">
          <CircleUser className="w-5 h-5 text-primary" />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 mt-1">{user.email}</p>
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded capitalize">
              {user.role}
            </span>
          </div>

          {/* Reset Password */}
          <div className="border-t border-gray-200 mt-1">
            <button
              onClick={() => {
                router.push(`/reset-password?email=${encodeURIComponent(user.email)}`);
                setIsOpen(false);
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-all duration-150 ease-in-out rounded-lg mx-2"
            >
              <Lock className="w-4 h-4 mr-3" />
              Reset Password
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-200 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:translate-x-1 transition-all duration-150 ease-in-out rounded-lg mx-2"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}