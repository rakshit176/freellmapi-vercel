// ═══════════════════════════════════════════════════════════════
// FreeLLMAPI — Vercel Serverless Edition
// Routes requests across free-tier LLM providers with fallback.
// No database — all config from environment variables.
// ═══════════════════════════════════════════════════════════════

export interface ProviderConfig {
  platform: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: ModelConfig[];
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}

export interface ModelConfig {
  id: string;           // model id sent to provider
  displayName: string;
  rank: number;         // lower = smarter, tried first
  contextWindow: number;
}

export interface RouteResult {
  provider: ProviderConfig;
  model: ModelConfig;
}

/**
 * Load all providers from environment variables.
 * API keys are stored as PROVIDER_<NAME>_KEY env vars.
 * Models are configured as PROVIDER_<NAME>_MODELS (comma-separated model ids).
 */
export function loadProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // ── OpenRouter ──
  const orKey = process.env.PROVIDER_OPENROUTER_KEY;
  if (orKey) {
    providers.push({
      platform: 'openrouter',
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: orKey,
      extraHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://portfolio-v3.vercel.app',
        'X-Title': 'FreeLLMAPI',
      },
      models: parseModels(process.env.PROVIDER_OPENROUTER_MODELS || [
        'minimax/minimax-m2.5:free|MiniMax M2.5|1|196608',
        'qwen/qwen3-coder:free|Qwen3 Coder|2|262144',
        'openai/gpt-oss-120b:free|GPT-OSS 120B|3|131072',
        'google/gemma-4-31b-it:free|Gemma 4 31B|10|262144',
        'meta-llama/llama-3.3-70b-instruct:free|Llama 3.3 70B|15|131072',
      ].join(',')),
    });
  }

  // ── Google Gemini ──
  const googleKey = process.env.PROVIDER_GOOGLE_KEY;
  if (googleKey) {
    providers.push({
      platform: 'google',
      name: 'Google',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: googleKey,
      models: parseModels(process.env.PROVIDER_GOOGLE_MODELS || [
        'gemini-2.5-flash|Gemini 2.5 Flash|5|1048576',
        'gemini-2.5-flash-lite|Gemini 2.5 Flash-Lite|20|1048576',
      ].join(',')),
    });
  }

  // ── Groq ──
  const groqKey = process.env.PROVIDER_GROQ_KEY;
  if (groqKey) {
    providers.push({
      platform: 'groq',
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: groqKey,
      models: parseModels(process.env.PROVIDER_GROQ_MODELS || [
        'llama-3.3-70b-versatile|Llama 3.3 70B|12|131072',
        'llama-3.1-8b-instant|Llama 3.1 8B|25|131072',
      ].join(',')),
    });
  }

  // ── Cerebras ──
  const cerebrasKey = process.env.PROVIDER_CEREBRAS_KEY;
  if (cerebrasKey) {
    providers.push({
      platform: 'cerebras',
      name: 'Cerebras',
      baseUrl: 'https://api.cerebras.ai/v1',
      apiKey: cerebrasKey,
      models: parseModels(process.env.PROVIDER_CEREBRAS_MODELS || [
        'qwen-3-235b-a22b-instruct-2507|Qwen3 235B|4|8192',
      ].join(',')),
    });
  }

  // ── SambaNova ──
  const sambaKey = process.env.PROVIDER_SAMBANOVA_KEY;
  if (sambaKey) {
    providers.push({
      platform: 'sambanova',
      name: 'SambaNova',
      baseUrl: 'https://api.sambanova.ai/v1',
      apiKey: sambaKey,
      models: parseModels(process.env.PROVIDER_SAMBANOVA_MODELS || [
        'DeepSeek-V3.2|DeepSeek V3.2|3|131072',
        'Meta-Llama-3.3-70B-Instruct|Llama 3.3 70B|14|8192',
      ].join(',')),
    });
  }

  // ── Mistral ──
  const mistralKey = process.env.PROVIDER_MISTRAL_KEY;
  if (mistralKey) {
    providers.push({
      platform: 'mistral',
      name: 'Mistral',
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: mistralKey,
      models: parseModels(process.env.PROVIDER_MISTRAL_MODELS || [
        'mistral-large-latest|Mistral Large 3|8|131072',
        'codestral-latest|Codestral|11|32000',
      ].join(',')),
    });
  }

  // ── Cloudflare ──
  const cfKey = process.env.PROVIDER_CLOUDFLARE_KEY;
  if (cfKey) {
    providers.push({
      platform: 'cloudflare',
      name: 'Cloudflare',
      baseUrl: `https://api.cloudflare.com/client/v4/accounts/${cfKey.split(':')[0]}/ai/v1`,
      apiKey: cfKey.split(':')[1] || cfKey,
      models: parseModels(process.env.PROVIDER_CLOUDFLARE_MODELS || [
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast|Llama 3.3 70B CF|16|131072',
      ].join(',')),
    });
  }

  // ── GitHub Models ──
  const githubKey = process.env.PROVIDER_GITHUB_KEY;
  if (githubKey) {
    providers.push({
      platform: 'github',
      name: 'GitHub Models',
      baseUrl: 'https://models.github.ai/inference',
      apiKey: githubKey,
      models: parseModels(process.env.PROVIDER_GITHUB_MODELS || [
        'gpt-4o|GPT-4o|18|8000',
      ].join(',')),
    });
  }

  // ── Pollinations (no key needed) ──
  providers.push({
    platform: 'pollinations',
    name: 'Pollinations',
    baseUrl: 'https://text.pollinations.ai/openai/v1',
    apiKey: 'pollinations-free',
    models: [
      { id: 'openai', displayName: 'OpenAI (Pollinations)', rank: 30, contextWindow: 32000 },
    ],
  });

  return providers;
}

/**
 * Parse model config from env var format: "model_id|display_name|rank|context_window"
 * Multiple models comma-separated.
 */
function parseModels(envStr: string): ModelConfig[] {
  return envStr.split(',')
    .map(entry => {
      const parts = entry.trim().split('|');
      if (parts.length < 4) return null;
      return {
        id: parts[0].trim(),
        displayName: parts[1].trim(),
        rank: parseInt(parts[2], 10) || 99,
        contextWindow: parseInt(parts[3], 10) || 8192,
      };
    })
    .filter((m): m is ModelConfig => m !== null);
}

/**
 * Get all available models sorted by rank (smartest first).
 */
export function getAllModels(providers: ProviderConfig[]): Array<ModelConfig & { platform: string; providerName: string }> {
  const models: Array<ModelConfig & { platform: string; providerName: string }> = [];
  for (const p of providers) {
    for (const m of p.models) {
      models.push({ ...m, platform: p.platform, providerName: p.name });
    }
  }
  return models.sort((a, b) => a.rank - b.rank);
}

/**
 * Route a request to the best available model.
 * If a specific model is requested, find it. Otherwise, pick by rank.
 */
export function routeRequest(
  providers: ProviderConfig[],
  requestedModel?: string,
): RouteResult | null {
  // Collect all provider+model combos
  const allRoutes: RouteResult[] = [];
  for (const p of providers) {
    for (const m of p.models) {
      allRoutes.push({ provider: p, model: m });
    }
  }

  // If specific model requested, find exact match
  if (requestedModel && requestedModel !== 'auto') {
    const match = allRoutes.find(r => r.model.id === requestedModel);
    if (match) return match;
    return null; // Model not found
  }

  // Auto-route: sort by rank (lower = smarter), return best
  allRoutes.sort((a, b) => a.model.rank - b.model.rank);
  return allRoutes[0] || null;
}

/**
 * Build the full URL for a chat completion request.
 */
export function getChatUrl(provider: ProviderConfig): string {
  return `${provider.baseUrl}/chat/completions`;
}

/**
 * Build request headers for a provider.
 */
export function getHeaders(provider: ProviderConfig): Record<string, string> {
  return {
    'Authorization': `Bearer ${provider.apiKey}`,
    'Content-Type': 'application/json',
    ...provider.extraHeaders,
  };
}

/**
 * Check if an error is retryable (429, 503, timeout, etc.)
 */
export function isRetryableError(err: any): boolean {
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')
    || msg.includes('quota') || msg.includes('resource_exhausted')
    || msg.includes('timeout') || msg.includes('503') || msg.includes('unavailable')
    || msg.includes('500') || msg.includes('internal server error')
    || msg.includes('404') || msg.includes('not found');
}
