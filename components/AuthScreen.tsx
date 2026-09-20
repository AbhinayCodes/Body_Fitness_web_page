'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { ApiError, clearDemoLogin, fitnessApi, setAccessToken } from '@/lib/api';

const phonePattern = /^(?:\+91|91)?[6-9]\d{9}$/;

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (isNewUser: boolean) => void }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = async (event: FormEvent) => {
    event.preventDefault();
    const compact = phoneNumber.replace(/[\s-]/g, '');
    if (!phonePattern.test(compact)) return setError('Enter a valid Indian mobile number.');
    setLoading(true); setError(null);
    try {
      const result = await fitnessApi.loginWithPhone(compact);
      setAccessToken(result.accessToken);
      clearDemoLogin();
      onAuthenticated(result.isNewUser);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return <main className="auth-shell"><section className="auth-panel"><Brand /><div className="eyebrow">Your next chapter starts here</div><h1>A little stronger.<br />Every day.</h1><p>Your training, meals, and progress. All in one place.</p><form onSubmit={login}><div className="field"><label htmlFor="phone-number">Mobile number</label><input id="phone-number" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} aria-describedby={error ? 'login-error' : undefined} /></div>{error && <div id="login-error" className="api-status error" role="alert">{error}</div>}<button className="primary dark-button" disabled={loading}>{loading ? 'Signing in...' : 'Continue'}<ArrowRight size={17} aria-hidden="true" /></button></form></section></main>;
}
