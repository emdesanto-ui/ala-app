export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY mancante su Vercel"
    });
  }

  try {
    const {
      question,
      answer,
      subject = "",
      topic = "",
      className = ""
    } = req.body || {};

    if (!question || !answer) {
      return res.status(400).json({
        error: "Domanda e risposta sono obbligatorie"
      });
    }

    const prompt = `
Sei il motore didattico di A.L.A. - Ambiente di Lezione Adattiva.

Analizza la risposta di uno studente italiano a una micro-attività.

Classe: ${className || "non indicata"}
Disciplina: ${subject || "non indicata"}
Argomento: ${topic || "non indicato"}

DOMANDA:
${question}

RISPOSTA DELLO STUDENTE:
${answer}

Devi:
1. valutare la correttezza della risposta;
2. individuare gli elementi corretti;
3. individuare errori o fraintendimenti;
4. fornire un feedback breve e comprensibile allo studente;
5. creare un breve report utile al docente;
6. proporre una nuova attività adattata specificamente agli errori rilevati.

Non inserire dati personali.
Mantieni un tono rispettoso, didattico e chiaro.
`;

    const schema = {
      type: "object",
      properties: {
        correction: {
          type: "object",
          properties: {
            level: {
              type: "string",
              enum: [
                "corretta",
                "parzialmente corretta",
                "errata"
              ]
            },
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            errors: {
              type: "array",
              items: { type: "string" }
            },
            feedback_student: {
              type: "string"
            }
          },
          required: [
            "level",
            "strengths",
            "errors",
            "feedback_student"
          ]
        },

        report: {
          type: "object",
          properties: {
            summary: {
              type: "string"
            },
            misconceptions: {
              type: "array",
              items: { type: "string" }
            },
            teacher_action: {
              type: "string"
            }
          },
          required: [
            "summary",
            "misconceptions",
            "teacher_action"
          ]
        },

        adaptive_activity: {
          type: "object",
          properties: {
            title: {
              type: "string"
            },
            question: {
              type: "string"
            },
            objective: {
              type: "string"
            }
          },
          required: [
            "title",
            "question",
            "objective"
          ]
        }
      },

      required: [
        "correction",
        "report",
        "adaptive_activity"
      ]
    };

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],

          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Errore nella chiamata a Gemini"
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: "Gemini non ha restituito una risposta"
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "La risposta di Gemini non è JSON valido",
        raw: text
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Errore interno"
    });
  }
}
