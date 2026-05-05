# Assignment ~02 AI Agent CLI Tool

Conversational terminal agent using **START → THINK → TOOL → (developer OBSERVE) → OUTPUT**.

When asked to clone or build the **Scaler Academy** website, it must generate **HTML + CSS + JavaScript** files (multiple tool steps — not one-shot), with **header, hero, and footer**, and open **`index.html`** in the browser.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and set **`OPENAI_API_KEY`**
3. Optional: set **`OPENAI_MODEL`** (default `gpt-4o-mini`)

## Run

```bash
npm start
```

## Demo video

- **Local demo recording (mp4)**: [`AGENT CLI - vid recording.mp4`](./AGENT%20CLI%20-%20vid%20recording.mp4)

Example prompts:

- *Clone the Scaler Academy homepage with header, hero, and footer in separate HTML/CSS/JS files.*
- *What is the weather in Delhi?* (demo of other tools.)

Output directory: **`output/scaler-clone/`**

## Submission checklist

1. Push a **public GitHub repo** with this code.
2. Record a **2–3 minute** YouTube (public/unlisted): show `npm start`, the reasoning loop + tool calls in the terminal, and the page opening in the browser.
