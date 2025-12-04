import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Route webhook Dialogflow
app.post("/dialogflow-webhook", async (req, res) => {
  try {
    const userText =
      req.body?.queryResult?.queryText ||
      req.body?.queryResult?.queryText === ""
        ? req.body.queryResult.queryText
        : "";
    const intent =
      req.body?.queryResult?.intent?.displayName || "intent_inconnu";

    let prompt = "";

    // ---------- ACCUEIL ----------
    if (
      intent === "Default Welcome Intent" ||
      intent === "Accueil_MyTechAssistant"
    ) {
      prompt = `
Tu es MyTechAssistant pour une boutique de réparation de smartphones.
Le client dit : "${userText}"

Classe la demande :
- "nouvelle_reparation"
- "suivi_reparation"
- "infos_generales"
- "autre"

Réponds UNIQUEMENT en JSON strict :
{
  "intent_type": "nouvelle_reparation | suivi_reparation | infos_generales | autre",
  "reponse_client": "phrase courte professionnelle en français"
}
`;
    }

    // ---------- DESCRIPTION PANNE ----------
    if (intent === "Description_Panne_Telephone") {
      prompt = `
Tu es MyTechAssistant, expert en réparation mobile.
Le client décrit un problème : "${userText}"

Analyse la panne.

Réponds UNIQUEMENT en JSON strict :
{
  "categorie_panne": "ecran|batterie|charge|eau|son|micro|camera|logiciel|autre",
  "gravite": "faible|moyenne|elevee",
  "niveau_urgence": "normale|a_voir_rapidement|critique",
  "resume_humain": "phrase courte rassurante en français"
}
`;
    }

    // Si aucun prompt défini, on renvoie une réponse générique
    if (!prompt) {
      return res.json({
        fulfillmentText:
          "Merci pour votre message, un instant, je regarde votre demande."
      });
    }

    // Appel à l'API OpenAI
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          messages: [
            {
              role: "system",
              content: "Tu es un assistant de boutique de réparation smartphone."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      }
    );

    const data = await openaiRes.json();
    const content = data?.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Erreur de parse JSON OpenAI:", e, content);
      parsed = {
        reponse_client: "Je n'ai pas bien compris, pouvez-vous reformuler ?"
      };
    }

    // Réponse à Dialogflow
    return res.json({
      fulfillmentText:
        parsed.reponse_client || parsed.resume_humain || "Merci.",
      outputContexts: [
        {
          name: `${req.body.session}/contexts/mytechassistant`,
          lifespanCount: 5,
          parameters: parsed
        }
      ]
    });
  } catch (error) {
    console.error("Erreur webhook:", error);
    return res.json({
      fulfillmentText:
        "Une erreur technique est survenue, un technicien va prendre le relais."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Backend lancé sur le port", PORT);
});

