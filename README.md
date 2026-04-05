# 🇩🇿 Nami-AI — Algeria's First AI Marketing Consultant

> Built by **Anes Lachemi** · Powered by **n8n** · LLM: **Llama 4 Scout 17B via Groq** · Vector DB: **Supabase pgvector** · Search: **Apify** · Image Gen: **FLUX.1-schnell**

<div align="center">

![Made for Algeria](https://img.shields.io/badge/Made%20for-Algeria%20🇩🇿-009a44?style=for-the-badge)
![n8n](https://img.shields.io/badge/Workflow-n8n-FF6D00?style=for-the-badge)
![Groq](https://img.shields.io/badge/LLM-Llama%204%20via%20Groq-4285F4?style=for-the-badge)
![Supabase](https://img.shields.io/badge/VectorDB-Supabase-3ECF8E?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)

*Wesh ndirek, entrepreneur? 🇩🇿*

</div>

---

## What is Nami-AI?

Nami-AI is not a generic chatbot. It is an intelligent **AI marketing consultant and entrepreneur advisor built specifically for the Algerian market**.

It understands local consumer psychology, Algerian platforms (Ouedkniss, Yassir, BaridiMob, Temtem), wilaya-based targeting, Ramadan seasonality, cash-on-delivery dominance, and informal economy dynamics that no international AI tool accounts for.

Nami speaks **Darija, French, Arabic, and English** — automatically matching the user's language — and grounds every answer in DZ-specific context. It can also **generate images** directly in the chat via FLUX.1-schnell.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              Static Web UI                   │
│      index.html + script.js + style.css      │
└───────────────────┬──────────────────────────┘
                    │ POST FormData
                    ▼
┌──────────────────────────────────────────────┐
│            n8n Chat Webhook                  │
│   → Get User Prefs (Supabase)                │
│   → Format Prefs                             │
│   → Has File?                                │
│        YES → Extract PDF → File Agent        │
│        NO  →              Main Agent         │
└──────────────────────────────────────────────┘
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
  Main Agent               File Agent
  • Groq Llama 4           • Groq Llama 4
  • RAG (Supabase)         • RAG (Supabase)
  • Apify Web Search       • Apify Web Search
  • FLUX Image Gen         • FLUX Image Gen
```

### Pipeline 1 — Knowledge Base Ingestion

```
Google Drive Folder
      ↓
Loop Over Files → Filter (PDF / CSV / TXT)
      ↓
Download → Extract Text
      ↓
Embed with HuggingFace (768-dim)
      ↓
Insert into Supabase pgvector
```

### Pipeline 2 — Live Chat

```
Chat Trigger (public webhook, file upload enabled)
      ↓
Get User Prefs → Format User Prefs
      ↓
Has file attached?
  YES → Extract PDF → File Agent (Groq + RAG + Image Gen)
  NO  → Main Agent  (Groq + RAG + Web Search + Image Gen)
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| Workflow Engine | [n8n](https://n8n.io) |
| LLM | Meta Llama 4 Scout 17B via [Groq](https://console.groq.com) |
| Vector Database | [Supabase](https://supabase.com) (pgvector) |
| Embeddings | [HuggingFace Inference API](https://huggingface.co) — 768 dimensions |
| Knowledge Source | Google Drive folder (PDF / CSV / TXT) |
| Web Search | [Apify](https://apify.com) — Google Search Results Scraper |
| Image Generation | FLUX.1-schnell via HuggingFace Inference Router |
| Chat Interface | n8n Chat Trigger + Custom Web UI |
| User Memory | Supabase `user_preferences` table |

---

## Features

| Feature | Details |
|---|---|
| 🧠 RAG | Queries Supabase vector store before every answer |
| 🌍 Multilingual | Auto-detects Darija / French / Arabic / English |
| 🇩🇿 DZ Context | References local platforms, payments, wilayas, seasons |
| 🖼️ Image Generation | FLUX.1-schnell — generates images on natural language request |
| 📄 File Upload | Users attach PDFs; Nami reads and analyzes them live |
| 🔍 Web Search | Real-time Google search for prices, news, and trends |
| 💾 User Memory | Session preferences persisted in Supabase |
| 🔒 Honest | Never fabricates statistics, influencer names, or platform data |

---

## Project Structure

```
nami-ai/
├── README.md
├── index.html           ← Static chat UI
├── script.js            ← Frontend logic (fetch, state, rendering)
├── style.css            ← UI styles
├── workflow/
│   └── nami-ai.json     ← Exported n8n workflow (import into n8n)
└── supabase/
    └── setup.sql        ← SQL schema: documents table + match function
```

---

## Setup Guide

### Prerequisites

| Service | Purpose | Link |
|---|---|---|
| n8n | Workflow engine | [n8n.io](https://n8n.io) |
| Groq | LLM inference (free tier available) | [console.groq.com](https://console.groq.com) |
| Supabase | Vector DB + user memory | [supabase.com](https://supabase.com) |
| HuggingFace | Embeddings + image generation | [huggingface.co](https://huggingface.co) |
| Google Drive | Knowledge base file storage | — |
| Apify | Web search scraper | [apify.com](https://apify.com) |

---

### 1. Supabase Setup

Run `supabase/setup.sql` in your Supabase project's SQL editor. It creates:

- `documents` table — stores embedded knowledge base chunks (768-dim vectors)
- `user_preferences` table — stores per-session user context
- `match_documents()` function — cosine similarity search via pgvector

---

### 2. n8n Credentials

In n8n → **Settings → Credentials**, add the following:

| Credential Type | Notes |
|---|---|
| Google Drive OAuth2 | Authorize via Google Cloud Console OAuth client |
| Groq API | API key from your Groq console |
| Supabase | Use the **service role key** (not the anon key) |
| HuggingFace Token | Token with Inference API access enabled |
| Apify API | Token from your Apify account |

---

### 3. Import the Workflow

1. In n8n → **Workflows → Import from file**
2. Upload `workflow/nami-ai.json`
3. Assign your credentials to each node
4. In the **"Search files and folders"** node, replace the folder ID with your own Google Drive knowledge base folder ID

---

### 4. Ingest the Knowledge Base

1. Upload `.pdf`, `.csv`, or `.txt` files to your Google Drive folder
2. In n8n, click **"Test workflow"** on the manual trigger (Pipeline 1)
3. The workflow loops through all files, embeds them via HuggingFace, and stores chunks in Supabase
4. Verify records appear in your `documents` table

> ⚠️ The ingestion pipeline does not deduplicate. Clear the `documents` table before re-running to avoid duplicate vectors.

---

### 5. Configure the Web UI

1. Activate the workflow in n8n (toggle → **ON**)
2. Open the **"When chat message received"** node → copy the **Production URL**
3. In `script.js`, update `PROXY_URL` to your webhook production URL:

```javascript
const PROXY_URL = 'https://your-n8n-instance.com/webhook/YOUR-WEBHOOK-ID/chat'
```

4. Deploy `index.html`, `script.js`, and `style.css` to any static host (GitHub Pages, Vercel, Netlify, etc.)

---

## Nami's Identity

Both agents share the same core behavioral rules:

- **Always query the knowledge base first** before answering
- **Respond in the user's exact language** — Darija, French, Arabic, or English
- **Never invent** statistics, influencer names, or platform data
- **Use web search only** for time-sensitive queries (prices, news, trends)
- **Simple questions** → 1–3 sentences, no headers
- **Marketing / business questions** → numbered steps + one `💡 DZ Pro Tip`
- **Image requests** → call FLUX tool once, return result immediately

### DZ Context Applied Automatically

```
Payment:   BaridiMob, CCP, Cash on Delivery (dominates e-commerce), Dahabia
Platforms: Ouedkniss, Yassir Business, Instagram/Facebook (primary), Telegram groups
Trust:     Phone number visibility, wilaya targeting, word-of-mouth (chka)
Seasons:   Ramadan (peak), Aïd el-Fitr, Aïd el-Adha, rentrée scolaire (Sept)
Barriers:  Low card penetration, delivery trust gaps, price sensitivity
```

---

## RAG Configuration

| Parameter | Value |
|---|---|
| Chunk size | 600 characters |
| Chunk overlap | 100 characters |
| Splitter | Recursive Character Text Splitter |
| Top K results | 20 |
| Similarity | Cosine via pgvector `<=>` operator |
| Embedding model | HuggingFace Inference API (768-dim) |

---

## Image Generation

Nami uses **FLUX.1-schnell** via the HuggingFace Inference Router. When a user requests an image in any language, the agent crafts a detailed English prompt and calls the tool.

```
Endpoint: https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell
Method:   POST
Headers:  Authorization: Bearer <YOUR_HF_TOKEN>
          Content-Type: application/json
          Accept: image/jpeg
Body:     { "inputs": "<detailed English prompt>" }
```

---

## Web UI

The interface is a fully static single-page application with no backend dependencies:

- Sidebar with chat history persisted in `localStorage`
- Welcome screen with suggested DZ-relevant prompts
- PDF file attachment support
- Markdown-lite rendering in bot responses
- Inline image rendering for generated images
- Mobile responsive with hamburger sidebar
- 90-second timeout for image generation with contextual loading message

---

## Known Limitations

| Issue | Notes |
|---|---|
| Web search query | Apify uses raw `chatInput` as query — append "Algérie" or "DZ" for better local results |
| File upload | Chat UI supports PDF only |
| Session memory | Loaded manually — no automatic cross-session history persistence |
| Ingestion deduplication | Re-running on already-indexed files creates duplicates — clear `documents` table first |

---

## Workflow Node Reference

### Pipeline 1 — Ingestion

| Node | Purpose |
|---|---|
| Manual Trigger | Starts ingestion on demand |
| Google Drive — Search | Lists all files in the knowledge base folder |
| Split In Batches | Processes files one by one |
| IF | Filters to PDF / CSV / TXT; skips placeholder files |
| Google Drive — Download | Downloads binary file content |
| Switch | Routes PDF vs plain text paths |
| Extract From File | Extracts text content from PDFs |
| Merge | Combines output from both text paths |
| Supabase — Create Record | Inserts filename metadata into `documents` |
| Supabase Vector Store | Embeds and stores chunks into pgvector |
| HuggingFace Embeddings | Generates 768-dim embedding vectors |
| Document Loader | Loads extracted text for chunking |
| Recursive Text Splitter | Splits at 600 chars with 100 char overlap |

### Pipeline 2 — Chat

| Node | Purpose |
|---|---|
| Chat Trigger | Public webhook — accepts text and file uploads |
| Supabase — Get Prefs | Loads session user preferences |
| Set — Format Prefs | Formats preferences into a prompt context string |
| IF | Routes file vs text-only messages |
| Extract From File | Extracts user-uploaded PDF content |
| AI Agent (Main) | Handles all text-only chat |
| AI Agent (File) | Handles messages with attached files |
| Groq Chat Model | Llama 4 Scout 17B inference |
| Supabase Vector Store | RAG retrieval tool (Top K = 20) |
| Apify Tool | Live Google search for real-time queries |
| HTTP Request Tool | FLUX.1-schnell image generation |

---

## Contributing

To extend Nami:

1. **Add new tools** — Ouedkniss scraper, CRM integration, product price tracker
2. **Expand the knowledge base** — Algerian market research, sector reports, competitor analyses
3. **Improve multilingual search** — pre-process queries to append "Algérie" / "DZ" automatically
4. **Add ingestion deduplication** — hash-based check before inserting vectors
5. **Automate session memory** — write preferences back to Supabase at conversation end

---

## License

This project is proprietary. All rights reserved by **Anes Lachemi**.

---

<div align="center">

*Nami-AI — Algeria's #1 AI marketing consultant 🇩🇿*

**Built with precision. Designed for the DZ market.**

</div>
