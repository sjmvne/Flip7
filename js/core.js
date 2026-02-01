        // ===== GAME ENGINE =====
        const qs = (s) => document.querySelector(s);


        function createDeck() {
            const d = [];
            for (let v = 0; v <= 12; v++) { const c = v === 0 ? 1 : v; for (let i = 0; i < c; i++) d.push({ type: 'number', value: v }); }
            ['freeze', 'flip3', 'second_chance'].forEach(v => { for (let i = 0; i < 3; i++) d.push({ type: 'action', value: v }) });
            ['+2', '+4', '+6', '+8', '+10', 'x2'].forEach(v => d.push({ type: 'modifier', value: v }));
            return shuffle(d);
        }
        function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

        // ===== PREMIUM EFFECTS =====
        // Sound Effects using Howler.js (using Web Audio API synth for lightweight sounds)
        // GLOBAL GAME STATE
        window.GAME_STATE = { memeMode: false };

        // Sound Effects using Howler.js


        // Confetti Effects
        function fireConfetti(type = 'default') {
            if (typeof confetti === 'undefined') return;

            // Only fire for specific types if I am involved (checked at call site)
            if (type === 'flip7') {
                // Rainbow explosion for Flip 7!
                const duration = 3000;
                const end = Date.now() + duration;
                (function frame() {
                    confetti({
                        particleCount: 7, angle: 60, spread: 55, origin: { x: 0 },
                        colors: ['#A78BFA', '#C084FC', '#fbbf24', '#22c55e', '#3b82f6']
                    });
                    confetti({
                        particleCount: 7, angle: 120, spread: 55, origin: { x: 1 },
                        colors: ['#A78BFA', '#C084FC', '#fbbf24', '#22c55e', '#3b82f6']
                    });
                    if (Date.now() < end) requestAnimationFrame(frame);
                })();
            } else if (type === 'win') {
                // Victory celebration
                confetti({
                    particleCount: 150, spread: 180, origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#FF6347', '#A78BFA']
                });
            } else if (type === 'round') {
                // Subtle round start
                confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 }, gravity: 1.5 });
            }
        }



        function getRandAsset(key) {
            const arr = ASSETS_COLLECTIONS[key];
            return arr ? arr[Math.floor(Math.random() * arr.length)] : (ASSETS[key] || '');
        }

        let lastReactTime = 0; // Cooldown tracker

        let peer = null, conns = [], isHost = false, myId = '', myName = '', roomId = '';
        window.state = {
                phase: 'lobby',
                round: 1,
                deck: [],
                players: [],
                discards: [],
                dealer: 0,
                turn: 0,
                last: null,
                pending: null,
                history: [],
                memeMode: false,
                // New Logic States
                dealingPhase: false,
                dealIndex: 0,
                turnOrder: [],
                flip3Queue: []
            };
            // Local state to track rendered cards and avoid re-animations
            let localPlayerCardCounts = {},
            localAnimatingCards = {},
            renderedPlayerIds = new Set(); // Track displayed players for animation

        let localLastToastId = 0;

        // ========== STATS DASHBOARD (READ-ONLY TRACKING) ==========
        let gameStats = {
            players: [], // Will be populated with PlayerStats objects
            rounds: 0,
            totalCardsDealt: 0,
            flip7Total: 0,
            actionTypes: { freeze: 0, flip3: 0, secondChance: 0 }
        };

        let statsCharts = {}; // Store chart instances

        function initGameStats() {
            gameStats = {
                players: state.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    bust: 0,
                    stay: 0,
                    flip7: 0,
                    secondChance: 0,
                    totalCards: 0,
                    totalScore: 0,
                    rounds: []
                })),
                rounds: 0,
                totalCardsDealt: 0,
                flip7Total: 0,
                actionTypes: { freeze: 0, flip3: 0, secondChance: 0 }
            };
        }

        function getPlayerStats(playerId) {
            return gameStats.players.find(p => p.id === playerId);
        }

        // TRACKING FUNCTIONS (called passively from existing logic)
        function trackBust(playerId) {
            const ps = getPlayerStats(playerId);
            if (ps) ps.bust++;
        }

        function trackStay(playerId) {
            const ps = getPlayerStats(playerId);
            if (ps) ps.stay++;
        }

        function trackFlip7(playerId) {
            const ps = getPlayerStats(playerId);
            if (ps) ps.flip7++;
            gameStats.flip7Total++;
        }

        function trackSecondChance(playerId) {
            const ps = getPlayerStats(playerId);
            if (ps) ps.secondChance++;
            gameStats.actionTypes.secondChance++;
        }

        function trackCardDealt(playerId) {
            const ps = getPlayerStats(playerId);
            if (ps) ps.totalCards++;
            gameStats.totalCardsDealt++;
        }

        function trackAction(actionType) {
            if (gameStats.actionTypes[actionType] !== undefined) {
                gameStats.actionTypes[actionType]++;
            }
        }

        function trackRoundEnd() {
            gameStats.rounds++;
            state.players.forEach(p => {
                const ps = getPlayerStats(p.id);
                if (ps) {
                    ps.rounds.push(p.st === 'bust' ? 'bust' : p.pts);
                    ps.totalScore = p.tot;
                }
            });
        }

        // STATS SHEET CONTROLS
        function openStatsSheet() {
            document.getElementById('statsSheet').classList.add('open');
            renderStatsCharts();
        }

        function closeStatsSheet() {
            document.getElementById('statsSheet').classList.remove('open');
        }

        function toggleStatsSheet() {
            const sheet = document.getElementById('statsSheet');
            if (sheet.classList.contains('open')) {
                closeStatsSheet();
            } else {
                openStatsSheet();
                // Close sidebar if open (UX improvement)
                if (document.getElementById('leaderboardSidebar').classList.contains('active')) {
                    toggleSidebar('leaderboardSidebar');
                }
            }
        }

        // CHART RENDERING
        function renderStatsCharts() {
            if (!window.Chart) return; // Chart.js not loaded

            const playerColors = ['#FF6B35', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EC4899'];
            const playerNames = gameStats.players.map(p => p.name);

            // 1. LINE CHART - Cumulative Score
            const lineCtx = document.getElementById('chartLine');
            if (lineCtx) {
                if (statsCharts.line) statsCharts.line.destroy();
                const roundLabels = Array.from({ length: gameStats.rounds || 1 }, (_, i) => `R${i + 1}`);
                const datasets = gameStats.players.map((p, i) => {
                    let cumulative = 0;
                    const data = p.rounds.map(r => {
                        if (r !== 'bust') cumulative += r;
                        return cumulative;
                    });
                    return {
                        label: p.name,
                        data: data.length ? data : [0],
                        borderColor: playerColors[i % playerColors.length],
                        backgroundColor: playerColors[i % playerColors.length] + '33',
                        tension: 0.3,
                        fill: false
                    };
                });
                statsCharts.line = new Chart(lineCtx, {
                    type: 'line',
                    data: { labels: roundLabels.length ? roundLabels : ['R1'], datasets },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } },
                        scales: {
                            x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                        }
                    }
                });
            }

            // 2. BAR CHART - Actions per Player
            const barCtx = document.getElementById('chartBar');
            if (barCtx) {
                if (statsCharts.bar) statsCharts.bar.destroy();
                statsCharts.bar = new Chart(barCtx, {
                    type: 'bar',
                    data: {
                        labels: playerNames,
                        datasets: [
                            { label: 'Bust', data: gameStats.players.map(p => p.bust), backgroundColor: '#EF4444' },
                            { label: 'Stay', data: gameStats.players.map(p => p.stay), backgroundColor: '#10B981' },
                            { label: 'Flip7', data: gameStats.players.map(p => p.flip7), backgroundColor: '#8B5CF6' }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } },
                        scales: {
                            x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                        }
                    }
                });
            }

            // 3. DONUT CHART - Action Distribution
            const donutCtx = document.getElementById('chartDonut');
            if (donutCtx) {
                if (statsCharts.donut) statsCharts.donut.destroy();
                statsCharts.donut = new Chart(donutCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Freeze', 'Flip3', 'Second Chance', 'Flip7 Bonus'],
                        datasets: [{
                            data: [
                                gameStats.actionTypes.freeze,
                                gameStats.actionTypes.flip3,
                                gameStats.actionTypes.secondChance,
                                gameStats.flip7Total
                            ],
                            backgroundColor: ['#38BDF8', '#FBBF24', '#F87171', '#A78BFA']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } }
                    }
                });
            }

            // 4. HEATMAP (simplified as stacked bar) - Cards vs Outcome
            const heatCtx = document.getElementById('chartHeatmap');
            if (heatCtx) {
                if (statsCharts.heat) statsCharts.heat.destroy();
                statsCharts.heat = new Chart(heatCtx, {
                    type: 'bar',
                    data: {
                        labels: playerNames,
                        datasets: [
                            { label: 'Carte Pescate', data: gameStats.players.map(p => p.totalCards), backgroundColor: '#3B82F6' },
                            { label: 'Punti Totali', data: gameStats.players.map(p => p.totalScore), backgroundColor: '#10B981' }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } },
                        scales: {
                            x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                        }
                    }
                });
            }

            // 5. RADAR CHART - Performance vs Average
            const radarCtx = document.getElementById('chartRadar');
            if (radarCtx) {
                if (statsCharts.radar) statsCharts.radar.destroy();
                const avgBust = gameStats.players.reduce((a, p) => a + p.bust, 0) / (gameStats.players.length || 1);
                const avgStay = gameStats.players.reduce((a, p) => a + p.stay, 0) / (gameStats.players.length || 1);
                const avgCards = gameStats.players.reduce((a, p) => a + p.totalCards, 0) / (gameStats.players.length || 1);
                const avgScore = gameStats.players.reduce((a, p) => a + p.totalScore, 0) / (gameStats.players.length || 1);

                const datasets = gameStats.players.map((p, i) => ({
                    label: p.name,
                    data: [p.bust, p.stay, p.totalCards / 10, p.totalScore / 20, p.flip7],
                    borderColor: playerColors[i % playerColors.length],
                    backgroundColor: playerColors[i % playerColors.length] + '44'
                }));

                statsCharts.radar = new Chart(radarCtx, {
                    type: 'radar',
                    data: {
                        labels: ['Bust', 'Stay', 'Carte/10', 'Punti/20', 'Flip7'],
                        datasets
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } },
                        scales: {
                            r: {
                                angleLines: { color: 'rgba(255,255,255,0.2)' },
                                grid: { color: 'rgba(255,255,255,0.1)' },
                                pointLabels: { color: '#aaa' },
                                ticks: { display: false }
                            }
                        }
                    }
                });
            }
        }

        // END-GAME STATS RENDER
        function renderEndgameStats(container) {
            if (!window.Chart || !container) return;

            container.innerHTML = `
                <h3>📊 Statistiche Finali</h3>
                <div class="stats-grid">
                    <div class="chart-card full-width"><h4>📈 Punteggio Cumulativo</h4><canvas id="endChartLine"></canvas></div>
                    <div class="chart-card"><h4>📊 Azioni per Giocatore</h4><canvas id="endChartBar"></canvas></div>
                    <div class="chart-card"><h4>🎯 Distribuzione Azioni</h4><canvas id="endChartDonut"></canvas></div>
                    <div class="chart-card"><h4>⚖️ Carte vs Punti</h4><canvas id="endChartHeatmap"></canvas></div>
                    <div class="chart-card"><h4>🕸️ Performance Radar</h4><canvas id="endChartRadar"></canvas></div>
                </div>
            `;

            // Re-render simplified charts
            setTimeout(() => {
                const playerColors = ['#FF6B35', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EC4899'];
                const playerNames = gameStats.players.map(p => p.name);
                const roundLabels = Array.from({ length: gameStats.rounds || 1 }, (_, i) => `R${i + 1}`);

                // Line
                const lineData = gameStats.players.map((p, i) => {
                    let cum = 0;
                    return {
                        label: p.name,
                        data: p.rounds.map(r => { if (r !== 'bust') cum += r; return cum; }),
                        borderColor: playerColors[i % playerColors.length],
                        tension: 0.3, fill: false
                    };
                });
                new Chart(document.getElementById('endChartLine'), {
                    type: 'line',
                    data: { labels: roundLabels.length ? roundLabels : ['R1'], datasets: lineData },
                    options: {
                        responsive: true, plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } },
                        scales: { x: { ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa' } } }
                    }
                });

                // Bar
                new Chart(document.getElementById('endChartBar'), {
                    type: 'bar',
                    data: {
                        labels: playerNames,
                        datasets: [
                            { label: 'Bust', data: gameStats.players.map(p => p.bust), backgroundColor: '#EF4444' },
                            { label: 'Stay', data: gameStats.players.map(p => p.stay), backgroundColor: '#10B981' }
                        ]
                    },
                    options: { responsive: true, plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } } }
                });

                // Donut
                new Chart(document.getElementById('endChartDonut'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Freeze', 'Flip3', 'Second Chance', 'Flip7'],
                        datasets: [{ data: [gameStats.actionTypes.freeze, gameStats.actionTypes.flip3, gameStats.actionTypes.secondChance, gameStats.flip7Total], backgroundColor: ['#38BDF8', '#FBBF24', '#F87171', '#A78BFA'] }]
                    },
                    options: { responsive: true, plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } } }
                });

                // Heatmap (Stacked Bar)
                new Chart(document.getElementById('endChartHeatmap'), {
                    type: 'bar',
                    data: {
                        labels: playerNames,
                        datasets: [
                            { label: 'Carte Pescate', data: gameStats.players.map(p => p.totalCards), backgroundColor: '#3B82F6' },
                            { label: 'Punti Totali', data: gameStats.players.map(p => p.totalScore), backgroundColor: '#10B981' }
                        ]
                    },
                    options: {
                        responsive: true, plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } },
                        scales: { x: { ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa' } } }
                    }
                });

                // Radar
                const radarDatasets = gameStats.players.map((p, i) => ({
                    label: p.name,
                    data: [p.bust, p.stay, p.totalCards / 10, p.totalScore / 20, p.flip7],
                    borderColor: playerColors[i % playerColors.length],
                    backgroundColor: playerColors[i % playerColors.length] + '44'
                }));
                new Chart(document.getElementById('endChartRadar'), {
                    type: 'radar',
                    data: {
                        labels: ['Bust', 'Stay', 'Carte/10', 'Punti/20', 'Flip7'],
                        datasets: radarDatasets
                    },
                    options: {
                        responsive: true, plugins: { legend: { labels: { usePointStyle: true, color: '#fff' } } },
                        scales: {
                            r: {
                                angleLines: { color: 'rgba(255,255,255,0.2)' },
                                grid: { color: 'rgba(255,255,255,0.1)' },
                                pointLabels: { color: '#aaa' },
                                ticks: { display: false }
                            }
                        }
                    }
                });
            }, 100);
        }
        // ========== END STATS DASHBOARD ==========


        function toggleSidebar(id) {
            const el = document.getElementById(id);
            const wasActive = el.classList.contains('active');

            // Close others
            document.querySelectorAll('.sidebar').forEach(s => {
                if (s.id !== id) s.classList.remove('active');
            });

            if (wasActive) {
                el.classList.remove('active');
                SFX.play('slide_out');
            } else {
                el.classList.add('active');
                SFX.play('slide_in');
            }
        }

        // Close sidebars on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar') && !e.target.closest('.sidebar-tab')) {
                const activeSidebars = document.querySelectorAll('.sidebar.active');
                if (activeSidebars.length > 0) {
                    SFX.play('slide_out');
                    activeSidebars.forEach(s => s.classList.remove('active'));
                }
            }
        });

        function addToHistory(text, type = 'normal') {
            if (!isHost) return; // Only host manages history state
            state.history.unshift({ t: text, type: type, time: Date.now() });
            if (state.history.length > 15) state.history.pop(); // Keep last 15
            sync(); updateGame();
        }

        function initPeer(id) {
            return new Promise((res, rej) => {
                peer = new Peer(id, { debug: 1 });
                peer.on('open', res); peer.on('error', rej);
                peer.on('connection', c => {
                    c.on('open', () => {
                        conns.push(c);
                        c.on('data', d => handleMsg(c, d));
                        c.on('close', () => {
                            conns = conns.filter(x => x != c);
                            // Handle Disconnect
                            if (isHost) {
                                const pIndex = state.players.findIndex(x => x.id === c.peer);
                                if (pIndex > -1) {
                                    const p = state.players[pIndex];

                                    // FIX: Different behavior for Lobby vs Game
                                    if (state.phase === 'lobby') {
                                        state.players.splice(pIndex, 1);
                                        bc({ t: 'state', s: serState() }); // Sync removal
                                        updateLobby();
                                        showToast(`👋 ${p.name} ha lasciato la stanza.`);
                                    } else {
                                        p.isOffline = true;
                                        bc({ t: 'broadcast_toast', type: 'disconnect', from: p.name });
                                        showToast(`⚠️ ${p.name} si è disconnesso!`);

                                        // TRIGGER AUTO-STAY if it's their turn
                                        const activePIdx = state.players.findIndex(pl => pl.id === p.id || pl.name === p.name);
                                        if (activePIdx > -1 && state.turn === activePIdx && p.st === 'active') {
                                            showToast(`Auto-Stay per disconnessione...`);
                                            setTimeout(() => {
                                                const currentP = state.players.find(x => x.name === p.name);
                                                if (currentP && currentP.isOffline && state.turn === activePIdx && currentP.st === 'active') {
                                                    handleAct(currentP.id, 'stay');
                                                }
                                            }, 1000);
                                        }

                                        sync(); updateGame();
                                    }
                                }
                            }
                        });
                    });
                });
            });
        }



        function handleMsg(c, d) {
            if (d.t === 'join' && isHost) {
                // VALIDATION: Check Limit (18 Players Max)
                if (state.players.length >= 18) {
                    // Check if it's a rejoin (allowed)
                    const isRejoin = state.players.some(p => p.name === d.name && p.isOffline);
                    if (!isRejoin) {
                        c.send({ t: 'error', msg: 'Stanza piena (Max 18)!' });
                        return;
                    }
                }

                // VALIDATION: Check Duplicate Name relative to ONLINE players
                // If player exists but is OFFLINE, they can rejoin.
                // If player exists and is ONLINE, it's a duplicate -> Error.
                const existingP = state.players.find(p => p.name === d.name);

                if (existingP && !existingP.isOffline) {
                    // DUPLICATE ERROR
                    c.send({ t: 'error', msg: 'Nome già in uso nella stanza!' });
                    return;
                }

                if (existingP && existingP.isOffline) {
                    // REJOIN LOGIC
                    existingP.id = c.peer; // Update Peer ID
                    existingP.isOffline = false; // Mark Online


                    // Notify everyone
                    bc({ t: 'broadcast_toast', type: 'rejoin', from: d.name });
                    bc({ t: 'sfx', id: 'user_join' }); // Join Sound
                    showToast(`👋 ${d.name} si è riconnesso!`);

                    bc({ t: 'state', s: serState() });
                    updateLobby();
                } else {
                    // New Player
                    state.players.push({ id: c.peer, name: d.name, cards: [], mods: [], nums: [], pts: 0, tot: 0, st: 'active', sc: false, isOffline: false });
                    bc({ t: 'sfx', id: 'user_join' }); // Join Sound
                    bc({ t: 'state', s: serState() });
                    updateLobby();
                }
            } else if (d.t === 'error') {
                showToast(`⚠️ ${d.msg}`);
                // Optional: Reset Login/Join Button?
                qs('#btnJoinRoom').innerText = 'Entra nella Stanza';
                qs('#btnJoinRoom').disabled = false;
                // User requested return to home on error
                setTimeout(() => {
                    window.location.href = window.location.origin + window.location.pathname;
                }, 2000);
            } else if (d.t === 'state') {
                desState(d.s);
                // Always update lobby if in lobby phase (fixes joiner visibility)
                if (state.phase === 'lobby') {
                    updateLobby();
                } else {
                    // REJOIN FIX: If state says game but we are in lobby, force switch
                    if (qs('#lobby').style.display !== 'none') {
                        qs('#lobby').style.display = 'none';
                        qs('#headerGameStatus').style.display = 'flex';
                        // Ensure headers are correct
                        qs('#turnName').innerText = state.players[state.turn]?.name || '-';
                    }
                    updateGame();
                }
            }
            else if (d.t === 'act' && isHost) handleAct(c.peer, d.a, d.tgt);
            else if (d.t === 'reaction' && isHost) {
                // Host receives reaction request from client
                // Find who sent it? c.peer is the ID.
                const pId = c.peer;
                bc({ t: 'reaction', who: pId, id: d.id });
                showReaction(pId, d.id);
            }
            else if (d.t === 'reaction' && !isHost) showReaction(d.who, d.id);
            else if (d.t === 'splash') showCardSplash(d.a, d.who);
            else if (d.t === 'start') startGame();
            else if (d.t === 'restart') {
                // Client handles restart from host
                qs('#endGameOverlay').style.display = 'none';
                qs('#flip7Overlay').style.display = 'none';
                qs('#recapOverlay').classList.remove('active');
                showToast('🎮 Nuova partita iniziata!');
            }
            else if (d.t === 'broadcast_toast') {
                // All clients show the broadcast toast
                showBroadcastToast(d.type, d.from, d.target);
            }
            // FIX 1: Handle SC burn when alone broadcast
            else if (d.t === 'sc_burn_alone') {
                showSCBurnAloneSplash(d.who);
            }
            // FIX 8: Handle smoke broadcast for bust
            else if (d.t === 'smoke') {
                spawnSmokeOnPlayer(d.who);
            }
            // FIX: Broadcast SFX
            else if (d.t === 'sfx') {
                SFX.play(d.id, d.v); // Pass variant
            }
            // NEW: Match End logic for Winner/Loser sounds
            else if (d.t === 'match_end') {
                if (d.winner === myId) SFX.play('win_match');
                else SFX.play('lose_match');
            }
            // NEW: MEME MODE SYNC
            else if (d.t === 'meme_mode') {
                state.memeMode = d.val;
                updateLobby();

                // Sound & Enhanced Toast
                new Howl({ src: ['assets/sounds/meme_mode/he he yeah boy.mp3'] }).play();

                if (d.val) {
                    showBroadcastToast('meme_mode', d.from || 'Host', null); // Reuse broadcast toast if possible or just custom
                    //  showToast("🎭 MEME MODE ATTIVATA!"); 
                } else {
                    showToast("Meme Mode disattivata.");
                }
            }
        }

        function bc(d) { conns.forEach(c => c.send(d)); }
        function sendHost(d) { if (conns[0]) conns[0].send(d); }
        function serState() { return { ...state, players: state.players.map(p => ({ ...p, nums: Array.from(p.nums || []) })), gameStats: gameStats }; }
        function desState(s) { state = { ...s, players: s.players.map(p => ({ ...p, nums: new Set(p.nums || []) })) }; if (s.gameStats) gameStats = s.gameStats; }

        // === REACTION SYSTEM ===
        function showReaction(pId, rId) {
            const pIdx = state.players.findIndex(p => p.id === pId);
            if (pIdx < 0) return;
            const zone = qs(`#pzone-${pIdx}`);
            if (!zone) return;

            const rData = REACTIONS.find(r => r.id === rId);
            if (!rData) return;

            // Target the reaction-overlay inside modifiers-row
            let overlay = zone.querySelector('.reaction-overlay');
            if (!overlay) {
                // Fallback to floating if overlay not found
                overlay = zone;
            }

            // Special Handling for STOP (Stay)
            if (rId === 'stop') {
                const stopsEl = document.createElement('div');
                stopsEl.innerHTML = `<img src="${rData.src}" style="height:40px; filter:drop-shadow(0 0 5px green); animation: popIn 0.3s ease-out;">`;
                // Append directly to overlay (flex container) so it sits next to other icons
                // ensure overlay is the flex container
                if (overlay.classList.contains('reaction-overlay')) {
                    overlay.appendChild(stopsEl);
                    // Remove after sometime? Or keep it? 
                    // "Quando un player si ferma... visualizziamo l'APNG"
                    // If it's the 'Stop' SIGN, it might be transient.
                    // But if they stay, they stay. 
                    // Let's make it transient as it's a "Reaction". 
                    // Permanent status is handled by badges/border/opacity.
                    setTimeout(() => stopsEl.remove(), 3000);
                } else {
                    // Fallback if overlay not found (floating)
                    stopsEl.style.cssText = `position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); z-index:100; pointer-events:none; animation: fadePop 3s ease-out;`;
                    overlay.appendChild(stopsEl);
                    setTimeout(() => stopsEl.remove(), 3000);
                }
                SFX.play('click');
                return;
            }

            // Standard reactions: use floating side messages
            const player = state.players.find(p => p.id === pId);
            const playerName = player ? player.name : 'Giocatore';
            showFloatingReaction(playerName, rData);
            SFX.play('user_reaction'); // Pop sound
        }

        // Floating reaction message from the side
        function showFloatingReaction(playerName, rData) {
            const el = document.createElement('div');
            el.className = 'floating-reaction';
            el.innerHTML = `<strong>${playerName}:</strong> <img src="${rData.src}" style="height:32px;">`;

            // Stack multiple reactions
            const existingCount = document.querySelectorAll('.floating-reaction').length;
            el.style.top = `${120 + existingCount * 60}px`;

            document.body.appendChild(el);
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transform = 'translateX(100px)';
                el.style.transition = 'all 0.3s ease-out';
                setTimeout(() => el.remove(), 300);
            }, 2500);
        }

        // Global Toggle Function for Reaction Picker (Used by main button and Recap button)
        window.toggleReactionPicker = (e) => {
            if (e) e.stopPropagation();
            const p = qs('#reactionPicker');
            if (!p) return;

            const isVis = p.style.display === 'grid';
            p.style.display = isVis ? 'none' : 'grid';
            setTimeout(() => p.style.opacity = isVis ? 0 : 1, 10);
            SFX.play(isVis ? 'popup_close' : 'popup_open');
        };

        // NEW: Toggle for Recap Picker
        window.toggleRecapPicker = (e) => {
            if (e) e.stopPropagation();
            const p = qs('#recapReactionPicker');
            if (!p) return;
            const isVis = p.style.display === 'grid';
            p.style.display = isVis ? 'none' : 'grid';
            SFX.play(isVis ? 'popup_close' : 'popup_open');
        };

        function initReactions() {
            const p = qs('#reactionPicker');
            if (!p) return;
            p.innerHTML = REACTIONS.map(r => `
                <div class="reaction-opt" onclick="sendReaction('${r.id}')" style="cursor:pointer; padding:5px; border-radius:8px; display:flex; justify-content:center; align-items:center; transition:transform 0.2s;">
                    <img src="${r.src}" style="width:32px; height:32px; pointer-events:none;">
                </div>
            `).join('');

            p.querySelectorAll('.reaction-opt').forEach(el => {
                el.onmouseenter = () => el.style.transform = 'scale(1.2)';
                el.onmouseleave = () => el.style.transform = 'scale(1)';
            });

            const btn = qs('#btnReact');
            if (btn) btn.onclick = window.toggleReactionPicker;

            // Close picker when clicking outside
            document.addEventListener('click', (e) => {
                if (!p.contains(e.target) && e.target !== btn && !e.target.closest('#btnReact') && !e.target.closest('.btn-recap-react')) {
                    p.style.opacity = 0;
                    setTimeout(() => p.style.display = 'none', 200);
                }
            });
        }



        // SESSION PERSISTENCE HELPERS
        function saveSession(nick, room) {
            if (nick) localStorage.setItem('flip7_nick', nick);
            if (room) localStorage.setItem('flip7_room', room);
        }

        function loadSession() {
            const n = localStorage.getItem('flip7_nick');
            const r = localStorage.getItem('flip7_room');
            if (n) qs('#nickname').value = n;
            return { n, r };
        }

        window.addEventListener('load', loadSession);

        function sendReaction(id) {
            if (Date.now() - lastReactTime < 3000) return;
            lastReactTime = Date.now();

            qs('#reactionPicker').style.display = 'none';
            const btn = qs('#btnReact');
            btn.style.transform = 'scale(0.8) grayscale(1)';
            setTimeout(() => btn.style.transform = '', 3000);

            if (isHost) {
                bc({ t: 'reaction', who: myId, id });
                showReaction(myId, id);
            } else {
                sendHost({ t: 'reaction', id });
            }
        }

        // Defer init
        setTimeout(initReactions, 500);

        // Stats Button Click Handler
        setTimeout(() => {
            const statsBtn = qs('#btnStats');
            if (statsBtn) statsBtn.onclick = toggleStatsSheet;
        }, 500);

        function showCardSplash(type, who) {
            const overlay = document.createElement('div');
            overlay.className = 'action-splash';
            document.body.appendChild(overlay);

            // Use getRandAsset to pick varied 3D emojis
            // If type is a URL (from showCardSplash call), use it directly.
            // If type is a key (bust, flip7), use getRandAsset.
            // MOD: Use Flip7 Logo for star/flip7
            const src = (type === 'star' || type === 'flip7') ? 'assets/Flip7 Logo.webp' : (type.startsWith('http') ? type : (getRandAsset(type) || ASSETS[type] || ASSETS.warning));

            let html = `<div class="card action" style="transform:scale(1.8); box-shadow:0 0 30px rgba(0,0,0,0.5); background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);">
                <img src="${src}" style="width:80%; height:auto; filter:drop-shadow(0 0 10px rgba(255,255,255,0.5));">
            </div>`;

            if (who && who !== myName) {
                const prettyNames = { 'freeze': 'Freeze', 'flip3': 'Flip 3', 'second_chance': 'Second Chance', 'bust': 'BUST!', 'hot': '2nd Chance!', 'star': 'FLIP 7!' };
                // If type is URL, default name
                const nameStr = prettyNames[type] || (type.startsWith('http') ? 'Evento!' : type.toUpperCase());

                html += `<div style="color:white; font-size:28px; margin-top:50px; text-shadow:0 2px 10px black; font-weight:800; text-align:center; animation:fadeIn 0.5s 0.3s both; background:rgba(0,0,0,0.4); padding:10px 20px; border-radius:15px; border:1px solid rgba(255,255,255,0.2);">
                    ${who} 
                    <div style="display:flex; align-items:center; justify-content:center; gap:8px; font-size:18px; font-weight:400; opacity:0.9; margin-top:5px;">
                        ${nameStr} 
                        <img src="${src}" style="height:24px;">
                    </div>
                </div>`;
            }
            overlay.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">${html}</div>`;

            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            }, 2000);
        }

        function spawnSmokeOnPlayer(pId) {
            const pIdx = state.players.findIndex(p => p.id === pId);
            if (pIdx < 0) return;
            const zone = qs(`#pzone-${pIdx}`);
            if (!zone) return;
            const rect = zone.getBoundingClientRect();
            const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

            for (let i = 0; i < 10; i++) {
                setTimeout(() => spawnSmoke(center.x, center.y), i * 80);
            }
        }

        function spawnSmoke(x, y) {
            const el = document.createElement('div');
            el.className = 'smoke-particle';
            const size = 30 + Math.random() * 50;
            el.style.width = `${size}px`; el.style.height = `${size}px`;
            const offX = (Math.random() - 0.5) * 80;
            const offY = (Math.random() - 0.5) * 50;
            el.style.left = `${x + offX}px`; el.style.top = `${y + offY}px`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2500);
        }

        qs('#btnCreateRoom').onclick = async () => {
            const n = qs('#nickname').value.trim();
            if (!n) { showToast('⚠️ Inserisci un nickname!'); return; }
            myName = n; roomId = 'flip7-' + Math.random().toString(36).substr(2, 6).toUpperCase();
            showToast('⏳ Creazione stanza...');
            try {
                await initPeer(roomId); isHost = true; myId = roomId;
                state.players.push({ id: myId, name: myName, cards: [], mods: [], nums: new Set(), pts: 0, tot: 0, st: 'active', sc: false });
                window.isCreatingRoom = true;
                window.location.hash = roomId; showRoom();
                showToast('✅ Stanza creata!');
            } catch (e) {
                console.error(e);
                showToast('❌ Errore creazione stanza');
            }
        };

        qs('#btnJoinRoom').onclick = async () => {
            const n = qs('#nickname').value.trim(), h = window.location.hash.slice(1);
            if (!n || !h?.startsWith('flip7-')) { showToast('⚠️ Inserisci nickname e codice stanza!'); return; }
            myName = n; roomId = h;
            try {
                await initPeer(); myId = peer.id;
                const c = peer.connect(roomId, { reliable: true });
                c.on('open', () => {
                    conns.push(c);
                    c.send({ t: 'join', name: myName });
                    c.on('data', d => handleMsg(c, d));

                    // HOST DISCONNECT HANDLER
                    c.on('close', () => {
                        SFX.play('disconnection');
                        // Block UI with Glassmorphism
                        qs('body').innerHTML = `
                             <div style="position:fixed; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle at center, #1e1b2e 0%, #000 100%); z-index:9999;">
                                <div class="glass" style="padding:40px; text-align:center; border-radius:24px; max-width:400px; animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
                                    <div style="font-size:64px; margin-bottom:20px; animation: pulseRed 2s infinite;">⚠️</div>
                                    <h1 style="font-size:28px; background:linear-gradient(to right, #f87171, #fca5a5); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:15px;">Host Disconnesso</h1>
                                    <p style="color:rgba(255,255,255,0.7); font-size:16px; line-height:1.5; margin-bottom:30px;">
                                        La connessione con l'host è stata interrotta.<br>La partita è terminata.
                                    </p>
                                    <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
                                        <div style="height:100%; background:#f87171; width:0%; animation: progressFill 5s linear forwards;"></div>
                                    </div>
                                    <p style="margin-top:10px; font-size:12px; color:rgba(255,255,255,0.4);">Ritorno alla home...</p>
                                </div>
                                <style>@keyframes progressFill { to { width: 100%; } }</style>
                             </div>`;
                        setTimeout(() => { window.location.hash = ''; window.location.reload(); }, 5000);
                    });
                });
                qs('#hostControls').style.display = 'none';
                qs('#roomInfo').style.display = 'block';
                qs('.room-link').style.display = 'none';
                qs('#playersList').innerHTML = '<div style="padding:10px">Connessione...</div>';
            } catch (e) { showToast('❌ Errore connessione'); }
        };


        function showRoom() {
            qs('#hostControls').style.display = 'none';
            qs('#roomInfo').style.display = 'block';
            const url = location.href;
            qs('#qrcode').innerHTML = '';
            new QRCode(qs('#qrcode'), { text: url, width: 128, height: 128 });
            updateLobby();
            SFX.play('popup_open');
        }

        // MEME MODE TOGGLE FUNCTION
        window.toggleMemeMode = () => {
            if (!isHost) return;
            state.memeMode = !state.memeMode;
            bc({ t: 'meme_mode', val: state.memeMode });
            updateLobby();

            if (state.memeMode) {
                new Howl({ src: ['assets/sounds/meme_mode/he he yeah boy.mp3'] }).play();
                showBroadcastToast('meme_mode', qs('#nickname').value || 'Host', null);
                // showToast("🎭 MEME MODE ATTIVATA!");
            } else {
                showToast("Meme Mode disattivata.");
            }
            SFX.play('click');
        };

        window.copyRoomLink = () => { navigator.clipboard.writeText(location.href); alert('Link copiato!'); };

        function updateLobby() {
            // CRITICAL: Ensure isHost is correct (if I am the owner of the roomId)
            if (roomId && myId && roomId === myId) isHost = true;

            // Ensure container is visible for joiners receiving updates
            qs('#roomInfo').style.display = 'block';
            if (!isHost) qs('.room-link').style.display = 'block'; // Now joiner can also invite others if they want

            qs('#playersList').innerHTML = state.players.map((p, i) => {
                const isBot = p.isBot;
                const icon = isBot ? '<img src="https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png" style="height:20px; vertical-align:middle; margin-left:5px;">' : '';
                return `<div class="player-item ${i === 0 ? 'host' : ''}">${p.name}${icon}${p.id === myId ? ' (Tu)' : ''} ${i === 0 ? '👑' : ''}</div>`
            }).join('');
            
            if (isHost) {
                qs('#btnAddBot').style.display = 'block';
                qs('#btnStartGame').style.display = state.players.length >= 2 ? 'block' : 'none';
            } else {
                qs('#btnAddBot').style.display = 'none';
                qs('#btnStartGame').style.display = 'none';
            }

            // UPDATE MEME SWITCH STATE
            const lobbySwitch = qs('#memeSwitchContainer');
            const lobbyCheck = qs('#memeCheckbox');

            if (lobbyCheck) lobbyCheck.checked = !!state.memeMode;

            if (lobbySwitch && lobbyCheck) {
                lobbySwitch.style.display = 'flex';

                if (isHost) {
                    lobbySwitch.style.opacity = '1';
                    lobbySwitch.style.pointerEvents = 'auto';
                    lobbySwitch.style.filter = 'none';
                    lobbySwitch.style.cursor = 'pointer';
                    lobbyCheck.disabled = false;
                } else {
                    lobbySwitch.style.opacity = '0.7';
                    lobbySwitch.style.pointerEvents = 'none'; // CRITICAL: Stop all clicks
                    lobbySwitch.style.filter = 'grayscale(0.3)';
                    lobbySwitch.style.cursor = 'default';
                    lobbyCheck.disabled = true; // Extra logical safety
                }
            }
        }

        qs('#btnStartGame').onclick = function () {
            if (this.disabled) return;
            this.disabled = true; // Prevent double click
            if (isHost) { bc({ t: 'start' }); startGame(); }
        };

        function startGame() {
            state.phase = 'game';
            state.round = 1;

            // HOST ONLY: Init Deck and Game Stats
            if (isHost) {
                state.deck = createDeck(); // First game always new deck
                state.discards = [];
                state.dealer = 0;
                initGameStats(); // Initialize stats tracking
            }

            resetRound();
            qs('#lobby').style.display = 'none';
            qs('#gameContainer').classList.add('active');

            // SHUFFLE ANIMATION (Visual for Everyone)
            const deckEl = qs('.deck');

            // Start Game Sound
            if (isHost) bc({ t: 'sfx', id: 'start' });
            SFX.play('start');

            if (deckEl) {
                deckEl.classList.add('shuffling');
                showToast("Mescolo le carte... 🔀");

                // Shuffle Sound
                // Shuffle Sound
                if (isHost) {
                    const v = SFX.getMemeVariant('shuffle');
                    bc({ t: 'sfx', id: 'shuffle', v: v });
                    SFX.play('shuffle', v);
                } else {
                    SFX.play('shuffle');
                }

                setTimeout(() => {
                    deckEl.classList.remove('shuffling');
                    // LOGIC: Only Host triggers the deal
                    if (isHost) dealInit();
                }, 5000); // 5 Seconds Shuffle
            } else {
                // Fallback if no deck element (rare)
                if (isHost) dealInit();
            }
        }

        function restartGame() {
            // Only host can restart
            if (!isHost) return;

            // Reset state but keep players connected
            state.phase = 'game';
            state.deck = createDeck();
            state.discards = [];
            state.round = 1;
            state.dealer = 0;
            state.players.forEach(p => { p.tot = 0; }); // Reset total scores

            // For restart, we DO reset the deck completely
            state.deck = createDeck();
            state.discards = [];

            resetRound();

            // Hide all overlays
            qs('#endGameOverlay').style.display = 'none';
            qs('#flip7Overlay').style.display = 'none';
            qs('#recapOverlay').classList.remove('active');

            // Broadcast restart to all players
            bc({ t: 'restart' });

            // Start new game
            dealInit();
            showToast('🎮 Nuova partita iniziata!');
        }

        function resetRound() {
            state.players.forEach(p => {
                p.cards = []; p.mods = []; p.nums = new Set(); p.pts = 0;
                p.st = 'active'; p.sc = false; p.frozen = false; p.flip3Active = false;
            });
            state.last = null; state.pending = null;
            state.dealingPhase = false; state.flip3Queue = [];
            state.dealingPhase = false; state.flip3Queue = [];
            state.dealingPaused = false; // FIX: Prevent race condition in deal loop
            state.flip3State = null; // FIX: Queue/Pause state for Flip3
            state.isShuffling = false; // Reset shuffle state
            localPlayerCardCounts = {}; // Reset local animation tracking
            qs('body').classList.remove('animation-blocked'); // Ensure UI is unlocked
        }

        function dealInit() {
            // Build Turn Order: Dealer+1 ... End, then 0 ... Dealer
            state.turnOrder = [];
            for (let i = 0; i < state.players.length; i++) {
                state.turnOrder.push((state.dealer + 1 + i) % state.players.length);
            }
            state.dealingPhase = true;
            state.dealIndex = 0;
            state.dealingPaused = false;

            dealLoop();
        }

        // ... dealLoop ...

        // ...

        function startFlip3Sequence(tgtIdx, fromIdx) {
            const tgt = state.players[tgtIdx];
            tgt.flip3Active = true;
            trackAction('flip3'); // Stats tracking

            // Auto Reaction Flip 3 (Anxiety!)
            showReaction(tgt.id, 'shock');
            bc({ t: 'reaction', who: tgt.id, id: 'shock' });

            // Set Context for queue processing
            state.flip3Context = { from: fromIdx, to: tgtIdx };

            // FIX: Initialize Global Flip3 State
            state.flip3State = { active: true, count: 0, targetIdx: tgtIdx, paused: false };

            sync(); updateGame();

            setTimeout(dealFlip3, 1500);
        }

        // CORE LOGIC: Recursive Flip 3 Deal with Pause support
        function dealFlip3() {
            if (!state.flip3State || !state.flip3State.active) return;
            if (state.flip3State.paused) return; // PAUSED

            // Check Pending (Double check to prevent race)
            if (state.pending) {
                state.flip3State.paused = true;
                return;
            }

            const tgtIdx = state.flip3State.targetIdx;
            const tgt = state.players[tgtIdx];

            // Meme Trigger: Start flipping
            if (state.flip3State.count === 0 && state.flip3State.active) {
                if (isHost && window.GAME_STATE && window.GAME_STATE.memeMode) {
                    const v = SFX.getMemeVariant('player_flipping3');
                    bc({ t: 'sfx', id: 'player_flipping3', v: v });
                    SFX.play('player_flipping3', v);
                } else if (!isHost) {
                    SFX.play('player_flipping3');
                }
            }

            if (state.flip3State.count < 3 && tgt.st === 'active') {
                const res = drawCard(tgtIdx, true); // true = isFlip3 context
                if (res === 'WAIT' || res === 'END') return;

                // CHECK PAUSE IMMEDIATELY AFTER DRAW
                // If drawCard triggered Freeze, state.pending is NOW true.
                if (state.pending) {
                    state.flip3State.paused = true;
                    // Do NOT increment count? 
                    // Wait, drawCard() already gave the card. The Freeze card counts as 1 of the 3 cards.
                    // Yes, Freeze IS a card.
                    state.flip3State.count++;
                    sync(); updateGame();
                    return; // Stop recursion. Resume will call dealFlip3 again.
                }

                state.flip3State.count++;
                sync(); updateGame();

                // Check Delay
                const isAction = state.last && state.last.type === 'action';
                const delay = isAction ? 3600 : 2200;

                setTimeout(dealFlip3, delay);
            } else {
                // Finished or busted (Handled in drawCard -> bust or below?)
                // If we are here, loop finished.
                // If tgt is active, it means Success.
                if (tgt.st === 'active') {
                    if (isHost && window.GAME_STATE && window.GAME_STATE.memeMode) {
                        const v = SFX.getMemeVariant('player_flipping3_success');
                        bc({ t: 'sfx', id: 'player_flipping3_success', v: v });
                        SFX.play('player_flipping3_success', v);
                    } else {
                        SFX.play('player_flipping3_success');
                    }
                }

                state.flip3State.active = false;
                tgt.flip3Active = false;
                state.flip3State = null;
                // Check logic queue via Global function
                processFlip3Queue();
            }
        }

        function dealLoop() {
            if (!state.dealingPhase) return;
            // FIX: Explicitly pause dealing if an action resolution is pending
            if (state.dealingPaused) return;

            // Block if animation is active
            if (qs('body').classList.contains('animation-blocked')) {
                setTimeout(dealLoop, 200);
                return;
            }
            if (state.pending) return;

            if (state.dealIndex >= state.players.length) {
                // Done Dealing
                state.dealingPhase = false;
                // Find first ACTIVE player to start turn (skip frozen/stayed)
                let startTurn = (state.dealer + 1) % state.players.length;
                let attempts = 0;
                while (state.players[startTurn].st !== 'active' && attempts < state.players.length) {
                    startTurn = (startTurn + 1) % state.players.length;
                    attempts++;
                }
                state.turn = startTurn;

                state.globalToast = { id: Date.now(), msg: "Inizia il round!" };
                sync(); updateGame();
                return;
            }

            const pIdx = state.turnOrder[state.dealIndex];
            const p = state.players[pIdx];

            // Deal card
            if (p.st === 'active') {
                const res = drawCard(pIdx);
                if (res === 'WAIT' || res === 'END') return;

                // MEME MODE HIT SOUND
                // If simple number card (and not modifier/action handling below), we play sound here?
                // drawCard handles 'number' logic.
                // If we want specific HIT sound vs generic DEAL sound:
                // 'deal' is usually the sliding sound. 'hit' is the player decision.
                // Here, we are in dealLoop, which services 'Hit'. 
                // But wait, dealLoop ALSO services the initial 1 card deal.
                // If state.dealIndex < state.players.length * 1 (initial deal), maybe keep quiet or simple deal.
                // If round is > 0 or after initial deal?

                // Actually, 'handleAct' calls 'dealLoop'. 
                // Let's check if this is an 'action' result or just a card.
                // For Meme Mode, we want every card dealt (that isn't a special event) to potentially trigger a sound?
                // Or just when a player explicitly HITs?
                // User said: "Hit button should trigger specific SFX".
                // The Hit button sends 'act: hit' -> handleAct -> dealLoop.

                // Let's add sound logic inside drawCard or here.
                // Here is safer to coordinate with 'deal' sound.

                if (window.GAME_STATE && window.GAME_STATE.memeMode) {
                    // If it's a number card (not mod/action), play a 'hit' meme sound
                    // Modifiers are handled in drawCard? No, logic is there.
                    // state.last is the card just drawn.
                    if (state.last && state.last.type === 'number') {
                        const v = SFX.getMemeVariant('hit');
                        bc({ t: 'sfx', id: 'hit', v: v }); // Broadcast exact variant
                        SFX.play('hit', v);
                    } else {
                        // Modifiers/Actions will likely have their own sounds in drawCard or below?
                        // Currently they default to 'deal' if not caught.
                        // Let's play standard deal for them if no specific logic overrides.
                        SFX.play('deal');
                    }
                } else {
                    // Normal mode
                    SFX.play('deal');
                }

                // Synchronous Pending or Flip 3 Sequence
                if (state.pending || (state.players.some(x => x.flip3Active))) {
                    state.dealIndex++;
                    // Do not schedule recursion. Action resolution will handle it.
                    return;
                }
            }

            state.dealIndex++;
            // Async Action safeguard (Freeze splash delay ~2.5s)
            const isAction = state.last && state.last.type === 'action';
            const delay = isAction ? 2600 : 900;
            setTimeout(dealLoop, delay);
        }

        function showCardSplash(type, who = null) {
            // BLOCK UI FOR EVERYONE
            qs('body').classList.add('animation-blocked');

            const overlay = document.createElement('div');
            overlay.className = 'action-splash';

            let html = `<div class="card action" style="transform:scale(1.8); box-shadow:0 0 30px rgba(0,0,0,0.5); background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);">
                <img src="${ASSETS[type] || ASSETS.warning}" style="width:80%; height:auto; filter:drop-shadow(0 0 10px rgba(255,255,255,0.5));">
            </div>`;

            if (who && who !== myName) {
                const prettyNames = { 'freeze': 'Freeze', 'flip3': 'Flip 3', 'second_chance': 'Second Chance' };
                html += `<div style="color:white; font-size:28px; margin-top:50px; text-shadow:0 2px 10px black; font-weight:800; text-align:center; animation:fadeIn 0.5s 0.3s both; background:rgba(0,0,0,0.4); padding:10px 20px; border-radius:15px; border:1px solid rgba(255,255,255,0.2);">
                    ${who} 
                    <div style="display:flex; align-items:center; justify-content:center; gap:8px; font-size:18px; font-weight:400; opacity:0.9; margin-top:5px;">
                        ha pescato ${prettyNames[type] || type}! 
                        <img src="${ASSETS[type]}" style="height:24px;">
                    </div>
                </div>`;
            }
            overlay.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">${html}</div>`;

            document.body.appendChild(overlay);

            // Duration Logic
            let duration = 2000;
            if (window.GAME_STATE && window.GAME_STATE.memeMode) {
                if (['star', 'flip7', 'second_chance'].includes(type)) {
                    duration = 10000;
                }
                // Also modifiers splash? If we splash them?
                // Currently modifiers don't splash, only actions.
            }

            // Animation styles for splash
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.background = 'rgba(0,0,0,0.6)';
            overlay.style.zIndex = '5000';
            overlay.style.backdropFilter = 'blur(5px)';
            overlay.style.animation = 'fadeIn 0.3s forwards';

            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    qs('body').classList.remove('animation-blocked');
                }, 300);
            }, duration); // Dynamic duration
        }

        // Helper for Buttons - reset 3D state
        function resetButton(btn) {
            btn.classList.add('clicked');
            btn.blur(); // Force release of :active/:focus state
            setTimeout(() => btn.classList.remove('clicked'), 150);
        }

        function applyCooldown() {
            const btnHit = qs('#btnHit');
            const btnStay = qs('#btnStay');
            btnHit.classList.add('btn-cooldown');
            btnStay.classList.add('btn-cooldown');
            setTimeout(() => {
                btnHit.classList.remove('btn-cooldown');
                btnStay.classList.remove('btn-cooldown');
            }, 1000);
        }

        let lastClickTime = 0;
        qs('#btnHit').onclick = function () {
            if (state.dealingPhase) { showToast("Attendi la distribuzione..."); return; }
            if (Date.now() - lastClickTime < 1000) return; // Rate Limit 1s
            lastClickTime = Date.now();
            resetButton(this);
            applyCooldown();
            isHost ? handleAct(myId, 'hit') : sendHost({ t: 'act', a: 'hit' });
        };
        qs('#btnStay').onclick = function () {
            if (state.dealingPhase) { showToast("Attendi la distribuzione..."); return; }
            if (Date.now() - lastClickTime < 1000) return; // Rate Limit 1s
            lastClickTime = Date.now();
            resetButton(this);
            applyCooldown();
            isHost ? handleAct(myId, 'stay') : sendHost({ t: 'act', a: 'stay' });
        };

        function renderCard(c, isNew = false, p = null) {
            let src = '';
            // Optimization for images - ensure no spaces in path
            const path = 'assets/cards/';

            if (c.type === 'number') src = `${path}number_${c.value}.webp`;
            else if (c.type === 'modifier') src = `${path}modifier_${c.value}.webp`;
            else if (c.type === 'action') src = `${path}action_${c.value}.webp`;
            else if (c.type === 'back' || !src) src = `${path}back.webp`; // Handle back/fallback if needed

            const bustClass = c.isBustCause ? 'bust-cause' : '';
            const newClass = isNew ? 'fly-in' : '';

            // Advanced Animations
            const isBounce = isNew && c.type === 'number' && c.value >= 8;
            const isShiny = c.type === 'action' || (c.type === 'number' && c.value >= 10) || (c.type === 'modifier' && c.value === 'x2'); // Shiny for Actions, high cards, x2

            let extra = '';
            if (isBounce) extra += ' bounce';
            if (isShiny) extra += ' shiny';

            if (c.isBustCause && p && p.bustTime && Date.now() - p.bustTime < 600) extra += ' bust-shake';
            if (p && p.scBurn) {
                if (c.value === 'second_chance' || c.isBustCause) extra += ' burning';
            }

            return `<img src="${src}" class="card ${c.type} ${bustClass} ${newClass}${extra}" alt="${c.value}">`;
        }
        function drawCard(idx) {
            if (state.isShuffling) return 'WAIT';

            if (!state.deck.length) {
                if (state.discards.length) {
                    state.isShuffling = true;
                    state.globalToast = { id: Date.now(), msg: "Mescolo gli scarti... 🔀 (5s)" };

                    // Visuals on Host immediately
                    const deckEl = qs('.deck');
                    if (deckEl) deckEl.classList.add('shuffling');

                    sync(); updateGame();

                    setTimeout(() => {
                        state.deck = shuffle([...state.discards]);
                        state.discards = [];
                        state.isShuffling = false;
                        if (deckEl) deckEl.classList.remove('shuffling');

                        // Resume Logic
                        if (state.dealingPhase) dealLoop();
                        else if (state.flip3State && state.flip3State.active) dealFlip3();
                        else handleAct(idx, 'hit');

                        sync(); updateGame();
                    }, 5000);

                    return 'WAIT';
                } else {
                    endRound(); return 'END';
                }
            }
            const p = state.players[idx], c = state.deck.pop(); state.last = c;

            // FLIP 3 FIX: If player is in Flip 3 loop, actions don't interrupt
            const isFlip3 = p.flip3Active;

            if (c.type === 'number') {
                if (p.nums.has(c.value)) {
                    // SECOND CHANCE LOGIC
                    if (p.sc) {
                        // Show the card first!
                        c.isBustCause = true; // Highlight red
                        p.cards.push(c);

                        // Consume SC flag but keep badge for a moment? 
                        // Actually, let's keep p.sc true for a split second so badge shows, then remove.
                        // Wait... if I keep p.sc true, next draw might trigger again? 
                        // No, we are inside the 'bust' branch. We won't draw again immediately.
                        // Logic:
                        // Move sc_burn here for immediate feedback
                        if (isHost) {
                            const v = SFX.getMemeVariant('sc_burn');
                            bc({ t: 'sfx', id: 'sc_burn', v: v });
                            SFX.play('sc_burn', v);
                        }
                        qs('body').classList.add('shake', 'animation-blocked');
                        setTimeout(() => qs('body').classList.remove('shake'), 400);

                        // Show the burn animation STATE
                        p.scBurn = true;

                        // NEW: Splash Hot Face REMOVED as requested, localized only
                        // NEW: Auto Reaction SC Burn
                        showReaction(p.id, 'fire');
                        if (isHost) bc({ t: 'reaction', who: p.id, id: 'fire' });

                        addToHistory(`${p.name} brucia una Second Chance! 🔥`, 'special');

                        sync(); updateGame();

                        // Trigger burn animation is handled by renderCard checking p.scBurn
                        // Just wait for animation to complete
                        setTimeout(() => {
                            // Remove SC card
                            const scIdx = p.cards.findIndex(x => x.type === 'action' && x.value === 'second_chance');
                            if (scIdx > -1) p.cards.splice(scIdx, 1);

                            // Remove bust card
                            const bustIdx = p.cards.indexOf(c);
                            if (bustIdx > -1) p.cards.splice(bustIdx, 1);

                            p.sc = false;
                            p.scUsed = true; // Mark as used for bot/game logic
                            p.scBurn = false;

                            state.discards.push({ type: 'action', value: 'second_chance' }, c);

                            // Sound removed from here (moved to start of block)
                            qs('body').classList.remove('animation-blocked');

                            sync(); updateGame();
                        }, 2500);

                        // We return here? No, we need to sync the 'show card' state first.
                        // But we must NOT set p.st = 'bust'.
                    }
                    else {
                        p.st = 'bust'; p.pts = 0; p.bustTime = Date.now();
                        trackBust(p.id); // Stats tracking
                        if (isHost) {
                            const v = SFX.getMemeVariant('bust');
                            bc({ t: 'sfx', id: 'bust', v: v });
                            SFX.play('bust', v);
                        }

                        // MEME TRIGGERS: Bust on 2 or 7 (Total cards including this one)
                        const totalCards = p.cards.length + 1; // c is not pushed yet in else block? No, look below...
                        // Actually c is NOT in p.cards yet in this block? 
                        // Line 4531: p.cards.push(c) is inside the else block (not bust).
                        // In bust block (here), we push it later at line 4554 (p.cards.push(c)).
                        // So current length is p.cards.length. Total will be +1.

                        if (window.GAME_STATE && window.GAME_STATE.memeMode) {
                            if (p.cards.length + 1 === 2) {
                                if (isHost) {
                                    const v = SFX.getMemeVariant('bust_on_two');
                                    bc({ t: 'sfx', id: 'bust_on_two', v: v });
                                    SFX.play('bust_on_two', v);
                                }
                            } else if (p.cards.length + 1 === 7) {
                                if (isHost) {
                                    const v = SFX.getMemeVariant('bust_on_seven');
                                    bc({ t: 'sfx', id: 'bust_on_seven', v: v });
                                    SFX.play('bust_on_seven', v);
                                }
                            }

                            // Meme Flip3 Fail Trigger
                            if (p.flip3Active) {
                                if (isHost) {
                                    const v = SFX.getMemeVariant('player_flipping3_fail');
                                    bc({ t: 'sfx', id: 'player_flipping3_fail', v: v });
                                    SFX.play('player_flipping3_fail', v);
                                } else {
                                    SFX.play('player_flipping3_fail');
                                }
                            }
                        }

                        // Auto Reaction Bust & Smoke (Real Smoke Effect)
                        spawnSmokeOnPlayer(p.id);
                        // FIX 8: Broadcast smoke to all clients
                        if (isHost) bc({ t: 'smoke', who: p.id });

                        const bustReact = 'bust';
                        showReaction(p.id, bustReact);
                        if (isHost) bc({ t: 'reaction', who: p.id, id: bustReact });

                        p.cards.forEach(card => { if (card.value === c.value && card.type === 'number') card.isBustCause = true; });
                        c.isBustCause = true;
                        p.cards.push(c);

                        if (p.id === myId) {
                            qs('body').classList.add('shake');
                            setTimeout(() => qs('body').classList.remove('shake'), 400);
                        }

                        addToHistory(`${p.name} ha sballato con un ${c.value}! 💥`, 'bust');
                    }
                } else {
                    p.nums.add(c.value); p.cards.push(c); p.pts = calcPts(p);
                    trackCardDealt(p.id); // Stats tracking
                    if (p.nums.size >= 7) {
                        // FIX 4: Debug log for Flip7 verification
                        console.log(`🎉 FLIP7 triggered for ${p.name}! Unique nums: ${p.nums.size}, Cards in hand: ${p.cards.filter(c => c.type === 'number').length}, Nums Set:`, [...p.nums]);
                        p.st = 'flip7'; p.pts = calcPts(p);
                        trackFlip7(p.id); // Stats tracking
                        if (isHost) {
                            const v = SFX.getMemeVariant('flip7');
                            bc({ t: 'sfx', id: 'flip7', v: v });
                            SFX.play('flip7', v);
                        }
                        // Only fire if I am this player
                        if (p.id === myId) {
                            fireConfetti('flip7'); // Function logic removed, add inline here or restore?
                            // Restoring inline logic for winner only
                            const duration = 3000;
                            const end = Date.now() + duration;
                            (function frame() {
                                confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#A78BFA', '#fbbf24'] });
                                confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#A78BFA', '#fbbf24'] });
                                if (Date.now() < end) requestAnimationFrame(frame);
                            })();
                        }

                        qs('body').classList.add('flip7-glow');
                        setTimeout(() => qs('body').classList.remove('flip7-glow'), 2000);
                        showCardSplash('star', p.name);
                        if (isHost) bc({ t: 'splash', a: 'star', who: p.name });
                        addToHistory(`${p.name} HA FATTO FLIP 7! 🔥`, 'special');
                        endRound(); return;
                    }
                    if (c.type === 'number') {
                        if (isHost) {
                            // User Pref: Always use 'deal' sound, even for manual hit
                            const sound = 'deal';
                            const v = SFX.getMemeVariant(sound);
                            SFX.play(sound, v);
                            bc({ t: 'sfx', id: sound, v: v });
                        }
                        addToHistory(`${p.name} ha pescato ${c.value}`, 'normal');

                        // MEME TRIGGER: Player has 6 cards (total)
                        // Prompt says "raggiunge 6 carte".
                        if (window.GAME_STATE && window.GAME_STATE.memeMode && p.cards.length === 6) {
                            if (isHost) {
                                const v = SFX.getMemeVariant('player_has_6_cards');
                                bc({ t: 'sfx', id: 'player_has_6_cards', v: v });
                                SFX.play('player_has_6_cards', v);
                            }
                        }
                    }
                }
            } else if (c.type === 'modifier') {
                p.mods.push(c); p.cards.push(c); p.pts = calcPts(p);

                if (isHost) {
                    let soundId = 'modifier_card';
                    if (window.GAME_STATE && window.GAME_STATE.memeMode) {
                        if (c.value === 'x2') soundId = 'modifier_x2';
                        else if (['+2', '+4', '+6', '+8', '+10'].includes(c.value)) soundId = `modifier_${c.value}`;
                    }

                    const v = SFX.getMemeVariant(soundId);
                    bc({ t: 'sfx', id: soundId, v: v });
                    SFX.play(soundId, v);
                }
                // No local play for clients (wait for broadcast)

                addToHistory(`${p.name} ha pescato modificatore ${c.value}`, 'normal');
            }
            else if (c.type === 'action') {
                // Logic moved inside specific blocks to prevent false splashes

                // FIX: Pause dealing if dealing phase and async action
                if (state.dealingPhase && ['freeze', 'flip3'].includes(c.value)) {
                    state.dealingPaused = true;
                }

                // FLIP3 QUEUE LOGIC:
                // If we are inside a Flip 3 loop, we QUEUE other Flip 3 cards.
                // Freeze and Second Chance fall through to standard logic (Freeze pauses, SC burns/keeps).
                if (isFlip3 && c.value === 'flip3') {
                    p.cards.push(c);
                    state.flip3Queue.push({ t: c.value, from: idx, card: c });
                    showToast(`Azione Flip 3 in coda!`);
                    return;
                }

                const activeCount = state.players.filter(pl => pl.st === 'active').length;

                // GENERIC HELPERS
                const triggerSplash = () => {
                    showCardSplash(c.value, p.name);
                    if (isHost) bc({ t: 'splash', a: c.value, who: p.name });

                    // SFX Logic derived from card value
                    let sfxId = 'action';
                    if (c.value === 'freeze') sfxId = 'freeze';
                    else if (c.value === 'flip3') sfxId = 'flip3';
                    else if (c.value === 'second_chance') sfxId = 'sc_gain';

                    if (isHost) {
                        const v = SFX.getMemeVariant(sfxId);
                        bc({ t: 'sfx', id: sfxId, v: v });
                        SFX.play(sfxId, v);
                    }

                    const actionIcons = { freeze: '❄️ Freeze', flip3: '⚡ Flip 3', second_chance: '❤️ Second Chance' };
                    addToHistory(`${p.name} ha pescato ${actionIcons[c.value] || c.value}!`, 'special');
                };

                // FLIP3: Drawer draws 3 cards themselves (no targeting)
                // RULE CHANGE: Action is played on TARGET.
                if (c.value === 'flip3') {
                    p.cards.push(c);
                    triggerSplash(); // Safe to splash now

                    // Determine Target:
                    // If during Initial Deal or alone -> Self
                    if (state.dealingPhase || activeCount <= 1) {
                        if (isHost) {
                            // Forced/Self Flip3 (Broadcast)
                            bc({ t: 'broadcast_toast', type: 'flip3_self', from: p.name, target: p.name });
                            showBroadcastToast('flip3_self', p.name, p.name);
                        }
                        startFlip3Sequence(idx, idx);
                    } else {
                        // Choose target with delay for splash
                        setTimeout(() => {
                            state.pending = { t: 'flip3', from: idx };
                            sync(); updateGame();
                            if (idx === state.players.findIndex(p => p.id === myId)) showTgt();
                        }, 2500);
                    }
                    return;
                }

                // FREEZE: Choose someone to freeze (if alone, freeze self)
                if (c.value === 'freeze') {
                    p.cards.push(c);
                    triggerSplash(); // Safe to splash now
                    if (activeCount <= 1) {
                        // Freeze self with dramatic sequence
                        setTimeout(() => {
                            if (p.id === myId) showToast("Hai pescato Freeze! ❄️");

                            setTimeout(() => {
                                if (p.id === myId) showToast("Sei l'ultimo! Ti congeli... 🥶");

                                // Forced Self-Freeze Broadcast
                                if (isHost) {
                                    bc({ t: 'broadcast_toast', type: 'freeze_self_forced', from: p.name, target: p.name });
                                    showBroadcastToast('freeze_self_forced', p.name, p.name);
                                }

                                setTimeout(() => {
                                    p.frozen = true;
                                    p.st = 'stayed';

                                    // MEME TRIGGER: Freezed
                                    if (window.GAME_STATE && window.GAME_STATE.memeMode) {
                                        // Local trigger for self? Or Broadcast? Prompt says LOCAL for 'freezed'.
                                        // "Quando un utente riceve lo stato FROZEN".
                                        // If LOCAL, only I play it.
                                        // Warning: This block runs on ALL clients if logic is replicated? 
                                        // No, drawCard logic runs on Host and synced. 
                                        // BUT this setTimeout logic for self-freeze might be running on client?
                                        // check surrounding: c.value === 'freeze'.
                                        // Wait, drawCard runs on whoever triggered it. 
                                        // If I drew it, I run this.
                                        if (isHost) {
                                            const v = SFX.getMemeVariant('freezed');
                                            bc({ t: 'sfx', id: 'freezed', v: v });
                                            SFX.play('freezed', v);
                                        } else {
                                            SFX.play('freezed');
                                        }
                                    }

                                    if (state.dealingPhase) dealLoop(); // Resume deal
                                    else { nextTurn(); sync(); updateGame(); }
                                }, 2000);
                            }, 1500);
                        }, 500);

                    } else {
                        // Choose target with delay for splash
                        setTimeout(() => {
                            state.pending = { t: 'freeze', from: idx };
                            sync(); updateGame();
                            if (idx === state.players.findIndex(p => p.id === myId)) showTgt();
                            else if (isHost) {
                                // If host is not the player, we sync state, client should open modal.
                                // We need to ensure client opens modal on pending update.
                                // Currently updateGame doesn't call showTgt automatically.
                                // We should broadcast a cmd? No, state sync should be enough if updateGame checks it.
                                // Let's add checkPendingAction() to updateGame if not present.
                                // Or send specific 'show_tgt' message?
                                // Actually, handleMsg calls updateGame.
                                // Let's make sure we call checkPending() in updateGame.
                                // For now, just sync.
                            }
                        }, 2500);
                    }
                    return;
                }

                // SECOND CHANCE: Keep as life, donate if have one
                if (c.value === 'second_chance') {
                    triggerSplash(); // Safe to splash now
                    if (p.sc) {
                        // Already have SC - MUST GIVE AWAY
                        if (activeCount <= 1) {
                            // FIX 1: Alone - discard with BURN ANIMATION (broadcast to all)
                            // Show splash to all explaining why SC burns
                            if (isHost) {
                                bc({ t: 'sc_burn_alone', who: p.name });
                            }
                            showSCBurnAloneSplash(p.name);

                            // Set burn state for animation
                            p.scBurn = true;
                            p.cards.push(c); // Temporarily add for visual

                            // Fire reaction
                            showReaction(p.id, 'fire');
                            if (isHost) bc({ t: 'reaction', who: p.id, id: 'fire' });

                            addToHistory(`${p.name} scarta Second Chance (ultimo rimasto)! 🔥`, 'special');
                            sync(); updateGame();

                            // After 2s, remove the card
                            setTimeout(() => {
                                p.scBurn = false;
                                const scIdx = p.cards.findIndex(x => x.type === 'action' && x.value === 'second_chance' && x !== c);
                                // Remove the NEW SC (the one just drawn = c)
                                const newScIdx = p.cards.indexOf(c);
                                if (newScIdx > -1) p.cards.splice(newScIdx, 1);
                                state.discards.push(c);
                                sync(); updateGame();
                            }, 2000);
                        } else {
                            // Donate to someone - Delay for splash
                            setTimeout(() => {
                                state.pending = { t: 'give_sc', from: idx, card: c };
                                sync(); updateGame();
                                if (idx === state.players.findIndex(p => p.id === myId)) showTgt();
                            }, 2500);
                        }
                    } else {
                        // Keep it as extra life
                        p.sc = true;
                        trackSecondChance(p.id); // Stats tracking
                        p.cards.push(c);
                    }
                    // If dealing, we need to resume! 
                    // Wait, if we set pending 'give_sc', deal pauses.
                    // If we just kept it, we need to auto-resume deal if dealingPhase?
                    // drawCard is synchronous usually, but dealLoop waits for it.
                    // Actually dealLoop just calls drawCard then setTimeout.
                    // So if NO pending set, logic continues.
                }
            }
        }

        // ...

        function resetRound() {
            state.players.forEach(p => {
                p.cards = []; p.mods = []; p.nums = new Set(); p.pts = 0; p.st = 'active'; p.sc = false;
                // Reset statuses
                p.frozen = false; p.flip3Active = false; p.scUsed = false;
                p.bustTime = 0; // State cleanup
            });
            state.last = null; state.pending = null; state.flip3 = 0;
            state.flip3Queue = []; // Clear queue
            localPlayerCardCounts = {}; localAnimatingCards = {};
            // Cleanup visual artifacts (Ghost Skulls)
            document.querySelectorAll('.bust-reaction, .reaction-bubble').forEach(e => e.remove());
        }

        // Duplicate endRound removed - see startRecapSequence below

        function calcPts(p) {
            // 1. Sum number cards only
            let b = p.cards.reduce((s, c) => s + (c.type === 'number' ? c.value : 0), 0);
            // 2. Apply x2 multiplier
            if (p.mods.some(m => m.value === 'x2')) b *= 2;
            // 3. Add +15 Flip7 bonus (after x2, not affected by multiplier)
            if (p.st === 'flip7') b += 15;
            // 4. Add modifier bonuses (+2, +4, +6, etc.)
            p.mods.forEach(m => { if (m.value.startsWith('+')) b += parseInt(m.value.slice(1)); });
            return b;
        }

        // Duplicate listeners removed



        function handleAct(pid, act, tgt) {
            const idx = state.players.findIndex(p => p.id === pid); if (idx === -1) return;
            const p = state.players[idx];
            if (act === 'hit' && idx === state.turn && p.st === 'active') {
                // Diversify Hit sound for Meme Mode
                if (isHost && state.memeMode) {
                    const v = SFX.getMemeVariant('hit');
                    SFX.play('hit', v);
                    bc({ t: 'sfx', id: 'hit', v: v });
                }

                // Sound moved to drawCard for consistency with dealLoop
                const res = drawCard(idx);
                if (res === 'WAIT' || res === 'END') return;

                if (state.pending) {
                    const delay = (state.last && state.last.type === 'action') ? 2600 : 0;
                    if (isHost) setTimeout(showTgt, delay);
                } else if (p.st !== 'active') { if (p.st === 'bust') setTimeout(() => nextTurn(), 3000); else nextTurn(); }
            } else if (act === 'stay' && idx === state.turn) {
                if (isHost && state.memeMode) {
                    const v = SFX.getMemeVariant('stay');
                    bc({ t: 'sfx', id: 'stay', v: v });
                    SFX.play('stay', v);
                } else if (isHost) {
                    bc({ t: 'sfx', id: 'stay' });
                    SFX.play('stay');
                } else {
                    // Client plays local sound immediately for responsiveness
                    SFX.play('stay');
                }
                p.st = 'stayed';
                trackStay(p.id); // Stats tracking
                addToHistory(`${p.name} si è fermato`, 'normal');
                // Show Stop reaction with broadcast
                showReaction(p.id, 'stop');
                if (isHost) bc({ t: 'reaction', who: p.id, id: 'stop' });
                nextTurn();
            } else if (act === 'tgt') resAct(tgt);
            sync(); updateGame();
        }

        function showTgt() {
            if (!state.pending) return;
            if (state.players.findIndex(p => p.id === myId) !== state.pending.from) return;
            const tm = qs('#targetModal');

            // Pretty modal titles
            const titles = {
                'freeze': '❄️ Chi vuoi congelare?',
                'flip3': '⚡ Chi deve pescare 3 carte?',
                'give_sc': '❤️ A chi regali Second Chance?'
            };
            qs('#modalTitle').innerText = titles[state.pending.t] || `Scegli bersaglio`;
            SFX.play('action_required'); // Local sound for me only
            SFX.play('popup_open');


            qs('#targetButtons').innerHTML = ''; // Clear

            // Gather Candidates
            let candidates = [];
            state.players.forEach((p, i) => {
                // Must be active
                if (p.st !== 'active') return;

                // SC Filter: Cannot give to someone who already has SC (including self)
                if (state.pending.t === 'give_sc' && (p.sc || p.id === myId)) return;

                // Freeze/Flip3: Can target self? Rules say yes usually, but UI implies attack.
                // Current logic allows targeting self if active (unless restricted elsewhere).
                // Let's keep logic: all active players.

                candidates.push({ p: p, i: i });
            });

            // SORT: By Total Score Descending (High Risk first), then Round Points
            // If it's 'give_sc', maybe sort by score ascending? (Helping loser). 
            // User requested "Freeze... Ordina per punteggio". We'll use Leaderboard sort (Desc) as default.
            candidates.sort((a, b) => (b.p.tot - a.p.tot) || (b.p.pts - a.p.pts));

            // Determine Highest Score for highlighting
            const maxScore = candidates.length > 0 ? candidates[0].p.tot : 0;

            candidates.forEach(c => {
                const p = c.p;
                const i = c.i;
                const isHighRisk = (p.tot === maxScore && p.tot > 0);

                const div = document.createElement('div');
                div.className = 'premium-card target-item'; // Use Premium Card style
                if (isHighRisk) div.classList.add('high-risk');
                div.style.marginBottom = '10px';
                div.style.cursor = 'pointer';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'space-between';

                // Content
                div.innerHTML = `
                    <div style="flex:1;">
                        <div style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px;">
                            ${p.name}
                            ${isHighRisk ? '<span title="High Score Danger" style="font-size:18px; filter:drop-shadow(0 0 5px red);">🔥</span>' : ''}
                        </div>
                        <div style="font-size:12px; opacity:0.8; margin-top:4px;">
                            Round: <strong style="color:#A78BFA">${p.pts}</strong> | Tot: <strong style="color:#fbbf24">${p.tot}</strong>
                        </div>
                    </div>
                    <div style="font-size:24px; opacity:0.8; filter:drop-shadow(0 0 5px rgba(255,255,255,0.3));">🎯</div>
                `;

                div.onclick = () => {
                    if (SFX.stopAction) SFX.stopAction();
                    tm.classList.remove('active');
                    isHost ? handleAct(myId, 'tgt', i) : sendHost({ t: 'act', a: 'tgt', tgt: i });
                };
                qs('#targetButtons').appendChild(div);
            });

            tm.classList.add('active');
        }

        function startFlip3Sequence(tgtIdx, fromIdx) {
            const tgt = state.players[tgtIdx];
            tgt.flip3Active = true;
            trackAction('flip3'); // Stats tracking

            // Auto Reaction Flip 3 (Anxiety!)
            showReaction(tgt.id, 'shock');
            bc({ t: 'reaction', who: tgt.id, id: 'shock' });

            // Set Context for queue processing
            state.flip3Context = { from: fromIdx, to: tgtIdx };

            sync(); updateGame();

            let count = 0;
            function flip3Loop() {
                if (count < 3 && tgt.st === 'active') {
                    drawCard(tgtIdx, true);
                    count++;
                    sync(); updateGame();

                    // Check if last card was Action (triggered 2s splash)
                    const isAction = state.last && state.last.type === 'action';
                    const delay = isAction ? 3600 : 2200;

                    setTimeout(flip3Loop, delay);
                } else {
                    tgt.flip3Active = false;
                    // Check logic queue via Global function
                    processFlip3Queue();
                }
            }

            setTimeout(flip3Loop, 1500);
        }

        // Global definition for processing queue and finishing sequence
        function processFlip3Queue() {
            if (state.flip3Queue.length > 0) {
                const queued = state.flip3Queue.shift();
                const tgtIdx = state.flip3Context?.to;
                const tgt = state.players[tgtIdx];

                showToast(`Risolvo azione accodata: ${queued.t}`);

                setTimeout(() => {
                    if (queued.t === 'freeze') {
                        const activeC = state.players.filter(p => p.st === 'active').length;
                        if (activeC <= 1) {
                            tgt.frozen = true; tgt.st = 'stayed';
                            setTimeout(finishFlip3Sequence, 1000);
                        } else {
                            state.pending = { t: 'freeze', from: tgtIdx, isQueue: true };
                            showTgt();
                        }
                    } else if (queued.t === 'flip3') {
                        const activeC = state.players.filter(p => p.st === 'active').length;
                        if (activeC <= 1) {
                            startFlip3Sequence(tgtIdx, tgtIdx);
                        } else {
                            state.pending = { t: 'flip3', from: tgtIdx, isQueue: true };
                            showTgt();
                        }
                    }
                }, 1000);
            } else {
                finishFlip3Sequence();
            }
        }

        function finishFlip3Sequence() {
            if (state.dealingPhase) {
                // FIX 3: Toast when resuming dealing
                if (isHost) bc({ t: 'broadcast_toast', type: 'deal_resume', from: '', target: '' });
                // showToast('🎴 Azione risolta, riprendiamo il dealing!');
                state.dealingPaused = false; // FIX: Resume dealing
                dealLoop();
            }
            else {
                const fromIdx = state.flip3Context?.from;
                if (fromIdx !== undefined && fromIdx === state.turn && state.players[fromIdx].st === 'active') {
                    showToast(`${state.players[fromIdx].name} continua il turno!`);
                    sync(); updateGame();
                } else {
                    nextTurn(); sync(); updateGame();
                }
            }
        }

        // New Async handling for Flip 3 animation in Host
        // New Async handling for Flip 3 animation in Host
        function resAct(tgtIdx) {
            if (!state.pending) return; // Safety check
            const fromIdx = state.pending.from;
            const fromPlayer = state.players[fromIdx];
            const tgt = state.players[tgtIdx], a = state.pending.t;
            const isQueue = state.pending.isQueue;
            state.pending = null; // Clear pending

            if (a === 'freeze') {
                tgt.frozen = true;
                tgt.st = 'stayed';
                trackAction('freeze'); // Stats tracking

                // Broadcast toast to all
                if (isHost) {
                    const toastType = (fromIdx === tgtIdx) ? 'freeze_self' : 'freeze';
                    bc({ t: 'broadcast_toast', type: toastType, from: fromPlayer.name, target: tgt.name });
                    showBroadcastToast(toastType, fromPlayer.name, tgt.name);
                }

                sync(); updateGame(); // Show frozen state immediately

                setTimeout(() => {
                    if (state.dealingPhase) {
                        // FIX 3: Toast when resuming dealing after freeze
                        if (isHost) bc({ t: 'broadcast_toast', type: 'deal_resume', from: '', target: '' });
                        // showToast('🎴 Azione risolta, riprendiamo il dealing!');
                        state.dealingPaused = false; // FIX: Resume dealing
                        dealLoop();
                    }
                    // FIX: Resume Flip3 Loop if paused (Interruption Logic)
                    else if (state.flip3State && state.flip3State.paused) {
                        state.flip3State.paused = false;
                        dealFlip3();
                    }
                    else if (isQueue) {
                        processFlip3Queue();
                    } else {
                        nextTurn();
                    }
                    sync(); updateGame();
                }, 2200);
            }
            else if (a === 'give_sc') {
                tgt.sc = true;
                trackSecondChance(tgt.id); // Stats tracking
                tgt.cards.push({ type: 'action', value: 'second_chance' });

                // Broadcast toast to all
                if (isHost) {
                    bc({ t: 'broadcast_toast', type: 'give_sc', from: fromPlayer.name, target: tgt.name });
                    showBroadcastToast('give_sc', fromPlayer.name, tgt.name);
                }

                sync(); updateGame(); // Show transfer immediately

                setTimeout(() => {
                    if (state.dealingPhase) {
                        // FIX 3: Toast when resuming dealing after give_sc
                        if (isHost) bc({ t: 'broadcast_toast', type: 'deal_resume', from: '', target: '' });
                        // showToast('🎴 Azione risolta, riprendiamo il dealing!');
                        state.dealingPaused = false; // Resume dealing
                        dealLoop();
                    }
                    // FIX: Resume Flip3 Loop if paused
                    else if (state.flip3State && state.flip3State.paused) {
                        state.flip3State.paused = false;
                        dealFlip3();
                    }
                    else {
                        // Continue current logic
                        sync(); updateGame();
                    }
                }, 2200);
            }
            else if (a === 'flip3') {
                // Broadcast toast for Flip3
                if (isHost) {
                    const toastType = (fromIdx === tgtIdx) ? 'flip3_self' : 'flip3';
                    bc({ t: 'broadcast_toast', type: toastType, from: fromPlayer.name, target: tgt.name });
                    showBroadcastToast(toastType, fromPlayer.name, tgt.name);
                }
                startFlip3Sequence(tgtIdx, state.turn);
                // startFlip3Sequence handles its own loops and syncs
            }
        }

        function nextTurn() {
            let i = 0; do { state.turn = (state.turn + 1) % state.players.length; i++; } while (state.players[state.turn].st !== 'active' && i < state.players.length);
            if (state.players.every(p => p.st !== 'active')) { endRound(); return; }

            // Global toast for turn start - stored in state for sync to all clients
            const currentPlayer = state.players[state.turn];
            if (currentPlayer) {
                state.globalToast = { id: Date.now(), msg: `Tocca a: ${currentPlayer.name}!` };

                // AUTO-STAY if Offline
                if (currentPlayer.isOffline && isHost) {
                    showToast(`${currentPlayer.name} è offline. Auto-Stay.`);
                    setTimeout(() => {
                        // SAFETY CHECK: Player might have reconnected during the delay
                        if (currentPlayer.isOffline && state.players[state.turn] === currentPlayer) {
                            handleAct(currentPlayer.id, 'stay');
                        }
                    }, 1500);
                }
            }

            sync(); updateGame();
        }

        function startRecapSequence() {
            state.phase = 'recap';
            sync(); updateGame();
        }

        function nextRoundCmd() {
            if (!isHost) return;
            state.phase = 'game';
            resetRound(); dealInit();
        }

        function endRound() {
            state.players.forEach(p => {
                // Force active players to 'stayed' so they bank points (Rule: Flip7 saves everyone active)
                if (p.st === 'active') p.st = 'stayed';

                // If SC wasn't used, discard it
                if (p.sc) {
                    const scIdx = p.cards.findIndex(x => x.type === 'action' && x.value === 'second_chance');
                    if (scIdx > -1) {
                        // Move to discards
                        state.discards.push(p.cards[scIdx]);
                        p.cards.splice(scIdx, 1);
                    }
                    p.sc = false;
                }

                if (p.st !== 'bust') p.tot += p.pts;
                state.discards.push(...p.cards);
            });
            trackRoundEnd(); // Stats tracking
            const w = state.players.filter(p => p.tot >= 200);
            if (w.length >= 1) { // Handle case where multiple pass 200 (though usually 1 turn at a time)
                state.phase = 'end';
                if (isHost) {
                    bc({ t: 'sfx', id: 'lose_match' }); // Broadcast lose to everyone first
                    // Then override locally for winner? 
                    // No, better logic: 
                    // Broadcast WIN for winner? No, winner hears WIN, others hear LOSE.
                    // But BC sends same ID to everyone. 
                    // We need client-side logic: on 'win_match' message, check if I am winner?
                    // Current system is simple ID broadcast.
                    // Let's broadcast 'win_match'. The client knows who won based on state? 
                    // Or we broadcast generic 'match_over' and client decides?
                    // Simple approach: Broadcast 'win_match' always. 
                    // But user asked for 'lose_match' for everyone except winner.
                    // Let's broadcast 'match_result'. Client checks state.
                    // For now, let's keep 'win_match' broadcast but ADD 'lose_match' logic on client?
                    // Actually, let's execute logic here:
                    // Host plays 'win_match' if he is winner, else 'lose_match'.
                    // AND broadcast... wait, simpler:
                    // Broadcast 'win_match'. Client sees who won.
                    // BUT user specified 'lose_match' mp3.
                    // Let's use 'win_match' for the winner and 'lose_match' for others.
                    // Updated Plan: broadcast special event 'match_end'.
                    bc({ t: 'match_end', winner: w[0].id });
                }
                if (w[0].id === myId) SFX.play('win_match'); else SFX.play('lose_match');

                sync(); updateGame();
                return;
            }

            // End of Round (Round End sound) - Commented out by user request
            // if (isHost) bc({ t: 'sfx', id: 'round_end' });
            // SFX.play('round_end');

            state.round++; state.dealer = (state.dealer + 1) % state.players.length;

            // Deck Persistence: We DO NOT createDeck() here.
            // We just trigger recap, then nextRoundCmd will call resetRound() and dealInit()

            // Trigger Recap
            startRecapSequence();
        }



        function renderHiddenCard() {
            return `<img src="assets/cards/back.webp" class="card back" alt="Back">`;
        }

        function sync() { if (isHost) bc({ t: 'state', s: serState() }); }

        // === SMART RENDER HELPERS ===

        // Render a SINGLE player into a container (clears container first)
        function renderSinglePlayerZone(container, player, state) {
            if (!player) {
                container.innerHTML = '';
                return;
            }
            const pIdx = state.players.findIndex(x => x.id === player.id);
            const zoneId = `pzone-${pIdx}`;
            let zone = document.getElementById(zoneId);

            // If zone exists elsewhere, move it here
            if (zone) {
                container.innerHTML = '';
                container.appendChild(zone);
            } else {
                // Create new zone
                zone = document.createElement('div');
                zone.id = zoneId;
                zone.className = 'player-zone';
                zone.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span class="p-name" style="font-weight:700; font-size:14px; display:flex; align-items:center; gap:6px;"></span>
                        <div class="p-badges" style="display:flex; align-items: center;">
                            <div class="round-score-glass">0</div>
                        </div>
                    </div>
                    <div class="player-cards"></div>
                    <div class="modifiers-row">
                        <div class="mods-container"></div>
                        <div class="reaction-overlay"></div>
                    </div>
                    <div class="bust-overlay-container"></div>
                `;
                container.innerHTML = '';
                container.appendChild(zone);
            }

            const isMe = player.id === myId;
            const isTurn = pIdx === state.turn;
            updatePlayerZone(zone, player, isMe, isTurn, state);
        }

        // Master layout routing function
        function smartRenderLayout() {
            const myIdx = state.players.findIndex(p => p.id === myId);
            const activeIdx = state.turn;
            const me = state.players[myIdx];
            const activePlayer = state.players[activeIdx];

            // Determine if action is in progress (requires showing target)
            const actionInProgress = state.pending &&
                (state.pending.t === 'freeze' || state.pending.t === 'flip3' || state.pending.t === 'give_sc');
            const actionFromIdx = actionInProgress ? state.pending.from : null;

            // For Flip3, track the target from flip3Context
            let actionTargetIdx = null;
            if (state.flip3Context && state.flip3Context.tgt !== undefined) {
                actionTargetIdx = state.flip3Context.tgt;
            }
            // Also check if any player has flip3Active
            const flip3ActivePlayer = state.players.findIndex(p => p.flip3Active);
            if (flip3ActivePlayer >= 0 && flip3ActivePlayer !== myIdx) {
                actionTargetIdx = flip3ActivePlayer;
            }

            // Track which indices are shown in special zones
            const shownInSpecialZones = new Set();

            // 1. MY HAND → always in #myHandZone
            if (myIdx >= 0 && me) {
                renderSinglePlayerZone(qs('#myHandZone'), me, state);
                shownInSpecialZones.add(myIdx);
            } else {
                qs('#myHandZone').innerHTML = '';
            }

            // 2. ACTIVE PLAYER ZONE (under deck) → shows current turn player IF not me
            const activeZone = qs('#activePlayerZone');
            if (activeIdx !== myIdx && activePlayer) {
                renderSinglePlayerZone(activeZone, activePlayer, state);
                shownInSpecialZones.add(activeIdx);
            } else {
                activeZone.innerHTML = '';
            }

            // 3. ACTION TARGET ZONE → shows during Freeze/Flip3 when target is not me and not already shown
            const targetZone = qs('#actionTargetZone');
            if (actionTargetIdx !== null && actionTargetIdx !== myIdx && !shownInSpecialZones.has(actionTargetIdx)) {
                targetZone.style.display = 'block';
                renderSinglePlayerZone(targetZone, state.players[actionTargetIdx], state);
                shownInSpecialZones.add(actionTargetIdx);
            } else {
                targetZone.style.display = 'none';
                targetZone.innerHTML = '';
            }

            // 4. OTHER PLAYERS → everyone not in special zones
            const otherPlayers = state.players.filter((_, i) => !shownInSpecialZones.has(i));
            smartRenderPlayers(qs('#playersArea'), otherPlayers, false, myId, state.turn, state);
        }

        function smartRenderPlayers(container, players, isMeGlobal, myIdGlobal, turnGlobal, stateGlobal) {
            players.forEach((p, idxList) => {
                const originalIdx = stateGlobal.players.findIndex(x => x.id === p.id);
                const zoneId = `pzone-${originalIdx}`;
                let zone = document.getElementById(zoneId);

                if (!zone) {
                    zone = document.createElement('div');
                    zone.id = zoneId;
                    zone.className = `player-zone`;
                    zone.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span class="p-name" style="font-weight:700; font-size:14px; display:flex; align-items:center; gap:6px;"></span>
                            <div class="p-badges" style="display:flex; align-items: center;">
                                <div class="round-score-glass">0</div>
                            </div>
                        </div>
                        <div class="player-cards"></div>
                        <div class="modifiers-row">
                            <div class="mods-container"></div>
                            <div class="reaction-overlay"></div>
                        </div>
                        <div class="bust-overlay-container"></div>
                    `;
                }
                container.appendChild(zone);
                updatePlayerZone(zone, p, p.id === myIdGlobal, originalIdx === turnGlobal, stateGlobal);
            });

            // Remove detached zones
            Array.from(container.children).forEach(child => {
                // If child is not in players list (by checking if we just appended it?)
                // Since we appended all current players, they are at the end.
                // Any child not touched/moved is at the beginning?
                // Actually if I move node A, it leaves its old spot.
                // So all valid nodes are moved to end.
                // If there were extra nodes (Z), they remain at start.
                // But container.children changes live.
                // So if we have 5 children, and we append 2 existing ones.
                // Those 2 move to index 3, 4?
                // No, node is removed from old pos and added to new.
                // So if Z, A, B.
                // Append A -> Z, B, A.
                // Append B -> Z, A, B.
                // Z remains at 0.
                // So we remove children from 0 to (count - players.length).
                while (container.children.length > players.length) {
                    container.firstChild.remove();
                }
            });
        }

        function updatePlayerZone(zone, p, isMe, isTurn, state) {
            // === Animation Tracking (FIX: Use Name instead of ID to persist across rejoins) ===
            if (!localPlayerCardCounts[p.name]) localPlayerCardCounts[p.name] = { nums: 0, mods: 0 };
            if (!localAnimatingCards[p.name]) localAnimatingCards[p.name] = { nums: {}, mods: {} };

            const numCards = p.cards.filter(c => c.type === 'number');
            const modCards = p.cards.filter(c => c.type === 'modifier' || (c.type === 'action' && c.value === 'second_chance'));

            if (numCards.length > localPlayerCardCounts[p.name].nums) {
                for (let k = localPlayerCardCounts[p.name].nums; k < numCards.length; k++) {
                    localAnimatingCards[p.name].nums[k] = Date.now();
                }
            }
            if (modCards.length > localPlayerCardCounts[p.name].mods) {
                for (let k = localPlayerCardCounts[p.name].mods; k < modCards.length; k++) {
                    localAnimatingCards[p.name].mods[k] = Date.now();
                }
            }
            localPlayerCardCounts[p.name] = { nums: numCards.length, mods: modCards.length };
            // ==========================

            const numCount = numCards.length;
            const isMeZone = isMe;
            // Note: p.id === myId is used in original class logic for 'my-zone'
            const finalZoneClass = `player-zone ${isTurn && p.st === 'active' ? 'active-turn' : ''} ${p.st === 'bust' ? 'bust' : ''} ${p.st === 'stayed' ? 'stayed' : ''} ${p.frozen ? 'frozen' : ''} ${isMeZone ? 'my-zone' : ''} ${p.flip3Active ? 'flip3' : ''} ${p.sc ? 'bonus-sc' : ''}`;

            if (zone.className !== finalZoneClass) zone.className = finalZoneClass;

            const nameEl = zone.querySelector('.p-name');
            const suffix = isMe ? ' (Tu)' : '';
            const dealerIcon = p.id === state.dealer ? `<img src="${ASSETS.crown}" style="height:16px;" title="Dealer">` : '';
            const botIcon = p.isBot ? '<img src="https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png" style="height:18px;" title="Bot">' : '';
            const nameHtml = `${p.name} ${botIcon} ${suffix} ${dealerIcon}`;
            if (nameEl.innerHTML !== nameHtml) nameEl.innerHTML = nameHtml;
            nameEl.style.fontSize = isMe ? '16px' : '14px';

            const scoreEl = zone.querySelector('.round-score-glass');
            if (scoreEl.innerText != p.pts) scoreEl.innerText = p.pts;



            smartUpdateCards(zone.querySelector('.player-cards'), numCards, p, isMe, 'nums');
            smartUpdateCards(zone.querySelector('.mods-container'), modCards, p, isMe, 'mods');

            const rOv = zone.querySelector('.reaction-overlay');
            const ovHtml = `
                ${p.sc ? `<img src="${ASSETS.sc}" style="height:40px; filter:drop-shadow(0 0 5px red); animation:pulse 1.5s infinite;" title="Second Chance">` : ''}
                ${p.frozen ? `<img src="${ASSETS.frozen}" style="height:40px; filter:drop-shadow(0 0 5px cyan);" title="Congelato">` : ''}
                ${p.flip3Active ? `<img src="${ASSETS.lightning}" style="height:40px; filter:drop-shadow(0 0 5px yellow);" title="Flip 3">` : ''}
                ${(p.st === 'stayed' && !p.frozen) ? `<img src="${ASSETS.stop}" style="height:40px; filter:drop-shadow(0 0 5px green);" title="Stop">` : ''}
                ${(p.st !== 'bust' && numCount === 6) ? `<img src="${ASSETS.fear}" style="height:40px; filter:drop-shadow(0 0 5px orange); animation:pulse 0.5s infinite;" title="-1 Card!">` : ''}
            `.trim();
            if (rOv.innerHTML !== ovHtml) rOv.innerHTML = ovHtml;

            // TOGGLE VISIBILITY of Modifiers Row
            const modRow = zone.querySelector('.modifiers-row');
            const modCont = zone.querySelector('.mods-container'); // NEW selection

            const hasMods = modCards.length > 0;
            const hasReacts = ovHtml.length > 0;

            if (hasMods || hasReacts) {
                modRow.classList.add('visible');
            } else {
                modRow.classList.remove('visible');
            }

            // TOGGLE VISIBILITY of Inner Container (Cards)
            if (hasMods) {
                modCont.classList.add('visible');
            } else {
                modCont.classList.remove('visible');
            }

            const bCont = zone.querySelector('.bust-overlay-container');
            const showBust = p.st === 'bust' && Date.now() - (p.bustTime || 0) < 2000;
            if (showBust) {
                if (!bCont.firstChild) {
                    // FIX 7: APNGs on sides of BUST text for symmetric dramatic layout
                    const bustEmojis = [
                        `${FLUENT_BASE}/Smilies/Skull.png`,
                        `${FLUENT_BASE}/Smilies/Loudly%20Crying%20Face.png`,
                        `${FLUENT_BASE}/Smilies/Exploding%20Head.png`
                    ];
                    const emoji = bustEmojis[Math.floor(Math.random() * bustEmojis.length)];
                    bCont.innerHTML = `
                        <div class="bust-overlay" style="gap: 15px;">
                            <img src="${emoji}" style="height:50px; filter:drop-shadow(0 0 10px rgba(244,63,94,0.8));">
                            <span style="color:#FF6B35; font-size:42px; font-weight:900; text-shadow: 0 0 30px rgba(255,107,53,0.8); animation: shake 0.3s infinite;">BUST!</span>
                            <img src="${emoji}" style="height:50px; filter:drop-shadow(0 0 10px rgba(244,63,94,0.8));">
                        </div>
                    `;
                }
            } else {
                if (bCont.firstChild) bCont.innerHTML = '';
            }
        }

        function smartUpdateCards(container, cards, p, isMe, typeStr) {
            // FIX: Use Name key for animation consistency across rejoins
            // tension check
            if (state.memeMode && p.nums.size === 6 && !p.hasTension) {
                p.hasTension = true; // Flag to prevent spamming
                if (isHost) {
                    const v = SFX.getMemeVariant('player_has_6_cards');
                    bc({ t: 'sfx', id: 'player_has_6_cards', v: v });
                    SFX.play('player_has_6_cards', v);
                }
            } else if (p.nums.size !== 6) {
                p.hasTension = false;
            }

            if (!localPlayerCardCounts[p.name]) localPlayerCardCounts[p.name] = { nums: 0, mods: 0 };
            if (!localAnimatingCards[p.name]) localAnimatingCards[p.name] = { nums: {}, mods: {} };

            let totalSlots = cards.length;
            if (isMe && typeStr === 'nums') totalSlots = Math.max(7, cards.length);

            const children = Array.from(container.children);

            for (let i = 0; i < totalSlots; i++) {
                const card = (i < cards.length) ? cards[i] : null;
                let child = children[i];

                if (!child) {
                    const temp = document.createElement('div');
                    if (card) {
                        const animTime = localAnimatingCards[p.name][typeStr][i];
                        const isAnimating = animTime && (Date.now() - animTime < 800);
                        temp.innerHTML = renderCard(card, isAnimating, p);
                    } else {
                        temp.innerHTML = '<div class="card-placeholder"></div>';
                    }
                    container.appendChild(temp.firstChild);
                    continue;
                }

                if (!card) {
                    if (!child.classList.contains('card-placeholder')) {
                        const temp = document.createElement('div');
                        temp.innerHTML = '<div class="card-placeholder"></div>';
                        container.replaceChild(temp.firstChild, child);
                    }
                } else {
                    const animTime = localAnimatingCards[p.name][typeStr][i];
                    const isAnimating = animTime && (Date.now() - animTime < 800);

                    if (child.classList.contains('card-placeholder')) {
                        const temp = document.createElement('div');
                        temp.innerHTML = renderCard(card, isAnimating, p);
                        container.replaceChild(temp.firstChild, child);
                        continue;
                    }

                    const path = 'assets/cards/';
                    let src = '';
                    if (card.type === 'number') src = `${path}number_${card.value}.webp`;
                    else if (card.type === 'modifier') src = `${path}modifier_${card.value}.webp`;
                    else if (card.type === 'action') src = `${path}action_${card.value}.webp`;
                    else src = `${path}back.webp`;

                    if (child.src && !child.src.includes(src)) child.src = src;

                    const bustClass = card.isBustCause ? 'bust-cause' : '';
                    const newClass = isAnimating ? 'fly-in' : '';
                    const isBounce = isAnimating && card.type === 'number' && card.value >= 8;
                    const isShiny = card.type === 'action' || (card.type === 'number' && card.value >= 10) || (card.type === 'modifier' && card.value === 'x2');
                    let extra = '';
                    if (isBounce) extra += ' bounce';
                    if (isShiny) extra += ' shiny';
                    if (card.isBustCause && p && p.bustTime && Date.now() - p.bustTime < 600) extra += ' bust-shake';
                    if (p && p.scBurn && (card.value === 'second_chance' || card.isBustCause)) extra += ' burning';

                    const finalClass = `card ${card.type} ${bustClass} ${newClass}${extra}`;
                    if (child.className !== finalClass) child.className = finalClass;
                }
            }
            while (container.children.length > totalSlots) {
                container.lastChild.remove();
            }
        }

        // ================= BOT LOGIC =================
        // ================= BOT LOGIC =================


        function addBot() {
            if (!isHost) return;
            const botId = 'bot-' + Date.now() + Math.floor(Math.random() * 1000);
            
            // Unique Name Selection
            let botName;
            const existingNames = new Set(state.players.map(p => p.name));
            const availableNames = BOT_NAMES.filter(n => !existingNames.has(n));
            
            if (availableNames.length > 0) {
                botName = availableNames[Math.floor(Math.random() * availableNames.length)];
            } else {
                botName = 'Bot ' + Math.floor(Math.random() * 1000);
            }

            state.players.push({
                id: botId,
                name: botName,
                isBot: true,
                cards: [], mods: [], nums: new Set(),
                pts: 0, tot: 0,
                st: 'active',
                frozen: false, flip3Active: false, sc: false
            });
            
            // LOG
            console.log(`[BOT] Added ${botName} (${botId})`);
            bc({ t: 'lobby_update', players: state.players });
            updateLobby();
            showToast(`${botName} aggiunto! 🤖`);
        }

        function removeBot(botId) {
            if (!isHost) return;
            const idx = state.players.findIndex(p => p.id === botId);
            if (idx > -1) {
                const name = state.players[idx].name;
                state.players.splice(idx, 1);
                bc({ t: 'lobby_update', players: state.players });
                updateLobby();
                showToast(`${name} rimosso! 🗑️`);
            }
        }

        let isBotThinking = false;
        
        function checkBotTurn() {
            // LOGGING
            // console.log(`[BOT_CHECK] Phase:${state.phase} Thinking:${isBotThinking}`);

            if (!isHost || state.phase !== 'game' || isBotThinking) return;
            
            // 1. Check Pending Action (Targeting) - PRIORITY: Resolve interrupts even during animations if needed
            if (state.pending && state.pending.from !== undefined) {
                const pendingP = state.players[state.pending.from];
                if (pendingP && pendingP.isBot) {
                    console.log(`[BOT] Pending action for ${pendingP.name}: ${state.pending.t}`);
                    processBotTarget(pendingP, state.pending);
                    return;
                }
            }

            // Prevent bot action during dealing or shuffling OR active animations
            const isFlip3Active = state.players.some(p => p.flip3Active) || state.flip3Queue.length > 0;
            if (state.dealingPhase || state.isShuffling || state.dealingPaused || isFlip3Active) {
                // console.log(`[BOT_CHECK] Paused due to game state (Deal/Flip3)`);
                return;
            }

            // 2. Check Standard Turn
            const turnP = state.players[state.turn];
            if (turnP && turnP.isBot && turnP.st === 'active' && !state.pending) {
                console.log(`[BOT] Turn detected for ${turnP.name}. Pts: ${turnP.pts}`);
                processBotDecision(turnP);
            }
        }

        function processBotDecision(p) {
            isBotThinking = true;
            console.log(`[BOT] ${p.name} is thinking...`);
            
            // Simulated thinking time
            setTimeout(() => {
                // Re-validate state after delay
                if (state.turn !== state.players.findIndex(x => x.id === p.id) || p.st !== 'active' || state.pending) {
                    console.log(`[BOT] State changed during thought, aborting.`);
                    isBotThinking = false; return;
                }

                // RISK LOGIC: Hit if < 15, Stay if >= 15
                // Flip7 Strategy: Aggression boost if close to 7 unique nums
                let threshold = 15;
                if (p.nums.size >= 5) threshold = 17; // Risk more if close to Flip7

                // NEW STRATEGIES:
                // 1. If I have Second Chance (p.sc), I am IMMORTAL (kinda). HIT ALWAYS (Aggressive).
                // 2. If I USED Second Chance (p.scUsed), I am terrified. STAY ALWAYS (Conservative).
                
                let action = 'stay';

                if (p.scUsed) {
                    // Burned my extra life? Safe mode ON.
                    action = 'stay';
                } else if (p.sc) {
                    // Have extra life? YOLO mode ON.
                    // Hit unless I already have Flip 7 (obviously)
                    action = 'hit';
                } else {
                    // Standard Logic
                    action = p.pts < threshold ? 'hit' : 'stay';
                }
                
                console.log(`[BOT] ${p.name} decides: ${action.toUpperCase()} (Pts: ${p.pts}, SC: ${p.sc}, SC_Used: ${p.scUsed})`);
                
                // CRITICAL FIX: Reset flag BEFORE action to avoid race condition if updateGame happens synchronously
                isBotThinking = false;
                
                handleAct(p.id, action);
                
                // Extra check to ensure loop continues if still active (e.g. after hit)
                setTimeout(checkBotTurn, 500);
            }, 1500);
        }

        function processBotTarget(p, pending) {
            isBotThinking = true;
            console.log(`[BOT] ${p.name} selecting target for ${pending.t}...`);
            
            setTimeout(() => {
                // Validate
                if (!state.pending || state.pending.from !== state.players.findIndex(x => x.id === p.id)) {
                    isBotThinking = false; return;
                }

                let targets = state.players.map((pl, i) => ({ pl, i })).filter(x => x.pl.st === 'active' && x.pl.id !== p.id);
                let chosenIdx = -1;

                if (pending.t === 'give_sc') {
                     // Benevolent: Give to lowest Score
                     // Filter out those who have SC is handled by UI logic usually, but here manually
                     targets = targets.filter(x => !x.pl.sc);
                     // Sort Ascending Score (Help weak)
                     targets.sort((a, b) => a.pl.tot - b.pl.tot);
                     if (targets.length) chosenIdx = targets[0].i;
                } else {
                    // Aggressive: Freeze / Flip3 -> Highest Score
                    targets.sort((a, b) => b.pl.tot - a.pl.tot);
                    if (targets.length) chosenIdx = targets[0].i;
                }

                if (chosenIdx !== -1) {
                    const tgtP = state.players[chosenIdx];
                    console.log(`[BOT] Target selected: ${tgtP.name}`);
                    isBotThinking = false;
                    handleAct(p.id, 'tgt', chosenIdx);
                } else {
                    // Fallback to random if logic fails (shouldn't happen if targets exist)
                    const fallback = targets[0];
                    if (fallback) {
                         console.log(`[BOT] Fallback target: ${fallback.pl.name}`);
                         isBotThinking = false;
                         handleAct(p.id, 'tgt', fallback.i);
                    } else {
                         console.log(`[BOT] No targets available?!`);
                         isBotThinking = false;
                    }
                }
                
                setTimeout(checkBotTurn, 500);
            }, 2000);
        }

        let localLastRound = 0;

        function updateGame() {
            // FIX: Detect New Round and Force Reset Local State
            if (state.round > localLastRound) {
                localLastRound = state.round;
                localPlayerCardCounts = {};
                localAnimatingCards = {};
                // Force hide overlays
                const ro = qs('#recapOverlay');
                ro.classList.remove('active');
                ro.removeAttribute('data-round');
                qs('#endGameOverlay').style.display = 'none';
                qs('body').classList.remove('animation-blocked');

                // FORCE GAME CONTAINER VISIBILITY
                qs('#gameContainer').classList.add('active');
            }

            // General Visibility Safeguard
            if (state.phase === 'game' && !qs('#gameContainer').classList.contains('active')) {
                qs('#gameContainer').classList.add('active');
            }

            // SYNC SHUFFLE ANIMATION
            const shufflingDeck = qs('.deck');
            if (shufflingDeck) {
                if (state.isShuffling) shufflingDeck.classList.add('shuffling');
                else shufflingDeck.classList.remove('shuffling');
            }

            // Recap Overlay Logic
            const ro = qs('#recapOverlay');
            if (state.phase === 'recap') {
                if (!ro.classList.contains('active') || ro.getAttribute('data-round') != state.round) {
                    ro.setAttribute('data-round', state.round);
                    const sortedRound = [...state.players].sort((a, b) => b.pts - a.pts);
                    const tableHtml = `
                        <div class="recap-card glass" style="width:95%; max-width:450px; padding:20px; animation: scaleIn 0.5s;">
                            <h2 style="text-align:center; margin-bottom:15px; color:#fbbf24; font-size:24px;">Fine Round ${state.round - 1}</h2>
                            <table class="recap-table">
                                <thead><tr><th style="color:rgba(255,255,255,0.6)">Giocatore</th><th style="text-align:center">Round</th><th style="text-align:right">Totale</th></tr></thead>
                                <tbody>
                                    ${sortedRound.map((p, i) => `
                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1); height:40px;">
                                        <td style="display:flex; align-items:center; gap:10px;">
                                            <span style="font-weight:bold; color:${p.st === 'bust' ? '#ef4444' : 'white'}">${p.name}</span>
                                            ${p.st === 'bust' ? (window.emojiManager.getImg('collision') || '💥') : ''} ${i === 0 && p.st !== 'bust' ? (window.emojiManager.getImg('trophy') || '🏆') : ''}
                                        </td>
                                        <td style="text-align:center; font-weight:bold; color:${p.st === 'bust' ? '#ef4444' : '#fbbf24'}">${p.pts > 0 ? '+' : ''}${p.pts}</td>
                                        <td style="text-align:right; font-weight:bold;">${p.tot}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>

                        <button class="btn" style="width:100%; margin-top:20px;" onclick="isHost ? nextRoundCmd() : null" ${!isHost ? 'disabled style="opacity:0.5; cursor:default"' : ''}>
                            ${isHost ? 'Prossimo Round ➡️' : 'Attendi Host...'}
                        </button>
                        
                        <!-- RECAP REACTION BUTTON -->
                        <div style="position:relative; display:flex; justify-content:center; margin-top:15px;">
                            <button class="btn-recap-react" onclick="toggleRecapPicker(event)" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.2s;" onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'">
                                <img src="https://em-content.zobj.net/source/microsoft-teams/400/speech-balloon_1f4ac.png" style="height:30px; filter:drop-shadow(0 0 5px rgba(255,255,255,0.5));">
                            </button>
                            
                            <div id="recapReactionPicker" class="glass" style="display:none; position:absolute; bottom:60px; left:50%; transform:translateX(-50%); width:320px; grid-template-columns:repeat(6, 1fr); gap:6px; padding:10px; z-index:9999; border:1px solid rgba(255,255,255,0.2); box-shadow:0 10px 40px rgba(0,0,0,0.5); background:rgba(20,20,30,0.8); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);">
                                ${REACTIONS.map(r => `
                                    <div onclick="sendReaction('${r.id}')" style="cursor:pointer; padding:5px; border-radius:8px; display:flex; justify-content:center; align-items:center; transition:transform 0.2s;" onmouseenter="this.style.transform='scale(1.2)'" onmouseleave="this.style.transform='scale(1)'">
                                        <img src="${r.src}" style="width:32px; height:32px; pointer-events:none;">
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        </div >
                        `;
                    ro.innerHTML = tableHtml;
                    ro.classList.add('active');
                }
            } else {
                ro.classList.remove('active');
                ro.removeAttribute('data-round');
            }

            // Flip7 Celebration Sync - All players see it when someone gets Flip 7!
            const flip7Player = state.players.find(p => p.st === 'flip7');
            const f7o = qs('#flip7Overlay');
            if (flip7Player && f7o) {
                if (f7o.style.display !== 'flex') {
                    f7o.querySelector('.flip7-winner-name').innerText = flip7Player.name;
                    f7o.style.display = 'flex';
                    SFX.play('flip7');
                    fireConfetti('flip7');
                    // Auto-hide after 3 seconds
                    setTimeout(() => { f7o.style.display = 'none'; }, 3000);
                }
            }

            // End Game Screen - All players see it when state.phase === 'end'
            if (state.phase === 'end') {
                const ego = qs('#endGameOverlay');
                if (ego.style.display !== 'flex') {
                    // Find winner and sort leaderboard
                    const winner = state.players.find(p => p.tot >= 200);
                    const sortedPlayers = [...state.players].sort((a, b) => b.tot - a.tot);
                    const amIWinner = winner && winner.id === myId;

                    // Status message based on win/loss
                    if (amIWinner) {
                        const duration = 3000;
                        const end = Date.now() + duration;
                        (function frame() {
                            confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#A78BFA', '#fbbf24'] });
                            confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#A78BFA', '#fbbf24'] });
                            if (Date.now() < end) requestAnimationFrame(frame);
                        })();
                    }

                    const statusHtml = amIWinner ? `
                        <div style="font-size:60px; margin-bottom:10px;">👑</div>
                        <h1 style="font-size:42px; margin:0; background:linear-gradient(135deg, #fbbf24, #f59e0b, #eab308); -webkit-background-clip:text; -webkit-text-fill-color:transparent; text-shadow: 0 0 40px rgba(251, 191, 36, 0.5);">VITTORIA!</h1>
                        <p style="color:rgba(255,255,255,0.7); margin:10px 0;">Hai raggiunto ${winner.tot} punti!</p>
                    ` : `
                        <div style="font-size:50px; margin-bottom:10px; filter:grayscale(100%);">😔</div>
                        <h1 style="font-size:36px; margin:0; color:#888;">SCONFITTA</h1>
                        <p style="color:rgba(255,255,255,0.5); margin:10px 0;">${winner.name} ha vinto la partita</p>
                    `;
                    qs('#endGameStatus').innerHTML = statusHtml;

                    // Leaderboard
                    const medals = ['🥇', '🥈', '🥉'];
                    const leaderboardHtml = `
                        <h3 style="text-align:center; margin:0 0 15px; color:white; font-size:18px;">📊 Classifica Finale</h3>
                            ${sortedPlayers.map((p, i) => {
                        const isWinner = p.tot >= 200;
                        const isMe = p.id === myId;
                        return `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; margin:8px 0; border-radius:10px; 
                                    background:${isWinner ? 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.2))' : 'rgba(255,255,255,0.05)'}; 
                                    border:1px solid ${isWinner ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'};
                                    ${isWinner ? 'box-shadow: 0 0 20px rgba(251,191,36,0.3);' : ''}">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <span style="font-size:24px;">${medals[i] || `#${i + 1}`}</span>
                                        <span style="font-weight:${isWinner ? '700' : '500'}; color:${isWinner ? '#fbbf24' : 'white'};">
                                            ${p.name}${isMe ? ' (Tu)' : ''}
                                        </span>
                                    </div>
                                    <span style="font-size:20px; font-weight:700; color:${isWinner ? '#fbbf24' : '#A78BFA'};">${p.tot}</span>
                                </div>
                            `;
                    }).join('')
                        }
                    `;
                    qs('#endGameLeaderboard').innerHTML = leaderboardHtml;

                    const restartBtn = qs('#btnRestartGame');
                    if (restartBtn) {
                        if (!isHost) {
                            restartBtn.innerText = "Aspettando l'host...";
                            restartBtn.disabled = true;
                            restartBtn.style.opacity = 0.5;
                        } else {
                            restartBtn.innerText = "🔄 Nuova Partita";
                            restartBtn.disabled = false;
                            restartBtn.style.opacity = 1;
                        }
                    }

                    ego.style.display = 'flex';

                    // Render end-game stats charts
                    const statsContainer = qs('#endgameStatsContainer');
                    if (statsContainer) renderEndgameStats(statsContainer);

                    // Effects only for winner
                    if (amIWinner) {
                        SFX.play('win');
                        fireConfetti('win');
                    } else {
                        SFX.play('bust');
                    }
                }
                return; // Stop further updates when game ended
            }

            // Show header game status during game
            const hgs = qs('#headerGameStatus');
            if (hgs) hgs.style.display = 'flex';

            qs('#turnName').innerText = state.players[state.turn]?.name || '-';
            qs('#roundNum').innerText = state.round;
            qs('#deckCount').innerText = state.deck.length;

            // Update deck layer visibility based on remaining cards
            const layers = document.querySelectorAll('#deckLayers .deck-layer');
            if (layers.length) {
                const remaining = state.deck.length;
                const maxCards = 54; // Full deck size
                const ratio = remaining / maxCards;
                // Show 1-3 layers based on remaining cards
                layers[0].style.opacity = ratio > 0.3 ? 1 : 0; // Bottom layer
                layers[1].style.opacity = ratio > 0.15 ? 1 : 0; // Middle layer
                layers[2].style.opacity = remaining > 0 ? 1 : 0.3; // Top layer (always somewhat visible)
            }

            // BOT TRIGGER
            checkBotTurn();

            // Global Toast - visible to all clients
            if (state.globalToast && state.globalToast.id > localLastToastId) {
                showToast(state.globalToast.msg);
                localLastToastId = state.globalToast.id;
            }

            // Personal Score Update
            const meP = state.players.find(p => p.id === myId);
            if (meP && qs('#personalTot')) qs('#personalTot').innerText = meP.tot;

            // SIDEBAR UPDATES
            // 1. Leaderboard
            const sortedLeaderboard = [...state.players].sort((a, b) => b.tot - a.tot);
            const lbHtml = sortedLeaderboard.map((p, i) => {
                const isWinner = p.tot >= 200;

                // Rank Styling
                let rankClass = '';
                let rankTextStyle = '';
                let medalImg = '';

                if (i === 0) {
                    rankClass = 'rank-1';
                    rankTextStyle = 'rank-text-1';
                    medalImg = `<img src="${FLUENT_BASE}/Activities/1st%20Place%20Medal.png" style="height:24px; margin-right:8px;">`;
                } else if (i === 1) {
                    rankClass = 'rank-2';
                    rankTextStyle = 'rank-text-2';
                    medalImg = `<img src="${FLUENT_BASE}/Activities/2nd%20Place%20Medal.png" style="height:24px; margin-right:8px;">`;
                } else if (i === 2) {
                    rankClass = 'rank-3';
                    rankTextStyle = 'rank-text-3';
                    medalImg = `<img src="${FLUENT_BASE}/Activities/3rd%20Place%20Medal.png" style="height:24px; margin-right:8px;">`;
                }

                return `<div class="leaderboard-row ${p.id === myId ? 'me' : ''} ${rankClass}" style="${isWinner ? 'color:#fbbf24; font-weight:bold' : ''}">
                    <div style="display:flex; align-items:center;">
                        ${medalImg}
                        <span class="${rankTextStyle}">${i + 1}. ${p.name} ${p.id === myId ? '(Tu)' : ''}</span>
                        ${isWinner ? `<img src="${ASSETS.crown}" style="height:20px; margin-left:6px;">` : ''}
                    </div>
                    <span class="${rankTextStyle}" style="font-weight:bold; font-size:16px;">${p.tot}</span>
                </div>`;
            }).join('');
            qs('#sidebarLeaderboardContent').innerHTML = lbHtml;

            // 2. History
            const historyHtml = state.history ? state.history.map(h => {
                const isSpecial = h.type === 'special';
                const isBust = h.type === 'bust';

                let text = h.t;
                let iconSrc = '';

                // Base Style with Flexbox
                let style = 'padding:10px 12px; margin-bottom:8px; border-radius:12px; font-size:13px; backdrop-filter:blur(5px); display:flex; align-items:center; gap:10px; line-height:1.4;';

                // Theme & Icon Logic
                if (text.includes('Freeze') || text.includes('❄️')) {
                    iconSrc = ASSETS.snowflake;
                    style += 'background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:#fff;'; // Blue
                    text = text.replace(/❄️/g, '').trim();
                }
                else if (text.includes('Flip 3') || text.includes('⚡')) {
                    iconSrc = ASSETS.lightning;
                    style += 'background:rgba(251,191,36,0.15); border:1px solid rgba(251,191,36,0.3); color:#fff;'; // Amber
                    text = text.replace(/⚡/g, '').trim();
                }
                else if (text.includes('Second Chance') || text.includes('❤️')) {
                    const heartIcon = ASSETS.sc || ASSETS.heart || 'https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Smilies/Red%20Heart.png';
                    iconSrc = heartIcon;
                    style += 'background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#fff;'; // Red
                    text = text.replace(/❤️/g, '').trim();
                }
                else if (isBust || text.includes('sballato') || text.includes('💥')) {
                    iconSrc = `${FLUENT_BASE}/Smilies/Bomb.png`; // Bomb Icon
                    style += 'background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#fff; box-shadow:0 0 15px rgba(239,68,68,0.4); animation: pulseRed 2s infinite;';
                    text = text.replace(/💥/g, '').trim();
                }
                else if (text.includes('🔥')) {
                    iconSrc = ASSETS.fire || `${FLUENT_BASE}/Travel%20and%20places/Fire.png`;
                    style += 'background:rgba(249,115,22,0.15); border:1px solid rgba(249,115,22,0.3); color:#fff;';
                    text = text.replace(/🔥/g, '').trim();
                }
                else {
                    style += 'background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.8);';
                }

                const imgHtml = iconSrc ? `<img src="${iconSrc}" style="width:28px; height:28px; object-fit:contain; flex-shrink:0; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">` : '';

                return `<div class="history-item" style="${style}">
                    ${imgHtml}
                    <span>${text}</span>
                </div>`;
            }).join('') : '';
            qs('#sidebarHistoryContent').innerHTML = historyHtml || '<div style="text-align:center; padding:20px; color:var(--text-secondary); font-style:italic">Nessuna azione ancora...</div>';

            // DYNAMIC DECK DEPTH
            const deckEl = qs('.deck');
            if (deckEl) {
                const depth = Math.min(12, Math.ceil(state.deck.length / 4)); // 1px depth per 4 cards
                const solidShadow = `0 ${depth}px 0 #5b21b6`;
                const softShadow = `0 ${depth + 10}px 20px rgba(0, 0, 0, 0.3)`;
                deckEl.style.boxShadow = `${solidShadow}, ${softShadow} `;
                deckEl.style.transform = `translateY(-${depth}px)`; // Move up as it grows down to keep center relative
                deckEl.style.transition = 'all 0.3s ease';
            }

            // Check for pending actions to show modal (for clients)
            if (state.pending && state.pending.from === state.players.findIndex(p => p.id === myId)) {
                showTgt();
            }

            // Remove old scoreboard updates
            // qs('#scoreRows').innerHTML = ...

            // Use new dynamic layout routing
            smartRenderLayout();

            const meIdx = state.players.findIndex(p => p.id === myId);
            const me = state.players[meIdx];
            const canAct = meIdx === state.turn && me?.st === 'active';
            const isGame = state.phase === 'game';
            qs('#btnHit').disabled = !canAct || state.pending || !isGame;
            qs('#btnStay').disabled = !canAct || state.pending || !isGame;
            if (state.pending?.from === meIdx) showTgt();

            // Enable Reaction Button if game is active OR in recap
            if (state.phase === 'game' || state.phase === 'recap') {
                qs('#btnReact').disabled = false;
                qs('#btnStats').disabled = false;
            } else {
                qs('#btnReact').disabled = true;
                qs('#btnStats').disabled = true;
            }

            // GEOMETRY-BASED FLY-IN ANIMATION
            requestAnimationFrame(() => {
                const flyCards = document.querySelectorAll('.card.fly-in');
                if (flyCards.length === 0) return;

                // Find the deck element (visible in UI)
                const deckEl = document.querySelector('.deck');
                if (!deckEl) return;

                const deckRect = deckEl.getBoundingClientRect();
                const deckCenterX = deckRect.left + deckRect.width / 2;
                const deckCenterY = deckRect.top + deckRect.height / 2;

                flyCards.forEach(card => {
                    // Check if we already set values to avoid resetting animation
                    if (card.style.getPropertyValue('--tx')) return;

                    // Calculate target position (current position because it's rendered in place)
                    const cardRect = card.getBoundingClientRect();
                    const cardCenterX = cardRect.left + cardRect.width / 2;
                    const cardCenterY = cardRect.top + cardRect.height / 2;

                    // Vector from Deck to Card
                    // We want: Initial = Deck. Final = Card.
                    // Transform Translate is relative to current position.
                    // If we want it to START at Deck, we need to translate by (Deck - Card).
                    const tx = deckCenterX - cardCenterX;
                    const ty = deckCenterY - cardCenterY;

                    card.style.setProperty('--tx', `${tx}px`);
                    card.style.setProperty('--ty', `${ty}px`);

                    // Unpause animation now that variables are set
                    card.style.animationPlayState = 'running';
                });
            });
        }

        function showRoom() {
            qs('#hostControls').style.display = 'none';
            qs('#roomInfo').style.display = 'block';
            updateRoomLinkInfo();
            updateLobby();
        }

        function updateRoomLinkInfo() {
            const url = location.href;
            qs('#qrcode').innerHTML = '';
            new QRCode(qs('#qrcode'), { text: url, width: 128, height: 128 });
        }

        window.copyRoomLink = () => { navigator.clipboard.writeText(location.href); showToast('Link copiato!'); };

        function updateLobby() {
            // FIX: Only show roomInfo if I am the host OR if I am in the player list (joined)
            const amIInList = state.players.some(p => p.id === myId);
            
            // Check if I am the first player (Host)
            if (state.players.length > 0 && state.players[0].id === myId) {
                isHost = true;
            }

            if (isHost || amIInList) {
                qs('#roomInfo').style.display = 'block';
            } else {
                qs('#roomInfo').style.display = 'none';
            }

            qs('.room-link').style.display = 'block';
            if (qs('#qrcode').innerHTML === '') updateRoomLinkInfo();
            qs('#playersList').innerHTML = state.players.map((p, i) => {
                const isBot = p.isBot;
                const icon = isBot ? '<img src="https://raw.githubusercontent.com/sjmvne/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png" style="height:20px; vertical-align:middle; margin-left:5px;">' : '';
                
                // Animation Logic
                let animClass = '';
                if (!renderedPlayerIds.has(p.id)) {
                    renderedPlayerIds.add(p.id);
                    animClass = 'pop-in';
                }

                // REMOVE BUTTON (Host Only, for Bots)
                let removeBtn = '';
                if (isHost && isBot) {
                    removeBtn = `<span onclick="removeBot('${p.id}')" style="cursor:pointer; margin-left:auto; opacity:0.6; font-size:16px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:rgba(255,255,255,0.1); transition:all 0.2s;" onmouseenter="this.style.background='rgba(239,68,68,0.5)'; this.style.opacity='1'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'; this.style.opacity='0.6'" title="Rimuovi Bot">✕</span>`;
                }

                return `<div class="player-item ${i === 0 ? 'host' : ''} ${animClass}" style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center;">
                        ${p.name}${icon}${p.id === myId ? ' (Tu)' : ''} ${i === 0 ? '👑' : ''}
                    </div>
                    ${removeBtn}
                </div>`
            }).join('');

            // ADD BOT BUTTON (Only for Host)
            if (isHost && state.players.length < 18) {
                const addBotBtn = document.createElement('div');
                addBotBtn.className = 'player-item add-bot-btn';
                // Apple Style Row: Transparent background, flex layout
                addBotBtn.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:12px; cursor:pointer; opacity:1; transition:all 0.2s; background:transparent; border:none; padding:12px;';
                
                // Icon: Green Circle with Plus
                const iconHtml = `
                    <div style="
                        width: 32px; height: 32px; 
                        background: linear-gradient(135deg, #34C759, #30D158); 
                        border-radius: 50%; 
                        display: flex; align-items: center; justify-content: center; 
                        box-shadow: 0 4px 10px rgba(52, 199, 89, 0.3);
                        font-size: 20px; font-weight: bold; color: white;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                    ">+</div>
                `;
                
                // Text: Clean, Apple-like font
                const textHtml = `
                    <span style="font-size:16px; font-weight:600; color:rgba(255,255,255,0.9);">
                        Aggiungi Bot
                    </span>
                `;
                
                addBotBtn.innerHTML = iconHtml + textHtml;
                
                addBotBtn.onclick = addBot;
                addBotBtn.onmouseenter = () => { addBotBtn.style.transform = 'scale(1.05)'; addBotBtn.style.opacity = '1'; };
                addBotBtn.onmouseleave = () => { addBotBtn.style.transform = 'scale(1)'; addBotBtn.style.opacity = '0.9'; };
                qs('#playersList').appendChild(addBotBtn);
            }

            const statusMsg = isHost ? "In attesa di partecipanti..." : "In attesa che l'host avvii la partita...";
            qs('#lobbyStatusMsg').innerText = statusMsg;

            // HIDE OLD BUTTONS
            qs('#btnAddBot').style.display = 'none'; // Force hide old
            
            if (isHost && state.players.length >= 2) qs('#btnStartGame').style.display = 'inline-block';
            else qs('#btnStartGame').style.display = 'none';

            // UX: Dynamic Title and Input Hiding
            if (roomId && roomId.startsWith('flip7-')) {
                const code = roomId.replace('flip7-', '');
                qs('.lobby h2').innerText = `Stanza ${code}`;
                qs('.lobby h2').style.fontFamily = 'monospace';
                qs('.lobby h2').style.letterSpacing = '1px';

                // Hide inputs if I am in the player list
                const me = state.players.find(p => p.id === myId);
                if (me) {
                    qs('#nickname').style.display = 'none';
                    // Safety hide others
                    qs('#btnCreateRoom').style.display = 'none';
                    qs('#btnShowJoin').style.display = 'none';
                    qs('#joinCodeArea').style.display = 'none';
                }
            }

            // Update QR Label
            const qrLabel = qs('#qrcode-container span');
            if (qrLabel && qrLabel.innerText.includes('Scansiona')) {
                qrLabel.innerText = "Fai scansionare ad un amico per farlo unire!";
            }
        }



        // LEFT SIDEBAR LOGIC
        window.toggleLeftSidebar = () => {
            const sidebar = qs('#leftSidebarDisplay');
            if (!sidebar) return;
            const content = sidebar.querySelector('.sidebar-content');
            const backdrop = sidebar.querySelector('.sidebar-backdrop');

            // CRITICAL: Ensure isHost is correct (if I am the owner of the roomId)
            if (roomId && myId && roomId === myId) isHost = true;

            // Clear any pending classes if switching rapidly
            if (content) content.classList.remove('closing');
            if (backdrop) backdrop.classList.remove('closing');

            if (sidebar.style.display === 'block') {
                SFX.play('slide_out');
                content.classList.add('closing');
                if (backdrop) backdrop.classList.add('closing');

                content.addEventListener('animationend', () => {
                    sidebar.style.display = 'none';
                    content.classList.remove('closing');
                    if (backdrop) backdrop.classList.remove('closing');
                }, { once: true });
            } else {
                SFX.play('slide_in');
                sidebar.style.display = 'block';
                // Update Room Code Area
                const codeArea = qs('#menuRoomCodeArea');
                const codeText = qs('#menuTypeRoomCode');
                const exitBtn = qs('#menuExitBtn');
                const shareArea = qs('#menuShareArea');
                if (roomId && roomId.startsWith('flip7-')) {
                    const code = roomId.replace('flip7-', '');
                    if (codeText) codeText.innerText = code;
                    if (codeArea) codeArea.style.display = 'block';
                    if (shareArea) shareArea.style.display = 'flex';
                    if (exitBtn) exitBtn.style.display = 'flex';
                } else {
                    if (codeArea) codeArea.style.display = 'none';
                    if (shareArea) shareArea.style.display = 'none';
                    if (exitBtn) exitBtn.style.display = 'none';
                }
            }
        };

        // Logic for Room Code
        qs('#btnShowJoin').onclick = () => {
            qs('#btnCreateRoom').style.display = 'none';
            qs('#btnShowJoin').style.display = 'none';
            qs('#joinCodeArea').style.display = 'block';
            qs('#roomCodeInput').focus();
        };

        qs('#roomCodeInput').oninput = (e) => {
            const val = e.target.value.trim().toUpperCase();
            if (val.length > 0) {
                const newHash = `flip7-${val}`;
                if (location.hash !== '#' + newHash) {
                    history.replaceState(null, null, `#${newHash}`);
                }
                roomId = newHash;
            } else {
                history.replaceState(null, null, ' ');
                roomId = null;
            }
        };

        function handleHashChange() {
            const h = location.hash.slice(1);
            if (h?.startsWith('flip7-')) {
                // If arriving via link or pasting URL
                const code = h.split('-')[1];
                qs('#roomCodeInput').value = code || '';

                qs('#btnCreateRoom').style.display = 'none';
                qs('#btnShowJoin').style.display = 'none';
                qs('#joinCodeArea').style.display = 'block';

                if (!isHost) qs('.lobby h2').innerText = "Unisciti alla partita";
                qs('#nickname').focus();
                roomId = h;
                if (window.isCreatingRoom) {
                    showToast('✅ Stanza creata!');
                    window.isCreatingRoom = false;
                } else {
                    showToast('🔗 Codice stanza rilevato!');
                }
                updateLobby();
            }
        }

        // CARD BACK CONFIG


        let currentBackIdx = 0;

        function openCardBackModal() {
            if (qs('#leftSidebarDisplay')) toggleLeftSidebar(); // Close sidebar if open
            qs('#cardBackModal').classList.add('active');

            // Find current index
            const currentSrc = window.userCardBack || 'assets/cards/back.webp';
            const found = BACKS.findIndex(b => currentSrc.includes(b.src) || (b.id === 'back' && currentSrc.includes('back.webp')));
            currentBackIdx = found !== -1 ? found : 0;
            renderBackCarousel();
        }

        function renderBackCarousel() {
            const item = BACKS[currentBackIdx];
            const img = qs('#cbImage');
            // Animation reset
            img.style.animation = 'none';
            img.offsetHeight; /* trigger reflow */
            img.style.animation = 'float 3s ease-in-out infinite';

            img.src = item.src;
            qs('#cbName').innerText = item.name;
            qs('#cbDesc').innerText = item.desc;

            // Update Counter
            qs('#cbCounter').innerText = `${currentBackIdx + 1} / ${BACKS.length}`;
        }

        function nextBack() {
            currentBackIdx = (currentBackIdx + 1) % BACKS.length;
            renderBackCarousel();
        }
        function prevBack() {
            currentBackIdx = (currentBackIdx - 1 + BACKS.length) % BACKS.length;
            renderBackCarousel();
        }

        function selectCurrentBack() {
            const item = BACKS[currentBackIdx];
            window.userCardBack = item.src;

            // Update DOM
            document.querySelectorAll('.card.back, .deck-back-img').forEach(img => {
                img.src = window.userCardBack;
            });
            document.documentElement.style.setProperty('--card-back-url', `url('${window.userCardBack}')`);

            showToast(`Dorso impostato: ${item.name}`);
            qs('#cardBackModal').classList.remove('active');
        }

        const cardImages = {};
        const assets = [
            'back', 'action_flip3', 'action_freeze', 'action_second_chance',
            'modifier_+2', 'modifier_+4', 'modifier_+6', 'modifier_+8', 'modifier_+10', 'modifier_x2',
            'number_0', 'number_1', 'number_3', 'number_4', 'number_5', 'number_6', 'number_7', 'number_8', 'number_9', 'number_10', 'number_11', 'number_12'
        ];

        function preloadImages() {
            assets.forEach(name => {
                const img = new Image();
                img.src = `assets/cards/${name}.webp`; //NON MODIFICARE QUESTA RIGA!
                cardImages[name] = img;
            });
        }
        // === SIDEBAR FEATURES LOGIC ===

        function toggleAudio(enabled) {
            SFX.enabled = enabled;
            Howler.mute(!enabled);
            showToast(enabled ? (window.emojiManager.getImg('loud sound') || "🔊") + " Audio attivato" : (window.emojiManager.getImg('speaker with cancellation stroke') || "🔇") + " Audio disattivato");
        }

        function changeTheme(theme, silent = false) {
            const body = document.body;
            // Simple background switch - can be enhanced with classes
            if (theme === 'casino') {
                body.style.background = 'radial-gradient(circle at center, #166534, #052e16)';
                body.style.setProperty('--primary', '#22c55e');
                body.style.setProperty('--accent', '#facc15');
                body.style.color = '#ffffff';
            } else if (theme === 'deepblue') {
                body.style.background = 'radial-gradient(circle at center, #1e3a8a, #0f172a)';
                body.style.setProperty('--primary', '#3b82f6');
                body.style.setProperty('--accent', '#60a5fa');
                body.style.color = '#ffffff';
            } else if (theme === 'minimalist') {
                // Dark Minimalist: Black bg, White text, visible borders
                body.style.background = '#000000';
                body.style.color = '#ffffff';
                body.style.setProperty('--primary', '#ffffff');
                body.style.setProperty('--accent', '#a3a3a3');
            } else if (theme === 'glass') {
                // Distinct Glass: Gray/Silver smooth gradient
                body.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)';
                body.style.setProperty('--primary', '#334155');
                body.style.setProperty('--accent', '#475569');
                body.style.color = '#0f172a'; // Darker text for glass
            } else {
                // Default Viola Notte
                body.style.background = '';
                body.style.setProperty('--primary', '#8B5CF6');
                body.style.setProperty('--accent', '#C084FC');
                body.style.color = 'white';
            }
            if (!silent) showToast("Tema aggiornato! " + (window.emojiManager ? window.emojiManager.getImg('artist palette') : '🎨'));
        }

        // Card Back Logic
        window.userCardBack = 'assets/cards/back.webp'; // Default

        function changeCardBack(val) {
            if (val === 'back') {
                window.userCardBack = 'assets/cards/back.webp';
            } else {
                // Assuming assets/cards/custom_backs/ exists or logic handles it
                // The user prompt implied these paths exist.
                window.userCardBack = `assets/cards/${val}.webp`;
            }

            // Update all existing back cards in DOM
            document.querySelectorAll('.card.back, .deck-back-img').forEach(img => {
                img.src = window.userCardBack;
            });

            // Also update deck layers if possible
            const deckLayers = document.styleSheets[0]; // Logic for deck layers is in CSS pseudo-elements?
            // The deck shuffling uses ::before/::after with background-image.
            // We need to update CSS variables for deck back?
            // Deck shuffling uses: .deck.shuffling::before { background: url(...) }
            // Let's set a CSS variable for the deck back
            document.documentElement.style.setProperty('--card-back-url', `url('${window.userCardBack}')`);

            showToast("Dorso carte cambiato! " + (window.emojiManager.getImg('flower playing cards') || "🎴"));
        }

        function shareRoom(platform) {
            if (!roomId) {
                showToast((window.emojiManager.getImg('warning') || "⚠️") + " Devi prima creare o unirti a una stanza!");
                return;
            }
            const code = roomId.replace('flip7-', '');
            const url = window.location.href; // Contains hash
            const text = `Gioca a Flip 7 con me! 🃏\nCodice Stanza: *${code}*\nClicca qui: ${url}`;

            if (platform === 'whatsapp') {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            } else if (platform === 'telegram') {
                window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
            }
        }

        // Tutorial Logic
        let currentTutSlide = 1;
        const totalTutSlides = 4;

        function openTutorial() {
            // If sidebar is open, close it
            if (qs('#leftSidebarDisplay').style.display === 'block') {
                toggleLeftSidebar();
            }
            qs('#tutorialModal').classList.add('active');
            showTutSlide(1);
        }

        function showTutSlide(n) {
            currentTutSlide = n;
            document.querySelectorAll('.tut-slide').forEach(s => s.classList.remove('active'));
            qs(`#tut-slide-${n}`).classList.add('active');

            // Update dots
            const dotsContainer = qs('#tutDots');
            dotsContainer.innerHTML = '';
            for (let i = 1; i <= totalTutSlides; i++) {
                const d = document.createElement('div');
                d.className = `tut-dot ${i === n ? 'active' : ''}`;
                dotsContainer.appendChild(d);
            }

            // Buttons
            qs('#btnPrevTut').disabled = n === 1;
            qs('#btnNextTut').innerText = n === totalTutSlides ? "Capito!" : "Avanti";
            qs('#btnNextTut').onclick = n === totalTutSlides ? () => qs('#tutorialModal').classList.remove('active') : nextTutSlide;
        }

        function nextTutSlide() {
            if (currentTutSlide < totalTutSlides) showTutSlide(currentTutSlide + 1);
        }

        function prevTutSlide() {
            if (currentTutSlide > 1) showTutSlide(currentTutSlide - 1);
        }

        window.onload = () => {
            if (SFX.init) SFX.init();
            preloadImages();
            handleHashChange();

            // PERSISTENCE HOOKS
            const btnCreate = qs('#btnCreateRoom');
            const btnJoin = qs('#btnJoinRoom');

            if (btnCreate) btnCreate.addEventListener('click', () => {
                saveSession(qs('#nickname').value, null);
            });

            if (btnJoin) btnJoin.addEventListener('click', () => {
                const nick = qs('#nickname').value;
                const code = qs('#roomCodeInput').value;
                saveSession(nick, code);

                if (!nick || !code) return;

                showToast('⏳ Connessione in corso...');

                showToast('⏳ Connessione in corso...');
            });
        };
        window.onhashchange = handleHashChange;

        function showToast(msg) {
            const t = qs('#customToast');
            t.innerHTML = msg;
            t.classList.add('active');
            setTimeout(() => t.classList.remove('active'), 3000);
        }

        // Broadcast Toast for action announcements (visible to ALL players)
        function showBroadcastToast(type, fromName, targetName = null) {
            const getE = (key, fallback) => {
                const img = window.emojiManager ? window.emojiManager.getImg(key) : null;
                return img && img !== key ? img : fallback;
            };

            const configs = {
                freeze: { icon: getE('snowflake', '❄️'), msg: `${fromName} congela ${targetName}!`, cls: 'freeze' },
                freeze_self: { icon: getE('snowflake', '❄️'), msg: `${fromName} si congela!`, cls: 'freeze' },
                freeze_self_forced: { icon: getE('snowflake', '❄️'), msg: `${fromName} è l'ultimo rimasto, viene congelato!`, cls: 'freeze' },
                flip3: { icon: getE('high voltage', '⚡'), msg: `${fromName} fa pescare 3 carte a ${targetName}!`, cls: 'flip3' },
                flip3_self: { icon: getE('high voltage', '⚡'), msg: `${fromName} pesca 3 carte!`, cls: 'flip3' },
                give_sc: { icon: getE('red heart', '❤️'), msg: `${fromName} dona Second Chance a ${targetName}!`, cls: 'second-chance' },
                // deal_resume: { icon: '🎴', msg: 'Azione risolta, riprendiamo il dealing!', cls: 'freeze' },
                rejoin: { icon: getE('waving hand', '👋'), msg: `${fromName} è tornato in partita!`, cls: 'second-chance' },
                disconnect: { icon: getE('warning', '⚠️'), msg: `${fromName} disconnesso (Auto-Stay)`, cls: 'freeze' },
                meme_mode: { icon: getE('performing arts', '🎭'), msg: `MEME MODE ATTIVATA DA ${fromName}!`, cls: 'flip3' }
            };
            const cfg = configs[type];
            if (!cfg) return;

            const toast = document.createElement('div');
            toast.className = `broadcast-toast ${cfg.cls}`;
            toast.innerHTML = `<span style="font-size:32px;">${cfg.icon}</span><span>${cfg.msg}</span>`;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
                setTimeout(() => toast.remove(), 300);
            }, 2800);
        }

        // FIX 1: Splashscreen for SC burn when alone (broadcast to all)
        function showSCBurnAloneSplash(playerName) {
            const splash = qs('#cardSplash');
            const isMe = state.players.find(p => p.name === playerName)?.id === myId;
            const title = isMe ? 'Hai già una Second Chance!' : `${playerName} ha già Second Chance!`;
            splash.innerHTML = `
                <div class="splash-title second_chance" style="font-size: 24px;">${title}</div>
                <div class="splash-card">
                    <img src="assets/cards/action_second_chance.webp" style="width:100%; height:100%; object-fit:contain; border-radius:10px; animation: burnCard 2s forwards;">
                </div>
                <div style="color: #ff6b35; font-size: 16px; margin-top: 10px;">Ultimo rimasto - La carta brucia! 🔥</div>
            `;
            splash.classList.add('active');
            setTimeout(() => splash.classList.remove('active'), (state && state.memeMode) ? 10000 : 2000);
        }

        // FIX 2: Personalized splashscreen - shows WHO drew the action card
        function showCardSplash(cardValue, whoName = null) {
            const names = { freeze: 'FREEZE!', flip3: 'FLIP THREE!', second_chance: 'SECOND CHANCE!' };
            const splash = qs('#cardSplash');

            // Determine if this is me or another player
            const isMe = whoName && state.players.find(p => p.name === whoName)?.id === myId;
            const whoText = isMe ? 'Hai pescato' : (whoName ? `${whoName} ha pescato` : 'Pescata');

            splash.innerHTML = `
                <div class="splash-title ${cardValue}">${names[cardValue] || cardValue.toUpperCase()}</div>
                <div class="splash-card">
                    <img src="assets/cards/action_${cardValue}.webp" style="width:100%; height:100%; object-fit:contain; border-radius:10px;">
                </div>
                <div style="color: white; font-size: 18px; margin-top: 12px; font-weight: 600; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                    ${whoText} ${names[cardValue] || cardValue}!
                </div>
            `;
            splash.classList.add('active');
            setTimeout(() => splash.classList.remove('active'), (state && state.memeMode) ? 10000 : 2000);
        }

        // PWA INSTALL LOGIC
        let deferredPrompt;

        // Wrap in load event to ensure HTML is parsed
        window.addEventListener('load', () => {
            const installBanner = document.getElementById('installBanner');
            if (!installBanner) return;

            // Check if already installed (Standalone mode)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

            // Hide banner if already installed
            if (!isStandalone) {
                // Android / Desktop - Capture event
                window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                    deferredPrompt = e;
                    // Show banner after short delay
                    setTimeout(() => installBanner.classList.add('visible'), 3000);
                });

                // iOS Detection - Show banner anyway if iOS
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                if (isIOS) {
                    setTimeout(() => installBanner.classList.add('visible'), 3000);
                }
            }
        });

        function installApp() {
            const installBanner = document.getElementById('installBanner');
            // Android / Desktop Native Prompt
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        installBanner.classList.remove('visible');
                    }
                    deferredPrompt = null;
                });
            }
            // iOS Instructions
            else {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                if (isIOS) {
                    document.getElementById('iosPwaModal').classList.add('active');
                } else {
                    showToast("Premi l'icona di installazione nella barra del browser!");
                }
            }
        }
        // === THEME MODAL LOGIC ===
        function openThemeModal() {
            if (qs('#leftSidebarDisplay')) toggleLeftSidebar();
            qs('#themeModal').classList.add('active');
            renderThemeList();
        }

        function renderThemeList() {
            const container = qs('#themeList');
            container.innerHTML = '';

            const themes = [
                { id: 'default', name: 'Viola Notte', colors: 'linear-gradient(135deg, #1a1625, #2d1f47)' },
                { id: 'casino', name: 'Verde Casinò', colors: 'linear-gradient(135deg, #064e3b, #10b981)' },
                { id: 'deepblue', name: 'Blu Profondo', colors: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' },
                { id: 'cyberpunk', name: 'Cyberpunk', colors: 'linear-gradient(135deg, #050510, #00f0ff)' },
                { id: 'minimalist', name: 'Minimalist', colors: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' },
                { id: 'velvet', name: 'Velvet', colors: 'linear-gradient(135deg, #4c0519, #881337)' },
                { id: 'glass', name: 'Glassmorphism', colors: 'linear-gradient(135deg, #64748b, #cbd5e1)' }
            ];

            const current = (SFX.themes && SFX.currentThemeIdx >= 0) ? SFX.themes[SFX.currentThemeIdx] : 'default';

            themes.forEach(t => {
                const isSelected = t.id === current;
                const div = document.createElement('div');
                div.className = `theme-option ${isSelected ? 'selected' : ''}`;
                div.onclick = () => { selectTheme(t.id); };
                div.innerHTML = `
                        <div class="theme-preview" style="background:${t.colors}"></div>
                        <div style="flex:1;">
                            <div style="font-weight:bold; color:var(--text);">${t.name}</div>
                            ${isSelected ? '<div style="font-size:11px; color:var(--primary);">Attivo</div>' : ''}
                        </div>
                        ${isSelected ? '✅' : ''}
                     `;
                container.appendChild(div);
            });
        }

        function selectTheme(id) {
            if (SFX.setTheme) {
                SFX.setTheme(id);
                // Sync index logic handled in SFX or here
                // Update external check
                const idx = SFX.themes.indexOf(id);
                if (idx !== -1) SFX.currentThemeIdx = idx;
            } else {
                // Fallback if SFX logic incomplete
                changeTheme(id);
            }

            renderThemeList(); // Re-render to update selection
            if (SFX.play) SFX.play('click');
        }

        // === RULES TAB LOGIC (REWRITTEN) ===
        function switchRuleTab(tab) {
            // Update Buttons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const btns = document.querySelectorAll('.rules-tabs .tab-btn');
            if (tab === 'basics' && btns[0]) btns[0].classList.add('active');
            if (tab === 'actions' && btns[1]) btns[1].classList.add('active');
            if (tab === 'scoring' && btns[2]) btns[2].classList.add('active');

            // Update Content Visibility
            const basicC = qs('#rule-basics');
            const actionC = qs('#rule-actions');
            const scoreC = qs('#rule-scoring'); // New container

            if (basicC) basicC.style.display = tab === 'basics' ? 'block' : 'none';
            if (actionC) actionC.style.display = tab === 'actions' ? 'block' : 'none';
            if (scoreC) scoreC.style.display = tab === 'scoring' ? 'block' : 'none';

            // Populate Content if empty
            const getE = (k, f) => window.emojiManager && window.emojiManager.getUrl(k) ? window.emojiManager.getImg(k) : f;

            if (tab === 'actions' && actionC && actionC.innerHTML === '') {
                actionC.innerHTML = `
                        <div class="premium-card" style="margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                                <strong style="color:var(--freeze);">${getE('snowflake', '❄️')} FREEZE (3)</strong>
                                <span style="font-size:10px; opacity:0.6;">OBBLIGATORIO</span>
                            </div>
                            <div style="font-size:12px; opacity:0.8; line-height:1.4;">
                                Se rivelata, <strong>scegli un giocatore</strong>. Quel giocatore (anche tu se sei l'unico) DEVE fermarsi (Stay) immediatamente. Non può più pescare.
                            </div>
                        </div>
                        <div class="premium-card" style="margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                                <strong style="color:var(--text-gold);">${getE('high voltage', '⚡')} FLIP 3 (3)</strong>
                                <span style="font-size:10px; opacity:0.6;">RISCHIO</span>
                            </div>
                            <div style="font-size:12px; opacity:0.8; line-height:1.4;">
                                <strong>Scegli un giocatore</strong>. Quel giocatore riceve 3 carte, rivelate UNA alla volta. Rischio bust alto! Se ottiene 7 numeri diversi durante Flip 3, vince subito il bonus!
                            </div>
                        </div>
                        <div class="premium-card">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                                <strong style="color:var(--text-danger);">${getE('red heart', '❤️')} SECOND CHANCE (3)</strong>
                            </div>
                            <div style="font-size:12px; opacity:0.8; line-height:1.4;">
                                Ti protegge UNA VOLTA da un numero duplicato. Se peschi un doppione, scarta questa carta e il doppione. Continui a giocare. (Non protegge da Freeze!)
                            </div>
                        </div>
                     `;
            }

            if (tab === 'scoring' && scoreC && scoreC.innerHTML === '') {
                scoreC.innerHTML = `
                        <div class="premium-card" style="margin-bottom:10px;">
                             <div style="color:var(--text-success); font-weight:bold; margin-bottom:5px;">${getE('party popper', '🎉')} BONUS FLIP 7 (+15 Punti)</div>
                             <div style="font-size:12px; opacity:0.8;">
                                 Ottieni esattamente <strong>7 carte NUMERO diverse</strong> (0-12).<br>
                                 Il round termina SUBITO. Prendi 15 punti extra + la somma delle carte.
                             </div>
                        </div>
                        <div class="premium-card" style="margin-bottom:10px;">
                             <div style="color:var(--primary-light); font-weight:bold; margin-bottom:5px;">${getE('multiply', '✖️')} MOLTIPLICATORE x2</div>
                             <div style="font-size:12px; opacity:0.8;">
                                 Raddoppia la somma delle sole Carte Numero. Le carte +2, +10 ecc. vengono aggiunte DOPO e non moltiplicate.
                             </div>
                        </div>
                        <div class="premium-card">
                             <div style="color:var(--text-accent); font-weight:bold; margin-bottom:5px;">${getE('plus', '➕')} ADDIZIONI (+2, +10...)</div>
                             <div style="font-size:12px; opacity:0.8;">
                                 Si sommano al totale finale. Contano solo se NON sballi (Bust).
                             </div>
                        </div>
                     `;
            }
        }

        // Carousel Enhancement
        function updateCarouselAnim(direction) {
            const img = qs('#cbImage');
            if (!img) return;
            img.style.animation = 'none';
            img.offsetHeight;
            img.style.animation = direction === 'next' ? 'slideInRight 0.3s ease, cardFloat 3s ease-in-out infinite' : 'slideInLeft 0.3s ease, cardFloat 3s ease-in-out infinite';
        }
        // FIX: Missing Modal Functions
        window.switchRulesTab = function (tabId) {
            // Update Buttons
            document.querySelectorAll('.rules-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            const btn = document.querySelector(`.rules-tabs .tab-btn[onclick="switchRulesTab('${tabId}')"]`);
            if (btn) btn.classList.add('active');

            // Update Body
            document.querySelectorAll('.rules-section').forEach(s => s.style.display = 'none');
            const section = document.getElementById(`tab-${tabId}`);
            if (section) {
                section.style.display = 'block';
                section.classList.add('fade-in');
            }
        };

        window.closeModal = function (id) {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        };

        // Hook into existing nextBack/prevBack
        // We use a safe hook pattern
        const originalNext = typeof nextBack === 'function' ? nextBack : null;
        nextBack = function () { if (originalNext) originalNext(); updateCarouselAnim('next'); };
        const originalPrev = typeof prevBack === 'function' ? prevBack : null;
        prevBack = function () { if (originalPrev) originalPrev(); updateCarouselAnim('prev'); };

        // Emoji Manager Ready Hook
        // Emoji Manager Ready Hook (Handles both event and immediate check)
        const runEmojiReplacement = () => {
            if (!window.emojiManager) return;
            document.querySelectorAll('[data-emoji]').forEach(el => {
                const key = el.dataset.emoji;
                const isBig = el.style.fontSize && parseInt(el.style.fontSize) > 30;
                const style = isBig ? "vertical-align: middle; height: 1em; width: auto;" : "vertical-align: middle; height: 1.2em; width: auto;";

                const img = window.emojiManager.getImg(key, style);
                if (img && img !== key) {
                    el.innerHTML = img;
                }
            });
        };

        window.addEventListener('emojimanager-ready', runEmojiReplacement);

        // If already ready (race condition safety)
        if (window.emojiManager && window.emojiManager.isReady) {
            runEmojiReplacement();
        }

        function switchTab(id) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            event.target.classList.add('active');
        }
