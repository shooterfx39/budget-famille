/**
 * Vercel Serverless Function — Scan de reçu via Claude claude-haiku-4-5
 * La clé API reste côté serveur, jamais exposée au navigateur.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(400).json({
      error: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans les variables d\'environnement Vercel.'
    })
  }

  const { imageBase64, mediaType } = req.body
  if (!imageBase64) {
    return res.status(400).json({ error: 'Image manquante' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `Analyse ce reçu de caisse et extrais tous les articles achetés.
Retourne UNIQUEMENT un JSON valide avec cette structure exacte (sans markdown, sans texte avant/après) :
{
  "store": "nom du magasin",
  "date": "YYYY-MM-DD ou vide si non lisible",
  "total": 0.00,
  "items": [
    {
      "name": "nom de l'article",
      "quantity": 1,
      "unit": "unité (kg, L, sac, pack, boîte, unité, etc.)",
      "unitPrice": 0.00,
      "total": 0.00
    }
  ]
}
Si le prix unitaire n'est pas indiqué, calcule-le à partir du total et de la quantité.
Tous les montants en dollars canadiens. Traduis les noms en français si possible.`
            }
          ]
        }]
      })
    })

    const result = await response.json()

    if (result.error) {
      return res.status(500).json({ error: result.error.message })
    }

    const text = result.content[0].text.trim()

    try {
      return res.json(JSON.parse(text))
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) return res.json(JSON.parse(match[0]))
      return res.status(500).json({ error: 'Impossible de parser la réponse', raw: text })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
