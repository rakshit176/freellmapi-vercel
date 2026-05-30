# FreeLLMAPI — Vercel Serverless Edition

An **OpenAI-compatible** LLM API proxy that routes chat completion requests across multiple free-tier LLM providers with automatic fallback on rate limits, timeouts, and errors. Deployed as a Vercel serverless application with zero database dependency — all configuration via environment variables.

---

## Features

- **OpenAI-Compatible API** — Drop-in replacement for the OpenAI API. Just change the `base_url` in any SDK or client
- **Multi-Provider Routing** — Distributes requests across 8+ providers: OpenRouter, Google Gemini, Groq, Cerebras, SambaNova, Mistral, Cloudflare Workers AI, GitHub Models, and Pollinations
- **Automatic Fallback** — When a provider returns a rate limit (429), timeout, or server error, the router automatically retries with the next best provider — up to 5 attempts
- **Smart Model Ranking** — Each model has a rank score (lower = smarter). The router picks the highest-ranked available model by default, or you can specify a model explicitly
- **Streaming Support** — Full SSE (Server-Sent Events) streaming for real-time token delivery, compatible with the OpenAI streaming format
- **Zero Database** — All provider configuration loaded from environment variables at request time. No database, no state, no persistence
- **Authentication** — Optional Bearer token authentication via `API_KEY` env var. If not set, the API is open
- **Health Check** — `/api/health` endpoint showing active providers and model counts
- **Landing Page** — Built-in documentation page at `/` with quick-start instructions

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | Chat completions (streaming & non-streaming) |
| `GET` | `/v1/models` | List all available models sorted by rank |
| `GET` | `/api/health` | Health check with provider status |

---

## Supported Providers

| Provider | Free Tier | Env Variable | Default Models |
|----------|-----------|-------------|----------------|
| **OpenRouter** | Yes | `PROVIDER_OPENROUTER_KEY` | MiniMax M2.5, Qwen3 Coder, GPT-OSS 120B, Gemma 4 31B, Llama 3.3 70B |
| **Google Gemini** | Yes | `PROVIDER_GOOGLE_KEY` | Gemini 2.5 Flash, Gemini 2.5 Flash-Lite |
| **Groq** | Yes | `PROVIDER_GROQ_KEY` | Llama 3.3 70B, Llama 3.1 8B |
| **Cerebras** | Yes | `PROVIDER_CEREBRAS_KEY` | Qwen3 235B |
| **SambaNova** | Yes | `PROVIDER_SAMBANOVA_KEY` | DeepSeek V3.2, Llama 3.3 70B |
| **Mistral** | Limited | `PROVIDER_MISTRAL_KEY` | Mistral Large 3, Codestral |
| **Cloudflare Workers AI** | Yes | `PROVIDER_CLOUDFLARE_KEY` | Llama 3.3 70B (FP8) |
| **GitHub Models** | Limited | `PROVIDER_GITHUB_KEY` | GPT-4o |
| **Pollinations** | Yes (no key) | _(none needed)_ | OpenAI (Pollinations) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/rakshit176/freellmapi-vercel.git
cd freellmapi-vercel
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add at least one provider API key. The more providers you configure, the better the fallback coverage.

### 3. Run Locally

```bash
npm run dev
# Server starts at http://localhost:3001
```

### 4. Test the API

```bash
# List available models
curl http://localhost:3001/v1/models

# Chat completion (non-streaming)
curl http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'

# Chat completion (streaming)
curl http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

---

## Using with OpenAI SDKs

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://your-freellmapi.vercel.app/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### JavaScript / TypeScript

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://your-freellmapi.vercel.app/v1',
  apiKey: 'your-api-key',
});

const stream = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | No | Bearer token for authentication. If not set, the API is open (no auth) |
| `PROVIDER_OPENROUTER_KEY` | No | OpenRouter API key |
| `PROVIDER_GOOGLE_KEY` | No | Google Gemini API key |
| `PROVIDER_GROQ_KEY` | No | Groq API key |
| `PROVIDER_CEREBRAS_KEY` | No | Cerebras API key |
| `PROVIDER_SAMBANOVA_KEY` | No | SambaNova API key |
| `PROVIDER_MISTRAL_KEY` | No | Mistral API key |
| `PROVIDER_CLOUDFLARE_KEY` | No | Cloudflare Workers AI key (format: `account_id:api_token`) |
| `PROVIDER_GITHUB_KEY` | No | GitHub Models API key |
| `PROVIDER_*_MODELS` | No | Override default model list for any provider (see below) |
| `NEXT_PUBLIC_SITE_URL` | No | Site URL for OpenRouter headers (default: `https://portfolio-v3.vercel.app`) |

### Custom Model Lists

Override the default models for any provider using the format:
```
PROVIDER_OPENROUTER_MODELS=model_id|Display Name|rank|context_window,model_id2|Name2|rank2|ctx2
```

Example:
```env
PROVIDER_OPENROUTER_MODELS=minimax/minimax-m2.5:free|MiniMax M2.5|1|196608,qwen/qwen3-coder:free|Qwen3 Coder|2|262144
```

Lower rank = tried first. Models are sorted by rank when using `model: "auto"`.

---

## How Routing Works

1. **Request arrives** at `POST /v1/chat/completions`
2. **Authentication** — If `API_KEY` is set, validate the Bearer token
3. **Model selection** — If `model: "auto"`, the router sorts all available models by rank and picks the best one. If a specific model ID is provided, it finds that model across providers
4. **Provider call** — The request is forwarded to the selected provider's `/chat/completions` endpoint
5. **Fallback** — If the provider returns a retryable error (429, 500, 503, timeout), the router moves to the next best provider
6. **Retry loop** — Up to 5 attempts across different providers before returning a 429 error

---

## Deployment on Vercel

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Add all `PROVIDER_*_KEY` environment variables and `API_KEY`
5. Deploy

The app uses Next.js API routes, so Vercel automatically converts each route into a serverless function. No `vercel.json` configuration needed.

---

## Project Structure

```
src/
├── app/
│   ├── api/health/route.ts           # Health check endpoint
│   ├── v1/
│   │   ├── chat/completions/route.ts # Chat completions (streaming + non-streaming)
│   │   └── models/route.ts           # Models list endpoint
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page with docs
│   └── globals.css                   # Global styles
└── lib/
    └── providers.ts                  # Provider configs, routing logic, model ranking
```

---

## Response Headers

| Header | Description |
|--------|-------------|
| `X-Routed-Via` | The provider and model used (e.g., `openrouter/minimax/minimax-m2.5:free`) |
| `X-Fallback-Attempts` | Number of fallback attempts before a successful response (only present if > 0) |

---

## License

MIT

---

Built by [Rakshith Kumar K.N](https://github.com/rakshit176)
