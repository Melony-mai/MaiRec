# WS Addon — Remote Control Mode

This addon enables WebSocket-based remote control of the captcha solver. It is designed to be overlaid on top of the base extension from the `extension/` folder.

When using this addon, the extension acts as a personal captcha solving service — on your own resources, without paying for third-party services. The extension connects to your remote WebSocket task distribution server and waits for incoming tasks. When a task is received, it opens a tab, solves the captcha, and returns the token. One extension instance works in a single thread, but you can connect any number of browsers simultaneously.

Tasks are submitted using standard captcha service API formats (such as 2captcha or AntiCaptcha compatible protocols).

## Requirements

- Chrome 116+
- The base extension already loaded as an unpacked extension
- A valid 32-character API key configured on your WebSocket dispatch server

## Getting an API key

1. Obtain or generate a 32-character API key configured on your WebSocket coordinator or dispatch server.
2. Paste the key into the extension popup (Reports submenu), then enable WS mode in the Timeout Settings / Report section.

## Installation

1. Load the base extension from `extension/` as an unpacked extension in `chrome://extensions`.
2. Copy all files from this folder **on top of** your `extension/` directory:
   ```
   ws/background_ws.js         → extension/ws/background_ws.js
   ws/offscreen.html           → extension/ws/offscreen.html
   ws/offscreen.js             → extension/ws/offscreen.js
   ws/recaptcha_frame_watch.js → extension/ws/recaptcha_frame_watch.js
   manifest.json               → extension/manifest.json
   ```
3. Reload the extension from `chrome://extensions` (click the reload icon).
4. Paste your API key in the extension popup (Reports submenu) and enable WS mode in the Timeout Settings / Report section.

## What changes

Compared to the base extension, this addon:

- Replaces the WS stub (`ws/background_ws.js`) with the full WebSocket implementation
- Updates `manifest.json` to add the required permissions: `tabs`, `debugger`, `offscreen`
- Raises the minimum Chrome version from 111 to 116

## How it works

When WS mode is enabled, the background script opens an offscreen document (`ws/offscreen.html`) that maintains a persistent WebSocket connection to the dispatch server. When a solve task arrives, the Chrome Debugger API is used to open a controlled tab, intercept the reCAPTCHA network requests, inject the challenge page, and return the solved token.
