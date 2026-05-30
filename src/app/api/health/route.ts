import { NextResponse } from 'next/server';
import { loadProviders, getAllModels } from '@/lib/providers';

export async function GET() {
  const providers = loadProviders();
  const models = getAllModels(providers);

  return NextResponse.json({
    status: 'ok',
    version: '1.0.0-vercel',
    providers: providers.map(p => ({
      platform: p.platform,
      name: p.name,
      models: p.models.length,
    })),
    totalModels: models.length,
    timestamp: new Date().toISOString(),
  });
}
