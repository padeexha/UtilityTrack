'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const { error: signupError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signupError) throw signupError;

        if (data.session) {
          router.push('/dashboard');
          router.refresh();
        } else {
          setMessage('Account created. Check your email to confirm the account, then sign in.');
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative gradient blob */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      
      <Card className="w-full max-w-md relative z-10 shadow-xl border-border/50 bg-card/90 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">UtilityTrack</span>
          </div>
          <CardTitle className="text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create an account'}</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Enter your credentials to access the dashboard.' : 'Sign up to start managing utility readings.'}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="John Doe" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>

            {error && <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">{error}</div>}
            {message && <div className="p-3 text-sm rounded-md bg-primary/10 text-primary border border-primary/20">{message}</div>}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
                setMessage('');
              }}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
              New accounts start as workers. Promote the first account to admin using the SQL shown in the README.
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
