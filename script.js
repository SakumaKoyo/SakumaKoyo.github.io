window.addEventListener('DOMContentLoaded', () => {
    // 現在のURLを取得
    const currentUrl = window.location.href;
    
    // もしURLが「/calc-trainer/」を含んでいない、またはルート「/」で終わっている場合
    //（＝古いアプリからルート基準で起動されてしまった場合）
    if (!currentUrl.includes('calc-trainer') || currentUrl.endsWith('.io/')) {
        const overlay = document.getElementById('migration-overlay');
        if (overlay) {
            overlay.style.display = 'block'; // お引越し画面を強制表示
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // DOM参照の全取得
    const tabPlayBtn = document.getElementById('tab-play-btn');
    const tabRecordBtn = document.getElementById('tab-record-btn');
    const playSection = document.getElementById('play-section');
    const recordSection = document.getElementById('record-section');

    const setupView = document.getElementById('setup-view');
    const countdownView = document.getElementById('countdown-view');
    const gameView = document.getElementById('game-view');
    const resultView = document.getElementById('result-view');

    const startBtn = document.getElementById('start-btn');
    const backSetupBtn = document.getElementById('back-setup-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const graphLimitSelect = document.getElementById('graph-limit');
    
    const formulaCard = document.getElementById('formula-card-element');
    const feedbackText = document.getElementById('feedback-text');
    
    const opSelect = document.getElementById('op-select');
    const rangeSelect = document.getElementById('range-select');
    const countSelect = document.getElementById('count-select');

    const filterOp = document.getElementById('filter-op');
    const filterRange = document.getElementById('filter-range');

    const progressDisplay = document.getElementById('progress-display');
    const timerDisplay = document.getElementById('timer-display');
    const answerInputBox = document.getElementById('answer-input-box');

    const blockLeft = document.getElementById('block-left');
    const blockMiddle = document.getElementById('block-middle');
    const blockRight = document.getElementById('block-right');

    const modeNormalBtn = document.getElementById('mode-normal-btn');
    const modeReviewBtn = document.getElementById('mode-review-btn');
    const setupOptionsBox = document.getElementById('setup-options-box');
    const reviewCountBadge = document.getElementById('review-count-badge');
    const reviewEmptyAlert = document.getElementById('review-empty-alert');
    const instantReviewBtn = document.getElementById('instant-review-btn');
    
    const normalStatsBox = document.getElementById('normal-stats-box');
    const reviewStatsBox = document.getElementById('review-stats-box');
    const resultTitle = document.getElementById('result-title');
    const tenkeyGrid = document.getElementById('tenkey-grid-element');

    // 効果音設定
    const audioCorrect = new Audio('sound/Correct_Fast-Single.mp3');
    const audioIncorrect = new Audio('sound/Incorrect.mp3');
    const audioCountdown = new Audio('sound/Countdown.mp3');
    audioCorrect.preload = 'auto';
    audioIncorrect.preload = 'auto';

    // アプリ内部ステート
    let totalQuestions = 20;
    let currentIdx = 0;
    let wrongCount = 0;
    let startTime = 0;
    let timerInterval = null;
    let currentAnswer = 0; 
    let userTypedInput = "";
    let problemsList = [];
    let chartInstance = null;
    
    let lastPlayedOp = "+";
    let lastPlayedRange = "positive";
    
    let currentAppMode = "normal"; 
    let currentRoundWrongPool = []; 
    let isCurrentProblemWrongOnce = false; 

    const FLASH_DURATION = 350;

    // 初期化処理
    updateReviewBadgeCount();
    renderTenkeyKeyboard();

    // ==================== タブ制御 ====================
    tabPlayBtn.addEventListener('click', () => {
        tabPlayBtn.classList.add('active');
        tabRecordBtn.classList.remove('active');
        playSection.classList.add('active');
        recordSection.classList.remove('active');
        updateReviewBadgeCount(); 
    });

    tabRecordBtn.addEventListener('click', () => {
        tabRecordBtn.classList.add('active');
        tabPlayBtn.classList.remove('active');
        recordSection.classList.add('active');
        playSection.classList.remove('active');
        renderRecords();
    });

    // ==================== 通常 / 復習 モード切り替え ====================
    modeNormalBtn.addEventListener('click', () => {
        currentAppMode = "normal";
        modeNormalBtn.classList.add('active');
        modeReviewBtn.classList.remove('active');
        setupOptionsBox.classList.remove('hidden'); 
        reviewEmptyAlert.classList.add('hidden');
        startBtn.classList.remove('disabled-box');
    });

    modeReviewBtn.addEventListener('click', () => {
        currentAppMode = "review";
        modeReviewBtn.classList.add('active');
        modeNormalBtn.classList.remove('active');
        setupOptionsBox.classList.add('hidden'); 
        
        const pool = JSON.parse(localStorage.getItem('calc_incorrect_pool')) || [];
        if (pool.length === 0) {
            reviewEmptyAlert.textContent = "現在、復習が必要な間違えた問題はありません！";
            reviewEmptyAlert.classList.remove('hidden'); 
            startBtn.classList.add('disabled-box'); 
        } else {
            reviewEmptyAlert.classList.add('hidden'); 
            startBtn.classList.remove('disabled-box');
        }
    });

    instantReviewBtn.addEventListener('click', () => {
        currentAppMode = "review";
        problemsList = [...currentRoundWrongPool];
        totalQuestions = problemsList.length;
        startGameDirectlyWithoutCountdown();
    });

    function updateReviewBadgeCount() {
        const pool = JSON.parse(localStorage.getItem('calc_incorrect_pool')) || [];
        reviewCountBadge.textContent = pool.length;
    }

    // ==================== 🛠️ 全問題列挙型プール生成（コア） ====================
    function generateAllProblemPool(opMode, rangeMode) {
        let pool = [];
        let ops = [];

        if (opMode === 'rand-pm' || opMode === 'mushikui-pm') ops = ['+', '-'];
        else if (opMode === 'rand-md' || opMode === 'mushikui-pd') ops = ['*', '/'];
        else if (opMode === 'rand-all' || opMode === 'mushikui-all') ops = ['+', '-', '*', '/'];
        else ops = [opMode];

        let isPositiveOnly = (rangeMode === 'positive');
        let min1 = isPositiveOnly ? 0 : -20;
        let max1 = isPositiveOnly ? 20 : 20;
        let min2 = isPositiveOnly ? 0 : -20;
        let max2 = isPositiveOnly ? 20 : 20;

        ops.forEach(op => {
            if (op === '+' || op === '-') {
                for (let n1 = min1; n1 <= max1; n1++) {
                    for (let n2 = min2; n2 <= max2; n2++) {
                        if (isPositiveOnly && op === '-' && (n1 - n2 < 0)) continue;
                        pool.push({ num1: n1, num2: n2, op: op });
                    }
                }
            } else if (op === '*') {
                let kMin = isPositiveOnly ? 0 : -10;
                let kMax = isPositiveOnly ? 10 : 10;
                for (let n1 = kMin; n1 <= kMax; n1++) {
                    for (let n2 = kMin; n2 <= kMax; n2++) {
                        pool.push({ num1: n1, num2: n2, op: op });
                    }
                }
            } else if (op === '/') {
                let dMinDiv = isPositiveOnly ? 1 : -10;
                let dMaxDiv = isPositiveOnly ? 10 : 10;
                let dMinAns = isPositiveOnly ? 0 : -9;
                let dMaxAns = isPositiveOnly ? 10 : 9;

                for (let div = dMinDiv; div <= dMaxDiv; div++) {
                    if (div === 0) continue;
                    for (let ans = dMinAns; ans <= dMaxAns; ans++) {
                        pool.push({ num1: ans * div, num2: div, op: op });
                    }
                }
            }
        });
        return pool;
    }

    // 過去3回の総合ミス数を評価した3段階段階的ウエイト算出
    function getProblemWeight(num1, op, num2, blankType) {
        const questionStats = JSON.parse(localStorage.getItem('calc_question_stats')) || {};
        const key = `${num1}_${op}_${num2}`;
        
        if (!questionStats[key] || !questionStats[key][blankType] || questionStats[key][blankType].length === 0) {
            return 3; // 未解答（ベースラインウエイト: 3）
        }
        
        const history = questionStats[key][blankType]; 
        const wrongCount = history.filter(result => result === 0).length;
        
        if (wrongCount === 3) return 15; // 3連続ミス（最優先）
        else if (wrongCount === 2) return 8;  // 3回中2回ミス
        else if (wrongCount === 1) return 4;  // 3回中1回ミス
        else return 1;  // 克服済み（低確率）
    }

    // アダプティブ問題自動抽選エンジン
    function generateAdaptiveQuestions(opMode, rangeMode, targetCount) {
        const basePool = generateAllProblemPool(opMode, rangeMode);
        const isMushikui = (opMode.startsWith('mushikui-'));
        
        let extendedPool = [];
        basePool.forEach(item => {
            if (isMushikui) {
                const bTypes = ['l', 'r'];
                bTypes.forEach(b => {
                    extendedPool.push({
                        num1: item.num1, num2: item.num2, op: item.op, blankType: b,
                        weight: getProblemWeight(item.num1, item.op, item.num2, b)
                    });
                });
            } else {
                extendedPool.push({
                    num1: item.num1, num2: item.num2, op: item.op, blankType: 'a',
                    weight: getProblemWeight(item.num1, item.op, item.num2, 'a')
                });
            }
        });

        let selectedQuestions = [];
        const loopCount = Math.min(targetCount, extendedPool.length);

        for (let i = 0; i < loopCount; i++) {
            const totalWeight = extendedPool.reduce((sum, item) => sum + item.weight, 0);
            let randomArrow = Math.random() * totalWeight;
            
            let chosenIdx = 0;
            for (let j = 0; j < extendedPool.length; j++) {
                randomArrow -= extendedPool[j].weight;
                if (randomArrow <= 0) {
                    chosenIdx = j;
                    break;
                }
            }

            const chosen = extendedPool[chosenIdx];
            
            let ans = 0;
            if (chosen.op === '+') ans = chosen.num1 + chosen.num2;
            if (chosen.op === '-') ans = chosen.num1 - chosen.num2;
            if (chosen.op === '*') ans = chosen.num1 * chosen.num2;
            if (chosen.op === '/') ans = chosen.num1 / chosen.num2;

            let opSymbol = chosen.op === '*' ? '×' : chosen.op === '/' ? '÷' : chosen.op;

            selectedQuestions.push({
                num1: chosen.num1,
                num2: chosen.num2,
                op: chosen.op,
                opSymbol: opSymbol,
                answer: ans,
                blankType: chosen.blankType,
                originalOpMode: opMode
            });

            extendedPool.splice(chosenIdx, 1);
        }
        return selectedQuestions;
    }

    // ==================== ゲーム実行フロー ====================
    function switchView(targetView) {
        [setupView, countdownView, gameView, resultView].forEach(v => v.classList.add('hidden'));
        targetView.classList.remove('hidden');
    }

    function preBuildProblemsBeforeCountdown() {
        lastPlayedOp = opSelect.value;
        lastPlayedRange = rangeSelect.value;
        totalQuestions = parseInt(countSelect.value);

        filterOp.value = lastPlayedOp;
        filterRange.value = lastPlayedRange;

        currentIdx = 0;
        wrongCount = 0;
        userTypedInput = "";
        answerInputBox.textContent = "";
        currentRoundWrongPool = []; 

        if (currentAppMode === "normal") {
            // カウントダウンが回る前に裏で完全ビルド（待ち時間解消）
            problemsList = generateAdaptiveQuestions(lastPlayedOp, lastPlayedRange, totalQuestions);
            totalQuestions = problemsList.length;
        } else {
            let pool = JSON.parse(localStorage.getItem('calc_incorrect_pool')) || [];
            pool.sort(() => Math.random() - 0.5);
            const selectedCount = parseInt(countSelect.value);
            problemsList = pool.slice(0, selectedCount); 
            totalQuestions = problemsList.length;
        }
    }

    startBtn.addEventListener('click', () => {
        if (startBtn.classList.contains('disabled-box')) return;
        preBuildProblemsBeforeCountdown();
        startCountdown();
    });

    function startCountdown() {
        switchView(countdownView);
        let count = 3;

        audioCountdown.currentTime = 0; 
        audioCountdown.play();

        document.getElementById('countdown-number').textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count > 0) document.getElementById('countdown-number').textContent = count;
            else { 
                clearInterval(interval); 
                launchGameScreen();
            }
        }, 1000);
    }

    function launchGameScreen() {
        switchView(gameView);
        showNextProblem();

        if (currentAppMode === "normal") {
            timerDisplay.classList.remove('hidden');
            startTime = Date.now();
            updateTimerText();
            timerInterval = setInterval(updateTimerText, 100);
        } else {
            timerDisplay.textContent = "復習モード"; 
        }
    }

    function startGameDirectlyWithoutCountdown() {
        currentIdx = 0;
        wrongCount = 0;
        userTypedInput = "";
        answerInputBox.textContent = "";
        switchView(gameView);
        showNextProblem();
        timerDisplay.textContent = "復習モード";
    }

    function updateTimerText() {
        if (currentAppMode === "review") return;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        timerDisplay.textContent = `${elapsed}秒`;
    }

    function showNextProblem() {
        userTypedInput = "";
        answerInputBox.textContent = "";
        progressDisplay.textContent = `第 ${currentIdx + 1} / ${totalQuestions} 問`;
        isCurrentProblemWrongOnce = false;

        const currentProb = problemsList[currentIdx];
        const n1Str = currentProb.num1 < 0 ? `(${currentProb.num1})` : currentProb.num1;
        const n2Str = currentProb.num2 < 0 ? `(${currentProb.num2})` : currentProb.num2;
        const op = currentProb.opSymbol;
        const ans = currentProb.answer;

        blockLeft.style.display = "inline-block";
        blockMiddle.style.display = "inline-block";
        blockRight.style.display = "inline-block";

        if (currentProb.blankType === 'l') {
            currentAnswer = currentProb.num1;
            blockLeft.textContent = "";
            blockMiddle.textContent = `${op} ${n2Str}`;
            blockRight.textContent = `＝ ${ans}`;
            
            answerInputBox.style.order = "1"; 
            blockLeft.style.order = "2";
            blockMiddle.style.order = "3";
            blockRight.style.order = "4";
            blockLeft.style.display = "none";
        } else if (currentProb.blankType === 'r') {
            currentAnswer = currentProb.num2;
            blockLeft.textContent = `${n1Str} ${op}`;
            blockMiddle.textContent = "";
            blockRight.textContent = `＝ ${ans}`;
            
            blockLeft.style.order = "1";
            answerInputBox.style.order = "2"; 
            blockMiddle.style.order = "3";
            blockRight.style.order = "4";
            blockMiddle.style.display = "none";
        } else {
            currentAnswer = currentProb.answer;
            blockLeft.textContent = `${n1Str} ${op}`;
            blockMiddle.textContent = `${n2Str}`;
            blockRight.textContent = `＝`;
            
            blockLeft.style.order = "1";
            blockMiddle.style.order = "2";
            blockRight.style.order = "3";
            answerInputBox.style.order = "4";
            blockRight.style.display = "inline-block";
        }
    }

    // ==================== 🎬 テンキーボード処理 ====================
    function renderTenkeyKeyboard() {
        const keyLayout = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '負 (-)', '0', 'C', '決定'];
        tenkeyGrid.innerHTML = '';
        
        keyLayout.forEach(key => {
            const btn = document.createElement('button');
            btn.textContent = key === '負 (-)' ? '－' : key === 'C' ? 'C' : key;
            btn.classList.add('key-btn');
            
            if (key === '負 (-)' || key === 'C') btn.classList.add('action');
            if (key === '決定') {
                btn.classList.add('enter');
                btn.id = "enter-btn";
            }

            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                handleTenkeyInput(key);
            });
            tenkeyGrid.appendChild(btn);
        });
    }

    function handleTenkeyInput(key) {
        if (key === 'C') {
            userTypedInput = "";
        } else if (key === '負 (-)') {
            if (userTypedInput.startsWith('-')) userTypedInput = userTypedInput.slice(1);
            else userTypedInput = '-' + userTypedInput;
        } else if (key === '決定') {
            evaluateUserAnswer();
            return;
        } else {
            if (userTypedInput.replace('-', '').length < 5) userTypedInput += key;
        }
        answerInputBox.textContent = userTypedInput;
    }

    function evaluateUserAnswer() {
        if (userTypedInput === "" || userTypedInput === "-") return;
        const userAnsInt = parseInt(userTypedInput);
        const currentProb = problemsList[currentIdx];

        let bKey = currentProb.blankType || 'a';
        const statsKey = `${currentProb.num1}_${currentProb.op}_${currentProb.num2}`;

        if (userAnsInt === currentAnswer) {
            audioCorrect.currentTime = 0; 
            audioCorrect.play();
            triggerFeedback('◯');

            // 初回挑戦時（ノーミス時）のみ「正解(1)」を過去履歴へプッシュ
            if (!isCurrentProblemWrongOnce) {
                updateQuestionStatsDatabase(statsKey, bKey, 1);
                if (currentAppMode === "review") {
                    removeProblemFromPersistentPool(currentProb);
                }
            }

            currentIdx++;
            setTimeout(() => {
                if (currentIdx < totalQuestions) showNextProblem();
                else endGame();
            }, FLASH_DURATION - 100);
        } else {
            audioIncorrect.currentTime = 0;
            audioIncorrect.play();
            triggerFeedback('×');
            wrongCount++;

            // 初回挑戦でのミス時のみ「不正解(0)」を過去履歴へプッシュ（重複処理スキップ）
            if (!isCurrentProblemWrongOnce) {
                updateQuestionStatsDatabase(statsKey, bKey, 0);
            }
            isCurrentProblemWrongOnce = true;

            if (currentAppMode === "normal") {
                if (!currentRoundWrongPool.some(p => p.num1 === currentProb.num1 && p.num2 === currentProb.num2 && p.op === currentProb.op && p.blankType === currentProb.blankType)) {
                    currentRoundWrongPool.push(currentProb);
                }
                saveProblemToPersistentPool(currentProb);
            }

            userTypedInput = "";
            answerInputBox.textContent = "";
        }
    }

    function updateQuestionStatsDatabase(key, blankType, resultValue) {
        let questionStats = JSON.parse(localStorage.getItem('calc_question_stats')) || {};
        if (!questionStats[key]) {
            questionStats[key] = { a: [], l: [], r: [] };
        }
        if (!questionStats[key][blankType]) {
            questionStats[key][blankType] = [];
        }
        
        questionStats[key][blankType].push(resultValue);
        if (questionStats[key][blankType].length > 3) {
            questionStats[key][blankType].shift(); 
        }
        localStorage.setItem('calc_question_stats', JSON.stringify(questionStats));
    }

    function saveProblemToPersistentPool(prob) {
        let pool = JSON.parse(localStorage.getItem('calc_incorrect_pool')) || [];
        const isDuplicate = pool.some(p => p.num1 === prob.num1 && p.num2 === prob.num2 && p.op === prob.op && p.blankType === prob.blankType);
        if (!isDuplicate) {
            pool.push(prob);
            localStorage.setItem('calc_incorrect_pool', JSON.stringify(pool));
        }
    }

    function removeProblemFromPersistentPool(prob) {
        let pool = JSON.parse(localStorage.getItem('calc_incorrect_pool')) || [];
        pool = pool.filter(p => !(p.num1 === prob.num1 && p.num2 === prob.num2 && p.op === prob.op && p.blankType === prob.blankType));
        localStorage.setItem('calc_incorrect_pool', JSON.stringify(pool));
    }

    function triggerFeedback(symbol) {
        feedbackText.textContent = symbol;
        feedbackText.classList.remove('hidden');
        if (symbol === '◯') formulaCard.classList.add('correct-flash');
        else formulaCard.classList.add('incorrect-flash');
        
        setTimeout(() => {
            feedbackText.classList.add('hidden');
            formulaCard.classList.remove('correct-flash', 'incorrect-flash');
        }, FLASH_DURATION);
    }

    function endGame() {
        clearInterval(timerInterval);

        if (currentAppMode === "normal") {
            const totalTimeSec = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
            const avgSpeed = parseFloat((totalTimeSec / totalQuestions).toFixed(2));

            document.getElementById('res-total-time').textContent = `${Math.floor(totalTimeSec / 60)}分${Math.floor(totalTimeSec % 60)}秒`;
            document.getElementById('res-wrong-count').textContent = `${wrongCount}回`;
            document.getElementById('res-avg-speed').textContent = `${avgSpeed}秒`;

            resultTitle.textContent = "結果発表 🎉";
            normalStatsBox.classList.remove('hidden');
            reviewStatsBox.classList.add('hidden');

            if (currentRoundWrongPool.length > 0) {
                instantReviewBtn.textContent = `間違えた問題 (${currentRoundWrongPool.length}問) を今すぐ復習する`;
                instantReviewBtn.classList.remove('hidden');
            } else {
                instantReviewBtn.classList.add('hidden');
            }

            const timestamp = new Date().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            const newRecord = {
                date: timestamp,
                opMode: lastPlayedOp,
                rangeMode: lastPlayedRange,
                totalQuestions: totalQuestions,
                wrongCount: wrongCount,
                avgSpeed: avgSpeed,
                rawTimestamp: Date.now()
            };

            let currentRecords = JSON.parse(localStorage.getItem('calc_training_records')) || [];
            currentRecords.push(newRecord);
            localStorage.setItem('calc_training_records', JSON.stringify(currentRecords));

        } else {
            resultTitle.textContent = "復習お疲れ様でした！ ✨";
            normalStatsBox.classList.add('hidden');
            reviewStatsBox.classList.remove('hidden');
            
            document.getElementById('res-review-count').textContent = `${totalQuestions}問`;
            document.getElementById('res-review-wrong').textContent = `${wrongCount}回`;
            
            instantReviewBtn.classList.add('hidden');
        }

        switchView(resultView);
    }

    // ==================== 戻る & クリア制御 ====================
    backSetupBtn.addEventListener('click', () => {
        updateReviewBadgeCount();
        modeNormalBtn.click();
        switchView(setupView);
    });
    
    clearDataBtn.addEventListener('click', () => {
        if(confirm("全モードの学習データ、履歴、苦手統計をすべて消去しますか？")) {
            localStorage.removeItem('calc_training_records');
            localStorage.removeItem('calc_incorrect_pool');
            localStorage.removeItem('calc_question_stats');
            updateReviewBadgeCount();
            renderRecords();
            alert('消去が完了しました。');
        }
    });

    filterOp.addEventListener('change', renderRecords);
    filterRange.addEventListener('change', renderRecords);
    graphLimitSelect.addEventListener('change', renderRecords);

    function renderRecords() {
        let allRecords = JSON.parse(localStorage.getItem('calc_training_records')) || [];
        allRecords.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

        const targetOp = filterOp.value;
        const targetRange = filterRange.value;
        
        let filteredRecords = allRecords.filter(r => r.opMode === targetOp && r.rangeMode === targetRange);

        const limit = graphLimitSelect.value;
        if (limit !== 'all') {
            const numLimit = parseInt(limit);
            filteredRecords = filteredRecords.slice(-numLimit);
        }

        const latestRecords = [...filteredRecords].reverse();
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';

        latestRecords.forEach(r => {
            let opDisplay = r.opMode;
            if (r.opMode === 'rand-pm') opDisplay = '±ランダム';
            else if (r.opMode === 'rand-md') opDisplay = '×÷ランダム';
            else if (r.opMode === 'rand-all') opDisplay = '四則ランダム';
            else if (r.opMode === 'mushikui-pm') opDisplay = '虫食い(±)';
            else if (r.opMode === 'mushikui-pd') opDisplay = '虫食い(×÷)';
            else if (r.opMode === 'mushikui-all') opDisplay = '虫食い(四則)';

            let rangeDisplay = r.rangeMode === 'positive' ? '正のみ' : '正負';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.date}</td>
                <td><span class="badge-op">${opDisplay}</span></td>
                <td><span class="badge-range">${rangeDisplay}</span></td>
                <td>${r.totalQuestions}問</td>
                <td>${r.wrongCount}回</td>
                <td><strong>${r.avgSpeed}秒</strong></td>
            `;
            tbody.appendChild(tr);
        });

        const labels = filteredRecords.map(r => r.date);
        const speedData = filteredRecords.map(r => r.avgSpeed);
        const wrongRateData = filteredRecords.map(r => parseFloat(((r.wrongCount / r.totalQuestions) * 100).toFixed(1)));

        if (chartInstance) chartInstance.destroy();

        const ctx = document.getElementById('record-chart').getContext('2d');
        if(filteredRecords.length === 0) {
            ctx.clearRect(0, 0, 400, 180);
            return;
        }

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '誤答率 (%)',
                        data: wrongRateData,
                        backgroundColor: 'rgba(224, 109, 109, 0.3)',
                        borderColor: 'rgba(224, 109, 109, 1)',
                        borderWidth: 1,
                        yAxisID: 'y-wrong',
                        order: 2
                    },
                    {
                        label: '速度 (秒/問)',
                        data: speedData,
                        type: 'line',
                        borderColor: '#4a90e2',
                        backgroundColor: '#4a90e2',
                        borderWidth: 3,
                        pointRadius: 4,
                        fill: false,
                        yAxisID: 'y-speed',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    'y-speed': { type: 'linear', position: 'left', title: { display: true, text: '秒/問', font: { size: 10 } }, min: 0 },
                    'y-wrong': { type: 'linear', position: 'right', title: { display: true, text: '誤答率(%)', font: { size: 10 } }, min: 0, max: 100, grid: { drawOnChartArea: false } },
                    x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } }
                },
                plugins: { legend: { labels: { boxWidth: 10, font: { size: 10 } } } }
            }
        });
    }
});
