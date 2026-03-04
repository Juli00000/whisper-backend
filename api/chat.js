/**
 * BACKEND-PROXY FÜR WHISPERTOME.DE
 * Nutzt die OpenAI Responses API mit File Search
 * um Antworten aus deinem Vector Store zu generieren.
 */

export default async function handler(req, res) {
  // CORS-Header
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API-Key nicht konfiguriert" });
  }

  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Keine Nachricht empfangen" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        instructions: `Du bist der juristische Assistent von whispertome.de.
Du beantwortest Fragen AUSSCHLIESSLICH auf Basis der Dokumente, die dir zur Verfügung stehen.
Wenn die Antwort nicht in den Dokumenten zu finden ist, sage ehrlich: "Dazu habe ich leider keine Informationen in meinen Unterlagen."
Du gibst keine persönliche Rechtsberatung.
Du antwortest immer auf Deutsch.
Verweise bei jeder Antwort auf die relevante Quelle oder den Paragraphen.`,
        input: message,
        tools: [
          {
            type: "file_search",
            vector_store_ids: ["vs_697df9518f0c8191bcc2a31037c29714"],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI Fehler:", JSON.stringify(errorData));
      return res.status(500).json({ error: "Fehler bei der KI-Anfrage" });
    }

    const data = await response.json();

    // Antworttext aus der Responses API extrahieren
    let reply = "";
    if (data.output) {
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const block of item.content) {
            if (block.type === "output_text") {
              reply += block.text;
            }
          }
        }
      }
    }

    if (!reply) {
      reply = "Entschuldigung, ich konnte leider keine Antwort generieren. Bitte versuche es erneut.";
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Server-Fehler:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
}
