import { NextRequest, NextResponse } from 'next/server';
import { loadProviders, routeRequest, getChatUrl, getHeaders, isRetryableError, type ProviderConfig, type ModelConfig } from '@/lib/providers';

// ── Auth ──
function validateAuth(request: NextRequest): boolean {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const apiKey = process.env.API_KEY;
  if (!apiKey) return true; // No auth required if API_KEY not set
  if (!token) return false;
  return token === apiKey;
}

// ── Request schema ──
interface ChatMessage {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

// ── POST /v1/chat/completions ──
export async function POST(request: NextRequest) {
  // Auth check
  if (!validateAuth(request)) {
    return NextResponse.json(
      { error: { message: 'Invalid API key', type: 'authentication_error' } },
      { status: 401 }
    );
  }

  // Parse request
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body', type: 'invalid_request_error' } },
      { status: 400 }
    );
  }

  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json(
      { error: { message: 'Messages array is required', type: 'invalid_request_error' } },
      { status: 400 }
    );
  }

  // Flatten multimodal content to plain text
  const messages = body.messages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content :
      (Array.isArray(m.content) ? m.content.map(b => b.text || '').join(' ') : String(m.content)),
  }));

  const providers = loadProviders();
  const requestedModel = body.model;

  // Streaming — try providers in rank order, fallback on error
  if (body.stream) {
    return handleStream(providers, messages, requestedModel, body);
  }

  // Non-streaming — try providers with fallback
  return handleNonStream(providers, messages, requestedModel, body);
}

async function handleNonStream(
  providers: ProviderConfig[],
  messages: Array<{ role: string; content: string }>,
  requestedModel: string | undefined,
  body: ChatRequest,
) {
  const maxRetries = 5;
  const triedRoutes = new Set<string>();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Route to best available model (skip already-tried ones)
    const route = findNextRoute(providers, requestedModel, triedRoutes);
    if (!route) {
      return NextResponse.json(
        { error: { message: 'All models exhausted. Try again later.', type: 'rate_limit_error' } },
        { status: 429 }
      );
    }

    const routeKey = `${route.provider.platform}:${route.model.id}`;
    triedRoutes.add(routeKey);

    try {
      const url = getChatUrl(route.provider);
      const headers = getHeaders(route.provider);

      const payload: Record<string, any> = {
        model: route.model.id,
        messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 2048,
        stream: false,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), route.provider.timeoutMs || 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        const errMsg = `API error ${response.status}: ${errText.slice(0, 200)}`;
        console.warn(`[FreeLLMAPI] ${route.provider.name}/${route.model.displayName} → ${errMsg}`);

        if (isRetryableError({ message: errMsg })) {
          continue; // Try next provider
        }
        // Non-retryable error
        return NextResponse.json(
          { error: { message: `Provider error (${route.provider.name}): ${errMsg}`, type: 'provider_error' } },
          { status: 502 }
        );
      }

      const result = await response.json();
      // Add routing info header
      const headers2 = new Headers();
      headers2.set('X-Routed-Via', `${route.provider.platform}/${route.model.id}`);
      if (attempt > 0) headers2.set('X-Fallback-Attempts', String(attempt));

      return new NextResponse(JSON.stringify(result), {
        status: 200,
        headers: headers2,
      });

    } catch (err: any) {
      console.warn(`[FreeLLMAPI] ${route.provider.name}/${route.model.displayName} → ${err.message}`);
      if (isRetryableError(err)) {
        continue;
      }
      return NextResponse.json(
        { error: { message: `Provider error: ${err.message}`, type: 'provider_error' } },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    { error: { message: 'All models rate-limited after retries', type: 'rate_limit_error' } },
    { status: 429 }
  );
}

function handleStream(
  providers: ProviderConfig[],
  messages: Array<{ role: string; content: string }>,
  requestedModel: string | undefined,
  body: ChatRequest,
): NextResponse {
  const maxRetries = 5;
  const triedRoutes = new Set<string>();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const route = findNextRoute(providers, requestedModel, triedRoutes);
        if (!route) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: 'All models exhausted' } })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        triedRoutes.add(`${route.provider.platform}:${route.model.id}`);

        try {
          const url = getChatUrl(route.provider);
          const headers = getHeaders(route.provider);

          const payload: Record<string, any> = {
            model: route.model.id,
            messages,
            temperature: body.temperature ?? 0.7,
            max_tokens: body.max_tokens ?? 2048,
            stream: true,
          };

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

          if (!response.ok || !response.body) {
            const errText = await response.text().catch(() => '');
            console.warn(`[FreeLLMAPI Stream] ${route.provider.name} → ${response.status}: ${errText.slice(0, 100)}`);
            if (isRetryableError({ message: `API error ${response.status}` })) {
              continue; // Try next provider
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: `Provider error (${route.provider.name})` } })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // Pipe the SSE stream through
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value); // Pass through raw bytes
            }
          } catch (streamErr: any) {
            console.warn(`[FreeLLMAPI Stream] Mid-stream error: ${streamErr.message}`);
          }

          controller.close();
          return;

        } catch (err: any) {
          console.warn(`[FreeLLMAPI Stream] ${route.provider.name} → ${err.message}`);
          if (isRetryableError(err)) continue;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function findNextRoute(
  providers: ProviderConfig[],
  requestedModel: string | undefined,
  triedRoutes: Set<string>,
) {
  // Collect all routes, sort by rank
  const allRoutes: Array<{ provider: ProviderConfig; model: ModelConfig }> = [];
  for (const p of providers) {
    for (const m of p.models) {
      const key = `${p.platform}:${m.id}`;
      if (triedRoutes.has(key)) continue;
      allRoutes.push({ provider: p, model: m });
    }
  }

  // If specific model requested, filter to it
  if (requestedModel && requestedModel !== 'auto') {
    const filtered = allRoutes.filter(r => r.model.id === requestedModel);
    if (filtered.length > 0) return filtered[0];
    return null;
  }

  // Sort by rank and return best
  allRoutes.sort((a, b) => a.model.rank - b.model.rank);
  return allRoutes[0] || null;
}
