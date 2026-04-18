# 🗺️ Roadmap Simplifac

Cette roadmap est volontairement découpée en micro-tâches atomiques. L'objectif est de pouvoir coder pas-à-pas, module par module, pour faciliter l'usage de l'IA (Copilot/ChatGPT) en lui donnant un contexte très précis à chaque fois.

## 🏗️ Phase 0 : Initialisation et Architecture (Les Fondations)
*L'objectif ici est d'avoir une application vide, mais parfaitement configurée.*

- [x] Initialiser le projet React Native avec TypeScript (CLI ou Expo).
- [x] Nettoyer le code de base (supprimer le template par défaut dans `App.tsx`).
- [x] Configurer `.eslint` et `.prettierrc` pour formater le code automatiquement.
- [x] Créer l'arborescence des dossiers (`src/components`, `src/screens`, `src/navigation`, `src/services`, `src/utils`, `src/types`).
- [x] **Créer l'interface TypeScript `StudentCase`** dans `src/types/index.ts` (id, title, category, status, array of `Messages`, updatedAt).
- [x] Installer et configurer `react-navigation` (Stack Navigator & Tab Navigator).
- [x] Configurer les variables d'environnement (`.env`) pour stocker les futures clés API en toute sécurité.

## 🎨 Phase 1 : Design System & UI de base
*Créer les briques visuelles réutilisables pour ne pas réinventer la roue.*

- [x] Définir le Design System "Midnight Cocon" (Couleurs: #0F172A, #1E1E38, #9333EA).
- [x] Créer l'écran principal `DashboardScreen` (Tableau de Bord).
- [x] Implémenter l'en-tête (Avatar + Salutation).
- [x] Implémenter la section "Situations fréquentes" (Tuiles d'accès rapide avec border-radius prononcé).
- [x] Implémenter le Bouton d'Action Principal (FAB) "Scanner un document ou mail".
- [x] Créer l'écran `ProfileScreen` (Profil de l'étudiant).
- [x] Ajouter les champs d'identité (Nom, Prénom, Âge).
- [x] Ajouter les champs d'études (Université, Filière, Numéro INE).
- [x] Ajouter les champs administratifs (Bourse, Logement).
- [x] Intégrer la bannière Privacy stipulant que les données restent 100% stockées sur le téléphone.
- [x] Raccorder la navigation vers le profil via l'avatar et l'engrenage du Dashboard.
- [x] Créer l'écran `SettingsScreen` (Paramètres).
- [x] Ajouter l'interface pour la clé API (Moteur IA).
- [x] Ajouter l'interface pour le choix de la langue, mode sombre et daltonien.
- [x] Ajouter le bouton de contribution Open Source (Partage de données anonymisées).
- [x] Séparer la navigation (Avatar = Profil / Engrenage = Paramètres).
- [x] Créer l'écran `ChatScreen` (Mockup de l'interface de discussion).
- [x] Ajouter le raccourci "Lancer une discussion" sur le Dashboard.
- [x] Initialiser le système de stockage local (react-native-mmkv) pour les paramètres et le profil.
- [x] Implémenter le contexte de thème dynamique (ThemeProvider) sans codage en dur.


## 🧠 Phase 2 : Le Pipeline de Traitement Sécurisé (OCR + Anonymisation + IA)
*L'objectif est de valider le "moteur" de l'application : transformer une image en conseil tout en protégeant les données.*

### 🛠️ OCR & Extraction
- [x] Intégrer l'appareil photo du téléphone pour capturer un document (`react-native-image-picker`).
- [x] Installer et configurer **Google ML Kit** (Local & Performant).
- [x] Créer le service `src/services/ocr.ts` pour extraire le texte brut d'une image.
- [x] Valider l'extraction sur des documents types (via Alertes de test).

### 🛡️ Pipeline d'Anonymisation (Hybride)
- [ ] Créer `src/services/anonymizer.ts`.
- [ ] Implémenter les **Regex classiques** (Email, Tel, INE, Codes postaux).
- [ ] Intégrer le modèle NER **cmarkea/distilcamembert-base-ner** via `onnxruntime-react-native`.
- [ ] Créer la fonction `anonymize(text: string)` qui combine Regex + NER avant tout envoi externe.

### 🤖 Cœur IA
- [ ] Créer `src/services/aiService.ts`.
- [ ] Implémenter la fonction `callLLM(prompt: string, context: string[])` avec intégration de la clé API.
- [ ] Configurer `src/utils/prompts.ts` : `TRANSLATOR_PROMPT`, `RECOURS_PROMPT`, `SUIVI_DOSSIER_PROMPT`.
- [ ] **Validation finale :** Créer un script de test "Image -> Texte -> Anonymisation -> IA" fonctionnel.

## 📂 Phase 3 : Gestion des "Dossiers" et Stockage Local
*Le cœur de l'application : permettre à l'étudiant de suivre ses démarches dans le temps.*

- [ ] Installer et configurer un gestionnaire d'état local persistant (ex: `Zustand` avec `MMKV`).
- [ ] Implémenter les actions Zustand : `creerDossier`, `ajouterMessageAuDossier`, `cloturerDossier`.
- [ ] Créer l'écran `MesDossiers.tsx` (Liste complète).
- [ ] Créer l'écran `DossierDetail.tsx` (Affichage type "chat" de l'historique).
- [x] **Sécurité MMKV :** Implémenter le stockage sécurisé de la clé de chiffrement.

## 📸 Phase 4 : Interface Utilisateur "Capture & Analyse"
*Donner vie au moteur de la Phase 2 via une interface fluide.*

- [ ] Installer une librairie pour utiliser l'appareil photo / galerie.
- [ ] Créer un composant "Ajouter un document" dans l'écran `DossierDetail`.
- [ ] Relier le texte extrait et anonymisé à l'IA pour l'analyser en temps réel.
- [ ] **Boucle magique :** Affichage automatique du brouillon de réponse généré par l'IA après un scan.

## ⚖️ Phase 5 : Création de Dossiers (Formulaires)
*La création d'un tout nouveau dossier de zéro.*

- [ ] Créer l'écran `NouveauDossier` : Choix du type de problème (Focus Bourse pour le MVP).
- [ ] Créer l'écran de formulaire : Questionnaire dynamique pour récupérer le contexte.
- [ ] Générer le premier recours via l'IA et l'enregistrer dans un nouveau dossier.
- [ ] Exporter le résultat (Copier / PDF).

## 🛡️ Phase 6 : Privacy, Consentement & Open Source
*Gérer la relation à la donnée et le partage solidaire.*

- [ ] Créer l'écran de consentement (Opt-in) pour le partage anonymisé.
- [ ] Ajouter une fonctionnalité de "Rapport de confidentialité" : montrer à l'utilisateur ce qui a été anonymisé.
- [ ] Préparer l'application pour le dépôt de données sur Hugging Face.

## 🌍 Phase 7 : Open Data (La liaison Hugging Face)
*Contribuer au bien commun.*

- [ ] Créer un backend léger (ex: Supabase ou Cloudflare Worker) pour la réception des données.
- [ ] Coder la route API sécurisée qui réceptionne les dossiers **déjà anonymisés**.
- [ ] Script d'export automatisé vers le dataset "Simplifac-Data" sur Hugging Face.

## 🚀 Phase 8 : Polish & Déploiement
- [ ] Ajouter une fonctionnalité "Date limite" dans la vue `DossierCard`.
- [ ] Vérifier l'accessibilité (contraste, lecture vocale).
- [ ] Icônes, Splash Screens et compilation finale (Android/iOS).
- [ ] Soumission aux stores (Play Store, App Store, F-Droid).