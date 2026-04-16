# Instructions de Développement - Agent Simplifac

## 1. Langue et Style de Code
- **Langue du Code :** Le code (noms de variables, fonctions, fichiers, etc.) doit être rédigé en Anglais pour mieux s'intégrer à l'écosystème (ex: `calculateTotal()`).
  - **Exception :** Le texte affiché aux utilisateurs dans l'interface finale (UI) doit impérativement rester en Français.
- **Concision :** Écris le code le plus court et le plus direct possible (KISS : Keep It Simple, Stupid). Évite le code "verbeux" ou les abstractions inutiles.

## 2. Architecture et Structure (Anti-Éparpillement)
- **Faible Couplage (Low Coupling) :** Les fichiers ne doivent pas dépendre les uns des autres de manière excessive. Évite les chaînes de dépendances profondes (A -> B -> C -> D).
- **Principe de Localité :** Préfère regrouper la logique liée dans un seul fichier robuste plutôt que de la fragmenter en 5 petits fichiers difficiles à suivre.
- **Réutilisabilité Pragmatique :** Le code doit être compréhensible au premier coup d'œil. Une abstraction ne doit être créée que si elle simplifie réellement la lecture ou si elle est utilisée à plus de 3 endroits différents.

## 3. Sécurité et Protection des Données (Privacy by Design)
- **Sécurité Maximale :** Applique les principes de l'OWASP par défaut (protection contre les injections SQL, XSS, CSRF).
- **Données Personnelles (RGPD) :**
  - Ne stocke jamais de données sensibles (PII) en clair.
  - Minimise la collecte : ne traite que les données strictement nécessaires.
  - Utilise systématiquement la validation de schéma (ex: Zod, Joi) pour filtrer les entrées utilisateur.
- **Gestion des Secrets :** Ne jamais coder de clés d'API ou de mots de passe en dur. Utilise des variables d'environnement.

## 4. Livrables
- Un code "self-contained" : chaque module doit pouvoir être compris sans avoir à ouvrir dix autres fichiers.
- Une préférence pour la clarté sur la complexité technique.