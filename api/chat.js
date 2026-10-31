
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "SKY AI API key is not configured yet."
    });
  }

  try {
    const { messages = [] } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid messages."
      });
    }

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

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "You are SKY AI, a helpful, intelligent and friendly AI assistant. Give clear, accurate and useful answers. Respond in the language used by the user.",
      input: safeMessages
    });

    return res.status(200).json({
      reply: response.output_text || "Please try again."
    });

  } catch (error) {
    console.error("SKY AI error:", error.message);

    return res.status(500).json({
      error: "SKY AI could not respond. Please try again."
    });
  }
}
