```markdown
# RuralBiz – Rural Business Advisory Assistant

**Smart India Hackathon (SIH) Prototype**  
Ministry of Social Justice & Empowerment

A feasibility advisory tool for rural micro-enterprises.  
It combines real Census village data, financial models, and AI to generate grounded business feasibility reports for aspiring rural entrepreneurs.

---

## Features

- Village-level demand & supply analysis using real Census 2011 data
- Loan eligibility & DSCR calculation (Micro Finance / Term Loan schemes)
- AI-generated feasibility report (Market Reach, SWOT, Risks, Competitors, Pricing)
- AI Chat Advisor for follow-up questions grounded in the report
- Similar villages discovery using TF-IDF vector search
- Clean, production-ready UI designed for rural entrepreneurs

---

## Tech Stack

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Custom design system (sage / parchment theme)

**Backend**
- FastAPI (Python)
- Groq (primary) + Gemini (fallback) for AI report generation
- scikit-learn (TF-IDF for enterprise matching & village similarity)
- In-memory cache + vector store

**Data**
- Census 2011 village demographics (Pune district sample)
- Amenities data (road access, market, internet, etc.)

---

## Project Structure

```
├── app/                     # Next.js frontend
│   ├── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── main.py                  # FastAPI entrypoint
├── logic.py                 # Core business logic + AI report generation
├── data_loader.py           # Census + amenities loader
├── storage.py               # Cache + village vector store
├── auth.py                  # API key authentication
├── villages.csv
├── amenities.csv
└── README.md
```

---

## Local Development

### 1. Backend

```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn python-dotenv google-genai groq scikit-learn pydantic slowapi

# Run the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
npm install
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Create a `.env` file in the backend root:

```env
# AI Providers (Groq is primary, Gemini is fallback)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxx

# API Authentication
API_KEY=my-secret-02101431908
ADMIN_API_KEY=my-admin-02101431908
```

> Never commit the `.env` file. It is already listed in `.gitignore`.

---

## API Endpoints

| Method | Endpoint                     | Description                        | Auth      |
|--------|------------------------------|------------------------------------|-----------|
| POST   | `/api/v1/generate-report`    | Generate full feasibility report   | Required  |
| POST   | `/api/v1/chat`               | AI chat advisor                    | Required  |
| POST   | `/api/v1/similar-villages`   | Find similar villages              | Required  |
| GET    | `/api/v1/health`             | Health check + cache stats         | Public    |
| GET    | `/api/v1/cache-stats`        | Cache statistics                   | Required  |
| POST   | `/api/v1/cache-clear`        | Clear cache (admin only)           | Admin     |

**Authentication header:**
```
X-API-Key: my-secret-02101431908
```

---

## How it works

1. User selects a village + business category + available capital
2. Backend builds an **evidence packet** using Census data + financial assumptions
3. Deterministic calculations produce:
   - Addressable households
   - Demand proxy
   - Supply gap
   - Loan details & DSCR
4. AI (Groq / Gemini) generates a structured feasibility report using only the evidence packet
5. Frontend renders the report + offers an AI chat advisor grounded in the same data

---

## Sample Villages (Pune District)

| Village Code | Name              | Population | Households |
|--------------|-------------------|------------|------------|
| 556078       | Disali            | 278        | 54         |
| 555465       | Gangapur Kh.      | 1,566      | 339        |
| 556479       | Pandeshwar        | 1,900      | 403        |
| 555832       | Mahalunge         | 9,687      | 2,640      |
| 556952       | Pandare           | 7,440      | 1,494      |
| 556975       | Baramati Rural    | 19,387     | 4,215      |

---

## Team

Built for **Smart India Hackathon 2025**  
Track: Ministry of Social Justice & Empowerment

---

## License

MIT
```
