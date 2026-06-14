# 🏰 Dungeons & Deliverables

A browser-based side-scrolling platformer where you play as an IT consultant navigating a corporate dungeon. Fight enemies through four levels and a boss room while managing six project health meters. Supports solo play and **co-op multiplayer horde mode** via Socket.io.

## Running Locally

### Prerequisites
- Node.js 18+

### Setup

```bash
npm install
```

### Development

```bash
# Solo play only (client)
npm run dev

# Client + multiplayer server (co-op mode)
cd server && npm install && cd ..
npm run dev:all
```

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server — http://localhost:5173 |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | ESLint |
| `npm run server` | Socket.io multiplayer server (port 3001) |
| `npm run dev:all` | Client + server concurrently |

### Environment variables

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Multiplayer server port |
| `VITE_SERVER_URL` | `http://localhost:3001` | Client URL for socket connection |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS origin on the server |

## Gameplay

### Solo mode

Fight through four levels — three corporate dungeon floors followed by a Boss Room — and beat the boss with `deliveryProgress ≥ 70` to win.

**Lose conditions:** `budget ≤ 0`, `teamMorale ≤ 0`, `technicalDebt ≥ 100`, `complianceRisk ≥ 100`

### Co-op multiplayer horde mode

Up to several players share a compact arena. Enemies spawn in continuous waves from the server. Survive until 20 enemies accumulate simultaneously (overrun). There is no win condition — it's a survival challenge.

### Controls

| Key | Action |
|---|---|
| Arrow keys / WASD | Move & jump |
| Space | Attack |
| Q | Class ability |

## Consultant Classes

| Class | Ability | Passive kill bonus |
|---|---|---|
| 🏛️ Architect | Draft Architecture — freeze all enemies, reduce tech debt | −4 Technical Debt |
| 💻 Developer | Ship Hotfix — burst damage, nudge delivery | +3 Delivery Progress |
| 🎨 UX Designer | User Research — freeze, boost client happiness | +4 Client Happiness |
| 📊 Data Scientist | Run the Model — buff all loot drops, raise compliance risk | +4 Delivery / +2 Compliance Risk |
| 📋 Project Manager | Call a Meeting — reverse enemy direction, boost morale | +3 Team Morale |
| 🔒 Security Consultant | Deploy Firewall — delete incoming projectiles | −5 Compliance Risk |
| 🤝 Account Manager | Escalate — stun nearest enemy, steady client | +3 Client Happiness |
| 🎲 Intern | Wildcard — copies a random ability; kill bonuses are fully random | Random |

## Project Stats

All six stats are integers from 0 to 100:

- **Budget** — project funding
- **Client Happiness** — stakeholder satisfaction
- **Team Morale** — team energy
- **Delivery Progress** — project completion
- **Technical Debt** — accumulated shortcuts
- **Compliance Risk** — regulatory exposure
