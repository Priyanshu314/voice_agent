import os
import aiofiles
import requests
from pathlib import Path

async def dispatch_call(customer_phone_number: str, prompt_file_name: str) -> dict:
    prompt_path = Path(__file__).parent.parent / "prompts" / prompt_file_name
    
    async with aiofiles.open(prompt_path, mode='r', encoding='utf-8') as f:
        system_prompt = await f.read()

    vapi_payload = {
        "phoneNumberId": os.getenv("VAPI_TWILIO_PHONE_NUMBER_ID"),
        "customer": {
            "number": customer_phone_number
        },
        "assistantId": "8bfdf642-6dca-4f09-afe4-3ccd68d7455e",
        "assistantOverrides": {
            "model": {
                "provider": "openai",
                "model": "gpt-4.1",
                "messages": [
                    {
                        
                        "role": "system",
                        "content": system_prompt
                    }
                ]
            }
        }
    }

    headers = {
        "Authorization": f"Bearer {os.getenv('VAPI_PRIVATE_KEY')}",
        "Content-Type": "application/json"
    }

    response = requests.post("https://api.vapi.ai/call/phone", json=vapi_payload, headers=headers)
    if not response.ok:
        print("Vapi Error:", response.text)
    response.raise_for_status()

    return response.json()
