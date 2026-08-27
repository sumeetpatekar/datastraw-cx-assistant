import { NextResponse } from "next/server";
import { conversations, brands } from "../../../lib/mockData";
import { retrieveContext } from "../../../lib/retrieval";
import { evaluateGuardrails } from "../../../lib/guardrails";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";

export const runtime = "nodejs";

function buildSystemPrompt({ brand, entries, guardrail }) {
  const contextBlock = entries.length
    ? entries.map((e) => `- [${e.topic}] ${e.content}`).join("\n")
    : "(No matching policy was found in the knowledge base.)";

  const flagsBlock = guardrail.flags.length
    ? guardrail.flags.map((f) => `- ${f.message}`).join("\n")
    : "None.";

  return `You are a customer support reply assistant for the brand "${brand.name}" (${brand.tagline}).

You write a SUGGESTED reply for a human support agent to review, edit, and approve. You are not sending this directly to the customer.

RULES (follow strictly):
1. Base your answer ONLY on the "Brand knowledge base context" below. Do not invent policy details, dates, refund amounts, or promises that aren't supported by the context.
2. If the context does not fully cover the customer's situation, or a guardrail flag below applies, do NOT confidently promise an outcome (e.g. "you will get a refund"). Instead, acknowledge the issue empathetically, explain what you *can* confirm, and state that the specific outcome needs to be confirmed by the team / is being escalated.
3. Keep the tone warm, concise, and human -- 2-5 sentences. No corporate boilerplate.
4. Never mention "knowledge base", "guardrail", "LLM", or internal system names to the customer.
5. After writing the reply, on a new line output exactly one of:
CONFIDENCE: high
CONFIDENCE: needs_review
   Use "needs_review" if any guardrail flag below is non-empty, or if you had to hedge because information was missing.

Brand knowledge base context:
${contextBlock}

Guardrail flags (internal, do not mention to customer):
${flagsBlock}
`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { conversationId, regenerate } = body;

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const brand = brands[conversation.brand_id];
    const latestMessage = conversation.history[conversation.history.length - 1]?.text || "";

    // 1 & 2: identify brand (from conversation) + retrieve KB context
    const { entries, isFallback } = retrieveContext(conversation.brand_id, latestMessage);

    // Deterministic guardrail check against the actual order
    const guardrail = evaluateGuardrails({ entries, order: conversation.order, isFallback });

    // 3: build context/prompt for the LLM
    const systemPrompt = buildSystemPrompt({ brand, entries, guardrail });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not set on the server. Add it in your deployment's environment variables." },
        { status: 500 }
      );
    }

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    // 4: call the LLM
    const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: regenerate ? 0.7 : 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Customer name: ${conversation.customer.name}\nOrder: ${conversation.order.item} (${conversation.order.order_id}), delivered ${conversation.order.delivered_on}\nCustomer's latest message: "${latestMessage}"\n\nWrite the suggested reply now.`,
          },
        ],
      }),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      return NextResponse.json({ error: `LLM request failed: ${errText}` }, { status: 502 });
    }

    const llmData = await llmRes.json();
    const raw = llmData.choices?.[0]?.message?.content || "";

    // Parse out the CONFIDENCE line the model was instructed to append
    const confidenceMatch = raw.match(/CONFIDENCE:\s*(high|needs_review)/i);
    const modelConfidence = confidenceMatch ? confidenceMatch[1].toLowerCase() : "needs_review";
    const aiResponse = raw.replace(/CONFIDENCE:\s*(high|needs_review)/i, "").trim();

    const needsReview = guardrail.needsReview || modelConfidence === "needs_review";

    // 5: log the interaction (customer message, context, response, flags)
    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from("reply_interactions").insert({
        conversation_id: conversation.id,
        brand_id: conversation.brand_id,
        customer_message: latestMessage,
        retrieved_context: entries,
        guardrail_flags: guardrail.flags,
        ai_response: aiResponse,
        final_response: aiResponse,
        needs_review: needsReview,
        model,
        agent_action: regenerate ? "regenerated" : "generated",
      });
    }

    return NextResponse.json({
      reply: aiResponse,
      needsReview,
      guardrailFlags: guardrail.flags,
      retrievedContext: entries,
      model,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
