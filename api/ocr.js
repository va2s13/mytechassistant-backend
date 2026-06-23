export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { image, mediaType } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image }
            },
            {
              type: 'text',
              text: `Analyse cette image (ticket de caisse, recu, bon client, ecran logiciel de caisse, fiche client, ou toute autre image contenant des infos client).
              
Extrais le prenom du client et son numero de telephone.
Cherche dans tous les champs possibles : nom, prenom, client, telephone, mobile, tel, phone, portable, contact, destinataire, acheteur.
Si tu vois un nom complet, prends uniquement le prenom.
Pour le telephone, normalise-le (garde les chiffres, espaces ok).

Reponds UNIQUEMENT en JSON valide, rien d'autre :
{"prenom":"...","telephone":"..."}

Si tu ne trouves pas une info, mets une chaine vide "".`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    
    let result;
    try {
      result = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      result = { prenom: '', telephone: '' };
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ prenom: '', telephone: '', error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
