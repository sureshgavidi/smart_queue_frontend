import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, UserRole } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Shield, User, ArrowRight, Heart, Stethoscope } from 'lucide-react';

const LoginPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login, loginWithGoogle, signup } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (mode === 'signup') {
        const success = await signup(name, email, password, role);
        if (success) {
          navigate(role === 'admin' ? '/admin' : '/dashboard');
        } else {
          setError('Signup failed. Email might already be in use.');
        }
        return;
      }

      const success = await login(email, password, role);
      if (success) {
        navigate(role === 'admin' ? '/admin' : '/dashboard');
      } else {
        setError('Login failed. Please check your credentials and role.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    const success = await loginWithGoogle(role);
    if (success) {
      navigate(role === 'admin' ? '/admin' : '/dashboard');
      return;
    }
    setError(role === 'admin'
      ? 'Google admin login is allowed only for admin@hospital.com.'
      : 'Google sign-in failed. Please try again.');
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white blur-3xl shadow-[0_0_100px_rgba(255,255,255,0.3)]" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 12, repeat: Infinity }} className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-blue-400 blur-3xl" />
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl shadow-inner" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} 
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md mb-4 shadow-xl border border-white/20"
          >
            <img src="/logo.png" alt="MediQueue Logo" className="w-12 h-12 object-contain" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white font-display tracking-tight">MediQueue</h1>
          <p className="text-blue-100/80 mt-2 font-medium">Trusted Hospital Queue Management</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Role selector (login only) */}
          {mode === 'login' && (
            <div className="flex gap-3 mb-6">
              {([['user', User, 'Patient'], ['admin', Shield, 'Admin']] as const).map(([r, Icon, label]) => (
                <button key={r} onClick={() => { setError(''); setRole(r); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${role === r ? 'gradient-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Label htmlFor="name" className="text-foreground">Full Name</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith" className="mt-1" required />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@hospital.com" className="mt-1" required />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required />
            </div>

            <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity h-12 text-base font-semibold">
              {mode === 'login' ? `Sign in as ${role === 'admin' ? 'Admin' : 'Patient'}` : 'Create Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {error && (
              <p className="text-sm text-destructive mt-3">{error}</p>
            )}
          </form>

          <div className="mt-6 flex items-center justify-between">
            <span className="w-1/5 border-b lg:w-1/4"></span>
            <span className="text-xs text-center text-muted-foreground uppercase">or continue with</span>
            <span className="w-1/5 border-b lg:w-1/4"></span>
          </div>

          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            type="button"
            className="w-full mt-6 h-12 text-base font-medium flex items-center justify-center gap-2 hover:bg-muted/50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </Button>

          <div className="mt-6 text-center">
            <button onClick={() => { setError(''); setMode(mode === 'login' ? 'signup' : 'login'); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
