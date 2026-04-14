import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import anthropic

from ..db import query, execute

router = APIRouter(prefix="/api/report", tags=["report"])

PROMPT_DIR = Path(__file__).parent.parent / "prompts"

class ReportRequest(BaseModel):
    session_id: str

@router.post("/generate")
async def generate_report(req: ReportRequest):
    # Gather all session data
    session = query("SELECT * FROM sessions WHERE id = %s", (req.session_id,))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session = session[0]

    answers = query(
        "SELECT question_id, answer_raw FROM session_answers WHERE session_id = %s ORDER BY created_at",
        (req.session_id,),
    )

    vitals = query(
        "SELECT * FROM session_vitals WHERE session_id = %s ORDER BY recorded_at DESC LIMIT 1",
        (req.session_id,),
    )
    vitals = vitals[0] if vitals else {}

    # Load confirmed documents
    docs = query(
        "SELECT * FROM session_documents WHERE session_id = %s AND patient_confirmed = true ORDER BY created_at",
        (req.session_id,),
    )

    # Build structured document data grouped by type
    documents_data = []
    all_doc_meds = []
    all_doc_labs = []
    for doc in docs:
        structured = doc.get("ocr_structured") or {}
        if isinstance(structured, str):
            structured = json.loads(structured)

        doc_entry = {
            "type": doc.get("doc_type", "unknown"),
            "uploaded_at": str(doc.get("created_at", "")),
            "confidence": doc.get("ocr_confidence"),
            "raw_text_excerpt": (doc.get("ocr_raw") or "")[:500],
        }

        meds = structured.get("medications", [])
        if meds:
            doc_entry["medications"] = meds
            for m in meds:
                m["source_doc_type"] = doc.get("doc_type")
                m["source_date"] = str(doc.get("created_at", ""))[:10]
            all_doc_meds.extend(meds)

        labs = structured.get("lab_values", [])
        if labs:
            doc_entry["lab_values"] = labs
            for l in labs:
                l["source_doc_type"] = doc.get("doc_type")
                l["source_date"] = str(doc.get("created_at", ""))[:10]
            all_doc_labs.extend(labs)

        documents_data.append(doc_entry)

    # Build session JSON for the LLM
    session_json = {
        "patient": {
            "name": session.get("patient_name"),
            "age": session.get("patient_age"),
            "gender": session.get("patient_gender"),
            "department": session.get("department"),
        },
        "answers": {a["question_id"]: a["answer_raw"] for a in answers},
        "vitals": {k: v for k, v in vitals.items() if k not in ("id", "session_id", "recorded_at", "source")} if vitals else {},
        "triage_level": session.get("triage_level"),
        "documents": documents_data,
        "medications_from_documents": all_doc_meds,
        "lab_values_from_documents": all_doc_labs,
    }

    # Generate report via LLM or fallback
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key and api_key != "your_key_here":
        system_prompt = (PROMPT_DIR / "system_report.txt").read_text()
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": json.dumps(session_json, indent=2, default=str)}],
        )
        report_md = response.content[0].text
    else:
        report_md = _fallback_report(session_json)

    # Build FHIR bundle
    fhir_bundle = _build_fhir_bundle(session, answers, vitals, all_doc_meds, all_doc_labs)

    # Store report
    execute(
        """INSERT INTO session_reports (session_id, report_md, report_json, fhir_bundle)
           VALUES (%s, %s, %s, %s)""",
        (req.session_id, report_md, json.dumps(session_json, default=str), json.dumps(fhir_bundle, default=str)),
    )

    # Update session state
    execute(
        "UPDATE sessions SET state = 'COMPLETE', updated_at = NOW() WHERE id = %s",
        (req.session_id,),
    )

    return {
        "report_md": report_md,
        "report_json": session_json,
        "fhir_bundle": fhir_bundle,
        "triage_level": session.get("triage_level") or "GREEN",
    }


@router.get("/{session_id}")
async def get_report(session_id: str):
    reports = query(
        "SELECT * FROM session_reports WHERE session_id = %s ORDER BY created_at DESC LIMIT 1",
        (session_id,),
    )
    if not reports:
        raise HTTPException(status_code=404, detail="Report not found")
    r = reports[0]
    return {
        "report_md": r["report_md"],
        "report_json": r["report_json"],
        "fhir_bundle": r["fhir_bundle"],
        "his_pushed": r["his_pushed"],
        "doctor_feedback": r["doctor_feedback"],
    }


@router.post("/{session_id}/feedback")
async def submit_feedback(session_id: str, feedback: dict):
    val = feedback.get("feedback")
    if val not in ("accurate", "inaccurate"):
        raise HTTPException(status_code=400, detail="Feedback must be 'accurate' or 'inaccurate'")
    execute(
        "UPDATE session_reports SET doctor_feedback = %s WHERE session_id = %s",
        (val, session_id),
    )
    return {"stored": True}


def _fallback_report(session_json):
    """Generate a basic report without LLM"""
    answers = session_json.get("answers", {})
    vitals = session_json.get("vitals", {})
    patient = session_json.get("patient", {})
    triage = session_json.get("triage_level", "GREEN")

    lines = ["## QUICK SUMMARY"]
    if triage == "RED":
        lines.append("- 🚨 **EMERGENCY** — Patient flagged for immediate review")
    if answers.get("q_chest_pain") == "yes":
        lines.append("- 🚨 Chest pain reported")
    if answers.get("q_chest_pain_radiation") == "yes":
        lines.append("- 🚨 Chest pain with radiation — possible ACS")
    bp_sys = vitals.get("bp_systolic")
    if bp_sys and bp_sys > 140:
        lines.append(f"- ⚠ BP {bp_sys}/{vitals.get('bp_diastolic', '?')} — elevated")
    spo2 = vitals.get("spo2_pct")
    if spo2 and spo2 < 95:
        lines.append(f"- ⚠ SpO2 {spo2}% — low")
    if not any("🚨" in l or "⚠" in l for l in lines[1:]):
        lines.append("- Routine presentation, no critical flags")

    lines.append(f"\n## Chief Complaint\n{answers.get('q_chief_complaint', 'Not recorded')}")
    lines.append(f"\n## Vitals")
    if vitals:
        if bp_sys:
            lines.append(f"- BP: {bp_sys}/{vitals.get('bp_diastolic', '?')} mmHg")
        if vitals.get("weight_kg"):
            lines.append(f"- Weight: {vitals['weight_kg']} kg")
        if spo2:
            lines.append(f"- SpO2: {spo2}%")
        if vitals.get("heart_rate"):
            lines.append(f"- HR: {vitals['heart_rate']} bpm")
    else:
        lines.append("- Not recorded")

    # Medications: merge patient-reported + document-extracted
    lines.append("\n## Current Medications")
    doc_meds = session_json.get("medications_from_documents", [])
    patient_meds = answers.get("q_medications", "")
    if doc_meds:
        lines.append("**From uploaded documents:**")
        for m in doc_meds:
            line = f"- {m['name']}"
            if m.get('dose'): line += f" {m['dose']}"
            if m.get('frequency'): line += f" {m['frequency']}"
            if m.get('source_date'): line += f" *(from {m.get('source_doc_type', 'document')} uploaded {m['source_date']})*"
            lines.append(line)
    if patient_meds and patient_meds.lower() not in ('none', 'nil', 'no', ''):
        lines.append(f"\n**Patient reported:** {patient_meds}")
    elif not doc_meds:
        lines.append("Not recorded")

    lines.append(f"\n## Allergies\n{answers.get('q_allergies', 'Not recorded')}")

    # Lab values from documents
    doc_labs = session_json.get("lab_values_from_documents", [])
    if doc_labs:
        lines.append("\n## Lab Results from Documents")
        lines.append("| Test | Value | Source |")
        lines.append("|------|-------|--------|")
        for l in doc_labs:
            lines.append(f"| {l['test']} | {l['value']} | {l.get('source_doc_type', '')} {l.get('source_date', '')} |")

    # Documents reviewed
    documents = session_json.get("documents", [])
    if documents:
        lines.append("\n## Documents Reviewed")
        for d in documents:
            dtype = d.get('type', 'unknown').replace('_', ' ').title()
            n_meds = len(d.get('medications', []))
            n_labs = len(d.get('lab_values', []))
            detail = []
            if n_meds: detail.append(f"{n_meds} medications")
            if n_labs: detail.append(f"{n_labs} lab values")
            detail_str = f" — extracted {', '.join(detail)}" if detail else ""
            lines.append(f"- **{dtype}**{detail_str}")

    lines.append("\n---")
    lines.append("*Generated by OPD Pre-Consultation AI. The doctor should verify all information.*")
    return "\n".join(lines)


def _build_fhir_bundle(session, answers, vitals, doc_meds=None, doc_labs=None):
    """Build a minimal FHIR R4 Bundle"""
    patient_id = str(session.get("id"))
    entries = []

    # Patient resource
    entries.append({
        "resource": {
            "resourceType": "Patient",
            "id": patient_id,
            "name": [{"text": session.get("patient_name", "Unknown")}],
            "gender": {"M": "male", "F": "female"}.get(session.get("patient_gender"), "unknown"),
            "telecom": [{"system": "phone", "value": session.get("patient_phone", "")}],
        }
    })

    # Vitals as Observations
    if vitals:
        if vitals.get("bp_systolic"):
            entries.append({
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "85354-9", "display": "Blood pressure"}]},
                    "component": [
                        {"code": {"coding": [{"code": "8480-6", "display": "Systolic"}]}, "valueQuantity": {"value": vitals["bp_systolic"], "unit": "mmHg"}},
                        {"code": {"coding": [{"code": "8462-4", "display": "Diastolic"}]}, "valueQuantity": {"value": vitals.get("bp_diastolic"), "unit": "mmHg"}},
                    ],
                }
            })
        if vitals.get("spo2_pct"):
            entries.append({
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "2708-6", "display": "SpO2"}]},
                    "valueQuantity": {"value": vitals["spo2_pct"], "unit": "%"},
                }
            })

    # Conditions from answers
    answers_dict = {a["question_id"]: a["answer_raw"] for a in answers} if isinstance(answers, list) else answers
    if answers_dict.get("q_chest_pain") == "yes":
        entries.append({
            "resource": {
                "resourceType": "Condition",
                "clinicalStatus": {"coding": [{"code": "active"}]},
                "code": {"text": "Chest pain"},
                "subject": {"reference": f"Patient/{patient_id}"},
            }
        })

    # MedicationStatements from documents
    for med in (doc_meds or []):
        entries.append({
            "resource": {
                "resourceType": "MedicationStatement",
                "status": "active",
                "medicationCodeableConcept": {"text": med.get("name", "")},
                "subject": {"reference": f"Patient/{patient_id}"},
                "dosage": [{"text": f"{med.get('dose', '')} {med.get('frequency', '')}".strip()}] if med.get("dose") else [],
            }
        })

    # Observations from document lab values
    for lab in (doc_labs or []):
        entries.append({
            "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {"text": lab.get("test", "")},
                "valueQuantity": {"value": lab.get("value")},
            }
        })

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "entry": entries,
    }
