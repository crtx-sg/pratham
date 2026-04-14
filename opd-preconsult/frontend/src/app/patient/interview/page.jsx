'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../../lib/api';
import { t } from '../../../lib/i18n';
import QuestionCard from '../../../components/QuestionCard';
import TriageBadge from '../../../components/TriageBadge';

export default function Interview() {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const [question, setQuestion] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [triageAlert, setTriageAlert] = useState(null);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    const l = sessionStorage.getItem('lang') || 'en';
    setLang(l);
    const token = sessionStorage.getItem('token');
    if (token) setToken(token);
    const sid = sessionStorage.getItem('session_id');
    setSessionId(sid);
    if (sid) loadNext(sid);
  }, []);

  async function loadNext(sid) {
    setLoading(true);
    try {
      const res = await api.nextQuestion(sid || sessionId);
      if (res.done) {
        setDone(true);
      } else {
        setQuestion(res.question);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(answerRaw) {
    if (!question) return;
    setLoading(true);
    try {
      const result = await api.submitAnswer({
        question_id: question.id,
        answer_raw: answerRaw,
        answer_structured: { value: answerRaw },
        input_mode: 'text',
      });

      if (result.triage_flag === 'RED') {
        setTriageAlert('RED');
      }

      await loadNext(sessionId);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  if (triageAlert === 'RED') {
    return (
      <div className="screen" style={{ background: 'var(--red)', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ color: '#fff', fontSize: 64 }}>🏥</div>
        <h1 style={{ color: '#fff', fontSize: 28, margin: '16px 0' }}>{t('emergency', lang)}</h1>
        <TriageBadge level="RED" />
        <button
          className="btn"
          style={{ background: '#fff', color: 'var(--red)', marginTop: 32, maxWidth: 280 }}
          onClick={() => { setTriageAlert(null); loadNext(sessionId); }}
        >
          Continue Questions
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (done) {
    router.push('/patient/vitals');
    return null;
  }

  return (
    <div className="screen">
      <div className="progress-dots">
        <span className="dot done" /><span className="dot done" /><span className="dot done" /><span className="dot active" /><span className="dot" />
      </div>
      <h3 style={{ textAlign: 'center', color: 'var(--text-light)', marginBottom: 8 }}>{t('interview_title', lang)}</h3>
      {question && <QuestionCard question={question} lang={lang} onAnswer={handleAnswer} />}
    </div>
  );
}
