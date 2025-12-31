# FFAM Competitions

Application PWA de chronométrage et de calcul des scores pour les compétitions d'aéromodélisme de l'Essonne.

## Compétitions supportées

### Les 91 minutes de l'Essonne
- Équipes de 2 à 6 pilotes
- Vols de 4 minutes avec relais
- Système de bonus/pénalités "Table" pour l'atterrissage sur cible

### Les 3 heures de l'Essonne
- Équipes de 4 pilotes
- Vols de 10 minutes avec relais
- Pénalité pour équipes sans avion thermique

## Fonctionnalités

- ⏱️ **Chronométrage en temps réel** des vols et des temps de sécurité
- 📊 **Calcul automatique** des pénalités (durée de vol, décollage anticipé, relais tardif)
- ✅ **Pénalités manuelles** pour les infractions observées par le juge
- 🏆 **Résumé détaillé** des scores en fin de compétition
- 🌐 **Bilingue** français/anglais
- 🌙 **Thème clair/sombre**
- 📱 **PWA installable** sur mobile et tablette
- 🔌 **Fonctionne hors-ligne** (données stockées localement)

## Installation

```bash
npm install
npm run dev
```

## Scripts disponibles

| Commande          | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Lance le serveur de développement        |
| `npm run build`   | Compile l'application pour la production |
| `npm run preview` | Prévisualise la version de production    |
| `npm test`        | Lance les tests unitaires                |

## Déploiement

L'application est automatiquement déployée sur GitHub Pages via GitHub Actions à chaque push sur la branche `main`.

**URL de production** : `https://christophe.calmejane.github.io/FFAM_Competitions/`

## Architecture

```
src/
├── backend/
│   ├── types/       # Types TypeScript
│   ├── database/    # Couche IndexedDB
│   ├── scoring/     # Règles de calcul des scores
│   └── timer/       # Utilitaires de chronométrage
└── frontend/
    ├── components/  # Composants UI réutilisables
    ├── pages/       # Pages de l'application
    ├── i18n/        # Traductions
    ├── theme/       # Gestion du thème
    └── router/      # Navigation SPA
```

## Technologies

- **Vite** - Build tool
- **TypeScript** - Langage
- **IndexedDB** (via idb) - Persistance des données
- **Workbox** - Service worker pour le mode hors-ligne
- **Vitest** - Tests unitaires

## Utilisation

1. Ouvrir l'application et sélectionner une compétition
2. Créer une équipe avec les noms des pilotes
3. Démarrer la compétition (le chronomètre global démarre)
4. Appuyer sur le bouton d'un pilote pour démarrer son vol
5. Appuyer à nouveau pour terminer le vol (le temps de sécurité démarre)
6. Ajouter les pénalités/bonus manuels si nécessaire
7. À la fin, consulter le résumé détaillé des scores

## Licence

MIT
