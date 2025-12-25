'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import { Settings, LogOut, Clock } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CommandBarTrigger } from '@/components/global-search/command-bar-trigger';

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // Auth routes and public routes that should not show sidebar or main CRM chrome
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/login/verify-2fa' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password/') ||
    pathname.startsWith('/lead-form/') ||
    pathname === null; // 404 page (pathname is null for not-found)

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    if (!isAuthRoute) {
      fetchUser();
    }
  }, [isAuthRoute]);

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        console.error('Logout failed', errorText);
        // Still redirect even if API call fails - cookies will expire naturally
      }
    } catch (e) {
      console.error('Logout error', e);
      // Still redirect even on error - cookies will expire naturally
    } finally {
      setLoggingOut(false);
      // Always redirect to login page
      // Clear any local state if needed
      setCurrentUser(null);
      router.push('/login');
    }
  }

  // On auth pages (login, reset password), render a minimal layout with no sidebar or navigation.
  // Lead forms have their own layout, so we skip MainLayout entirely for them.
  if (isAuthRoute) {
    // For lead forms, just render children (they have their own layout)
    if (pathname.startsWith('/lead-form/')) {
      return <>{children}</>;
    }
    // For auth pages, use centered layout
    return <main className="min-h-screen flex items-center justify-center bg-muted px-4">{children}</main>;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-8 h-8 text-primary"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
            </svg>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold font-headline -mb-1">Shreenathji ERP</h1>
              <p className="text-xs text-muted-foreground">Rasayan Pvt. Ltd.</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage 
                src={currentUser?.avatarUrl || undefined} 
                alt={currentUser?.name || 'User'} 
                data-ai-hint="person" 
              />
              <AvatarFallback>
                {currentUser?.name 
                  ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : currentUser?.email 
                    ? currentUser.email[0].toUpperCase()
                    : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {isLoadingUser
                  ? 'Loading...'
                  : currentUser?.name?.trim()
                    ? currentUser.name
                    : currentUser?.email || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {isLoadingUser ? '' : currentUser?.email || ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/profile')}
              aria-label="Profile settings"
            >
              <Settings />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Sign out"
            >
              <LogOut className={loggingOut ? 'animate-spin' : ''} />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm sticky top-0 border-b z-10">
          <SidebarTrigger />
          <div className="flex-1 max-w-2xl mx-4">
            <CommandBarTrigger />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-end">
              <div className="font-medium" suppressHydrationWarning>
                {currentDateTime.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
                {currentDateTime.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
