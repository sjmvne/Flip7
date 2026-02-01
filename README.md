# 🃏 Flip 7 - The Web Game

![Flip 7 Logo](assets/Flip7%20Logo.webp)

**Flip 7** è un gioco di carte strategico multiplayer "push-your-luck", sviluppato come Web App moderna (PWA). Sfida i tuoi amici in tempo reale o gioca contro l'IA, ovunque tu sia!

> **Obiettivo**: Essere il primo a raggiungere **200 punti** sommando il valore delle carte pescate... ma attenzione a non sballare!

---

## ✨ Funzionalità Principali

### 🤖 Smart Bots (Nuovo!)
Non hai amici online? Nessun problema!
*   **30+ Personalità**: Da "Gerry Scotti" a "Skibidi Toilet", ogni bot ha un nome unico e divertente.
*   **Intelligenza Strategica**:
    *   ⚡ **YOLO Mode**: Se hanno una *Second Chance*, rischiano tutto e pescano aggressivamente.
    *   🛡️ **Panic Mode**: Se bruciano la *Second Chance*, diventano super conservativi e si fermano subito.
*   **Animazioni**: Ingresso in lobby fluido con effetto "Pop-in".
*   **Gestione Host**: L'host può aggiungere fino a **18 giocatori** (misti umani/bot) e rimuovere i bot indesiderati.

### 🎨 UI & Design Premium
*   **Apple-Style UI**: Pulsanti ed elementi con design moderno, sfumature ed effetti glassmorphism.
*   **Animazioni 3D**: Carte che volano, mescolamento deck realistico e feedback visivi fluidi.
*   **Icone Animate**: Emoji animate Fluent.
*   **Temi & Dorsi**:
    *   7 Temi (Notte, Casinò, Deep Blue, ecc.).
    *   12 Dorsi carte (Cyberpunk, Retro '30s, Vaporwave, ecc.).

### 🎮 Gameplay Immersivo
*   **Multiplayer P2P**: Bassissima latenza grazie a PeerJS (WebRTC). Nessun server centrale.
*   **Carte Speciali**:
    *   ❄️ **Freeze**: Congela un avversario per un turno.
    *   ⚡ **Flip 3**: Costringi un nemico a pescare 3 carte (fai rischiare lui!).
    *   ❤️ **Second Chance**: Una vita extra se sballi.
    *   ➕ **Modificatori**: Moltiplicatori e bonus punti.
*   **Meme Mode 🎭**: Una modalità caotica con suoni virali ("Bruh", "He he yeah boy") ed effetti visivi esagerati.

---

## 🚀 Come Avviare (Locale)

Il progetto è una **Single Page Application (SPA)** basata su Vanilla JS. Zero dipendenze di build.

1.  **Clona** la repository.
2.  **Apri** un terminale nella cartella.
3.  **Avvia** un server locale (es. con `npx` o Python):
    ```bash
    npx http-server -p 8080
    # oppure
    python -m http.server 8080
    ```
4.  Apri `http://localhost:8080` nel browser.

---

## 🕹️ Guida Rapida

1.  **Lobby**: Crea una stanza e condividi il Link/QR Code.
2.  **Aggiungi Bot**: Usa il tasto 🟢 **+** per riempire la stanza (fino a 18 giocatori).
3.  **Gioca**:
    *   **Hit (Pesca)**: Tenta la fortuna.
    *   **Stay (Fermati)**: Metti al sicuro i punti.
4.  **Regole**:
    *   Se peschi un numero che **hai già** in mano -> **SBALLI (BUST)!**
    *   Colleziona **7 carte uniche** per fare **FLIP 7** (+15 punti bonus).

---

## 🛠️ Stack Tecnologico

*   **Core**: HTML5, CSS3 (Variables, Flexbox/Grid), Vanilla JS (ES6+).
*   **Network**: [PeerJS](https://peerjs.com/) (WebRTC Data Channels).
*   **Audio**: [Howler.js](https://howlerjs.com/) per audio spaziale e SFX.
*   **Grafica**: Chart.js (Stats), Canvas Confetti.
*   **Assets**: [Animated Fluent Emojis](https://github.com/sjmvne/Animated-Fluent-Emojis).

---

## ℹ️ Crediti

*   **Sviluppo**: Simone Pepe
*   **Concept Originale**: Basato sul gioco di carte "Flip 7" di Eric Olsen.
*   **Meme & Audio**: Community Internet Archives.

---

## ⚠️ Disclaimer

Questo progetto è una riproduzione **fan-made a scopo non di lucro**, creata esclusivamente per permettere di giocare a distanza con amici.

Tutti i diritti, le meccaniche di gioco e il concept originale appartengono a **Eric Olsen** e agli editori ufficiali di **"Flip 7"**.
Questa Web App **non** intende sostituire il gioco fisico né appropriarsene.

👉 **Se ti piace questo gioco, supporta gli autori acquistando la versione fisica originale!**

---
*Made with 💜 and too much caffeine.*
