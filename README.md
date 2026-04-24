# SanteAI

SanteAI est un assistant de triage communautaire avec:

- Frontend web React/Vite
- API Express (triage, malnutrition, ASR, chatbot)
- Application mobile Expo (dossier `mobile/`)

## 1. Lancer le backend/web

1. `npm install`
2. Copier `.env.example` vers `.env` et renseigner les cles API
3. `npm run dev`

## 2. Lancer l application mobile

1. `cd mobile`
2. `npm install`
3. Copier `.env.example` vers `.env`
4. Configurer `EXPO_PUBLIC_API_BASE_URL`
5. `npm run start`

Voir les details dans `mobile/README.md`.
