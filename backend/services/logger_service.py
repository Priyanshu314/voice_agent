import re
import os
from datetime import datetime
from dateutil.parser import parse as parse_date

# Mock in-memory DB for demonstration
mock_db = [
    {
        "call_id": "vapi_101",
        "timestamp": "2026-04-30T08:00:00Z",
        "duration_seconds": 180,
        "qualification_outcome": "QUALIFIED",
        "transcript": "[masked transcript]",
        "slots": {"vehicle_type": "HCV", "monthly_income": 85000},
        "metrics": {"latency_tts_avg_ms": 280}
    },
    {
        "call_id": "vapi_102",
        "timestamp": "2026-04-30T07:00:00Z",
        "duration_seconds": 45,
        "qualification_outcome": "NOT_INTERESTED",
        "transcript": "[masked transcript]",
        "slots": {},
        "metrics": {"latency_tts_avg_ms": 260}
    },
    {
        "call_id": "vapi_103",
        "timestamp": "2026-04-30T06:00:00Z",
        "duration_seconds": 210,
        "qualification_outcome": "QUALIFIED",
        "transcript": "[masked transcript]",
        "slots": {"vehicle_type": "LCV", "monthly_income": 45000},
        "metrics": {"latency_tts_avg_ms": 300}
    }
]


def mask_transcript(transcript: str) -> str:
    if not transcript:
        return transcript
        
    # Mask 12 digit Aadhaar
    aadhaar_regex = r'\b\d{4}\s?\d{4}\s?\d{4}\b'
    # Mask PAN (5 letters, 4 digits, 1 letter)
    pan_regex = r'\b[a-zA-Z]{5}\d{4}[a-zA-Z]{1}\b'
    # Mask Phone Numbers
    phone_regex = r'\b\d{10}\b'

    masked = re.sub(aadhaar_regex, 'XXXX XXXX XXXX', transcript)
    masked = re.sub(pan_regex, 'XXXXX0000X', masked)
    
    def mask_phone(match):
        val = match.group(0)
        return "XXXXXX" + val[6:]
        
    masked = re.sub(phone_regex, mask_phone, masked)
    return masked

async def log_end_call(report: dict):
    try:
        call_info = report.get("call", {})
        analysis = report.get("analysis", {})
        
        start_at = call_info.get("startedAt")
        end_at = call_info.get("endedAt")
        duration = 0
        if start_at and end_at:
            duration = (parse_date(end_at) - parse_date(start_at)).total_seconds()
            
        call_log = {
            "call_id": call_info.get("id"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": duration,
            "qualification_outcome": analysis.get("successEvaluation", "UNKNOWN"),
            "transcript": mask_transcript(report.get("transcript", "")),
            "slots": call_info.get("variables", {}),
            "metrics": {
                "latency_tts_avg_ms": call_info.get("metrics", {}).get("ttsLatencyAvg", 0)
            }
        }

        print(f"[Logger] Call logged safely: {call_log['call_id']}")
        mock_db.append(call_log)
    except Exception as e:
        print(f"Failed to log call: {e}")

async def get_masked_transcript_openai(call_id: str) -> str:
    import requests
    import openai
    
    vapi_key = os.getenv("VAPI_PRIVATE_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if not vapi_key or not openai_key:
        return "Error: Missing API keys for masking."
        
    try:
        # 1. Fetch full call from Vapi
        headers = {"Authorization": f"Bearer {vapi_key}"}
        resp = requests.get(f"https://api.vapi.ai/call/{call_id}", headers=headers)
        resp.raise_for_status()
        call_data = resp.json()
        raw_transcript = call_data.get("transcript", "")
        
        if not raw_transcript:
            return "No transcript available."
            
        # 2. Use OpenAI to mask PII
        client = openai.OpenAI(api_key=openai_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a privacy-focused assistant. Mask all PII (Personal Identifiable Information) in the following transcript. Specifically mask: Aadhaar numbers, PAN numbers, Card numbers, CVVs, OTPs, and full phone numbers. Replace them with [MASKED]. Preserve the rest of the text and speaker labels (User: / Assistant:) exactly."},
                {"role": "user", "content": raw_transcript}
            ],
            temperature=0
        )
        
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI Masking Error: {e}")
        return f"Error during AI masking: {str(e)}"

async def get_analytics():
    import requests
    vapi_key = os.getenv("VAPI_PRIVATE_KEY")
    if not vapi_key:
        return {
            "metrics": {"totalCalls": 0, "conversionRate": "0.00%", "avgDuration": 0},
            "logs": []
        }
        
    try:
        headers = {"Authorization": f"Bearer {vapi_key}"}
        resp = requests.get("https://api.vapi.ai/call", headers=headers)
        resp.raise_for_status()
        vapi_calls = resp.json()
        
        if vapi_calls:
            print("DEBUG VAPI CALL KEYS:", vapi_calls[0].keys(), flush=True)
            print("DEBUG VAPI ANALYSIS:", vapi_calls[0].get("analysis"), flush=True)
            print("DEBUG VAPI VARIABLES:", vapi_calls[0].get("variables"), flush=True)
        
        logs = []
        total_duration = 0
        qualified_count = 0
        non_zero_duration_calls = 0
        
        for call in vapi_calls:
            # Safely get the masked phone number
            customer = call.get("customer", {})
            phone = customer.get("number", "Unknown")
            if phone != "Unknown" and len(phone) >= 10:
                phone = "XXXXXX" + phone[-4:]
                
            analysis = call.get("analysis", {})
            outcome = str(analysis.get("successEvaluation", "UNKNOWN"))
            if outcome.lower() == "true":
                qualified_count += 1
                
            start_at = call.get("startedAt")
            end_at = call.get("endedAt")
            duration = 0
            if start_at and end_at:
                try:
                    duration = (parse_date(end_at) - parse_date(start_at)).total_seconds()
                except:
                    pass
            elif call.get("endedAt") and call.get("createdAt"):
                 try:
                     duration = (parse_date(call.get("endedAt")) - parse_date(call.get("createdAt"))).total_seconds()
                 except:
                     pass
            
            if duration > 0:
                total_duration += duration
                non_zero_duration_calls += 1
            
            status = call.get("status", "unknown")
            ended_reason = call.get("endedReason", "")
            if status == "ended" and ended_reason:
                status = f"{status} ({ended_reason})"

            # Deep search for the 'result' key in the entire call object
            def find_slots(obj):
                if isinstance(obj, dict):
                    if "result" in obj and isinstance(obj["result"], dict) and "name" in obj:
                        return obj["result"]
                    for k, v in obj.items():
                        res = find_slots(v)
                        if res: return res
                elif isinstance(obj, list):
                    for item in obj:
                        res = find_slots(item)
                        if res: return res
                return None

            slots = find_slots(call)
            
            if not slots:
                slots = call.get("variables", {})

            logs.append({
                "call_id": call.get("id"),
                "timestamp": call.get("createdAt", ""),
                "duration_seconds": round(duration),
                "status": status,
                "qualification_outcome": outcome,
                "phone_number_masked": phone,
                "transcript": mask_transcript(call.get("transcript", "")),
                "slots": slots or {},
                "recording_url": call.get("recordingUrl"),
                "metrics": {
                    "latency_tts_avg_ms": call.get("metrics", {}).get("ttsLatencyAvg", 0)
                }
            })
            
        total_calls = len(logs)
        conversion_rate = (qualified_count / total_calls * 100) if total_calls > 0 else 0
        avg_duration = total_duration / non_zero_duration_calls if non_zero_duration_calls > 0 else 0
        
        return {
            "metrics": {
                "totalCalls": total_calls,
                "conversionRate": f"{conversion_rate:.2f}%",
                "avgDuration": avg_duration
            },
            "logs": sorted(logs, key=lambda x: x["timestamp"], reverse=True)
        }
    except Exception as e:
        print(f"Error fetching analytics from Vapi: {e}")
        return {
            "metrics": {"totalCalls": 0, "conversionRate": "0.00%", "avgDuration": 0},
            "logs": []
        }
