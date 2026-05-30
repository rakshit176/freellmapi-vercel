import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreeLLMAPI — Free LLM Proxy",
  description: "OpenAI-compatible API proxy that routes across free-tier LLM providers with automatic fallback. Try it now with our chat interface.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#09090b] text-[#e4e4e7] min-h-0 h-dvh overflow-hidden antialiased">{children}</body>
    </html>
  );
}
