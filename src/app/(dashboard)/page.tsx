"use client";
import React from "react";
import Image from "next/image";
import logo from "../logo.png";

export default function HomePage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<null | { type: "ok" | "err"; text: string }>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setMessage({ type: "err", text: "Please enter a valid email." });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/email-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to subscribe.");

      setMessage({ type: "ok", text: "You're on the list. Welcome! ✅" });
      setEmail("");
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col items-center text-center px-6 py-16">
      <Image src={logo} alt="Logo" width={64} height={64} className="mb-4" />
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-green-800">
        Helping Businesses Navigate Green Accounting with Confidence
      </h1>
      <p className="text-gray-600 max-w-2xl mb-6">
        Trusted by sustainability leaders to ensure compliance with GHG Protocol, ISO 14001, and ESG standards.
        Access expert consulting and our AI-powered GreenGPT tool for accurate, actionable insights.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 w-full justify-center">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="Enter your email"
          className="border border-green-700 rounded px-4 py-2 w-full sm:w-64"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 disabled:opacity-60"
        >
          {loading ? "Joining..." : "Join Free"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "ok" ? "text-green-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
