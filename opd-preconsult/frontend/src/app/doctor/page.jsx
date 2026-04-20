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
  const [rightTab, setRightTab] = useState('report'); // report | prescribe | scribe

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
    setRightTab('report');
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

            {/* Report / Prescribe tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              <button className={`btn ${rightTab === 'report' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 13, minHeight: 32, width: 'auto', padding: '0 16px' }}
                onClick={() => setRightTab('report')}>Report</button>
              <button className={`btn ${rightTab === 'prescribe' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 13, minHeight: 32, width: 'auto', padding: '0 16px' }}
                onClick={() => setRightTab('prescribe')}>Prescribe</button>
              <button className={`btn ${rightTab === 'scribe' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 13, minHeight: 32, width: 'auto', padding: '0 16px' }}
                onClick={() => setRightTab('scribe')}>Scribe</button>
            </div>

            {rightTab === 'report' && (
              <>
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
                        <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => handleFeedback('accurate')}>Report Accurate</button>
                        <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--red)', color: 'var(--red)' }}
                          onClick={() => handleFeedback('inaccurate')}>Incorrect History</button>
                      </div>
                    )}
                  </>
                ) : (
                  !loading && <p style={{ color: 'var(--text-light)' }}>No report generated yet for this patient.</p>
                )}
              </>
            )}

            {rightTab === 'prescribe' && (
              <PrescriptionPanel session={selected} doctor={doctor} />
            )}

            {rightTab === 'scribe' && (
              <ScribePanel session={selected} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const DRUG_LIST = [
  "warfarin","acenocoumarol","rivaroxaban","apixaban","heparin",
  "metoprolol","atenolol","propranolol","carvedilol","bisoprolol",
  "amlodipine","nifedipine","diltiazem","verapamil",
  "enalapril","ramipril","lisinopril","telmisartan","losartan","olmesartan",
  "furosemide","torsemide","spironolactone","hydrochlorothiazide",
  "aspirin","clopidogrel","ticagrelor","prasugrel",
  "atorvastatin","rosuvastatin","simvastatin",
  "metformin","glipizide","glimepiride","sitagliptin","vildagliptin",
  "empagliflozin","dapagliflozin","canagliflozin","insulin","pioglitazone",
  "digoxin","amiodarone","ivabradine","nitroglycerin","isosorbide",
  "pantoprazole","omeprazole","rabeprazole",
  "paracetamol","ibuprofen","diclofenac",
  "levothyroxine","carbimazole",
  "prednisolone","dexamethasone","methylprednisolone",
  "azithromycin","amoxicillin","ciprofloxacin","ceftriaxone",
  "montelukast","salbutamol","budesonide",
];

const FREQ_OPTIONS = ['OD', 'BD', 'TDS', 'QID', 'HS', 'SOS', 'Weekly'];

function PrescriptionPanel({ session, doctor }) {
  const [items, setItems] = useState([{ drug_name: '', dose: '', frequency: 'OD', duration: '', instructions: '' }]);
  const [allergies, setAllergies] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [notes, setNotes] = useState('');
  const [drugFilter, setDrugFilter] = useState('');
  const [existingRx, setExistingRx] = useState([]);

  useEffect(() => {
    if (session?.patient_phone) {
      api.getAllergies(session.patient_phone).then(setAllergies).catch(() => {});
    }
    if (session?.id) {
      api.getPrescriptions(session.id).then(setExistingRx).catch(() => {});
    }
    setSaved(null);
    setWarnings([]);
  }, [session?.id]);

  function addItem() {
    setItems([...items, { drug_name: '', dose: '', frequency: 'OD', duration: '', instructions: '' }]);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx, field, val) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  }

  async function checkInteractions() {
    const drugs = items.map(i => i.drug_name).filter(Boolean);
    const allergenList = allergies.map(a => a.allergen);
    if (drugs.length === 0) return;

    try {
      const result = await api.checkBulkInteractions({ drugs, patient_allergies: allergenList });
      setWarnings(result.warnings || []);
    } catch {
      setWarnings([]);
    }
  }

  async function handleSave() {
    const validItems = items.filter(i => i.drug_name);
    if (!validItems.length) return;

    // Check for blocks
    const blocks = warnings.filter(w => w.severity === 'block');
    if (blocks.length > 0) {
      if (!confirm(`There are ${blocks.length} BLOCKED interaction(s). Proceed anyway?`)) return;
    }

    setSaving(true);
    try {
      const result = await api.createPrescription({
        session_id: session.id,
        items: validItems.map(i => ({ ...i, warnings: warnings.filter(w => w.drug_a?.toLowerCase() === i.drug_name.toLowerCase() || w.drug_b?.toLowerCase() === i.drug_name.toLowerCase() || w.drug?.toLowerCase() === i.drug_name.toLowerCase()) })),
        notes,
      });
      setSaved(result);
      setExistingRx(prev => [{ ...result.prescription, items: result.items }, ...prev]);
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Allergies */}
      {allergies.length > 0 && (
        <div style={{ background: '#FADBD8', borderRadius: 8, padding: 10, fontSize: 13 }}>
          <strong>Known Allergies:</strong> {allergies.map(a => a.allergen).join(', ')}
        </div>
      )}

      {/* Existing prescriptions */}
      {existingRx.length > 0 && (
        <div style={{ background: '#F8F9FA', borderRadius: 8, padding: 10, fontSize: 12 }}>
          <strong>Previous Rx ({existingRx.length}):</strong>
          {existingRx.map((rx, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              {(rx.items || []).map(it => it.drug_name).join(', ')} — {new Date(rx.created_at).toLocaleDateString()}
            </div>
          ))}
        </div>
      )}

      {/* Prescription items */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #E0E0E0' }}>
        <h3 style={{ fontSize: 15, color: 'var(--primary)', marginBottom: 12 }}>New Prescription</h3>

        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 150 }}>
              {idx === 0 && <label style={{ fontSize: 10, color: 'var(--text-light)' }}>Drug</label>}
              <input className="input" list="drug-list" value={item.drug_name}
                onChange={e => updateItem(idx, 'drug_name', e.target.value)}
                placeholder="Drug name" style={{ minHeight: 34, fontSize: 13 }} />
            </div>
            <div style={{ flex: 1, minWidth: 70 }}>
              {idx === 0 && <label style={{ fontSize: 10, color: 'var(--text-light)' }}>Dose</label>}
              <input className="input" value={item.dose}
                onChange={e => updateItem(idx, 'dose', e.target.value)}
                placeholder="e.g. 5mg" style={{ minHeight: 34, fontSize: 13 }} />
            </div>
            <div style={{ width: 80 }}>
              {idx === 0 && <label style={{ fontSize: 10, color: 'var(--text-light)' }}>Freq</label>}
              <select className="input" value={item.frequency}
                onChange={e => updateItem(idx, 'frequency', e.target.value)}
                style={{ minHeight: 34, fontSize: 13 }}>
                {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 70 }}>
              {idx === 0 && <label style={{ fontSize: 10, color: 'var(--text-light)' }}>Duration</label>}
              <input className="input" value={item.duration}
                onChange={e => updateItem(idx, 'duration', e.target.value)}
                placeholder="e.g. 7 days" style={{ minHeight: 34, fontSize: 13 }} />
            </div>
            <button type="button" onClick={() => removeItem(idx)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, minHeight: 34 }}>
              ✕
            </button>
          </div>
        ))}

        <datalist id="drug-list">
          {DRUG_LIST.map(d => <option key={d} value={d.charAt(0).toUpperCase() + d.slice(1)} />)}
        </datalist>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={addItem}
            style={{ background: 'var(--secondary)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
            + Add Drug
          </button>
          <button type="button" onClick={checkInteractions}
            style={{ background: '#fff', border: '1px solid var(--secondary)', color: 'var(--secondary)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
            Check Interactions
          </button>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ borderRadius: 8, overflow: 'hidden' }}>
          {warnings.map((w, i) => (
            <div key={i} style={{
              background: w.severity === 'block' ? '#FADBD8' : '#FFF3CD',
              padding: 10, fontSize: 13, borderBottom: '1px solid rgba(0,0,0,0.1)'
            }}>
              <strong style={{ color: w.severity === 'block' ? '#C0392B' : '#856404' }}>
                {w.severity === 'block' ? 'BLOCKED' : 'WARNING'}:
              </strong>{' '}
              {w.description}
              {w.drug_a && w.drug_b && <span style={{ color: 'var(--text-light)' }}> ({w.drug_a} + {w.drug_b})</span>}
              {w.drug && w.allergy && <span style={{ color: 'var(--text-light)' }}> ({w.drug} / allergy: {w.allergy})</span>}
            </div>
          ))}
        </div>
      )}

      {/* Notes + Save */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-light)' }}>Notes (optional)</label>
        <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Additional instructions..." />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving || !items.some(i => i.drug_name)}>
        {saving ? 'Saving...' : 'Save & Generate QR'}
      </button>

      {/* QR Result */}
      {saved && (
        <div style={{ background: '#D5F5E3', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: '#1E8449', marginBottom: 8 }}>Prescription saved!</p>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8 }}>QR payload for pharmacy scanning:</p>
          <textarea className="input" readOnly value={saved.prescription?.qr_payload || ''}
            style={{ fontSize: 10, height: 60, fontFamily: 'monospace' }} onClick={e => e.target.select()} />
          <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>Copy and encode as QR code for pharmacy.</p>
        </div>
      )}
    </div>
  );
}

function ScribePanel({ session }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [soap, setSoap] = useState(null);
  const [processing, setProcessing] = useState('');
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    // Load existing SOAP if available
    if (session?.id) {
      api.getSOAP(session.id).then(data => {
        setTranscript(data.transcript || '');
        setSoap(data.soap || null);
      }).catch(() => {});
    }
    return () => { if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop(); };
  }, [session?.id]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunks.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      recorder.start(1000);
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied: ' + err.message);
    }
  }

  async function stopRecording() {
    if (!mediaRecorder.current) return;

    return new Promise(resolve => {
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
        mediaRecorder.current = null;
        setRecording(false);

        // Transcribe
        setProcessing('Transcribing audio...');
        try {
          const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
          const result = await api.transcribeAudio(file, session?.id);
          setTranscript(result.transcript || '');
          setProcessing('');
        } catch (err) {
          setProcessing('');
          alert('Transcription failed: ' + err.message);
        }
        resolve();
      };
      mediaRecorder.current.stop();
    });
  }

  async function extractSOAP() {
    if (!transcript) return;
    setProcessing('Extracting SOAP notes...');
    try {
      const result = await api.extractSOAP({ transcript, session_id: session?.id });
      setSoap(result.soap);
    } catch (err) {
      alert('SOAP extraction failed: ' + err.message);
    }
    setProcessing('');
  }

  function renderSOAPSection(title, data) {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) return null;
    return (
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: 14, color: 'var(--primary)', marginBottom: 4, borderBottom: '1px solid #E0E0E0', paddingBottom: 4 }}>{title}</h4>
        {typeof data === 'string' ? (
          <p style={{ fontSize: 13 }}>{data}</p>
        ) : Array.isArray(data) ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {data.map((item, i) => <li key={i} style={{ fontSize: 13 }}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}
          </ul>
        ) : (
          Object.entries(data).filter(([_, v]) => v && v !== 'not discussed' && v !== 'Not discussed').map(([key, val]) => (
            <div key={key} style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-light)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}: </span>
              {Array.isArray(val) ? (
                <span style={{ fontSize: 13 }}>{val.join(', ')}</span>
              ) : typeof val === 'object' ? (
                <span style={{ fontSize: 13 }}>{JSON.stringify(val)}</span>
              ) : (
                <span style={{ fontSize: 13 }}>{val}</span>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#F8F9FA', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-light)' }}>
        Record the consultation. Audio is transcribed and discarded (zero-retention). The transcript is processed into SOAP notes.
      </div>

      {/* Recording controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {!recording ? (
          <button className="btn btn-primary" onClick={startRecording} disabled={!!processing}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto', padding: '0 20px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
            Start Recording
          </button>
        ) : (
          <button className="btn" onClick={stopRecording}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto', padding: '0 20px', background: 'var(--red)', color: '#fff', border: 'none' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fff', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            Stop Recording
          </button>
        )}
        {processing && <span style={{ fontSize: 13, color: 'var(--secondary)' }}>{processing}</span>}
      </div>

      {/* Transcript */}
      {transcript && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: 15, color: 'var(--primary)' }}>Transcript</h3>
            <button className="btn btn-outline" onClick={extractSOAP} disabled={!!processing}
              style={{ fontSize: 12, minHeight: 28, width: 'auto', padding: '0 12px', marginLeft: 'auto' }}>
              Extract SOAP Notes
            </button>
          </div>
          <textarea className="input" value={transcript}
            onChange={e => setTranscript(e.target.value)}
            rows={8} style={{ fontSize: 13, lineHeight: 1.6 }} />
        </div>
      )}

      {/* SOAP Notes */}
      {soap && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #E0E0E0' }}>
          <h3 style={{ fontSize: 15, color: 'var(--primary)', marginBottom: 12 }}>SOAP Notes</h3>
          {renderSOAPSection('Subjective', soap.subjective)}
          {renderSOAPSection('Objective', soap.objective)}
          {renderSOAPSection('Assessment', soap.assessment)}
          {renderSOAPSection('Plan', soap.plan)}
          {soap._note && (
            <p style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic', marginTop: 8 }}>{soap._note}</p>
          )}
        </div>
      )}
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
