'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../../lib/api';
import { t } from '../../../lib/i18n';

export default function Register() {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const [form, setForm] = useState({ patient_name: '', patient_phone: '', patient_age: '', patient_gender: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('lang') || 'en';
    setLang(saved);
    const token = sessionStorage.getItem('token');
    if (token) setToken(token);
    if (!token) router.push('/');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.register({
        ...form,
        patient_age: form.patient_age ? parseInt(form.patient_age) : null,
        language: lang,
      });
      router.push('/patient/consent');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="progress-dots">
        <span className="dot active" /><span className="dot" /><span className="dot" /><span className="dot" /><span className="dot" />
      </div>
      <form className="card" style={{ gap: 16 }} onSubmit={handleSubmit}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary)' }}>{t('register', lang)}</h2>

        <div>
          <label style={{ fontSize: 14, color: 'var(--text-light)' }}>{t('name', lang)} *</label>
          <input className="input" required value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 14, color: 'var(--text-light)' }}>{t('phone', lang)} *</label>
          <input className="input" type="tel" required value={form.patient_phone} onChange={e => setForm({ ...form, patient_phone: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, color: 'var(--text-light)' }}>{t('age', lang)}</label>
            <input className="input" type="number" value={form.patient_age} onChange={e => setForm({ ...form, patient_age: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 14, color: 'var(--text-light)' }}>{t('gender', lang)}</label>
            <select className="input" value={form.patient_gender} onChange={e => setForm({ ...form, patient_gender: e.target.value })}>
              <option value="">--</option>
              <option value="M">{t('male', lang)}</option>
              <option value="F">{t('female', lang)}</option>
              <option value="O">{t('other', lang)}</option>
            </select>
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '...' : t('next', lang)}
        </button>
      </form>
    </div>
  );
}
