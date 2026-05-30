import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreeLLMAPI — Free LLM Proxy",
  description: "OpenAI-compatible API proxy that routes across free-tier LLM providers with automatic fallback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-[#e5e5e5] min-h-screen antialiased">{children}</body>
    </html>
  );
}
