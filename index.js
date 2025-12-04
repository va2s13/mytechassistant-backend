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

  } catch (err) {
    console.error("Erreur webhook:", err);
    res.json({
      fulfillmentText: "Erreur technique, un technicien prend le relais."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Backend lancé sur port", PORT));
