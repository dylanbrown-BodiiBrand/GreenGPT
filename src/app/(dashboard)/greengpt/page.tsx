// src/app/green-gpt/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

type Citation = {
  ref: string;
  document_id: string;
  filename?: string | null;
  page_or_sheet?: string | null;
  section_path?: string | null;
  url?: string | null; // <-- clickable link
};

type QA = { question: string; answer: string; citations?: Citation[]; ts: number };

const CAL_URL = "https://cal.com/the-green-executive-briefing";

const GreenGPT = () => {
  const [question, setQuestion] = useState("");
  const [currentQA, setCurrentQA] = useState<QA | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QA[]>([]);

  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("greengpt_history") : null;
      if (saved) setHistory(JSON.parse(saved) as QA[]);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("greengpt_history", JSON.stringify(history.slice(0, 3)));
    } catch {}
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const asked = question.trim();
    setLoading(true);
    setQuestion(""); // clear textbox immediately
    setCurrentQA(null); // reset current display until response arrives

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked }),
      });

      const data = await res.json();
      const a: string = data.answer || "No response from GreenGPT.";
      const cits: Citation[] = Array.isArray(data.citations) ? data.citations : [];

      setHistory((prev) => {
        const filtered = prev.filter((h) => h.question !== asked);
        return [ ...(currentQA ? [currentQA] : []), ...filtered ].slice(0, 3);
      });
      setCurrentQA({ question: asked, answer: a, citations: cits, ts: Date.now() });
    } catch (err) {
      console.error(err);
      const a = "Error contacting GreenGPT.";
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.question !== asked);
        return [ ...(currentQA ? [currentQA] : []), ...filtered ].slice(0, 3);
      });
      setCurrentQA({ question: asked, answer: a, citations: [], ts: Date.now() });
    } finally {
      setLoading(false);
    }
  };

  const Sources: React.FC<{ citations?: Citation[] }> = ({ citations }) => {
    if (!citations || citations.length === 0) return null;
    return (
      <div className="mt-4">
        <h3 className="font-medium text-green-900 mb-1">Sources</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700">
          {citations.map((c, i) => {
            const label = c.filename ?? c.document_id;
            const extra =
              c.page_or_sheet
                ? ` (${c.page_or_sheet}${c.section_path ? ` • ${c.section_path}` : ""})`
                : c.section_path
                ? ` (${c.section_path})`
                : "";
            return (
              <li key={`${c.ref}-${c.document_id}-${i}`}>
                <span className="font-semibold">{c.ref}</span>{" "}
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 underline hover:no-underline"
                    title="Open source file in a new tab"
                  >
                    {label}
                  </a>
                ) : (
                  <span>{label}</span>
                )}
                <span className="text-gray-500">{extra}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-gray-500 mt-1">Links expire after ~10 minutes.</p>
      </div>
    );
  };

  return (
    <div className="bg-[#FAFAF4] min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <h1 className="text-2xl font-bold text-green-800 mb-4">
          GreenGPT – Sustainability Consulting AI
        </h1>
        <p className="text-black mb-6">
          Ask a question about green accounting, ESG compliance, or sustainability reporting and
          get instant AI-powered insights.
        </p>
        <p className="text-sm text-gray-500">
          Disclaimer: This is an AI-powered assistant. Responses should be verified for accuracy and are for learning purposes only.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here..."
            rows={4}
            className="border border-green-700 text-black rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className={`bg-green-700 text-white font-medium px-6 py-3 rounded transition ${
              !question.trim() || loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-green-800 hover:cursor-pointer"
            }`}
          >
            {loading ? "Thinking..." : "Ask GreenGPT"}
          </button>
        </form>

        {currentQA && (
          <div className="mt-6 bg-[#FAFAF4] border border-green-200 rounded-lg p-4">
            <p className="font-semibold text-green-900 mb-2">Q: {currentQA.question}</p>
            <h2 className="font-semibold text-green-800 mb-2">Answer:</h2>
            <div className="prose prose-green max-w-none text-black">
              <ReactMarkdown remarkPlugins={[gfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                {currentQA.answer}
              </ReactMarkdown>
            </div>

            {/* CTA Button */}
            <div className="mt-4 text-black">
              Need personalized advice?
              <br />
              <a
                href={CAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-700 text-white font-medium px-5 py-2 rounded hover:bg-green-800 transition"
              >
                Book a 30-minute Consultation
              </a>
            </div>

            <Sources citations={currentQA.citations} />
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Recent Questions & Answers</h3>
            <div className="flex flex-col gap-4">
              {history.map((item) => (
                <div key={String(item.ts)} className="bg-[#FAFAF4] border border-green-200 rounded-lg p-4">
                  <p className="font-medium text-green-900 mb-2">Q: {item.question}</p>
                  <div className="prose prose-green max-w-none text-black">
                    <ReactMarkdown remarkPlugins={[gfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                      {item.answer}
                    </ReactMarkdown>
                  </div>
                  <Sources citations={item.citations} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GreenGPT;
