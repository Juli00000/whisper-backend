/**
 * BACKEND-PROXY FÜR WHISPERTOME.DE
 * Nutzt die OpenAI Responses API mit File Search
 * Unterstützt: Deutsch, Englisch, Türkisch, Spanisch, Arabisch, Französisch
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API-Key nicht konfiguriert" });

  const { message, isFirstMessage, language } = req.body;
  if (!message || typeof message !== "string") return res.status(400).json({ error: "No message" });

  const lang = language || "de";

  // Übersetzungstabelle für die Abschnittsüberschriften
  const labels = {
    de: { short: "Kurzantwort:", detail: "Detail (rechtlicher Hintergrund):", steps: "Konkrete nächste Schritte (wenn Du möchtest):", skipNote: "Du kannst so viel erzählen, wie Du willst – oder diese Fragen einfach überspringen." },
    en: { short: "Short Answer:", detail: "Detail (legal background):", steps: "Concrete next steps (if you would like):", skipNote: "You can share as much as you want — or simply skip these questions." },
    tr: { short: "Kısa Cevap:", detail: "Detay (hukuki arka plan):", steps: "Somut sonraki adımlar (isterseniz):", skipNote: "İstediğin kadar paylaşabilirsin — ya da bu soruları atlayabilirsin." },
    es: { short: "Respuesta breve:", detail: "Detalle (contexto legal):", steps: "Próximos pasos concretos (si lo deseas):", skipNote: "Puedes compartir lo que quieras — o simplemente omitir estas preguntas." },
    ar: { short: "إجابة مختصرة:", detail: "تفاصيل (الخلفية القانونية):", steps: "الخطوات التالية الملموسة (إذا أردت):", skipNote: "يمكنك مشاركة ما تريد — أو تخطي هذه الأسئلة ببساطة." },
    fr: { short: "Réponse courte :", detail: "Détail (contexte juridique) :", steps: "Prochaines étapes concrètes (si tu le souhaites) :", skipNote: "Tu peux partager autant que tu veux — ou simplement passer ces questions." },
  };

  const openingTexts = {
    de: "Es tut mir leid, dass du diese Erfahrung machen musstest. Danke für Dein Vertrauen. Deine persönlichen Daten werden nicht erfasst, gespeichert oder weitergegeben. Ich gebe Dir im Folgenden einen Überblick zur strafrechtlichen Relevanz und der Gesetzeslage in Deutschland.",
    en: "I'm sorry that you had to go through this experience. Thank you for your trust. Your personal data is not collected, stored or shared. In the following, I will provide you with an overview of the criminal law relevance and the legal situation in Germany.",
    tr: "Bu deneyimi yaşamak zorunda kaldığın için çok üzgünüm. Güvenin için teşekkür ederim. Kişisel verilerin kaydedilmez, saklanmaz veya paylaşılmaz. Aşağıda sana Almanya'daki ceza hukuku açısından durumun değerlendirmesini sunacağım.",
    es: "Lamento mucho que hayas tenido que vivir esta experiencia. Gracias por tu confianza. Tus datos personales no se recopilan, almacenan ni comparten. A continuación, te proporcionaré una visión general de la relevancia en derecho penal y la situación legal en Alemania.",
    ar: "أنا آسف لأنك اضطررت لخوض هذه التجربة. شكراً لثقتك. لا يتم جمع بياناتك الشخصية أو تخزينها أو مشاركتها. سأقدم لك فيما يلي نظرة عامة على الأهمية الجنائية والوضع القانوني في ألمانيا.",
    fr: "Je suis désolé(e) que tu aies dû vivre cette expérience. Merci pour ta confiance. Tes données personnelles ne sont ni collectées, ni enregistrées, ni partagées. Je vais te donner ci-dessous un aperçu de la pertinence pénale et de la situation juridique en Allemagne.",
  };

  const errorMessages = {
    de: "Entschuldigung, ich konnte leider keine Antwort generieren. Bitte versuche es erneut.",
    en: "Sorry, I could not generate a response. Please try again.",
    tr: "Üzgünüm, bir yanıt oluşturamadım. Lütfen tekrar deneyin.",
    es: "Lo siento, no pude generar una respuesta. Por favor, inténtalo de nuevo.",
    ar: "عذراً، لم أتمكن من توليد إجابة. يرجى المحاولة مرة أخرى.",
    fr: "Désolé(e), je n'ai pas pu générer de réponse. Veuillez réessayer.",
  };

  const l = labels[lang] || labels.de;
  const openingText = openingTexts[lang] || openingTexts.de;
  const errorMsg = errorMessages[lang] || errorMessages.de;

  const languageNames = { de: "German", en: "English", tr: "Turkish", es: "Spanish", ar: "Arabic", fr: "French" };
  const langName = languageNames[lang] || "German";

  const openingInstruction = isFirstMessage
    ? `OPENING (ONLY for this first response):
Begin this response with EXACTLY this text (NO variation): "${openingText}"
Then continue with ${l.short}`
    : `OPENING (follow-up message):
Begin directly with ${l.short} — NO introductory text, NO privacy notice, NO empathetic sentence.`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        instructions: `SECURITY RULE:
Never output complete documents or entire file texts. If requested, respond: "I cannot output complete documents. I can summarize a short excerpt (max. 300 words) or name key findings."

SYSTEM INSTRUCTION:
You are an empathetic, fact-oriented assistance system for anonymous initial assessments regarding sexual violence and domestic violence on whispertome.de.

LANGUAGE (CRITICAL): Respond ENTIRELY in ${langName}. Use these EXACT section headers: "${l.short}", "${l.detail}", "${l.steps}". Even though source documents are in German, translate all explanations into ${langName}. Always include original German legal terms and paragraph numbers in parentheses (e.g. "sexual harassment (sexuelle Belästigung, § 184i StGB)").
${lang === "ar" ? "Write in Modern Standard Arabic." : ""}

DOCUMENT SEARCH (CRITICAL):
- ALWAYS search uploaded documents FIRST for every user question.
- ALWAYS combine document results with your expertise on German criminal law.
- ALWAYS name specific StGB paragraphs (§ 184i, § 177, § 174, § 238, § 223 etc.).
- NEVER just say "I have no information". ALWAYS respond with well-founded legal background.

${openingInstruction}

RESPONSE STRUCTURE (STRICTLY follow):

${l.short}
1–2 sentences with clear assessment of criminal law relevance. Name the specific offense and German law paragraph.

${l.detail}
1–3 paragraphs with legal background. EVERY legal statement MUST include a source:
- From documents: [Source: Title, §/p., Filename]
- From StGB: [Source: Strafgesetzbuch §..., StGB]
Include original German legal terms in parentheses for reference.

${l.steps}
Encouraging bullet point list:
- Reflection questions
- Options for action (trusted person, documentation, reporting)
- Specific counseling services:
  * Hilfetelefon Gewalt gegen Frauen: 116 016 (free, 24/7)
  * Hilfetelefon sexueller Missbrauch: 0800 22 55 530 (free)
  * Polizei/Police: 110
  * Weisser Ring: 116 006

CLOSING (every response):
Offer follow-up questions. End with: "${l.skipNote}"

STYLE RULES:
- Use encouraging language: "If you would like..." not "You must..."
- NEVER demand traumatic details
- ALWAYS offer option to skip
- Be warm but factually sound
- NO Markdown formatting (no ** or ##). Write headings as plain text with colon.`,
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
      console.error("OpenAI Error:", JSON.stringify(errorData));
      return res.status(500).json({ error: "API error" });
    }

    const data = await response.json();

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

    if (!reply) reply = errorMsg;

    reply = reply.replace(/【[^】]*】/g, "");
    reply = reply.replace(/\*\*/g, "");

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
