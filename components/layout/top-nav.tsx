'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function TopNav() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const userName = user?.name ?? 'Guest User';
  const userEmail = user?.email ?? 'guest@example.com';

  function handleSignOut() {
    logout();
    router.push('/login');
  }
  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between max-w-screen-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Leaf className="size-6 text-primary" />
          <span className="font-semibold text-lg text-foreground">TerraWatt</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/home" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link href="/area-select" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            New Plan
          </Link>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="size-4 text-primary" />
            </div>
            <span className="hidden sm:inline text-sm">{userName}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
