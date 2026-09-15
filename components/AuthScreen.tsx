'use client';

import { FormEvent, useState } from 'react';
import { ApiError, fitnessApi, setAccessToken } from '@/lib/api';

const phonePattern = /^(?:\+91|91)?[6-9]\d{9}$/;

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (isNewUser: boolean) => void }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
    const compact = phoneNumber.replace(/[\s-]/g, '');
    if (!phonePattern.test(compact)) return setError('Enter a valid Indian mobile number.');
    setLoading(true); setError(null);
    try { await fitnessApi.sendOtp(compact); setPhoneNumber(compact); setSent(true); } catch (reason) { setError(message(reason)); } finally { setLoading(false); }
  };
  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code.');
    setLoading(true); setError(null);
    try { const result = await fitnessApi.verifyOtp(phoneNumber, code); setAccessToken(result.accessToken); onAuthenticated(result.isNewUser); } catch (reason) { setError(message(reason)); } finally { setLoading(false); }
  };
  return <main className="auth-shell"><section className="auth-panel"><a className="brand" href="#"><span className="brand-mark" />formwell</a><span className="eyebrow">Your fitness, built around real life</span><h1>{sent ? 'Enter your code.' : 'Let\'s get moving.'}</h1><p>{sent ? `We sent a verification code to ${phoneNumber}.` : 'Sign in or create your account with your Indian mobile number.'}</p><form onSubmit={sent ? verifyOtp : sendOtp}>{!sent ? <div className="field"><label>Mobile number</label><input autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /></div> : <div className="field"><label>Verification code</label><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></div>}{error && <div className="api-status error" role="alert">{error}</div>}<button className="primary dark-button" disabled={loading}>{loading ? 'Please wait...' : sent ? 'Verify and continue' : 'Send OTP'}</button></form>{sent && <button className="auth-link" onClick={() => { setSent(false); setCode(''); setError(null); }}>Use a different number</button>}</section><aside className="auth-aside"><span className="eyebrow">Formwell</span><strong>Strong habits,<br />made personal.</strong></aside></main>;
}

function message(reason: unknown) { return reason instanceof ApiError ? reason.message : 'Something went wrong. Please try again.'; }