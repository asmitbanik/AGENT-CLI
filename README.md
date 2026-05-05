# AI Agent CLI (Terminal Chat)

A conversational CLI agent you can chat with directly in the terminal. It follows a structured loop (**START → THINK → TOOL → OBSERVE → OUTPUT**) and can take actions on your machine (create files, run commands, open a generated webpage in the browser).

## Demo

![Demo recording](./AGENT%20CLI%20-%20vid%20recording.gif)

## What it can do

- **Generate a Scaler-style landing page**: creates a working mini website using **HTML + CSS + JavaScript** with:
  - **Header** (logo/nav/CTAs)
  - **Hero** (headline/subcopy/CTAs)
  - **Footer** (links + bottom line)
- **Write real output files** under `output/scaler-clone/`
- **Open `index.html`** in your default browser automatically (Windows/macOS/Linux)
- **Extra tools (demo)**:
  - Get live weather (`wttr.in`)
  - Fetch public GitHub profile info
  - Execute a shell command

## How it works (high level)

The agent runs in a loop and prints each step to the terminal:

- **START / THINK**: the model reasons about what to do next
- **TOOL**: the model requests a tool call (write file, open browser, run command, etc.)
- **OBSERVE**: the tool result is fed back to the model
- **OUTPUT**: the model summarizes and ends the current response (the CLI keeps running for new prompts)

## Setup

### Requirements

- **Node.js 18+**

### Install

```bash
npm install
```

### Configure environment

Copy `.env.example` to `.env` and set your key:

```bash
# .env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

## Run

```bash
npm start
```

Then chat in the terminal.

## Example prompts

- “Clone the Scaler Academy homepage with header, hero, and footer in separate HTML/CSS/JS files. Make it visually similar.”
- “Create a Scaler-like landing page and open it in the browser.”
- “What is the weather in Delhi?”
- “Show GitHub details for torvalds”

## Output

- **Generated site**: `output/scaler-clone/`
  - Common files: `index.html`, `styles.css`, `app.js`

## Notes / troubleshooting

- **No page opened?** Open `output/scaler-clone/index.html` manually.
- **Model output not JSON?** The CLI asks the model to retry until it returns one valid JSON object in the required schema.
