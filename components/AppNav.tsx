import Link from 'next/link';
import { signOut } from '@/app/(protected)/actions';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Building2, Camera, History, FileSpreadsheet, Receipt, LogOut, Users } from 'lucide-react';

export function AppNav({ email, role }: { email: string; role: string }) {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r min-h-screen p-4 gap-6 sticky top-0 h-screen">
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <Link href="/dashboard" className="font-bold text-xl tracking-tight text-foreground">UtilityTrack</Link>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-foreground">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link href="/meters" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-foreground">
          <Building2 className="h-4 w-4" />
          Premises & meters
        </Link>
        <Link href="/readings/new" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-foreground">
          <Camera className="h-4 w-4" />
          Take reading
        </Link>
        <Link href="/readings" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-foreground">
          <History className="h-4 w-4" />
          Reading history
        </Link>
        {role === 'admin' && (
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-foreground">
            <Users className="h-4 w-4" />
            User Management
          </Link>
        )}
      </nav>

      <div className="mt-auto pt-4 border-t space-y-4">
        <div className="px-2">
          <p className="text-sm font-medium truncate" title={email}>{email}</p>
          <p className="text-xs text-muted-foreground capitalize">Role: {role}</p>
        </div>
        <form action={signOut}>
          <Button variant="secondary" type="submit" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
