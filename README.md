# Vibecoding Steam Lookup

This project is a small Node.js application that exposes an HTTP API for looking up Steam games and serves a single page application that displays the banner, description, and screenshots for a queried game.

## Prerequisites

You need a recent [Node.js](https://nodejs.org/) installation. The official installer ships with both `node` and `npm` and is the easiest way to set things up on Windows:

1. Download the *LTS* installer from [nodejs.org](https://nodejs.org/).
2. Run the installer and keep the default options so that the `node` and `npm` executables are added to your `PATH` automatically.
3. Close the PowerShell or Command Prompt session you used before and open a new one so the updated `PATH` is picked up.

To verify the installation run:

```powershell
node -v
npm -v
```

Both commands should print version numbers. If they do not, reboot Windows or double‑check the installation steps above.

## Installation

From a terminal that recognises `npm`, navigate into the project folder and install the dependencies:

```powershell
cd path\to\Vibecoding
npm install
```

The project currently only uses the built‑in Node.js modules, so `npm install` will finish quickly, but it also creates the `node_modules` directory that `npm start` expects.

## Running the development server

Once dependencies are installed you can start the server:

```powershell
npm start
```

or, equivalently:

```powershell
node server.js
```

The server listens on port `3000`. Open <http://localhost:3000/> in your browser to use the UI. The terminal will display `Server is running at http://0.0.0.0:3000` when the service is ready.

If the environment has no internet access the server automatically falls back to the curated offline catalogue stored in `data/fallback-games.json`.

## Stopping the server

Press `Ctrl+C` in the terminal where the server is running to stop it.

## Troubleshooting

- **`npm` is not recognised** – Make sure Node.js is installed and that you opened a new PowerShell/Command Prompt window after the installation so that the `PATH` variable is refreshed.
- **Port 3000 is busy** – Stop the other program that is using the port or edit `server.js` and change the value of `PORT`.
- **No Steam data** – When offline the server serves placeholder data. Reconnect to the internet to get live data from Steam.

## Project structure

```
Vibecoding/
├── data/                # Offline catalogue used when Steam is unreachable
├── public/              # Static assets served to the browser (HTML, CSS, JS)
├── server.js            # Node.js server entry point
├── package.json         # npm scripts and metadata
└── README.md            # This document
```

