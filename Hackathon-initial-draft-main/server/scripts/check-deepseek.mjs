/**
 * Verifies your DeepSeek API key from server/.env (run from TAKEN/server).
 * Usage: npm run check-deepseek
 *
 * Get a key: https://platform.deepseek.com/ → API keys
 */
import "../src/envLoad.js";
import axios from "axios";

const key = process.env.DEEPSEEK_API_KEY?.trim();
const url = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions";
const model = process.env.DEEPSEEK_CHAT_MODEL || "deepseek-chat";

if (!key) {
  console.error(`
  No DEEPSEEK_API_KEY in environment.
  1. Create a key: https://platform.deepseek.com/
  2. Add to TAKEN/server/.env:
     DEEPSEEK_API_KEY=sk-...
  3. Restart the API server.
`);
  process.exit(1);
}

try {
  const { data } = await axios.post(
    url,
    {
      model,
      messages: [{ role: "user", content: "Reply with exactly the word: OK" }],
      max_tokens: 16,
      temperature: 0
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );
  const reply = data?.choices?.[0]?.message?.content?.trim();
  console.log("DeepSeek API reachable. Model:", model);
  console.log("Sample reply:", reply ?? "(empty)");
  process.exit(0);
} catch (e) {
  const detail = e.response?.data ?? e.message;
  console.error("DeepSeek request failed:", JSON.stringify(detail, null, 2));
  process.exit(1);
}
