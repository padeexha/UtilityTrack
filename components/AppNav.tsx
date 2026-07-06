'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/(protected)/actions';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Building2, Camera, History, FileSpreadsheet, Receipt, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppNav({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/meters', label: 'Premises & meters', icon: Building2 },
    { href: '/readings/new', label: 'Take reading', icon: Camera },
    { href: '/readings', label: 'Reading history', icon: History },
  ];

  if (role === 'admin') {
    navLinks.push({ href: '/admin/users', label: 'User Management', icon: Users });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border/60 min-h-screen p-4 gap-6 sticky top-0 h-screen shadow-sm z-20">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <Link href="/dashboard" className="font-bold text-xl tracking-tight text-foreground hover:text-primary transition-colors">UtilityTrack</Link>
      </div>

      <nav className="flex-1 space-y-1.5" aria-label="Main navigation">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard');
          return (
            <Link 
              key={link.href}
              href={link.href} 
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-5 border-t border-border/60 space-y-4">
        <div className="px-2">
          <p className="text-sm font-semibold truncate text-foreground" title={email}>{email}</p>
          <p className="text-xs text-muted-foreground capitalize mt-0.5 flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", role === 'admin' ? 'bg-primary' : 'bg-amber-500')}></span>
            Role: {role}
          </p>
        </div>
        <form action={signOut}>
          <Button variant="ghost" type="submit" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
