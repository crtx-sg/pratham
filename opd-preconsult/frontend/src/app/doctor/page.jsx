'use client';
import { useState, useEffect, useRef } from 'react';
import { api, setToken } from '../../lib/api';
import TriageBadge from '../../components/TriageBadge';
import ReactMarkdown from 'react-markdown';

function PinLogin({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.doctorLogin(phone, pin);
      onLogin(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff', borderRadius: 16, padding: 32, width: 360,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👨‍⚕️</div>
          <h2 style={{ color: 'var(--primary)', fontSize: 20 }}>Doctor Login</h2>
          <p style={{ color: 'var(--text-light)', fontSize: 13, marginTop: 4 }}>Enter your phone number and PIN</p>
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-light)' }}>Phone Number</label>
          <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876500001" required autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-light)' }}>PIN (4-6 digits)</label>
          <input className="input" type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" required
            style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }} />
        </div>
        {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading || pin.length < 4}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-light)', textAlign: 'center' }}>Demo: Phone 9876500001, PIN 1234</p>
      </form>
    </div>
  );
}

function DoctorDashboard({ doctor }) {
  const [tab, setTab] = useState('queue'); // queue | consulted
  const [sessions, setSessions] = useState([]);
  const [consulted, setConsulted] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    loadQueue();
    api.listDoctors(doctor.department).then(setDoctors).catch(() => {});
    const interval = setInterval(loadQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadQueue() {
    try { setSessions(await api.doctorQueue()); } catch {}
  }

  async function loadConsulted() {
    try { setConsulted(await api.doctorConsulted()); } catch {}
  }

  function switchTab(t) {
    setTab(t);
    setSelected(null);
    setReport(null);
    if (t === 'consulted') loadConsulted();
    if (t === 'queue') loadQueue();
  }

  async function selectSession(s) {
    setSelected(s);
    setReport(null);
    setLoading(true);
    if (!s.assigned_doctor_id && tab === 'queue') {
      try { await api.doctorAssign(s.id); loadQueue(); } catch {}
    }
    try { setReport(await api.getReport(s.id)); } catch { setReport(null); }
    setLoading(false);
  }

  async function handleUnassign() {
    if (!selected) return;
    if (!confirm('Release this patient back to the unassigned pool?')) return;
    await api.doctorUnassign(selected.id);
    setSelected(null);
    setReport(null);
    loadQueue();
  }

  async function handleReassign(targetId) {
    if (!selected || !targetId) return;
    await api.doctorReassign(selected.id, targetId);
    setSelected(null);
    setReport(null);
    loadQueue();
  }

  async function handleFeedback(val) {
    if (!selected) return;
    await api.submitFeedback(selected.id, val);
    alert('Feedback submitted');
  }

  function handleLogout() {
    setToken(null);
    sessionStorage.removeItem('doctor_token');
    sessionStorage.removeItem('doctor_info');
    window.location.reload();
  }

  const otherDoctors = doctors.filter(d => d.id !== doctor.id);
  const currentList = tab === 'queue' ? sessions : consulted;

  return (
    <div className="doctor-layout" style={{ display: 'flex', gap: 16, minHeight: '100vh' }}>
      {/* Left Panel */}
      <div style={{ width: 340, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, color: 'var(--primary)' }}>{doctor.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{doctor.department} Department</p>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Logout</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          <button className={`btn ${tab === 'queue' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, fontSize: 13, minHeight: 36 }} onClick={() => switchTab('queue')}>
            Queue ({sessions.length})
          </button>
          <button className={`btn ${tab === 'consulted' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, fontSize: 13, minHeight: 36 }} onClick={() => switchTab('consulted')}>
            Consulted
          </button>
        </div>

        {tab === 'queue' && (
          <button className="btn btn-outline" style={{ fontSize: 13, marginBottom: 8 }} onClick={loadQueue}>Refresh</button>
        )}

        {currentList.map(s => (
          <div key={s.id} className="queue-item" onClick={() => selectSession(s)}
            style={{ border: selected?.id === s.id ? '2px solid var(--secondary)' : 'none' }}>
            <TriageBadge level={s.triage_level} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{s.patient_name || 'Unregistered'}</p>
              <p style={{ fontSize: 11, color: 'var(--text-light)' }}>
                {s.patient_age ? `${s.patient_age}y` : ''} {s.patient_gender || ''} · {s.state} · #{s.queue_slot || '-'}
              </p>
              {tab === 'queue' && !s.assigned_doctor_id && (
                <span style={{ fontSize: 10, background: '#FFF3CD', color: '#856404', padding: '2px 6px', borderRadius: 4 }}>Unassigned</span>
              )}
              {tab === 'consulted' && s.doctor_feedback && (
                <span style={{ fontSize: 10, background: s.doctor_feedback === 'accurate' ? '#D5F5E3' : '#FADBD8',
                  color: s.doctor_feedback === 'accurate' ? '#1E8449' : '#C0392B', padding: '2px 6px', borderRadius: 4 }}>
                  {s.doctor_feedback === 'accurate' ? '✓ Accurate' : '✗ Inaccurate'}
                </span>
              )}
            </div>
          </div>
        ))}
        {currentList.length === 0 && <p style={{ color: 'var(--text-light)', padding: 16, textAlign: 'center' }}>
          {tab === 'queue' ? 'No patients in queue' : 'No consulted patients yet'}
        </p>}
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, background: 'var(--card-bg)', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {!selected && <p style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: 40 }}>Select a patient from the {tab}</p>}

        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <TriageBadge level={selected.triage_level} />
              <h2 style={{ fontSize: 20 }}>{selected.patient_name}</h2>
              <span style={{ color: 'var(--text-light)', fontSize: 14 }}>
                {selected.patient_age ? `${selected.patient_age}y` : ''} {selected.patient_gender || ''} · {selected.department}
              </span>
              {/* Action buttons */}
              {tab === 'queue' && selected.assigned_doctor_id && (
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                  <button onClick={handleUnassign}
                    style={{ background: 'none', border: '1px solid #E74C3C', color: '#E74C3C', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>
                    Release
                  </button>
                  {otherDoctors.length > 0 && (
                    <select onChange={e => { if (e.target.value) handleReassign(e.target.value); e.target.value = ''; }}
                      style={{ border: '1px solid #ccc', borderRadius: 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                      <option value="">Reassign to...</option>
                      {otherDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>

            {loading && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ width: '100%', height: 20, background: '#F0F0F0', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ width: '70%', height: 16, background: '#F0F0F0', borderRadius: 4, marginBottom: 8 }} />
                <p style={{ color: 'var(--text-light)', marginTop: 12 }}>Loading report...</p>
              </div>
            )}

            {report ? (
              <>
                <div style={{ lineHeight: 1.8, fontSize: 15 }}>
                  <ReactMarkdown>{report.report_md}</ReactMarkdown>
                </div>
                {tab === 'queue' && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 24, borderTop: '1px solid #E0E0E0', paddingTop: 16 }}>
                    <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => handleFeedback('accurate')}>✓ Report Accurate</button>
                    <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--red)', color: 'var(--red)' }}
                      onClick={() => handleFeedback('inaccurate')}>✗ Incorrect History</button>
                  </div>
                )}
              </>
            ) : (
              !loading && <p style={{ color: 'var(--text-light)' }}>No report generated yet for this patient.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DoctorApp() {
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('doctor_token');
    const savedDoc = sessionStorage.getItem('doctor_info');
    if (saved && savedDoc) {
      setToken(saved);
      setDoctor(JSON.parse(savedDoc));
    }
  }, []);

  function handleLogin(result) {
    setToken(result.token);
    sessionStorage.setItem('doctor_token', result.token);
    sessionStorage.setItem('doctor_info', JSON.stringify(result.doctor));
    setDoctor(result.doctor);
  }

  if (!doctor) return <PinLogin onLogin={handleLogin} />;
  return <DoctorDashboard doctor={doctor} />;
}
