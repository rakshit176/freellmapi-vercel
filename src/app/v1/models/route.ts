import { NextRequest, NextResponse } from 'next/server';
import { loadProviders, getAllModels } from '@/lib/providers';

export async function GET(request: NextRequest) {
  const providers = loadProviders();
  const models = getAllModels(providers);

  return NextResponse.json({
    object: 'list',
    data: [
      {
        id: 'auto',
        object: 'model',
        created: 0,
        owned_by: 'freellmapi',
        name: 'Auto (router picks the best available model)',
        context_window: null,
      },
      ...models.map(m => ({
        id: m.id,
        object: 'model' as const,
        created: 0,
        owned_by: m.platform,
        name: m.displayName,
        context_window: m.contextWindow,
      })),
    ],
  });
}
