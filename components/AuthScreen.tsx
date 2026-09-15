'use client';

import { FormEvent, useState } from 'react';
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
  return <main className="auth-shell"><section className="auth-panel"><a className="brand" href="#"><span className="brand-mark" />formwell</a><span className="eyebrow">Your fitness, built around real life</span><h1>Let\'s get moving.</h1><p>Sign in or create your account with your Indian mobile number.</p><form onSubmit={login}><div className="field"><label>Mobile number</label><input autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /></div>{error && <div className="api-status error" role="alert">{error}</div>}<button className="primary dark-button" disabled={loading}>{loading ? 'Please wait...' : 'Login'}</button></form></section><aside className="auth-aside"><span className="eyebrow">Formwell</span><strong>Strong habits,<br />made personal.</strong></aside></main>;
}
