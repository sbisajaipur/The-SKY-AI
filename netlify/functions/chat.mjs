
import OpenAI from "openai";

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OpenAI API key is missing in Netlify settings." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    const safeMessages = messages
      .filter(item =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string"
      )
      .slice(-20)
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 8000)
      }));

    if (!safeMessages.length) {
      return Response.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const useWebSearch = body.webSearch !== false;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",

      instructions: `
        You are SKY AI, created by founder Daksh Pareek.
        Your tagline is BEYOND IMAGINATION.
        Be helpful, accurate and friendly.
        Reply in the user's language.
        For current information and internet research,
        use web search when it is enabled.
        Never invent sources or facts.
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
    });

  } catch (error) {
    console.error("SKY AI Error:", error);

    return Response.json(
      {
        error: "SKY AI could not respond. Please check API settings and balance."
      },
      { status: 500 }
    );
  }
};
