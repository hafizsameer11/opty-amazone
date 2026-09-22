'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import GlobalLanguageDock from '@/components/ui/GlobalLanguageDock';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading, login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoggingIn(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(true);
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlobalLanguageDock position="top-right" />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <GlobalLanguageDock position="top-right" />
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('loginTitle')}</h1>
          <p className="text-slate-500">{t('loginSubtitle')}</p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6" onClose={() => setError(false)}>
            {t('loginFailed')}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label={t('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              label={t('password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loggingIn}
            className="w-full"
          >
            {loggingIn ? t('signingIn') : t('signIn')}
          </Button>
        </form>
      </div>
    </div>
  );
}
