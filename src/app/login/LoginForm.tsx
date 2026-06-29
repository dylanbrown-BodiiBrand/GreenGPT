"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const B = {
  forest: "#0B3D2E",
  cream: "#FAF7F2",
};

export function LoginForm({
  initialError,
  nextPath,
  initialEmail,
}: {
  initialError?: string;
  nextPath: string;
  initialEmail?: string;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    sendMagicLink,
    initialError ? { error: initialError } : {}
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: B.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Outfit:wght@300;400;500;600&display=swap');`}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 16,
          padding: "40px 36px",
          border: "1.5px solid #E8E6E0",
          boxShadow: "0 8px 32px rgba(11,61,46,0.08)",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
        <h1
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 28,
            color: B.forest,
            margin: "0 0 8px",
          }}
        >
          Sign in
        </h1>
        <p style={{ fontSize: 14, color: "#666", fontWeight: 300, margin: "0 0 28px", lineHeight: 1.5 }}>
          Use the same email as your Pro subscription. We&apos;ll send a magic link.
        </p>

        <form action={formAction}>
          <input type="hidden" name="next" value={nextPath} />
          <label
            htmlFor="login-email"
            style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={initialEmail ?? ""}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1.5px solid #E0DDD6",
              fontSize: 14,
              marginBottom: 16,
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={pending}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: B.forest,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: pending ? "wait" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {state.error && (
          <p style={{ marginTop: 16, fontSize: 13, color: "#C0392B" }}>{state.error}</p>
        )}
        {state.success && (
          <p style={{ marginTop: 16, fontSize: 13, color: B.forest }}>{state.success}</p>
        )}
      </div>
    </div>
  );
}
