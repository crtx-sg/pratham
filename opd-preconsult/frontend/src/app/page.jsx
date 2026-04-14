'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, setToken } from '../lib/api';
import { t } from '../lib/i18n';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const qr = searchParams.get('qr');
    if (qr) handleQR(qr);
  }, [searchParams]);

  async function handleQR(payload) {
    setLoading(true);
    setError('');
    try {
      const result = await api.scan(payload);
      setToken(result.token);
      sessionStorage.setItem('token', result.token);
      sessionStorage.setItem('session_id', result.session.id);
      sessionStorage.setItem('department', result.session.department);
      sessionStorage.setItem('lang', lang);
      router.push('/patient/register');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="card" style={{ justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🏥</div>
        <h1 style={{ fontSize: 24, color: 'var(--primary)' }}>{t('welcome', lang)}</h1>
        <p style={{ color: 'var(--text-light)' }}>{t('scan_prompt', lang)}</p>

        <div className="lang-selector">
          {[['en', 'English'], ['hi', 'हिंदी'], ['te', 'తెలుగు']].map(([code, label]) => (
            <button
              key={code}
              className={`lang-btn ${lang === code ? 'active' : ''}`}
              onClick={() => setLang(code)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ width: '100%', marginTop: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8 }}>Demo: enter QR payload</p>
          <input className="input" placeholder="Base64 QR payload" id="qr-input" />
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            disabled={loading}
            onClick={() => {
              const val = document.getElementById('qr-input').value;
              if (val) handleQR(val);
            }}
          >
            {loading ? 'Loading...' : 'Start Session'}
          </button>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 14 }}>{error}</p>}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}><p>Loading...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}
