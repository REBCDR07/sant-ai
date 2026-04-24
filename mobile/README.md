# SanteAI Mobile (Expo)

Application mobile React Native/Expo de SanteAI.

## Prerequis

- Node.js 20+
- Backend SanteAI demarre a la racine du projet (`npm run dev`)
- Expo Go sur telephone ou emulateur Android/iOS

## Installation

1. Installer les dependances mobile:
   - `cd mobile`
   - `npm install`
2. Copier le fichier d environnement:
   - `cp .env.example .env`
3. Ajuster `EXPO_PUBLIC_API_BASE_URL`:
   - Android emulateur: `http://10.0.2.2:3000`
   - iOS simulateur: `http://localhost:3000`
   - Appareil physique: `http://<IP_LOCALE_PC>:3000`

## Lancement

- `npm run start`

Puis scanner le QR code avec Expo Go.

## Fonctionnalites portees

- Triage patient IA
- Depistage visuel malnutrition
- Historique local avec suivi
- Alertes epidemiques locales (clustering)
- Assistant IA (chat texte + dictée + voix)
