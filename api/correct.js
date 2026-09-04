export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: `
Sei il motore didattico di A.L.A. - Ambiente di Lezione Adattiva.

Classe: ${className}
Disciplina: ${subject}
Argomento: ${topic}

DOMANDA O CONSEGNA:
${question}

RISPOSTA DELLO STUDENTE:
${answer}

Devi produrre esclusivamente JSON valido con questa struttura:

{
  "correction": {
    "correct_parts": "",
    "errors": "",
    "improvements": "",
    "corrected_answer": ""
  },
  "report": {
    "level": "",
    "strengths": "",
    "difficulties": "",
    "skills_to_reinforce": "",
    "teacher_summary": ""
  },
  "adaptive_activity": {
    "title": "",
    "question": "",
    "objective": "",
    "reason": ""
  }
}

La correzione deve essere concreta e riferita alla risposta reale.
Il report deve aiutare il docente a capire cosa ha acquisito lo studente e cosa deve consolidare.
L'attività adattata deve intervenire precisamente sulla difficoltà emersa, senza riproporre semplicemente la stessa domanda.
`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Errore durante l'analisi"
      });
    }

    const text = data.output_text || "";

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "L'IA non ha restituito un report nel formato previsto",
        raw: text
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({
      error: "Errore interno durante l'analisi"
    });
  }
}
