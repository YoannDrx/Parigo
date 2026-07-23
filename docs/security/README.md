# Sécurité Vercel

`vercel-firewall.json` est la règle canonique à appliquer via le dashboard ou
l’API Vercel Firewall. Le rate limiting ne peut pas être déclaré dans
`vercel.json`.

1. Activer la règle sur Preview et vérifier que la onzième mutation en une
   minute reçoit bien HTTP 429.
2. Activer Bot Protection en observation (`log`) sans cibler les routes
   publiques en lecture.
3. Après analyse des faux positifs, passer Bot Protection à `challenge`.
4. Ne jamais bloquer les robots vérifiés sur les pages publiques.

L’application conserve en complément la validation same-origin, le honeypot,
la limite de 16 Kio et l’idempotence Resend.
