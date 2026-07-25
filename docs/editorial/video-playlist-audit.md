# Audit de la playlist vidéo Parigo

Playlist suivie : `PLIqrBBZKnwyWMkXainshLgavNlTmx9AhG` — « Video Clip & More ».

## État initial au 25/07/2026

- 60 vidéos publiques observées.
- 15 fiches vidéo provenaient de la migration Portfolio Caro.
- 14 de ces fiches possédaient un identifiant YouTube.
- La playlist mélange clips officiels, teasers, making-of, live, performances DJ, prix, annonces et archives.
- Répartition après rapprochement initial : 19 clips officiels, 5 teasers, 5 contenus de prix, 4 performances, 2 annonces, 1 making-of, 1 live, 12 archives et 11 contenus à qualifier.

La playlist constitue la source de l’inventaire, du titre, de la miniature et de l’ordre. Elle ne constitue pas une preuve de relation vers un compositeur ou un album.

## Points nécessitant une validation éditoriale

- `Acid Body Music` : le teaser officiel est relié explicitement à la fiche et à Modulhater.
- `NY Parigo` : la seconde vidéo détectée est traitée comme doublon de la fiche canonique.
- `Une Dernière Fois` / `Une Première Fois` : l’affichage reprend le titre de la vidéo officielle « Une Première Fois » ; le titre source Portfolio doit encore être corrigé.
- `Dub Experience` : présent dans la playlist mais absent de la migration publiée initiale.
- Les vidéos de prix, vœux et nominations doivent rester accessibles dans « Toutes » mais ne pas être mises en avant comme clips officiels.
- Les vidéos de chaînes partenaires et archives ne reçoivent aucun crédit compositeur automatique.

## Commande de contrôle

```bash
pnpm audit:youtube:clips
```

La commande compare la playlist courante aux fiches éditoriales, compte les catégories proposées et liste chaque nouvelle vidéo à relire. Les classifications automatiques sont des aides de tri ; seules les relations explicitement vérifiées sont publiées.
