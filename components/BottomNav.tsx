'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Camera, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dash', icon: LayoutDashboard },
    { href: '/meters', label: 'Meters', icon: Building2 },
    { href: '/readings/new', label: 'Scan', icon: Camera },
    { href: '/readings', label: 'History', icon: History },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 z-50 flex justify-around items-center p-2 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard');
        
        return (
          <Link 
            key={link.href}
            href={link.href} 
            className={cn(
              "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-10 h-8 rounded-full mb-1 transition-colors",
              isActive ? "bg-primary/15" : "bg-transparent"
            )}>
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className={cn("text-[10px] font-medium tracking-wide", isActive ? "text-primary font-semibold" : "text-muted-foreground")}>
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
