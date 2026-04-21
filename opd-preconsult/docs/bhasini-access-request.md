# PRATHAM — OPD Pre-Consultation AI Agent

**Organization:** Coherentix Technologies
**Contact:** sg@coherentix.com

---

## Product Summary

Pratham is an AI-powered pre-consultation system for Indian hospital Outpatient Departments (OPDs). It collects patient history, symptoms, medications, and vitals during the waiting period — in the patient's native language — and delivers a structured clinical summary to the doctor before the consultation begins.

## Problem Addressed

Indian OPDs handle 2,000–15,000 patients daily. Average consultation time is under 2 minutes. Patients often cannot articulate their history clearly in English to the doctor. Language barriers and time pressure lead to missed diagnoses and incomplete medical records.

## How Bhasini STT/TTS Enables Pratham

| Use Case | Bhasini Service Needed | Languages |
|----------|----------------------|-----------|
| Patient symptom interview via voice | ASR (Speech-to-Text) | Hindi, Telugu, Tamil, Kannada, Bengali, Marathi |
| Reading questions aloud to low-literacy patients | TTS (Text-to-Speech) | Hindi, Telugu, Tamil, Kannada, Bengali, Marathi |
| WhatsApp voice note processing | ASR (Speech-to-Text) | Hindi, Telugu |
| Ambient doctor-patient consultation recording | ASR (Speech-to-Text) | Hindi-English code-mixed, Telugu-English |

## Current State

- Live POC deployed on Railway.app serving hospital pilots
- Patient-facing UI supports English, Hindi, Telugu
- Currently uses browser-native Web Speech API (limited accuracy for Indian languages) and OpenAI Whisper (English-only, sends data to US servers)
- Bhasini integration would enable: accurate Indian language transcription, on-shore data processing (DISHA compliance), and TTS for accessibility

## Technical Integration Plan

- Bhasini ASR replaces `openai.audio.transcriptions.create()` in our transcription pipeline
- Bhasini TTS adds audio output to the questionnaire flow for low-literacy patients
- Our backend (Python/FastAPI) will call Bhasini's Meity ULCA APIs via standard REST
- Expected volume: 50–200 ASR calls/day per hospital during pilot, scaling to 2,000+/day

## Alignment with Bhasini's Mission

- Healthcare access in Indian languages for underserved populations
- Data stays in India (DISHA/DPDP compliance)
- Open to contributing anonymized medical vocabulary datasets back to Bhasini for domain adaptation
- Non-commercial pilot phase; intended for public/government hospital deployment

## Requested Resources

1. API access to ASR pipeline (Hindi, Telugu — initial; expandable to 10+ languages)
2. API access to TTS pipeline (Hindi, Telugu)
3. Access to healthcare-domain language models if available
4. Inference endpoint with <3s latency for real-time voice input during patient interaction
