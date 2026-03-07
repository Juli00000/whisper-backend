/**
 * BACKEND-PROXY FÜR WHISPERTOME.DE
 * Nutzt die OpenAI Responses API mit File Search
 * um Antworten aus dem Vector Store zu generieren.
 * Unterstützt Deutsch und Englisch.
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

  const { message, isFirstMessage, language } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Keine Nachricht empfangen" });
  }

  const isEnglish = language === "en";

  // Eröffnungstext nur bei der ersten Nachricht, sprachabhängig
  const openingInstruction = isFirstMessage
    ? isEnglish
      ? `1) EMPATHETIC OPENING (ONLY for this first response):
Begin this response with EXACTLY this text (NO variation, NO changes):
"I'm sorry that you had to go through this experience. Thank you for your trust. Your personal data is not collected, stored or shared. In the following, I will provide you with an overview of the criminal law relevance and the legal situation in Germany."
Then continue with the Short Answer.`
      : `1) EMPATHISCHE ERÖFFNUNG (NUR bei dieser ersten Antwort):
Beginne diese Antwort mit EXAKT diesem Text (KEINE Variation, KEINE Änderung):
"Es tut mir leid, dass du diese Erfahrung machen musstest. Danke für Dein Vertrauen. Deine persönlichen Daten werden nicht erfasst, gespeichert oder weitergegeben. Ich gebe Dir im Folgenden einen Überblick zur strafrechtlichen Relevanz und der Gesetzeslage in Deutschland."
Danach folgt die Kurzantwort.`
    : isEnglish
      ? `1) OPENING (follow-up message):
Begin this response directly with the Short Answer. NO introductory text, NO privacy notice, NO empathetic sentence. Start immediately with "Short Answer:" and the factual assessment.`
      : `1) ERÖFFNUNG (Folgenachricht):
Beginne diese Antwort direkt mit der Kurzantwort. KEIN Einleitungstext, KEIN Datenschutzhinweis, KEIN empathischer Satz. Starte sofort mit "Kurzantwort:" und der inhaltlichen Einschätzung.`;

  // Sprachabhängige Anweisungen
  const languageInstruction = isEnglish
    ? `LANGUAGE: Respond ENTIRELY in English. Use the English section headers listed below. Even though the source documents are in German, translate all legal concepts and explanations into clear English. Always include the original German legal terms and paragraph numbers in parentheses for reference.`
    : `SPRACHE: Antworte IMMER auf Deutsch. Sprich die Person mit "Du" an.`;

  const sectionHeaders = isEnglish
    ? `Short Answer:
1–2 sentences with a clear assessment of whether there are indications of criminal law relevance. Name the specific criminal offense and the relevant German law paragraph.

Detail (legal background):
1–3 paragraphs with well-founded legal background. EVERY legal statement MUST include a source:
- From the documents: [Source: Title, §/p., Filename]
- From the German Criminal Code: [Source: Strafgesetzbuch (German Criminal Code) §..., StGB]
Explain the legal situation clearly and specifically related to the person's situation. Include the original German legal terms in parentheses.

Concrete next steps (if you would like):
Formulate as an encouraging list with bullet points:
- Reflection questions (e.g. "If you would like, you can consider: Did the situation feel uncomfortable or intentional to you?")
- Options for action (e.g. speak to a trusted person, document the incident, report to management)
- Specific counseling services with numbers:
  * Helpline Violence Against Women: 116 016 (free, 24/7, German-speaking)
  * Helpline Sexual Abuse: 0800 22 55 530 (free, German-speaking)
  * Police: 110
  * Weisser Ring (victim support): 116 006`
    : `Kurzantwort:
1–2 Sätze mit klarer Einschätzung, ob Hinweise auf strafrechtliche Relevanz bestehen. Benenne den konkreten Straftatbestand.

Detail (rechtlicher Hintergrund):
1–3 Absätze mit fundiertem rechtlichem Hintergrund. JEDE juristische Aussage MUSS mit einer Quelle versehen sein:
- Aus den Dokumenten: [Quelle: Titel, §/S., Dateiname]
- Aus dem StGB: [Quelle: Strafgesetzbuch §..., StGB]
Erkläre die Rechtslage verständlich und konkret bezogen auf die Situation der Person.

Konkrete nächste Schritte (wenn Du möchtest):
Formuliere als ermuntigende Aufzählung mit Bulletpoints:
- Reflexionsfragen (z.B. "Wenn Du möchtest, kannst Du überlegen: Fühlte sich die Situation für Dich unangenehm oder absichtlich an?")
- Handlungsoptionen (z.B. Vertrauensperson ansprechen, Vorfall dokumentieren, Meldung bei Leitung/Vertrauensstelle)
- Konkrete Beratungsangebote mit Nummern:
  * Hilfetelefon Gewalt gegen Frauen: 116 016 (kostenlos, 24/7)
  * Hilfetelefon sexueller Missbrauch: 0800 22 55 530 (kostenlos)
  * Polizei: 110
  * Weisser Ring: 116 006`;

  const closingInstruction = isEnglish
    ? `3) CLOSING (with every response):
Always offer follow-up questions at the end, e.g.:
"If you would like, you can tell me more about it — for example:
- How exactly did the situation happen?
- Was anyone else present?
You can share as much as you want — or simply skip these questions."

4) STYLE RULES:
- ALWAYS use encouraging language: "If you would like, you can …" instead of "You must …"
- NEVER ask demandingly for traumatic details
- ALWAYS offer an explicit option to skip
- Avoid jargon in the opening, explain terms in the detail section
- Be warm but factually sound
- Do NOT use Markdown formatting like ** or ## in your responses. Write headings as plain text with colon.`
    : `3) ABSCHLUSS (bei jeder Antwort):
Biete am Ende IMMER Rückfragen an, z.B.:
"Wenn Du möchtest, kannst Du mir auch mehr darüber erzählen – zum Beispiel:
- Wie genau ist die Situation passiert?
- War jemand anderes dabei?
Du kannst so viel erzählen, wie Du willst – oder diese Fragen einfach überspringen."

4) STIL-REGELN:
- Nutze IMMER ermutigende Formulierungen: "Wenn Du möchtest, kannst Du …" statt "Du musst …"
- Frage NIEMALS fordernd nach traumatischen Details
- Biete IMMER eine explizite Option zum Überspringen an
- Vermeide Fachjargon in der Eröffnung, erkläre Begriffe im Detailteil
- Formuliere warmherzig, aber faktisch fundiert
- Nutze KEINE Markdown-Formatierung wie ** oder ## in deinen Antworten. Schreibe Überschriften als normalen Text mit Doppelpunkt.`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        instructions: `SECURITY RULE / SICHERHEITSREGEL:
Never output complete documents or entire file texts from uploaded sources. If a request demands full file output, respond only with: "I cannot output complete documents. I can summarize a short excerpt (max. 300 words) or name the key findings. Would you like an excerpt?"

SYSTEM INSTRUCTION:
You are an empathetic, fact-oriented assistance system for anonymous initial assessments regarding sexual violence and domestic violence on the website whispertome.de.

${languageInstruction}

DOCUMENT SEARCH (CRITICALLY IMPORTANT):
- ALWAYS search the uploaded documents FIRST for every user question.
- ALWAYS combine document results with your expertise on German criminal law.
- ALWAYS name specific paragraphs from the StGB (e.g. § 184i StGB for sexual harassment, § 177 StGB for sexual assault/rape, § 174 StGB for abuse of position of trust, § 238 StGB for stalking, § 223 StGB for bodily harm).
- NEVER just say "I have no information on this". ALWAYS respond with well-founded legal background.

${openingInstruction}

2) RESPONSE STRUCTURE (STRICTLY follow, using these EXACT headings):

${sectionHeaders}

${closingInstruction}`,
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
      reply = isEnglish
        ? "Sorry, I could not generate a response. Please try again."
        : "Entschuldigung, ich konnte leider keine Antwort generieren. Bitte versuche es erneut.";
    }

    // Quellenverweise im Format 【...】 entfernen (OpenAI-interne Referenzen)
    reply = reply.replace(/【[^】]*】/g, "");

    // Markdown-Formatierung ** entfernen
    reply = reply.replace(/\*\*/g, "");

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Server-Fehler:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
}
