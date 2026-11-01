
import OpenAI from "openai";

export default async (request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers }
    );
  }

  const apiKey = Netlify.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing in Netlify." },
      { status: 500, headers }
    );
  }

  try {
    const body = await request.json();

    const messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    const safeMessages = messages
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .slice(-20)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 8000)
      }));

    if (!safeMessages.length) {
      return Response.json(
        { error: "Please enter a message." },
        { status: 400, headers }
      );
    }

    const client = new OpenAI({ apiKey });

    const useWebSearch = body.webSearch !== false;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",

      instructions: `
        You are SKY AI, created by Daksh Pareek.
        Your tagline is BEYOND IMAGINATION.
        Answer accurately and helpfully.
        Respond in the user's language.
        Use web search for current information when enabled.
        Never invent facts or sources.
      `,

      input: safeMessages,

      ...(useWebSearch
        ? {
            tools: [{ type: "web_search" }],
            tool_choice: "auto"
          }
        : {})
    });

    const sources = [];

    for (const item of response.output || []) {
      if (item.type !== "message") continue;

      for (const content of item.content || []) {
        for (const annotation of content.annotations || []) {
          if (
            annotation.type === "url_citation" &&
            annotation.url &&
            !sources.some(s => s.url === annotation.url)
          ) {
            sources.push({
              title: annotation.title || annotation.url,
              url: annotation.url
            });
          }
        }
      }
    }

    return Response.json({
      reply: response.output_text || "Please try again.",
      sources
    }, { status: 200, headers });

  } catch (error) {
    console.error("SKY AI Error:", error);

    return Response.json({
      error: "AI request failed. Check API key, model access and billing."
    }, { status: 500, headers });
  }
};
