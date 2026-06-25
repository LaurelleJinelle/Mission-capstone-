# Smart Grid RL Dashboard

A React + FastAPI dashboard that runs your trained PPO models live against
the same simulator used during training. Four pages: overview, live
single-day simulation, side-by-side policy comparison, and stress test.

## Prerequisites

Already installed if you've been running the rest of the project:

- Python 3.10+ with `pandas`, `numpy`, `gymnasium`, `stable-baselines3`, `torch`
- Trained models at `output/pilot_run/ppo_5feeder.zip` and/or
  `output/pilot_run/ppo_5feeder_robust.zip`
- `output/pilot_feeders.csv` (from `select_pilot_feeders.py`)

Newly needed:

- **Node.js 18+** (download from nodejs.org for Windows)
- Python packages `fastapi` and `uvicorn`

## One-time setup

### Backend

From the project root (where `feeder_env.py` lives):

```powershell
pip install fastapi "uvicorn[standard]"
```

### Frontend

From `dashboard/frontend/`:

```powershell
npm install
```

This downloads React, Tailwind, Recharts, etc. into `node_modules/`. Takes a
minute or two the first time, fast afterwards.

## Running the dashboard

You need two terminals open at the same time. Both must be running.

### Terminal 1 — backend

From `dashboard/backend/`:

```powershell
uvicorn app:app --reload --port 8000
```

You should see:

```
[startup] Loaded 5 pilot feeders
[startup] Loaded model ppo from ppo_5feeder.zip
[startup] Loaded model ppo_robust from ppo_5feeder_robust.zip
INFO:     Uvicorn running on http://127.0.0.1:8000
```

If a model file is missing, the backend still starts and just hides that
policy from the dropdown. The baselines always work.

### Terminal 2 — frontend

From `dashboard/frontend/`:

```powershell
npm run dev
```

You should see:

```
VITE v5.x.x  ready in 250 ms
  ➜  Local:   http://localhost:5173/
```

Open that URL in your browser. The dashboard checks the backend health on
load and shows a friendly error screen if it's not running.

## Project structure

```
dashboard/
├── README.md                       this file
├── backend/
│   ├── app.py                      FastAPI server, loads models at startup
│   └── requirements.txt
└── frontend/
    ├── package.json                npm dependencies
    ├── vite.config.js              dev server + /api proxy to localhost:8000
    ├── tailwind.config.js          brand colors (blue, green, purple)
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx                React entry point
        ├── App.jsx                 layout + tab navigation
        ├── index.css               Tailwind + a few utility classes
        ├── api/
        │   └── client.js           fetch wrapper + shared colour palettes
        └── pages/
            ├── Overview.jsx        hero, headline stats, feeder cards
            ├── Simulator.jsx       interactive single-day run
            ├── Compare.jsx         multi-policy comparison
            └── StressTest.jsx      degradation under harder scarcity
```

## API endpoints

The frontend calls these via the Vite proxy on `/api/*`:

| Method | Path              | Purpose                                              |
|--------|-------------------|------------------------------------------------------|
| GET    | `/api/health`     | Liveness check, returns loaded model names           |
| GET    | `/api/feeders`    | Pilot feeder configurations                          |
| GET    | `/api/policies`   | List of selectable policies (depends on loaded models) |
| POST   | `/api/simulate`   | Run one 24-hour episode, return hour-by-hour data    |
| POST   | `/api/compare`    | Run N episodes for each selected policy, aggregates  |
| POST   | `/api/stress_test`| Run all four scarcity scenarios for selected policies |

When the backend is up, you can also visit `http://localhost:8000/docs` for
auto-generated Swagger UI documentation of every endpoint.

## Common gotchas

- **"Backend not reachable" on load.** The FastAPI server isn't running, or
  is running on a port other than 8000. Check terminal 1.
- **PPO option missing from dropdown.** The model `.zip` file doesn't exist
  at the expected path. Check the backend startup logs.
- **`pilot_feeders.csv not found`.** Run `python select_pilot_feeders.py`
  first from the project root.
- **Long-running comparisons.** Each comparison runs N episodes per policy,
  in sequence. For 100 episodes × 4 policies, expect 10-20 seconds.
