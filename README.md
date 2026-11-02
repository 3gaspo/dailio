# Dailio

Dailio suit des habitudes quotidiennes et hebdomadaires, ainsi que des tâches ponctuelles. Il permet de consulter et de modifier les périodes passées, de gérer les absences et de suivre la progression.

## Fonctionnalités

- Habitudes quotidiennes ou hebdomadaires, tâches ponctuelles et anti-tâches à éviter.
- Catégories colorées, filtre par catégorie, groupes et réorganisation des habitudes.
- Multiplicité de 1 à 10 sous-étapes ; compteurs de répétitions pour les habitudes hebdomadaires concernées.
- Calendrier mensuel des journées et vue annuelle des semaines, avec édition des périodes et gestion des absences.
- Objectifs quotidiens et hebdomadaires, ratios de complétion et statistiques.
- Export CSV des compteurs quotidiens et hebdomadaires depuis le début de l’année courante.
- Thèmes clair et sombre persistants, connexion locale ou Firebase.

## Écrans

| URL | Écran |
| --- | --- |
| `/today` | Today : habitudes courantes et ajout |
| `/calendar` | Calendar : journées et semaines |
| `/statistics` | Statistics |
| `/settings` | Settings : objectifs, catégories, thème, compte et export |

La racine `/` redirige vers l’accueil. La connexion s’affiche lorsqu’aucune session n’est active. Les écrans secondaires sont chargés à la demande.

## Stack et organisation

React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, React Router, Lucide et Firebase Authentication / Firestore, avec Recharts pour les graphiques.

- [src/pages/](src/pages/) : écrans de l’application.
- [src/providers/](src/providers/) : interface commune des fournisseurs et implémentations locales/Firebase.
- [src/components/HabitRow.tsx](src/components/HabitRow.tsx) et [src/components/TaskGroupRow.tsx](src/components/TaskGroupRow.tsx) : habitudes, sous-étapes et groupes.
- [src/utils/habitLogic.ts](src/utils/habitLogic.ts) : complétion, ratios et règles d’absence.
- [src/utils/dateUtils.ts](src/utils/dateUtils.ts) : clés des jours et semaines.
- [tests/history-loading.test.ts](tests/history-loading.test.ts) : règles métier et chargement historique.
- [src/styles/](src/styles/) : imports des styles partagés et styles propres à l’application.

## Installation

Environnement de référence : Node.js 24 et npm. Exécuter les commandes depuis ce dépôt.

```bash
npm ci
npm run dev
```

Le serveur de développement écoute sur le port 3000. Ouvrir `http://localhost:3000`.

## Configuration et données

Sans `VITE_FIREBASE_API_KEY`, Dailio utilise les fournisseurs locaux. La fenêtre de connexion reste nécessaire : elle accepte un email ou un nom d’utilisateur en mode local, et le mot de passe n’y est pas vérifié. La présence de cette variable active le fournisseur Firebase ; renseigner alors toute la configuration.

Le mode local conserve ses données dans le `localStorage` du navigateur, sans synchronisation entre appareils. Sa session de développement n’est pas une authentification distante. Changer de mode de stockage ne transfère pas automatiquement ces données.

Pour utiliser Firebase, copier [.env.example](.env.example) vers `.env.local` et renseigner la configuration de l’application web :

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Activer l’authentification email/mot de passe et Firestore dans le projet Firebase concerné. Ces variables sont lues par Vite au démarrage et lors du build : redémarrer le serveur ou reconstruire après une modification. Conserver les fichiers d’environnement locaux hors Git.

## Commandes et validation

| Commande | Rôle |
| --- | --- |
| `npm ci` | Installer les versions du lockfile, y compris l’archive UI locale |
| `npm run dev` | Lancer le serveur de développement sur le port 3000 |
| `npm run lint` | Vérifier les types avec `tsc --noEmit` |
| `npm run check:ui` | Vérifier l’archive UI, son empreinte, le lockfile et les réexports |
| `npm run build` | Exécuter `prebuild` puis générer le site statique dans `dist/` |
| `npm run preview` | Prévisualiser le dernier build localement |

`npm test` vérifie les règles de complétion et d’absence ainsi que les lectures historiques par plage de jours et de semaines.

## Périodes et chargement

Une période passée sans données saisies est considérée absente automatiquement ; un choix explicite d’absence ou de présence est prioritaire. Les anti-tâches sont considérées accomplies tant que leur comportement à éviter n’est pas signalé.

L’accueil charge les habitudes courantes avant l’accentuation issue de l’historique. Les lectures historiques sont regroupées par plage de périodes. Le calendrier, les statistiques et les paramètres sont chargés à la demande.

## Interface partagée

L’application utilise `@3gaspo/app-ui`, actuellement en version 0.1.5, pour la navigation, les titres, dialogues, formulaires, commandes, retours d’état et formats visibles. L’interface utilise Inter et des thèmes clair et sombre communs. Les dates affichées utilisent `en-GB` et les heures le format 24 h ; les formats de stockage et d’export restent propres à l’application.

L’archive est incluse dans [vendor/](vendor/) et référencée par `package.json` et `package-lock.json`. Ce dépôt est installable et déployable seul : aucun accès au dépôt source voisin `app-ui` ni à un registre privé n’est nécessaire. Relancer `npm ci` après un pull qui change les dépendances. La vérification du package partagé s’exécute automatiquement avant le build.

## Déploiement

Le site statique est servi par Firebase Hosting depuis `dist/`. [firebase.json](firebase.json) redirige les routes de l’application vers `index.html` et déclare aussi les règles et index Firestore.

Après avoir authentifié la CLI Firebase et sélectionné le bon projet :

```bash
git pull
npm ci
npm run build
firebase deploy --only hosting
```

Ajouter `--project ID_DU_PROJET` si aucun projet n’est sélectionné. Un `firebase deploy` sans restriction peut aussi publier les règles et index Firestore déclarés. Un retour à une version conservée dans l’historique Firebase Hosting restaure le site, pas les données.
