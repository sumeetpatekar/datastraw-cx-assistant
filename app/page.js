"use client";

import { useState } from "react";
import { conversations, brands } from "../lib/mockData";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ConfidenceBadge({ needsReview }) {
  if (needsReview) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn">
        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
        Needs review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-moss/10 px-2 py-0.5 text-xs font-medium text-moss">
      <span className="h-1.5 w-1.5 rounded-full bg-moss" />
      Confident
    </span>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(conversations[0].id);
  const [replyState, setReplyState] = useState({}); // conversationId -> { text, needsReview, guardrailFlags, retrievedContext, status }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const conversation = conversations.find((c) => c.id === selectedId);
  const brand = brands[conversation.brand_id];
  const current = replyState[selectedId];

  async function generateReply(regenerate = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate reply");

      setReplyState((prev) => ({
        ...prev,
        [selectedId]: {
          text: data.reply,
          needsReview: data.needsReview,
          guardrailFlags: data.guardrailFlags,
          retrievedContext: data.retrievedContext,
          status: "draft",
        },
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function editReply(text) {
    setReplyState((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], text, status: "edited" },
    }));
  }

  async function approveReply() {
    const state = replyState[selectedId];
    if (!state) return;
    setReplyState((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], status: "approved" },
    }));
    try {
      await fetch("/api/log-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedId,
          editedResponse: state.status === "edited" ? state.text : null,
          finalResponse: state.text,
          action: state.status === "edited" ? "edited" : "approved",
        }),
      });
    } catch (e) {
      // Logging failure shouldn't block the agent's workflow -- surface
      // quietly rather than blocking approval.
      console.error("Failed to log approval", e);
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 border-r border-line bg-white/60 flex flex-col">
        <div className="px-5 pt-6 pb-4 border-b border-line">
          <p className="font-display text-lg leading-tight">CX Reply Assistant</p>
          <p className="text-xs text-ink/50 mt-1">Datastraw &middot; assessment build</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => {
            const b = brands[c.brand_id];
            const isActive = c.id === selectedId;
            const last = c.history[c.history.length - 1];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-5 py-3.5 border-b border-line transition-colors ${
                  isActive ? "bg-sand" : "hover:bg-sand/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.customer.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-ink/40">{b.name}</span>
                </div>
                <p className="text-xs text-ink/55 mt-1 line-clamp-2">{last.text}</p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        {/* Conversation column */}
        <section className="flex-1 flex flex-col overflow-hidden border-r border-line">
          <header className="px-8 pt-6 pb-4 border-b border-line bg-white/40">
            <div className="flex items-baseline justify-between">
              <div>
                <h1 className="font-display text-2xl">{conversation.customer.name}</h1>
                <p className="text-sm text-ink/55 mt-0.5">
                  {brand.name} &middot; {conversation.customer.phone}
                </p>
              </div>
              <div className="text-right text-xs text-ink/50 font-mono">
                <p>{conversation.order.order_id}</p>
                <p>{conversation.order.item}</p>
                <p>Delivered {formatDate(conversation.order.delivered_on)}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
            {conversation.history.map((m, i) => (
              <div key={i} className={`flex ${m.sender === "customer" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[70%] rounded-md px-4 py-2.5 text-sm leading-relaxed ${
                    m.sender === "customer" ? "bg-white border border-line" : "bg-moss text-white"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="px-8 py-5 border-t border-line bg-white/40">
            <button
              onClick={() => generateReply(false)}
              disabled={loading}
              className="rounded-md bg-clay px-5 py-2.5 text-sm font-medium text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Generating..." : current ? "Generate reply again" : "Generate Reply"}
            </button>
            {error && <p className="text-warn text-xs mt-2">{error}</p>}
          </div>
        </section>

        {/* Reply panel */}
        <section className="w-[420px] shrink-0 flex flex-col overflow-hidden bg-white/30">
          <header className="px-6 pt-6 pb-4 border-b border-line flex items-center justify-between">
            <h2 className="font-display text-lg">Suggested reply</h2>
            {current && <ConfidenceBadge needsReview={current.needsReview} />}
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!current && (
              <p className="text-sm text-ink/45 leading-relaxed">
                Click <span className="font-medium text-ink/70">Generate Reply</span> to draft a response using the
                brand's knowledge base.
              </p>
            )}

            {current && (
              <>
                <textarea
                  value={current.text}
                  onChange={(e) => editReply(e.target.value)}
                  rows={8}
                  className="w-full rounded-md border border-line bg-white px-3.5 py-3 text-sm leading-relaxed resize-none focus:border-moss transition-colors"
                />

                {current.needsReview && current.guardrailFlags?.length > 0 && (
                  <div className="mt-4 rounded-md border border-warn/30 bg-warn/5 px-3.5 py-3">
                    <p className="text-xs font-medium text-warn mb-1.5">Flagged for review</p>
                    <ul className="space-y-1">
                      {current.guardrailFlags.map((f, i) => (
                        <li key={i} className="text-xs text-ink/65 leading-relaxed">
                          &bull; {f.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5">
                  <p className="text-xs font-medium text-ink/50 mb-2 uppercase tracking-wide">Retrieved context</p>
                  <div className="space-y-2">
                    {current.retrievedContext?.map((e) => (
                      <div key={e.id} className="text-xs text-ink/60 border border-line rounded-sm px-3 py-2 bg-sand/40">
                        <span className="font-medium text-ink/75">{e.topic.replace(/_/g, " ")}</span>
                        <p className="mt-0.5 leading-relaxed">{e.content}</p>
                      </div>
                    ))}
                    {(!current.retrievedContext || current.retrievedContext.length === 0) && (
                      <p className="text-xs text-ink/45">No matching context was found.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {current && (
            <div className="px-6 py-4 border-t border-line flex items-center gap-2">
              <button
                onClick={() => generateReply(true)}
                disabled={loading}
                className="flex-1 rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-sand transition-colors disabled:opacity-50"
              >
                Regenerate
              </button>
              <button
                onClick={approveReply}
                className="flex-1 rounded-md bg-moss px-3 py-2 text-sm font-medium text-white hover:bg-moss/90 transition-colors"
              >
                {current.status === "approved" ? "Approved ✓" : "Approve"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
