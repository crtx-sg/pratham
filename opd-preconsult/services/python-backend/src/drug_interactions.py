"""
Drug interaction checker — static JSON matrix for common Indian OPD drugs.
Covers critical interactions for drugs in the KNOWN_DRUGS list.
"""

# Drug-drug interactions: {drug_a: {drug_b: {severity, description}}}
# severity: "block" (hard stop) or "warn" (alert but allow)
DRUG_INTERACTIONS = {
    "warfarin": {
        "aspirin": {"severity": "warn", "description": "Increased bleeding risk. Monitor INR closely."},
        "ibuprofen": {"severity": "warn", "description": "NSAIDs increase bleeding risk with warfarin."},
        "diclofenac": {"severity": "warn", "description": "NSAIDs increase bleeding risk with warfarin."},
        "amiodarone": {"severity": "warn", "description": "Amiodarone increases warfarin levels. Reduce warfarin dose."},
        "clopidogrel": {"severity": "warn", "description": "Dual antithrombotic — increased bleeding risk."},
        "metronidazole": {"severity": "warn", "description": "Increases warfarin effect. Monitor INR."},
    },
    "metformin": {
        "insulin": {"severity": "warn", "description": "Hypoglycemia risk. Monitor blood glucose closely."},
        "glipizide": {"severity": "warn", "description": "Combined hypoglycemia risk. Monitor blood glucose."},
        "glimepiride": {"severity": "warn", "description": "Combined hypoglycemia risk. Monitor blood glucose."},
    },
    "enalapril": {
        "spironolactone": {"severity": "warn", "description": "Risk of hyperkalemia. Monitor potassium levels."},
        "losartan": {"severity": "block", "description": "ACE inhibitor + ARB: increased renal failure and hyperkalemia risk. Avoid combination."},
        "telmisartan": {"severity": "block", "description": "ACE inhibitor + ARB: avoid combination."},
        "olmesartan": {"severity": "block", "description": "ACE inhibitor + ARB: avoid combination."},
    },
    "ramipril": {
        "spironolactone": {"severity": "warn", "description": "Risk of hyperkalemia. Monitor potassium."},
        "losartan": {"severity": "block", "description": "ACE inhibitor + ARB: avoid combination."},
        "telmisartan": {"severity": "block", "description": "ACE inhibitor + ARB: avoid combination."},
        "olmesartan": {"severity": "block", "description": "ACE inhibitor + ARB: avoid combination."},
    },
    "lisinopril": {
        "spironolactone": {"severity": "warn", "description": "Risk of hyperkalemia."},
        "losartan": {"severity": "block", "description": "ACE inhibitor + ARB: avoid combination."},
        "telmisartan": {"severity": "block", "description": "ACE inhibitor + ARB: avoid combination."},
    },
    "digoxin": {
        "amiodarone": {"severity": "warn", "description": "Amiodarone increases digoxin levels. Reduce digoxin dose by 50%."},
        "verapamil": {"severity": "warn", "description": "Verapamil increases digoxin levels and risk of bradycardia."},
        "furosemide": {"severity": "warn", "description": "Loop diuretic-induced hypokalemia increases digoxin toxicity risk."},
        "torsemide": {"severity": "warn", "description": "Loop diuretic-induced hypokalemia increases digoxin toxicity risk."},
    },
    "metoprolol": {
        "verapamil": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia and heart block risk."},
        "diltiazem": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia risk."},
    },
    "atenolol": {
        "verapamil": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia risk."},
        "diltiazem": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia risk."},
    },
    "propranolol": {
        "verapamil": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: risk of asystole."},
        "diltiazem": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia risk."},
        "insulin": {"severity": "warn", "description": "Beta-blockers mask hypoglycemia symptoms."},
    },
    "carvedilol": {
        "verapamil": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia risk."},
        "diltiazem": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia risk."},
    },
    "bisoprolol": {
        "verapamil": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia risk."},
        "diltiazem": {"severity": "block", "description": "Beta-blocker + non-DHP CCB: severe bradycardia risk."},
    },
    "clopidogrel": {
        "omeprazole": {"severity": "warn", "description": "Omeprazole reduces clopidogrel efficacy. Use pantoprazole instead."},
        "aspirin": {"severity": "warn", "description": "Dual antiplatelet — increased bleeding risk. Monitor."},
    },
    "ticagrelor": {
        "aspirin": {"severity": "warn", "description": "Use low-dose aspirin only (75-100mg). Higher doses reduce ticagrelor efficacy."},
    },
    "simvastatin": {
        "amiodarone": {"severity": "warn", "description": "Limit simvastatin to 20mg/day with amiodarone. Rhabdomyolysis risk."},
        "diltiazem": {"severity": "warn", "description": "Limit simvastatin to 20mg/day. Rhabdomyolysis risk."},
        "verapamil": {"severity": "warn", "description": "Limit simvastatin to 20mg/day. Rhabdomyolysis risk."},
        "azithromycin": {"severity": "warn", "description": "Temporary statin hold during azithromycin course may be considered."},
    },
    "ciprofloxacin": {
        "prednisolone": {"severity": "warn", "description": "Fluoroquinolone + corticosteroid: increased tendon rupture risk."},
        "dexamethasone": {"severity": "warn", "description": "Fluoroquinolone + corticosteroid: increased tendon rupture risk."},
        "methylprednisolone": {"severity": "warn", "description": "Fluoroquinolone + corticosteroid: increased tendon rupture risk."},
        "warfarin": {"severity": "warn", "description": "Ciprofloxacin increases warfarin effect. Monitor INR."},
    },
    "levothyroxine": {
        "pantoprazole": {"severity": "warn", "description": "PPIs reduce levothyroxine absorption. Take levothyroxine 4 hours apart."},
        "omeprazole": {"severity": "warn", "description": "PPIs reduce levothyroxine absorption."},
        "rabeprazole": {"severity": "warn", "description": "PPIs reduce levothyroxine absorption."},
    },
    "aspirin": {
        "ibuprofen": {"severity": "warn", "description": "Ibuprofen may reduce cardioprotective effect of aspirin. Take aspirin 30 min before ibuprofen."},
    },
}

# Common drug-allergy contraindications
ALLERGY_CONTRAINDICATIONS = {
    "sulfa": ["furosemide", "hydrochlorothiazide", "glipizide", "glimepiride"],
    "sulfonamide": ["furosemide", "hydrochlorothiazide", "glipizide", "glimepiride"],
    "penicillin": ["amoxicillin"],
    "aspirin": ["aspirin", "diclofenac", "ibuprofen"],
    "nsaid": ["aspirin", "diclofenac", "ibuprofen"],
    "ace inhibitor": ["enalapril", "ramipril", "lisinopril"],
    "statin": ["atorvastatin", "rosuvastatin", "simvastatin"],
    "beta blocker": ["metoprolol", "atenolol", "propranolol", "carvedilol", "bisoprolol"],
}


def check_interactions(drug_name, other_drugs):
    """Check a drug against a list of other drugs. Returns list of warnings."""
    warnings = []
    drug_lower = drug_name.lower()

    for other in other_drugs:
        other_lower = other.lower()
        if drug_lower == other_lower:
            continue

        # Check both directions
        interaction = None
        if drug_lower in DRUG_INTERACTIONS and other_lower in DRUG_INTERACTIONS[drug_lower]:
            interaction = DRUG_INTERACTIONS[drug_lower][other_lower]
        elif other_lower in DRUG_INTERACTIONS and drug_lower in DRUG_INTERACTIONS[other_lower]:
            interaction = DRUG_INTERACTIONS[other_lower][drug_lower]

        if interaction:
            warnings.append({
                "drug_a": drug_name,
                "drug_b": other,
                "severity": interaction["severity"],
                "description": interaction["description"],
            })

    return warnings


def check_allergies(drug_name, allergies):
    """Check a drug against patient allergies. Returns list of contraindications."""
    warnings = []
    drug_lower = drug_name.lower()

    for allergy in allergies:
        allergy_lower = allergy.lower().strip()

        # Direct match
        if allergy_lower == drug_lower:
            warnings.append({
                "drug": drug_name,
                "allergy": allergy,
                "severity": "block",
                "description": f"Patient has documented allergy to {allergy}. Do NOT prescribe {drug_name}.",
            })
            continue

        # Class-based match
        if allergy_lower in ALLERGY_CONTRAINDICATIONS:
            if drug_lower in ALLERGY_CONTRAINDICATIONS[allergy_lower]:
                warnings.append({
                    "drug": drug_name,
                    "allergy": allergy,
                    "severity": "block",
                    "description": f"Patient has {allergy} allergy. {drug_name} is contraindicated.",
                })

    return warnings
