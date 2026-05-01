import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the project root (one level up from backend/)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from prompt_pipeline.generate_prompt import generate_system_prompt
from services.vapi_service import dispatch_call
from services.logger_service import log_end_call, get_analytics, get_masked_transcript_openai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    productName: str
    companyName: str
    questions: List[str]
    slots: List[str]

class CallRequest(BaseModel):
    phoneNumber: str
    promptFileName: str

@app.post("/api/prompts/generate")
async def api_generate_prompt(req: PromptRequest):
    try:
        prompt_path = await generate_system_prompt(
            req.productName, req.companyName, req.questions, req.slots
        )
        return {"success": True, "promptPath": prompt_path}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/calls/dispatch")
async def api_dispatch_call(req: CallRequest):
    try:
        call_result = await dispatch_call(req.phoneNumber, req.promptFileName)
        return {"success": True, "callResult": call_result}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/webhook/vapi")
async def api_vapi_webhook(request: Request):
    try:
        payload = await request.json()
        message = payload.get("message", {})
        message_type = message.get("type") or payload.get("type")

        if message_type == "tool-calls":
            tool_calls = message.get("toolCalls", [])
            for call in tool_calls:
                function_info = call.get("function", {})
                if function_info.get("name") == "submit_qualification_data":
                    slots = function_info.get("arguments", "{}")
                    print(f"[Tool Call] Slots extracted: {slots}")
                    return {
                        "results": [{
                            "toolCallId": call.get("id"),
                            "result": "Data submitted successfully."
                        }]
                    }
        elif message_type == "end-of-call-report":
            await log_end_call(message)
            return {"success": True}

        return {"success": True}
    except Exception as e:
        print(f"Webhook Error: {e}")
        return {"error": "Internal Server Error"}

@app.get("/api/analytics")
async def api_analytics():
    return await get_analytics()

@app.get("/api/calls/{call_id}/transcript")
async def api_get_transcript(call_id: str):
    masked_transcript = await get_masked_transcript_openai(call_id)
    return {"transcript": masked_transcript}

@app.get("/healthz")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
