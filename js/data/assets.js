// ================= ASSETS & COLLECTIONS =================

// CARD BACK CONFIG
const BACKS = [
    { id: 'back', name: 'Classico', desc: 'Il dorso originale di Flip 7.', src: 'assets/cards/back.webp' },
    { id: 'back_30s', name: 'Anni 30', desc: 'Stile vintage raffinato.', src: 'assets/cards/custom_backs/back_30s.webp' },
    { id: 'back_cyberpunk', name: 'Cyberpunk', desc: 'Neon e circuiti futuristici.', src: 'assets/cards/custom_backs/back_cyberpunk.webp' },
    { id: 'back_vaporwave', name: 'Vaporwave', desc: 'Estetica anni 80 retrò.', src: 'assets/cards/custom_backs/back_vaporwave.webp' },
    { id: 'back_gothic', name: 'Gothic', desc: 'Oscuro ed elegante.', src: 'assets/cards/custom_backs/back_gothic.webp' },
    { id: 'back_jp', name: 'Nippon', desc: 'Ispirazione giapponese.', src: 'assets/cards/custom_backs/back_jp.webp' },
    { id: 'back_greek', name: 'Olimpo', desc: 'Miti e leggende.', src: 'assets/cards/custom_backs/back_greek.webp' },
    { id: 'back_roma', name: 'Roma', desc: 'Gloria eterna.', src: 'assets/cards/custom_backs/back_roma.webp' },
    { id: 'back_deepState', name: 'Deep State', desc: 'Top Secret.', src: 'assets/cards/custom_backs/back_deepState.webp' },
    { id: 'back_blueprint', name: 'Blueprint', desc: 'Progettazione tecnica.', src: 'assets/cards/custom_backs/back_blueprint.webp' },
    { id: 'back_graffiti', name: 'Graffiti', desc: 'Arte urbana.', src: 'assets/cards/custom_backs/back_graffiti.webp' },
    { id: 'back_lsd', name: 'Psychedelic', desc: 'Colori in movimento.', src: 'assets/cards/custom_backs/back_lsd.webp' },
];

const ASSETS = {
    crown: 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Objects/Crown.png',
    heart: 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Smilies/Red%20Heart.png',
    snowflake: 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Snowflake.png',
    lightning: 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/High%20Voltage.png',
    // FIX 6: Using Face Exhaling for stay reactions
    stop: 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20Exhaling.png',
    carta: 'https://em-content.zobj.net/source/microsoft-teams/400/palm-up-hand_medium-light-skin-tone_1faf4-1f3fc_1f3fc.png',
    frozen: 'https://em-content.zobj.net/source/microsoft-teams/400/cold-face_1f976.png',
    sc: 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Smilies/Heart%20on%20Fire.png',
    fire: 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Fire.png',
    star: 'https://em-content.zobj.net/source/microsoft-teams/400/star-struck_1f929.png',
    bust: 'https://em-content.zobj.net/source/microsoft-teams/400/loudly-crying-face_1f62d.png',
    bust_alt: 'https://em-content.zobj.net/source/microsoft-teams/400/face-with-symbols-on-mouth_1f92c.png',
    fear: 'https://em-content.zobj.net/source/microsoft-teams/400/face-screaming-in-fear_1f631.png',
    hot: 'https://em-content.zobj.net/source/microsoft-teams/400/hot-face_1f975.png'
};

const FLUENT_BASE = 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis';

// Varied collections for events
const ASSETS_COLLECTIONS = {
    bust: [
        ASSETS.bust,
        ASSETS.bust_alt,
        `${FLUENT_BASE}/Smilies/Woozy%20Face.png`,
        `${FLUENT_BASE}/Smilies/Exploding%20Head.png`,
        `${FLUENT_BASE}/Smilies/Face%20Vomiting.png`
    ],
    flip7: [
        ASSETS.star,
        ASSETS.fire,
        `${FLUENT_BASE}/Activities/Party%20Popper.png`,
        `${FLUENT_BASE}/Activities/Trophy.png`,
        `${FLUENT_BASE}/Activities/1st%20Place%20Medal.png`
    ],
    win: [
        `${FLUENT_BASE}/Activities/Confetti%20Ball.png`,
        `${FLUENT_BASE}/Activities/Party%20Popper.png`,
        `${FLUENT_BASE}/Smilies/Partying%20Face.png`
    ]
};

// APNG PATH STRATEGY - PLEASE READ DO NOT MODIFY
// ------------------------------------------------
// Emoji paths MUST be fully qualified or strictly encoded to avoid 404 errors.
// 1. Files from 'sjmvne/Animated-Fluent-Emojis' often have spaces in filenames.
// 2. We MUST encode these spaces as '%20' manually in the strings below.
// 3. Do NOT use local paths (e.g. 'Emojis/...') as they may fail if assets aren't downloaded.
// 4. Always use `${FLUENT_BASE}` or the full raw.githubusercontent.com URL.
const REACTIONS = [
    // Hand Gestures
    { id: 'like', src: `${FLUENT_BASE}/Hand%20gestures/Thumbs%20Up.png` },
    { id: 'dislike', src: `${FLUENT_BASE}/Hand%20gestures/Thumbs%20Down.png` },
    { id: 'ok', src: `${FLUENT_BASE}/Hand%20gestures/OK%20Hand.png` },
    { id: 'peace', src: `${FLUENT_BASE}/Hand%20gestures/Victory%20Hand.png` },
    { id: 'fingers_crossed', src: `${FLUENT_BASE}/Hand%20gestures/Crossed%20Fingers.png` },
    { id: 'love_you', src: `${FLUENT_BASE}/Hand%20gestures/Love-You%20Gesture.png` },
    { id: 'clap', src: `${FLUENT_BASE}/Hand%20gestures/Clapping%20Hands.png` },
    { id: 'wave', src: `${FLUENT_BASE}/Hand%20gestures/Waving%20Hand.png` },
    { id: 'pray', src: `${FLUENT_BASE}/Hand%20gestures/Folded%20Hands.png` },
    { id: 'stop', src: `${FLUENT_BASE}/Hand%20gestures/Raised%20Hand.png` },
    { id: 'muscle', src: `${FLUENT_BASE}/People%20with%20activities/Person%20Lifting%20Weights%20Light%20Skin%20Tone.png` },

    // Smilies & Emotions
    { id: 'laugh', src: `${FLUENT_BASE}/Smilies/Face%20with%20Tears%20of%20Joy.png` },
    { id: 'cry', src: `${FLUENT_BASE}/Smilies/Loudly%20Crying%20Face.png` },
    { id: 'angry', src: `${FLUENT_BASE}/Smilies/Enraged%20Face.png` },
    { id: 'shock', src: `${FLUENT_BASE}/Smilies/Face%20Screaming%20in%20Fear.png` },
    { id: 'heart', src: `${FLUENT_BASE}/Smilies/Smiling%20Face%20with%20Heart-Eyes.png` },
    { id: 'cool', src: `${FLUENT_BASE}/Smilies/Smiling%20Face%20with%20Sunglasses.png` },
    { id: 'thinking', src: `${FLUENT_BASE}/Smilies/Thinking%20Face.png` },
    { id: 'devil', src: `${FLUENT_BASE}/Smilies/Smiling%20Face%20with%20Horns.png` },
    { id: 'angel', src: `${FLUENT_BASE}/Smilies/Smiling%20Face%20with%20Halo.png` },
    { id: 'money', src: `${FLUENT_BASE}/Smilies/Money-Mouth%20Face.png` },
    { id: 'nerd', src: `${FLUENT_BASE}/Smilies/Nerd%20Face.png` },
    { id: 'sick', src: `${FLUENT_BASE}/Smilies/Nauseated%20Face.png` },
    { id: 'clown', src: `${FLUENT_BASE}/Smilies/Clown%20Face.png` },
    { id: 'ghost', src: `${FLUENT_BASE}/Smilies/Ghost.png` },
    { id: 'poop', src: `${FLUENT_BASE}/Smilies/Pile%20of%20Poo.png` },
    { id: 'skull', src: `${FLUENT_BASE}/Smilies/Skull.png` },
    { id: 'shush', src: `${FLUENT_BASE}/Smilies/Shushing%20Face.png` },
    { id: 'zany', src: `${FLUENT_BASE}/Smilies/Zany%20Face.png` },
    { id: 'pleading', src: `${FLUENT_BASE}/Smilies/Pleading%20Face.png` },
    { id: 'pout', src: `${FLUENT_BASE}/People%20with%20activities/Man%20in%20Motorized%20Wheelchair%20Light%20Skin%20Tone.png` },
    { id: 'hot', src: `${FLUENT_BASE}/Smilies/Hot%20Face.png` },
    { id: 'cold', src: `${FLUENT_BASE}/Smilies/Cold%20Face.png` },
    { id: 'explode', src: `${FLUENT_BASE}/Smilies/Exploding%20Head.png` },
    { id: 'cowboy', src: `${FLUENT_BASE}/Smilies/Cowboy%20Hat%20Face.png` },

    // Activities & Objects
    { id: 'fire', src: `${FLUENT_BASE}/Travel%20and%20places/Fire.png` },
    { id: 'party', src: `${FLUENT_BASE}/Activities/Party%20Popper.png` },
    { id: 'star', src: `${FLUENT_BASE}/Travel%20and%20places/Star.png` },
    { id: 'trophy', src: `${FLUENT_BASE}/Activities/Trophy.png` },
    { id: 'medal', src: `${FLUENT_BASE}/Activities/1st%20Place%20Medal.png` },
    { id: 'bomb', src: `${FLUENT_BASE}/Smilies/Bomb.png` },
    { id: 'gift', src: `${FLUENT_BASE}/Activities/Wrapped%20Gift.png` },
    { id: 'gem', src: `${FLUENT_BASE}/Objects/Gem%20Stone.png` }, // Using generic path
    // Animals (some might need check but usually exist)
    { id: 'cat', src: `${FLUENT_BASE}/Animals/Cat%20Face.png` },
    { id: 'dog', src: `${FLUENT_BASE}/Animals/Dog%20Face.png` },
    { id: 'monkey', src: `${FLUENT_BASE}/Animals/Monkey%20Face.png` },
    { id: 'bust', src: `${FLUENT_BASE}/Smilies/Skull.png` } // Kept for bust usage
];

// Helper to get Emoji/Asset or fallback (Restored for compatibility)
window.getE = function(id, fallback) {
    if (window.emojiManager && typeof window.emojiManager.getImg === 'function') {
         const res = window.emojiManager.getImg(id);
         if (res && res !== id) return res;
    }
    return fallback || id;
};
