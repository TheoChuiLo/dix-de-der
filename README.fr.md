# Dix de Der

[English](README.md) | **Français**

Compteur de points pour la coinche, la contrée et la belote classique. Application web installable (PWA) qui fonctionne hors ligne, sans compte, sans serveur, sans étape de build et sans dépendance.

**Ouvrir l'application : https://theochuilo.github.io/dix-de-der/**

## Installer sur un téléphone

L'application fonctionne dans tout navigateur récent. Pour avoir une icône sur l'écran d'accueil et un affichage plein écran :

| Téléphone | Étapes |
|---|---|
| Android (Chrome) | Ouvrir le lien, menu ⋮, puis « Installer l'application » ou « Ajouter à l'écran d'accueil » |
| iPhone (Safari) | Ouvrir le lien, bouton Partager, puis « Sur l'écran d'accueil » |

Les mises à jour se téléchargent en arrière-plan : ouvrir l'application, la fermer, puis la rouvrir pour avoir la dernière version.

## Fonctionnalités

- Quatre jeux sur l'accueil : Coinche (avec annonces), Contrée (sans annonces), Belote classique et « Mes règles », qui restaure les dernières variantes réglées à la main.
- Saisie guidée de chaque donne : preneur, contrat, couleur, puis résultat. Une touche par équipe pour la belote, touches Capot et Générale, coinche et surcoinche, annonces.
- Variantes de règles modifiables avant ou pendant la partie. Les scores sont recalculés aussitôt.
- Récap des règles généré à partir des variantes actives, avec des exemples chiffrés calculés par le moteur de comptage.
- Noms des joueurs et des équipes, rotation du donneur.
- Statistiques par équipe et par joueur, avec la courbe d'évolution du score.
- Historique des 50 dernières parties, chacune avec ses statistiques et ses donnes.
- Partage du score en image ou en texte.
- Six thèmes de couleurs et une option pour garder l'écran allumé.
- L'accueil, les réglages et la saisie d'une donne tiennent sur un écran de téléphone sans défiler, jusqu'à 360x640. Les longues listes (donnes, historique) et la page de statistiques défilent.

## Données et vie privée

Tout est enregistré sur l'appareil, dans le stockage local du navigateur : partie en cours, historique et préférences. Rien n'est envoyé ailleurs. En conséquence, les parties ne sont pas synchronisées entre téléphones, et effacer les données du site les supprime.

## Lancer en local

Il faut un Node.js récent, uniquement pour le serveur de développement et les tests.

```bash
npm start
```

Ouvrir ensuite http://localhost:8795. Le service worker est désactivé sur localhost pour éviter les fichiers périmés pendant le développement ; ajouter `?sw` à l'URL pour tester le mode hors ligne.

## Tests

```bash
npm test
```

Les tests couvrent le moteur de comptage (`js/scoring.js`) et les statistiques (`js/stats.js`).

## Structure

| Chemin | Rôle |
|---|---|
| `index.html`, `css/styles.css` | Page, styles et thèmes de couleurs |
| `js/scoring.js` | Règles de comptage pures (belote classique, coinche, totaux) |
| `js/stats.js` | Statistiques par équipe et par joueur |
| `js/app.js` | État de l'interface, rendu, évènements |
| `js/chart.js` | Courbe d'évolution du score en SVG |
| `js/share.js` | Image du score (canvas) et partage |
| `js/store.js` | Enregistrement dans le localStorage |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA : cache hors ligne et métadonnées d'installation |
| `scripts/` | Serveur de développement et générateur d'icônes |
| `tests/` | Tests du comptage et des statistiques |

L'interface n'utilise aucun framework : `js/app.js` génère le HTML dans `#app` et traite les clics via des attributs `data-action`. L'accueil contient le choix du jeu et le score cible ; tout le reste est rangé dans des panneaux (joueurs, règles, affichage) ou dans des écrans dédiés (statistiques, historique, récap des règles).

Le code, les commentaires et les messages de commit sont en anglais. Seuls les textes affichés aux joueurs sont en français.

## Jeux et variantes

Les jeux sont déclarés dans `GAMES` (`js/app.js`). La coinche et la contrée partagent le même moteur de comptage et ne diffèrent que par leurs règles de base : la contrée désactive les annonces.

Toutes les variantes sont dans `DEFAULT_RULES` (`js/scoring.js`) :

| Variante | Choix |
|---|---|
| Comptage | Points faits + contrat, ou contrat seul |
| Arrondi | Points des plis arrondis à la dizaine, ou exacts |
| Contrat chuté | La défense marque 160 + contrat, ou 160 seulement |
| Coinche | Multiplie le contrat ou tout le total ; le gagnant prend tout ou chacun garde ses points ; surcoinche activée ou non |
| Belote et annonces | Comptent pour le contrat ou non ; annonces activées ou non |
| Enchères | Sans atout et tout atout, générale, contrats de 170 et 180 |
| Belote classique | Règle du litige activée ou non |

Les thèmes de couleurs sont des jeux de variables CSS dans `css/styles.css` (`[data-theme='...']`), listés dans `THEMES` dans `js/app.js`.

## Règles de comptage

Règles de base pour la coinche et la contrée :

- « Points faits + contrat » : un contrat réussi rapporte le contrat plus les points faits, la défense marque ses propres points. Un contrat chuté donne 160 plus le contrat à la défense.
- « Contrat seul » : le contrat va aux preneurs s'il est réussi, à la défense s'il est chuté.
- La coinche (x2) et la surcoinche (x4) multiplient le contrat ; le gagnant d'une donne coinchée prend tout.
- Le capot est un contrat de 250, la générale un contrat de 500.
- Un capot non annoncé compte 250 points de plis. Une générale non annoncée est comptée de la même façon et apparaît comme générale dans la liste des donnes.
- La belote (20) reste toujours à l'équipe qui la détient et compte pour le contrat, comme les annonces des preneurs.
- Avec l'arrondi, les points des preneurs sont arrondis à la dizaine et la défense reçoit le complément à 160.

Belote classique : le preneur doit marquer plus que la défense, sinon la défense marque 162 (« dedans »). Un capot vaut 252. En cas d'égalité (« litige »), les points du preneur vont au gagnant de la donne suivante.

## Publication

Le site est servi par GitHub Pages depuis la branche `main` : un push sur `main` le publie. Tout autre hébergement statique en HTTPS convient aussi, le dossier est servi tel quel.

Incrémenter `CACHE_VERSION` dans `sw.js` à chaque publication pour que les applications installées se mettent à jour.
