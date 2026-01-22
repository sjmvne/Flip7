# Flip 7 - Multiplayer Card Game 🎴

Flip 7 is a fast-paced, high-stakes multiplayer card game built with modern web technologies. Focus on strategic risks, special actions, and outsmarting your friends in a premium, glassmorphic interface.

![Flip 7 Logo](assets/Flip7%20Logo.webp)

## 🌟 Features

- **P2P Multiplayer**: No server needed! Powered by [PeerJS](https://peerjs.com/) for a decentralized gaming experience.
- **Premium UI/UX**: State-of-the-art glassmorphism design with fluid animations (Anime.js, Canvas-Confetti).
- **Interactive Gameplay**: Use special cards like **Freeze**, **Flip 3**, and **Second Chance** to turn the tide.
- **Stats Dashboard**: Track your performance with integrated Chart.js visualizations.
- **PWA Support**: Install it on your home screen for a native-like mobile experience.
- **Dynamic Feedback**: Responsive toasts, haptic-style animations, and animated Fluent Emojis.

## 🎮 How to Play

### Object of the Game
The goal is to accumulate the most points without busting. Flip cards one by one, deciding whether to "Stay" and bank your points or "Hit" for higher rewards.

### Special Cards
- **Freeze (❄️)**: Force a target player to stop their round immediately.
- **Flip 3 (⚡)**: Force a player to draw 3 consecutive cards.
- **Second Chance (❤️)**: Absorbs a "Bust" once, allowing you to keep playing.
- **Face Cards (Multipliers)**: Use `x2` symbols to double your round points or numeric additive modifiers.

### The "Flip 7" Rule
If you manage to collect **7 unique number values** in your hand without busting, you trigger a "FLIP 7" — a massive point bonus that automatically ends the round in your favor!

## 🚀 Getting Started

### Prerequisites
- Any modern web browser.
- A local web server (optional, but recommended for PWA/Manifest support).

### Local Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Flip7.git
   ```
2. Navigate to the project folder:
   ```bash
   cd Flip7
   ```
3. Start a local server (e.g., using Python or http-server):
   ```bash
   npx http-server .
   ```
4. Open the link in your browser.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Multiplayer**: PeerJS (WebRTC)
- **Animations**: Anime.js, Canvas-Confetti
- **Graphs**: Chart.js
- **Assets**: Animated Fluent Emojis, Microsoft Teams Icons

## 📱 Mobile Setup
You can add Flip 7 to your home screen on iOS and Android. Open the site in Safari or Chrome, tap "Share" or "Menu", and select **"Add to Home Screen"**. The app will then behave like a native application with its own icon and splash screen.

---

*Questo progetto è stato sviluppato con ❤️ per offrire una moderna interpretazione digitale dei giochi di carte multiplayer.*
