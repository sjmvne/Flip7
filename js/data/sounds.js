// ================= PREMIUM EFFECTS & AUDIO =================
// Sound Effects using Howler.js

const SFX = {
    enabled: true,
    currentActionSound: null,
    sounds: {}, // Placeholder if sounds meant to be here

    // THEME SYSTEM
    themes: ['default', 'casino', 'deepblue', 'cyberpunk', 'minimalist', 'velvet', 'glass'],
    currentThemeIdx: 0,

    init: function () {
        // Theme Init
        const savedTheme = localStorage.getItem('flip7_theme');
        if (savedTheme && this.themes.includes(savedTheme)) {
            this.currentThemeIdx = this.themes.indexOf(savedTheme);
            this.setTheme(savedTheme, true); // Silent init
        }
    },

    play: function (name) {
        if (!this.enabled || !this.sounds[name]) return;
        this.sounds[name].play();
    },

    cycleTheme: function () {
        this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
        const newTheme = this.themes[this.currentThemeIdx];
        this.setTheme(newTheme);
    },

    setTheme: function (name, silent = false) {
        // 1. Update Index
        const idx = this.themes.indexOf(name);
        if (idx !== -1) this.currentThemeIdx = idx;

        // 2. Set Data Attribute (for CSS variables)
        if (name === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', name);
        }

        // 3. Call Enhanced ChangeTheme (for specific body styles like Gradients)
        if (typeof changeTheme === 'function') {
            changeTheme(name, silent);
        }

        localStorage.setItem('flip7_theme', name);

        // 4. Update Meta Theme Color
        let color = '#1a1625';
        if (name === 'cyberpunk') color = '#050510';
        else if (name === 'minimalist') color = '#000000'; // Dark Minimalist
        else if (name === 'velvet') color = '#4c0519';
        else if (name === 'glass') color = '#334155';
        else if (name === 'casino') color = '#064e3b';
        else if (name === 'deepblue') color = '#1e3a8a';

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', color);
    },

    sounds: {
        // Core Gameplay
        hit: new Howl({ src: ['assets/sounds/hit.mp3'] }),
        stay: new Howl({ src: ['assets/sounds/stay.mp3'] }),
        bust: new Howl({ src: ['assets/sounds/bust.mp3'] }),
        flip7: new Howl({ src: ['assets/sounds/flip7.mp3'] }),
        shuffle: new Howl({ src: ['assets/sounds/shuffle.wav'] }),
        deal: new Howl({ src: ['assets/sounds/deal.mp3'] }),

        // Actions
        freeze: new Howl({ src: ['assets/sounds/freeze.mp3'] }),
        flip3: new Howl({ src: ['assets/sounds/flip3.wav'] }),
        sc_gain: new Howl({ src: ['assets/sounds/second_chance_gain.mp3'] }),
        sc_burn: new Howl({ src: ['assets/sounds/second_chance_burn.mp3'] }),
        modifier_card: new Howl({ src: ['assets/sounds/modifier_card.mp3'] }),

        // UI & Atmosphere
        click: new Howl({ src: ['assets/sounds/button_click.mp3'] }),
        user_join: new Howl({ src: ['assets/sounds/user_join.mp3'] }),
        // start: new Howl({ src: ['assets/sounds/start_game.mp3'] }), //TODO: Add sound
        win_match: new Howl({ src: ['assets/sounds/win_match.mp3'] }),
        lose_match: new Howl({ src: ['assets/sounds/lose_match.mp3'] }),
        round_end: new Howl({ src: ['assets/sounds/round_end.mp3'] }),

        // Popups & Notifications
        popup_open: new Howl({ src: ['assets/sounds/popup_open.mp3'] }),
        popup_close: new Howl({ src: ['assets/sounds/popup_close.mp3'] }),
        action_required: new Howl({ src: ['assets/sounds/action_required_popup.mp3'] }),
        disconnection: new Howl({ src: ['assets/sounds/disconnection.mp3'] }),
        user_reaction: new Howl({ src: ['assets/sounds/user_reaction.mp3'] }),

        // Sidebar Sounds
        slide_in: new Howl({ src: ['assets/sounds/slide_in.mp3'] }),
        slide_out: new Howl({ src: ['assets/sounds/slide_out.mp3'] }),

        // Legacy/Fallback mapping
        action: new Howl({ src: ['assets/sounds/hit.mp3'] }),
        win: new Howl({ src: ['assets/sounds/win_match.mp3'] })
    },
    // MEME SOUNDS will be loaded here
    memeSounds: {
        // Core Gameplay
        hit: [new Howl({ src: ['assets/sounds/deal.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/ive-got-this.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/another-one.mp3'] })],
        stay: [new Howl({ src: ['assets/sounds/stay.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/rahhh.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/OOOW MA GAHD.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/ti-devo-dire-cicciogamer.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/formula-1-box-box.mp3'] })],
        bust: [new Howl({ src: ['assets/sounds/meme_mode/bone-crack-meme.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/bruh.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/disappear-scream.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/FAHHH.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/Fornite Death Sound.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/gta-v-busted.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/mario_oof.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/minecraft_hurt.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/IT_IS_WHAT_IT_IS.mp3'] })],
        flip7: [new Howl({ src: ['assets/sounds/meme_mode/BYE BYE.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/fortunate_son.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/marza-bukkin.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/chipi-chipi-chapa-chapa.mp3'] })],
        shuffle: [new Howl({ src: ['assets/sounds/shuffle.wav'] })], // Normal
        deal: [new Howl({ src: ['assets/sounds/deal.mp3'] })], // Normal

        // New Core
        bust_on_two: [new Howl({ src: ['assets/sounds/meme_mode/Emotional Damage.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/spongebob-disappointed-sound-effect.mp3'] })],
        bust_on_seven: [new Howl({ src: ['assets/sounds/meme_mode/Scoreggia.mp3'] })],
        player_has_6_cards: [new Howl({ src: ['assets/sounds/meme_mode/let-him-cook-now.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/cooked-dog-meme.mp3'] })],

        // Actions
        freeze: [new Howl({ src: ['assets/sounds/freeze.mp3'] })], // Normal
        flip3: [new Howl({ src: ['assets/sounds/meme_mode/minkia-subbito-mbare.mp3'] })],
        sc_gain: [new Howl({ src: ['assets/sounds/meme_mode/defy-gravity-x-god-is-kanye.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/i-was-the-knight.mp3'] })],
        sc_burn: [new Howl({ src: ['assets/sounds/second_chance_burn.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/non-mi-puoi-contraddire.mp3'] })],

        // New Actions
        freezed: [new Howl({ src: ['assets/sounds/meme_mode/bastavdo.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/get-out-meme.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/meme-violin-sad-violin.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/there_are_you_little_shit.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/Undertaker-bell.mp3'] })],
        modifier_x2: [new Howl({ src: ['assets/sounds/meme_mode/WOW!.mp3'] })],
        'modifier_+2': [new Howl({ src: ['assets/sounds/meme_mode/gangster paradise.mp3'] })],
        'modifier_+4': [new Howl({ src: ['assets/sounds/meme_mode/rizz-sound-effect.mp3'] })],
        'modifier_+6': [new Howl({ src: ['assets/sounds/meme_mode/mi-bombo-duolingo.mp3'] })],
        'modifier_+8': [new Howl({ src: ['assets/sounds/meme_mode/mi-bombo.mp3'] })],
        'modifier_+10': [new Howl({ src: ['assets/sounds/meme_mode/metal-pipe-clang.mp3'] })],
        player_flipping3: [new Howl({ src: ['assets/sounds/meme_mode/skeleton-with-shield.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/adele-this-is-the-end.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/man-shut-yo-gah-damn-meme.mp3'] })],
        player_flipping3_success: [new Howl({ src: ['assets/sounds/meme_mode/marza-bukkin.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/per-favore-non-piangere-slow.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/gigachad-theme-music.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/drip-goku.mp3'] })],
        player_flipping3_fail: [new Howl({ src: ['assets/sounds/meme_mode/what-the-hell-meme-sound-effect.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/trollface-smile.mp3'] })],

        // UI & Atmosphere
        click: [new Howl({ src: ['assets/sounds/button_click.mp3'] })], // Normal
        user_join: [new Howl({ src: ['assets/sounds/meme_mode/discord_join_call.mp3'] })],
        // start: [ new Howl({ src: ['assets/sounds/meme_mode/start_game.mp3'] }) ], //TODO: Add sound
        win_match: [new Howl({ src: ['assets/sounds/meme_mode/we-are-charlie-kirk-song.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/noi-veniamo-dalla-calabria.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/tarantella-napolitana.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/o-casal-mais-lindo-do-brasil.mp3'] })],
        lose_match: [new Howl({ src: ['assets/sounds/lose_match.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/fnaf-meme-har-har.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/sad-meow-song.mp3'] })],
        round_end: [new Howl({ src: ['assets/sounds/meme_mode/among-us-role-reveal-sound.mp3'] })],

        // Popups
        popup_open: [new Howl({ src: ['assets/sounds/popup_open.mp3'] })], // Normal
        popup_close: [new Howl({ src: ['assets/sounds/popup_close.mp3'] })], // Normal
        action_required: [new Howl({ src: ['assets/sounds/meme_mode/death_note_popup_deciding.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/dexter-meme.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/kyrie-death-note.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/scary-tiktok-music.mp3'] }), new Howl({ src: ['assets/sounds/meme_mode/dramatic-tiktok.mp3'] })],
        disconnection: [new Howl({ src: ['assets/sounds/meme_mode/windows shutdown.mp3'] })],
        user_reaction: [new Howl({ src: ['assets/sounds/user_reaction.mp3'] })] // Normal
    },

    stopAction: function () {
        if (this.currentActionSound) {
            this.currentActionSound.stop();
            this.currentActionSound = null;
        }
    },

    getMemeVariant: function (type) {
        if (!this.memeSounds[type] || !Array.isArray(this.memeSounds[type])) return null;
        return Math.floor(Math.random() * this.memeSounds[type].length);
    },

    play: function (type, variant = null) {
        if (!this.enabled) return;

        // Check Meme Mode
        if (state && state.memeMode && this.memeSounds[type]) {
            // Use provided variant if valid, otherwise random
            const sounds = this.memeSounds[type];
            // Validate variant index
            let s;
            if (variant !== null && variant >= 0 && variant < sounds.length) {
                s = sounds[variant];
            } else {
                // If no variant provided, pick one and RETURN it so caller can broadcast it
                // BUT we can't easily return from here to the caller of 'play'. 
                // The caller should have called getMemeVariant first if they wanted to sync.
                // If we are here without a variant, it means it's a local sound or we are the host initiating it?
                // Actually, for sync, the HOST picks the variant and broadcasts 'play(type, v)'.
                // The CLIENT receives 'play(type, v)'.
                // If we are just playing locally (UI click), random is fine.
                s = this.getRandomMemeSound(sounds);
            }

            if (s) {
                // Stop previous action sound if needed
                if (['action_required', 'win_match', 'lose_match'].includes(type) || type.startsWith('player_flipping3') || type === 'player_has_6_cards') {
                    if (this.currentActionSound) {
                        this.currentActionSound.stop();
                        this.currentActionSound = null;
                    }

                    // For 6 cards, we might want to loop or just play once. Let's play once for now.
                    this.currentActionSound = s;
                }
                s.play();
                return; // Don't play normal sound
            }
        }

        // Fallback to Normal
        try {
            if (this.sounds[type]) {
                // Stop logic for normal sounds too if needed
                if (['action_required', 'win_match', 'lose_match'].includes(type)) {
                    if (this.currentActionSound) this.currentActionSound.stop();
                    this.currentActionSound = this.sounds[type];
                }
                this.sounds[type].play();
            } else if (this.sounds['click']) {
                // Fallback
                this.sounds['click'].play();
            }
        } catch (e) { console.error('SFX Error:', e); }
    },

    getRandomMemeSound: function (soundArray) {
        if (!Array.isArray(soundArray) || soundArray.length === 0) return null;
        return soundArray[Math.floor(Math.random() * soundArray.length)];
    },

    stopAction: function () {
        if (this.currentActionSound) {
            this.currentActionSound.stop();
            this.currentActionSound = null;
        }
    }
};
