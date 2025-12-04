import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/dialogflow-webhook", async (req, res) => {
  try {
    const userText = req.body.queryResult?.queryText || "";
    const intent = req.body.queryResult?.intent?.displayName || "";

    let prompt = "";

    // ACCUEIL
    if (intent === "Default Welcome Intent" || intent === "Accueil_MyTechAssistant") {
      prompt = `
Tu es MyTechAssistant pour une boutique de réparation de smartphones.
Le client dit: "${userText}"

Classe la demande :
- nouvelle_reparation
- suivi_reparation
- infos_generales
- autre

Réponds en JSON :
{
  "intent_type": "...",
  "reponse_client": "phrase courte professionnelle"
}
`;
    }

    // DESCRIPTION PANNE
    if (intent === "Description_Panne_Telephone") {
      prompt = `
Tu es MyTechAssistant, expert réparation mobile.
Client: "${userText}"

Analyse la panne.

Réponds uniquement en JSON :
{
  "categorie_panne": "ecran|batterie|charge|eau|son|micro|camera|logiciel|autre",
  "gravite": "faible|moyenne|elevee",
  "niveau_urgence": "normale|a_voir_rapidement|critique",
  "resume_humain": "phrase rassurante"
}
`;
    }

    if (!prompt) {
      return res.json({
        fulfillmentText: "Un instant, je regarde votre demande."
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "Assistant réparation smartphone." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });

    const data = await openaiRes.json();
    const content = data.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { reponse_client: "Pouvez-vous reformuler ?" };
    }

    return res.json({
      fulfillmentText: parsed.reponse_client || parsed.resume_humain || "Merci.",
      outputContexts: [
        {
          name: `${req.body.session}/contexts/mytechassistant`,
          lifespanCount: 5,
          parameters: parsed
        }
      ]
    });

  } catch (error) {
    console.error(error);
    return res.json({
      fulfillmentText: "Erreur technique, un technicien arrive."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Backend lancé sur le port", PORT);
});
