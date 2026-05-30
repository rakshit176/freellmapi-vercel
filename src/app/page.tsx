export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">FreeLLMAPI</h1>
        <p className="text-lg text-neutral-400">OpenAI-compatible LLM proxy &middot; Free tier &middot; Auto-fallback</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-neutral-300">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">How it works</h2>
          <p>FreeLLMAPI routes your chat completion requests across multiple free-tier LLM providers (OpenRouter, Google, Groq, Cerebras, Mistral, etc.) with automatic fallback on rate limits or errors. It is fully OpenAI-compatible — just change the base URL.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Quick Start</h2>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 font-mono text-xs space-y-2">
            <div className="text-neutral-500"># Set the base URL to your FreeLLMAPI instance</div>
            <div>export OPENAI_BASE_URL=https://<span className="text-amber-400">your-domain</span>.vercel.app/v1</div>
            <div>export OPENAI_API_KEY=<span className="text-amber-400">your-api-key</span></div>
            <div className="mt-3 text-neutral-500"># Or use with curl</div>
            <div>curl https://<span className="text-amber-400">your-domain</span>.vercel.app/v1/chat/completions \</div>
            <div className="pl-4">-H &quot;Authorization: Bearer <span className="text-amber-400">your-api-key</span>&quot; \</div>
            <div className="pl-4">-H &quot;Content-Type: application/json&quot; \</div>
            <div className="pl-4">-d {`'{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'`}</div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Endpoints</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="py-2 pr-4 text-neutral-400 font-medium">Method</th>
                <th className="py-2 pr-4 text-neutral-400 font-medium">Path</th>
                <th className="py-2 text-neutral-400 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className="border-b border-neutral-800/50">
                <td className="py-2 pr-4 text-emerald-400">POST</td>
                <td className="py-2 pr-4 text-white">/v1/chat/completions</td>
                <td className="py-2 text-neutral-400">Chat completions (streaming supported)</td>
              </tr>
              <tr className="border-b border-neutral-800/50">
                <td className="py-2 pr-4 text-blue-400">GET</td>
                <td className="py-2 pr-4 text-white">/v1/models</td>
                <td className="py-2 text-neutral-400">List available models</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-blue-400">GET</td>
                <td className="py-2 pr-4 text-white">/api/health</td>
                <td className="py-2 text-neutral-400">Health check</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Models</h2>
          <p>Use <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-amber-400">model: &quot;auto&quot;</code> to let the router pick the best available model, or specify a model ID from the <a href="/v1/models" className="text-blue-400 hover:underline">models list</a>.</p>
        </section>
      </div>

      <footer className="mt-16 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
        FreeLLMAPI &middot; Serverless on Vercel &middot; No database &middot; Config via environment variables
      </footer>
    </main>
  );
}
