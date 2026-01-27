class EmojiManager {
    constructor() {
        this.emojiMap = new Map();
        this.isReady = false;
        // Default mappings for specific keywords if direct match fails or for utility
        this.keywordMapping = {
            'freeze': 'Snowflake',
            'flip3': 'High Voltage',
            'second_chance': 'Red Heart', // or Heart Suit
            'rejoin': 'Waving Hand',
            'disconnect': 'Warning',
            'meme_mode': 'Performing Arts',
            'palette': 'Artist Palette'
        };
    }

    async init(jsonPath = 'emoji_mapping.json') {
        try {
            const response = await fetch(jsonPath);
            const data = await response.json();

            // Flatten the categories into a single map for O(1) lookup
            // Key will be lowercase name
            Object.values(data).forEach(categoryList => {
                categoryList.forEach(emoji => {
                    if (emoji.name && emoji.url) {
                        this.emojiMap.set(emoji.name.toLowerCase(), emoji.url);
                    }
                });
            });

            this.isReady = true;
            console.log(`EmojiManager initialized with ${this.emojiMap.size} animated emojis.`);

            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('emojimanager-ready'));

        } catch (e) {
            console.error('Failed to load emoji mapping:', e);
        }
    }

    /**
     * Get the HTML image tag for an emoji by name.
     * @param {string} name - The name of the emoji (e.g., "Snowflake", "Red Heart")
     * @param {string} style - Additional styles
     * @returns {string} HTML string or original name if not found/not ready
     */
    getImg(name, style = "vertical-align: middle; height: 1.2em; width: auto; display: inline-block;") {
        if (!name) return '';
        if (!this.isReady) return name; // Fallback to text if not loaded yet

        const key = name.toLowerCase();
        let url = this.emojiMap.get(key);

        // Try mapping if not found directly
        if (!url && this.keywordMapping[key]) {
            url = this.emojiMap.get(this.keywordMapping[key].toLowerCase());
        }

        if (url) {
            return `<img src="${url}" alt="${name}" class="animated-emoji" style="${style}">`;
        }
        return name;
    }

    /**
     * Get just the URL for an emoji
     */
    getUrl(name) {
        if (!this.isReady || !name) return null;
        const key = name.toLowerCase();
        let url = this.emojiMap.get(key);

        if (!url && this.keywordMapping[key]) {
            url = this.emojiMap.get(this.keywordMapping[key].toLowerCase());
        }
        return url;
    }
}

// Initialize globally
window.emojiManager = new EmojiManager();
window.emojiManager.init();
