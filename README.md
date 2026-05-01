# Commercial Vehicle Loan Lead Qualification - AI Voice Agent (Hinglish)

A production-grade outbound voice agent system built for the BFSI domain. This system orchestrates real-time, low-latency calls using Vapi, Twilio, OpenAI, and ElevenLabs to qualify leads for Commercial Vehicle Loans.

<img width="719" height="376" alt="image_720" src="https://github.com/user-attachments/assets/5a1ac7c8-dad9-4a94-9408-33ff3e72839d" />
<img width="716" height="720" alt="image_720" src="https://github.com/user-attachments/assets/bee21f80-a15a-4267-9288-3409b1ebc1ba" />


## Features Included
1. **Dynamic Prompt Generation Pipeline:** Uses OpenAI to compile `.md` templates into product-specific guardrail-enforced system prompts.
2. **Vapi Call Orchestration:** Dispatches calls with seamless language switching.
3. **Advanced Compliance Filtering:** Real-time backend masking of PII (PAN, Aadhaar) before data touches the persistence layer.
4. **React Dashboard:** A beautiful, responsive glassmorphism dashboard built with React and Vanilla CSS, providing real-time log ingestion and filtering.
5. **Dockerized Setup:** Fully containerized backend and frontend.

## Getting Started

1. **Environment Variables:** 
   Copy `.env.example` to `.env` and fill in your keys.
   ```bash
   cp .env.example .env
   ```

2. **Run with Docker Compose:**
   ```bash
   docker-compose up --build -d
   ```

3. **Access Services:**
   - **Backend API:** `http://localhost:8000`
   - **Frontend Dashboard:** `http://localhost:8080`



