# 🏰 Dungeons & Deliverables

A browser-based dungeon crawler where you are a consultant trying to deliver an impossible AI project. The dungeon is a corporate client organization. The AI acts as the dungeon master.

## Running Locally

### Prerequisites
- Node.js 18+
- An OpenAI API key (optional — fallback content works without it)

### Setup

```bash
npm install
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Development

```bash
npm run dev
```

Opens the game at http://localhost:5173

The Express backend runs on port 3001 and proxies OpenAI calls.

### Without AI

The game works fully without an API key using fallback rooms and built-in fallback resolutions.

## Gameplay

1. Select a consultant class (each has a unique ability and stat flavor)
2. Navigate rooms by choosing actions or typing custom actions
3. Manage 6 project meters: Budget, Client Happiness, Team Morale, Delivery Progress, Technical Debt, Compliance Risk
4. Win by surviving the Final Boss with enough Delivery Progress to deliver the project
5. Lose if Budget or Team Morale hit 0, or Technical Debt / Compliance Risk hit 100
