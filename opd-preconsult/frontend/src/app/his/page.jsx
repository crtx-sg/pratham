'use client';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import TriageBadge from '../../components/TriageBadge';
import ReactMarkdown from 'react-markdown';

export default function HISPage() {
  const [sessions, setSessions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ department: '', doctor_id: '', state: '' });

  useEffect(() => {
    loadData();
    api.listDoctors().then(setDoctors).catch(() => {});
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { loadData(); }, [filters]);

  async function loadData() {
    try {
      const params = {};
      if (filters.department) params.department = filters.department;
      if (filters.doctor_id) params.doctor_id = filters.doctor_id;
      if (filters.state) params.state = filters.state;
      setSessions(await api.allSessions(params));
    } catch {}
  }

  async function selectSession(s) {
    setSelected(s);
    setReport(null);
    setLoading(true);
    try { setReport(await api.getReport(s.id)); } catch { setReport(null); }
    setLoading(false);
  }

  async function handleReassign(sessionId, targetDoctorId) {
    if (!targetDoctorId) return;
    try {
      await api.doctorReassign(sessionId, targetDoctorId);
      loadData();
      if (selected?.id === sessionId) {
        const updated = sessions.find(s => s.id === sessionId);
        if (updated) setSelected({ ...updated, assigned_doctor_id: targetDoctorId });
      }
    } catch (err) {
      alert('Reassign failed: ' + err.message);
    }
  }

  async function handleUnassign(sessionId) {
    // Use the reassign endpoint with null — but we need unassign via direct API
    // Actually we have doctorUnassign but it needs a doctor token. For HIS, use reassign route workaround.
    // Let's call the node backend directly for unassign
    try {
      const res = await fetch(`/api/doctor/reassign/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_doctor_id: null }),
      });
      if (!res.ok) throw new Error('Failed');
      loadData();
    } catch {
      // Fallback: set via session endpoint
      alert('Unassign requires doctor login. Use reassign instead.');
    }
  }

  // Stats
  const byDoctor = {};
  sessions.forEach(s => {
    const dname = s.doctor_name || 'Unassigned';
    if (!byDoctor[dname]) byDoctor[dname] = { total: 0, complete: 0, active: 0, red: 0 };
    byDoctor[dname].total++;
    if (s.state === 'COMPLETE') byDoctor[dname].complete++;
    else byDoctor[dname].active++;
    if (s.triage_level === 'RED') byDoctor[dname].red++;
  });

  const departments = [...new Set(sessions.map(s => s.department).filter(Boolean))];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, color: 'var(--primary)' }}>🏥 HIS Dashboard</h1>
        <span style={{ fontSize: 13, color: 'var(--text-light)' }}>Hospital Information System — Patient & Doctor Overview</span>
        <button className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: 13, minHeight: 36, width: 'auto', padding: '0 16px' }}
          onClick={loadData}>Refresh</button>
      </div>

      {/* Doctor Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(byDoctor).map(([name, stats]) => (
          <div key={name} style={{
            background: '#fff', borderRadius: 12, padding: 16, minWidth: 200, flex: '1 1 200px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer',
            border: filters.doctor_id && doctors.find(d => d.name === name)?.id === filters.doctor_id ? '2px solid var(--secondary)' : '1px solid #E0E0E0'
          }}
            onClick={() => {
              const doc = doctors.find(d => d.name === name);
              setFilters(f => ({ ...f, doctor_id: f.doctor_id === doc?.id ? '' : (doc?.id || '') }));
            }}>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{name}</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13 }}>
              <span><strong>{stats.total}</strong> total</span>
              <span style={{ color: 'var(--green)' }}><strong>{stats.complete}</strong> done</span>
              <span style={{ color: 'var(--secondary)' }}><strong>{stats.active}</strong> active</span>
              {stats.red > 0 && <span style={{ color: 'var(--red)' }}><strong>{stats.red}</strong> RED</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 160 }} value={filters.department}
          onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input" style={{ width: 200 }} value={filters.doctor_id}
          onChange={e => setFilters(f => ({ ...f, doctor_id: e.target.value }))}>
          <option value="">All Doctors</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.department})</option>)}
        </select>
        <select className="input" style={{ width: 160 }} value={filters.state}
          onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}>
          <option value="">All States</option>
          <option value="COMPLETE">Completed</option>
          <option value="INTERVIEW">In Interview</option>
          <option value="VITALS">Vitals</option>
          <option value="CONSENTED">Consented</option>
          <option value="REGISTERED">Registered</option>
          <option value="INIT">Init</option>
        </select>
        {(filters.department || filters.doctor_id || filters.state) && (
          <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}
            onClick={() => setFilters({ department: '', doctor_id: '', state: '' })}>
            Clear filters
          </button>
        )}
        <span style={{ fontSize: 13, color: 'var(--text-light)', alignSelf: 'center', marginLeft: 8 }}>
          {sessions.length} patient{sessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Patient Table */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <thead>
              <tr style={{ background: 'var(--primary)', color: '#fff', fontSize: 13 }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Patient</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Dept</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Triage</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>State</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Doctor</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Assign / Reassign</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} onClick={() => selectSession(s)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #F0F0F0',
                    background: selected?.id === s.id ? '#EBF5FB' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    <strong>{s.patient_name || 'Unregistered'}</strong>
                    <br /><span style={{ color: 'var(--text-light)', fontSize: 11 }}>
                      {s.patient_age ? `${s.patient_age}y` : ''} {s.patient_gender || ''} · #{s.queue_slot || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{s.department}</td>
                  <td style={{ padding: '10px 12px' }}><TriageBadge level={s.triage_level} /></td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: s.state === 'COMPLETE' ? '#D5F5E3' : s.state === 'INTERVIEW' ? '#D6EAF8' : '#F8F9FA',
                      color: s.state === 'COMPLETE' ? '#1E8449' : 'var(--text)'
                    }}>{s.state}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    {s.doctor_name || <span style={{ color: 'var(--amber)', fontSize: 11 }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={s.assigned_doctor_id || ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val) handleReassign(s.id, val);
                        else handleUnassign(s.id);
                      }}
                      style={{ border: '1px solid #ccc', borderRadius: 6, padding: '4px 6px', fontSize: 12, cursor: 'pointer', maxWidth: 160 }}>
                      <option value="">Unassigned</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: 32 }}>No sessions match filters</p>
          )}
        </div>

        {/* Report Sidebar (when selected) */}
        {selected && (
          <div style={{ width: 480, flexShrink: 0, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TriageBadge level={selected.triage_level} />
              <h3 style={{ fontSize: 16 }}>{selected.patient_name}</h3>
              <button onClick={() => { setSelected(null); setReport(null); }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>
              {selected.patient_age ? `${selected.patient_age}y` : ''} {selected.patient_gender || ''} · {selected.department} · Doctor: {selected.doctor_name || 'Unassigned'}
            </p>

            {loading && <p style={{ color: 'var(--text-light)' }}>Loading report...</p>}
            {report ? (
              <div style={{ lineHeight: 1.7, fontSize: 14 }}>
                <ReactMarkdown>{report.report_md}</ReactMarkdown>
              </div>
            ) : (
              !loading && <p style={{ color: 'var(--text-light)' }}>No report generated yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
