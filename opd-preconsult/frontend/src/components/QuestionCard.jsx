'use client';
import { useState } from 'react';
import VoiceButton from './VoiceButton';

export default function QuestionCard({ question, lang, onAnswer }) {
  const [value, setValue] = useState('');

  const text = question[`text_${lang}`] || question.text_en;
  const options = question.options_json || [];
  const type = question.q_type;

  function submit(val) {
    const answer = val || value;
    if (!answer && question.required) return;
    onAnswer(answer);
    setValue('');
  }

  return (
    <div className="card" style={{ gap: 24, justifyContent: 'center' }}>
      <h2 style={{ fontSize: 20, lineHeight: 1.4, textAlign: 'center' }}>{text}</h2>

      {type === 'BOOLEAN' && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => submit('yes')}>
            {lang === 'hi' ? 'हाँ' : lang === 'te' ? 'అవును' : 'Yes'}
          </button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => submit('no')}>
            {lang === 'hi' ? 'नहीं' : lang === 'te' ? 'కాదు' : 'No'}
          </button>
        </div>
      )}

      {type === 'SINGLE_SELECT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map(opt => (
            <button
              key={opt.value}
              className="btn btn-outline"
              onClick={() => submit(opt.value)}
            >
              {opt[`label_${lang}`] || opt.label_en}
            </button>
          ))}
        </div>
      )}

      {type === 'FREE_TEXT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            className="input"
            rows={3}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={lang === 'hi' ? 'यहाँ टाइप करें...' : lang === 'te' ? 'ఇక్కడ టైప్ చేయండి...' : 'Type here...'}
          />
          <VoiceButton lang={lang} onResult={v => { setValue(v); submit(v); }} />
          <button className="btn btn-primary" onClick={() => submit()} disabled={!value}>
            {lang === 'hi' ? 'अगला' : lang === 'te' ? 'తదుపరి' : 'Next'}
          </button>
        </div>
      )}

      {type === 'NUMERIC' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="number"
            className="input"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => submit()} disabled={!value}>
            {lang === 'hi' ? 'अगला' : lang === 'te' ? 'తదుపరి' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
