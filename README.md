# 🃏 Flip 7 - The Web Game

![Flip 7 Logo](assets/Flip7%20Logo.webp)

**Flip 7** è un gioco di carte strategico multiplayer "push-your-luck", sviluppato come Web App moderna (PWA). Sfida i tuoi amici in tempo reale, ovunque voi siate, senza scaricare nulla!

> **Obiettivo**: Essere il primo a raggiungere **200 punti** sommando il valore delle carte pescate... ma attenzione a non sballare!

---

## ✨ Funzionalità Principali

### 🎮 Gameplay Immersivo
*   **Multiplayer P2P**: Gioca con amici tramite connessione Peer-to-Peer (PeerJS). Nessun server centrale, bassa latenza.
*   **Carte Speciali**:
    *   ❄️ **Freeze**: Congela un avversario per un turno.
    *   ⚡ **Flip 3**: Costringi un avversario a pescare 3 carte.
    *   ❤️ **Second Chance**: Una vita extra se sballi.
    *   ➕ **Modificatori**: Moltiplicatori e bonus punti.
*   **Animazioni 3D**: Carte che volano, mescolamento realistico (CSS 3D), e feedback visivi fluidi.
*   **Audio Spaziale & SFX**: Suoni dinamici per ogni azione, con toggle rapido.

### 🎭 Meme Mode
Una modalità caotica nascosta (attivabile dall'Host) che trasforma il gioco in un'esperienza esilarante:
*   💥 **Audio Meme**: Suoni virali ("He he yeah boy", "Bruh", ecc.) triggerati da eventi di gioco.
*   🌈 **Effetti Visivi**: Splash screen più lunghi e intensi.

### 🛠️ Personalizzazione & Tech
*   **Temi Tavolo**: Viola Notte (Default), Verde Casinò, Blu Profondo.
*   **Dorsi Personalizzati**: 13+ stili di carte (Cyberpunk, Retro '30s, Vaporwave, ecc.).
*   **Statistiche**: Dashboard completa con grafici (Chart.js) a fine partita.
*   **PWA Ready**: Installabile come app nativa su iOS e Android.

---

## 🚀 Come Avviare (Sviluppo Locale)

Il progetto è una **Single Page Application (SPA)** basata su Vanilla JS. Non richiede build process complessi.

### Prerequisiti
*   [Node.js](https://nodejs.org/) (opzionale, solo per servire i file in locale).

### Avvio Veloce
1.  Clona o scarica la cartella.
2.  Apri un terminale nella cartella del progetto.
3.  Esegui un server locale (es. con `http-server`):
    ```bash
    npx http-server -p 8080
    ```
4.  Apri il browser su `http://localhost:8080`.

---

## 🕹️ Come Giocare

1.  **Crea Stanza**: Un giocatore fa da Host e crea la stanza.
2.  **Unisciti**: Gli altri scansionano il QR Code o inseriscono il codice stanza.
3.  **Turno di Gioco**:
    *   **Hit (Pesca)**: Pesca una carta dal mazzo.
    *   **Stay (Fermati)**: Banka i punti accumulati nel round.
4.  **Regole di Base**:
    *   Le carte 0-12 valgono i loro punti.
    *   Se peschi un numero che **hai già** in mano -> **SBALLI (BUST)!** Perdi i punti del round.
    *   Ottieni un **Flip 7** (7 carte uniche in mano) per un bonus di +15 punti!

---

## 📂 Struttura Progetto

```
Flip7/
├── assets/                  # Immagini, Suoni, Icone
│   ├── cards/               # Asset carte (front/back)
│   ├── sounds/              # Effetti sonori (mp3/wav)
│   │   └── meme_mode/       # SFX per Meme Mode
│   └── ...
├── index.html               # Entry point (Logica JS inclusa)
├── manifest.json            # Configurazione PWA
├── Flip7Rules.txt           # Regole complete
└── README.md                # Questo file
```

---

## 🛠️ Tecnologie Usate

*   **HTML5 / CSS3**: Layout responsivo, variabili CSS, animazioni keyframe.
*   **JavaScript (ES6+)**: Logica di gioco, gestione stato.
*   **PeerJS**: Networking WebRTC per il multiplayer.
*   **Howler.js**: Gestione audio avanzata.
*   **Chart.js**: Grafici statistiche.
*   **Anime.js / Canvas Confetti**: Effetti particellari.

---

## ℹ️ Crediti

*   **Sviluppo & Adattamento**: Simone Pepe
*   **Idea Originale**: Basato sul gioco di carte "Flip 7" di Eric Olsen.
*   **Asset Audio**: Mixkit & Risorse Meme Community.
*   **Librerie**: Vedere sezione Tecnologie.

---

Made with 💜 by **Simone Pepe**
