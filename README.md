# Commercial Vehicle Loan Lead Qualification - AI Voice Agent

A production-grade outbound voice agent system built for the BFSI domain. This system orchestrates real-time, low-latency calls using Vapi, Twilio, OpenAI, and ElevenLabs to qualify leads for Commercial Vehicle Loans.

## Features Included
1. **Dynamic Prompt Generation Pipeline:** Uses OpenAI to compile `.md` templates into product-specific guardrail-enforced system prompts.
2. **Vapi Call Orchestration:** Dispatches calls seamlessly with imported twillio number.
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



