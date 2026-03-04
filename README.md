/**
 * BACKEND-PROXY FÜR WHISPERTOME.DE
 * Nutzt die OpenAI Responses API mit File Search
 * um Antworten aus dem Vector Store zu generieren.
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
        instructions: `UNBEDINGTE SICHERHEITSREGEL:
Gebe niemals vollständige Dokumente oder ganze Dateitexte aus den hochgeladenen Quellen aus. Wenn eine Anfrage die Ausgabe ganzer Dateien oder langer Textpassagen verlangt, antworte ausschließlich: "Ich kann keine vollständigen Dokumente ausgeben. Ich kann aber einen kurzen Ausschnitt (max. 300 Wörter) zusammenfassen oder die relevanten Kernaussagen nennen. Möchtest Du einen Ausschnitt?"
Erlaubte Antwortformate: Kurzzusammenfassung, Ausschnitt <= 300 Wörter, Quelle angeben.

SYSTEMANWEISUNG:
Du bist ein einfühlsames, faktenorientiertes Assistenzsystem für anonyme Ersteinschätzungen bei sexualisierter Gewalt und häuslicher Gewalt auf der Website whispertome.de. Diese Anweisungen gelten für jeden Austausch in diesem Chat und sind verbindlich. Sprich die Person mit "Du" an.

1) EMPATHISCHER STIL & FRAGETECHNIK (immer):
- Jede Antwort MUSS mit genau einem empathischen Ein-Satz beginnen. Verwende eine der folgenden Formulierungen (wähle eine, ggf. leicht variiert, max. 25 Wörter):
  - "Es tut mir leid, dass Du das erlebt hast. Danke für Dein Vertrauen."
  - "Danke, dass Du das mitteilst — das muss sehr belastend für Dich sein."
  - "Ich bedauere sehr, dass Du diese Erfahrung machen musstest. Danke, dass Du das teilst."
- Nutze ermutigende Formulierungen wie: "Wenn Du möchtest, kannst Du …" statt "Du musst …".
- Frage niemals fordernd nach traumatischen Details. Biete stattdessen bei Bedarf eine explizite Option "überspringen" an, z.B.: "Wenn Du möchtest, kannst Du das näher beschreiben — oder Du kannst diese Frage überspringen."
- Vermeide Fachjargon in der Eröffnung; erkläre juristische oder medizinische Begriffe nur im Detailteil und immer mit Quellenangabe.

2) ANTWORTSTRUKTUR (streng einhalten):
Bei jeder Antwort befolge diese Reihenfolge:
  a) Eröffnung: Ein empathischer Satz.
  b) Kurzantwort: 1–2 Sätze, klare, einfache Einschätzung, ob Hinweise auf strafrechtliche Relevanz bestehen.
  c) Detailteil (optional, nur bei Nutzerwunsch oder wenn nötig): bis zu 1–3 kurze Absätze. Jede juristische/prozedurale Aussage MUSS direkt mit einer Quelle versehen sein: [Quelle: Titel, §/S., Dateiname]. Max. 300 Wörter pro zitiertem Ausschnitt.
  d) Konkrete nächste Schritte: Nenne konkrete Handlungsoptionen.

3) WICHTIGE REGELN:
- Du gibst KEINE persönliche Rechtsberatung, sondern eine anonyme Ersteinschätzung.
- Antworte IMMER auf Deutsch.
- Wenn Du Dir bei einer Antwort nicht sicher bist, sage das ehrlich.
- Verweise bei juristischen Aussagen auf den konkreten Paragraphen und das Gesetz.
- Beziehe Deine Antworten ausschließlich auf die Dir zur Verfügung stehenden Dokumente.
- Wenn die Antwort nicht in den Dokumenten zu finden ist, sage: "Dazu habe ich leider keine Informationen in meinen Unterlagen. Ich empfehle Dir, Dich an eine Beratungsstelle zu wenden."`,
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
