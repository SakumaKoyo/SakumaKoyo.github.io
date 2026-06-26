document.addEventListener('DOMContentLoaded', () => {
    // タブ要素
    const tabPlayBtn = document.getElementById('tab-play-btn');
    const tabRecordBtn = document.getElementById('tab-record-btn');
    const playSection = document.getElementById('play-section');
    const recordSection = document.getElementById('record-section');

    // ビュー要素
    const setupView = document.getElementById('setup-view');
    const countdownView = document.getElementById('countdown-view');
    const gameView = document.getElementById('game-view');
    const resultView = document.getElementById('result-view');

    // 操作UI
    const startBtn = document.getElementById('start-btn');
    const backSetupBtn = document.getElementById('back-setup-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const graphLimitSelect = document.getElementById('graph-limit');
    
    // 通常 / 復習 切り替えUI
    const modeNormalBtn = document.getElementById('mode-normal-btn');
    const modeReviewBtn = document.getElementById('mode-review-btn');
    const setupOptionsBox = document.getElementById('setup-options-box');
    const reviewCountBadge = document.getElementById('review-count-badge');
    const reviewEmptyAlert = document.getElementById('review-empty-alert');
    const instantReviewBtn = document.getElementById('instant-review-btn');
    const normalStatsBox = document.getElementById('normal-stats-box');
    const reviewStatsBox = document.getElementById('review-stats-box');
    const resultTitle = document.getElementById('result-title');

    // エフェクト用UI要素
    const formulaCard = document.getElementById('formula-card-element');
    const feedbackText = document.getElementById('feedback-text');
    
    // 絞り込みフィルターUI
    const filterOp = document.getElementById('filter-op');
    const filterRange = document.getElementById('filter-range');

    // プレイ中表示UI
    const progressDisplay = document.getElementById('progress-display');
    const timerDisplay = document.getElementById('timer-display');
    const answerInputBox = document.getElementById('answer-input-box');

    // 各数式パーツのDOM参照
    const blockLeft = document.getElementById('block-left');
    const blockMiddle = document.getElementById('block-middle');
    const blockRight = document.getElementById('block-right');

    // 効果音ファイルの読み込み設定
    const audioCorrect = new Audio('sound/Correct_Fast-Single.mp3');
    const audioIncorrect = new Audio('sound/Incorrect.mp3');
    const audioCountdown = new Audio('sound/Countdown.mp3');

    audioCorrect.preload = 'auto';
    audioIncorrect.preload = 'auto';

    // ゲーム用システム変数
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
    
    // 復習用データステート
    let currentAppMode = "normal"; // "normal" or "review"
    let currentRoundWrongPool = []; // 一次ストック（案C用）
    let isCurrentProblemWrongOnce = false; // 現在の問題で1回でも間違えたかのフラグ

    const FLASH_DURATION = 350;

    // 起動時にストレージから間違えた問題のストック数を取得して反映
    updateReviewBadgeCount();

    // ==================== タブ切り替え ====================
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

    // ==================== 通常 / 復習 スイッチ制御 ====================
    modeNormalBtn.addEventListener('click', () => {
        currentAppMode = "normal";
        modeNormalBtn.classList.add('active');
        modeReviewBtn.classList.remove('active');
        
        // 演算の種類と数値の範囲の項目群を「表示」にする
        setupOptionsBox.classList.remove('hidden'); 
        
        reviewEmptyAlert.classList.add('hidden');
        startBtn.classList.remove('disabled-box');
    });

    modeReviewBtn.addEventListener('click', () => {
        currentAppMode = "review";
        modeReviewBtn.classList.add('active');
        modeNormalBtn.classList.remove('active');
        
        // 演算の種類と数値の範囲の項目群を「非表示」にする
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

    // 案C: 結果画面から直接復習に挑むボタン
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

    // ==================== ゲーム制御 ====================
    startBtn.addEventListener('click', () => {
        if (startBtn.classList.contains('disabled-box')) return;
        startCountdown();
    });

    backSetupBtn.addEventListener('click', () => {
        updateReviewBadgeCount();
        modeNormalBtn.click();
        switchView(setupView);
    });
    
    clearDataBtn.addEventListener('click', () => {
        if(confirm("全モードの学習データおよび復習ストックをすべて消去してもよろしいですか？")) {
            localStorage.removeItem('calc_training_records');
            localStorage.removeItem('calc_incorrect_pool');
            updateReviewBadgeCount();
            renderRecords();
        }
    });

    filterOp.addEventListener('change', renderRecords);
    filterRange.addEventListener('change', renderRecords);
    graphLimitSelect.addEventListener('change', renderRecords);

    function switchView(targetView) {
        [setupView, countdownView, gameView, resultView].forEach(v => v.classList.add('hidden'));
        targetView.classList.remove('hidden');
    }

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
                if (currentAppMode === "normal") {
                    initNormalGame(); 
                } else {
                    initReviewGameFromPool();
                }
            }
        }, 1000);
    }

    function startGameDirectlyWithoutCountdown() {
        currentIdx = 0;
        wrongCount = 0;
        userTypedInput = "";
        answerInputBox.textContent = "";

        switchView(gameView);
        showNextProblem();

        timerDisplay.textContent = "復習モード";
        timerDisplay.classList.remove('hidden');
    }

    function initNormalGame() {
        lastPlayedOp = document.getElementById('op-select').value;
        lastPlayedRange = document.getElementById('range-select').value;
        totalQuestions = parseInt(document.getElementById('count-select').value);

        filterOp.value = lastPlayedOp;
        filterRange.value = lastPlayedRange;

        currentIdx = 0;
        wrongCount = 0;
        userTypedInput = "";
        answerInputBox.textContent = "";
        problemsList = [];
        currentRoundWrongPool = []; 

        for (let i = 0; i < totalQuestions; i++) {
            problemsList.push(generateSingleProblem(lastPlayedOp, lastPlayedRange));
        }

        switchView(gameView);
        timerDisplay.classList.remove('hidden'); 
        showNextProblem();

        startTime = Date.now();
        updateTimerText();
        timerInterval = setInterval(updateTimerText, 1000);
    }

    function initReviewGameFromPool() {
        let pool = JSON.parse(localStorage.getItem('calc_incorrect_pool')) || [];
        
        currentIdx = 0;
        wrongCount = 0;
        userTypedInput = "";
        answerInputBox.textContent = "";
        
        pool.sort(() => Math.random() - 0.5);

        // 設定された出題数を取得
        const selectedCount = parseInt(document.getElementById('count-select').value);
        
        problemsList = pool.slice(0, selectedCount); 
        totalQuestions = problemsList.length;

        switchView(gameView);
        timerDisplay.textContent = "復習モード"; 
        timerDisplay.classList.remove('hidden'); 
        showNextProblem();
    }

    function updateTimerText() {
        if (currentAppMode === "review") return;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const sec = String(elapsed % 60).padStart(2, '0');
        timerDisplay.textContent = `${min}:${sec}`;
    }

    function generateSingleProblem(opMode, rangeMode) {
        let num1, num2, answer, selectedOp;
        
        if (opMode === 'mushikui-pm') {
            selectedOp = Math.random() < 0.5 ? '+' : '-';
        } else if (opMode === 'mushikui-pd') {
            selectedOp = Math.random() < 0.5 ? '*' : '/';
        } else if (opMode === 'mushikui-all') {
            const ops = ['+', '-', '*', '/'];
            selectedOp = ops[Math.floor(Math.random() * ops.length)];
        } else if (opMode === 'rand-pm') {
            selectedOp = Math.random() < 0.5 ? '+' : '-';
        } else if (opMode === 'rand-md') {
            selectedOp = Math.random() < 0.5 ? '*' : '/';
        } else if (opMode === 'rand-all') {
            const ops = ['+', '-', '*', '/'];
            selectedOp = ops[Math.floor(Math.random() * ops.length)];
        } else {
            selectedOp = opMode;
        }

        let isPositiveOnly = (rangeMode === 'positive');

        if (selectedOp === '+') {
            if (isPositiveOnly) {
                num1 = getRandomIntIncludingZero(0, 20);
                num2 = getRandomIntIncludingZero(0, 20);
            } else {
                num1 = getRandomIntIncludingZero(-20, 20);
                num2 = getRandomIntIncludingZero(-20, 20);
            }
            answer = num1 + num2;
        } else if (selectedOp === '-') {
            if (isPositiveOnly) {
                num1 = getRandomIntIncludingZero(0, 20);
                num2 = getRandomIntIncludingZero(0, num1); 
            } else {
                num1 = getRandomIntIncludingZero(-20, 20);
                num2 = getRandomIntIncludingZero(-20, 20);
            }
            answer = num1 - num2;
        } else if (selectedOp === '*') {
            if (isPositiveOnly) {
                num1 = getRandomIntIncludingZero(0, 10); 
                num2 = getRandomIntIncludingZero(0, 10); 
            } else {
                num1 = getRandomIntIncludingZero(-10, 10);
                num2 = getRandomIntIncludingZero(-10, 10);
            }
            answer = num1 * num2;
        } else if (selectedOp === '/') {
            if (isPositiveOnly) {
                num2 = getRandomIntIncludingZero(1, 10);   
                answer = getRandomIntIncludingZero(0, 10); 
                num1 = num2 * answer;                       
            } else {
                num2 = getRandomIntExcludingZero(-10, 10);
                answer = getRandomIntIncludingZero(-9, 9);
                num1 = num2 * answer;
            }
        }

        const opSymbol = selectedOp === '*' ? '×' : selectedOp === '/' ? '÷' : selectedOp;
        return { num1, num2, opSymbol, answer, originalOpMode: opMode };
    }

    function getRandomIntExcludingZero(min, max) {
        let val = 0;
        while(val === 0) val = Math.floor(Math.random() * (max - min + 1)) + min;
        return val;
    }

    function getRandomIntIncludingZero(min, max) {
        let val = 0;
        val = Math.floor(Math.random() * (max - min + 1)) + min;
        if (val === 0) val = Math.floor(Math.random() * (max - min + 1)) + min; 
        return val;
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

        const targetMode = currentProb.originalOpMode || lastPlayedOp;
        const isMushikui = (targetMode === 'mushikui-pm' || targetMode === 'mushikui-pd' || targetMode === 'mushikui-all');

        if (isMushikui) {
            const blankPattern = Math.floor(Math.random() * 5);

            if (blankPattern === 0) {
                currentAnswer = currentProb.answer; 
                blockLeft.textContent = `${n1Str} ${op}`;
                blockMiddle.textContent = `${n2Str}`;
                blockRight.textContent = `＝`;
                
                blockLeft.style.order = "1";
                blockMiddle.style.order = "2";
                blockRight.style.order = "3";
                answerInputBox.style.order = "4"; 
            } else if (blankPattern >= 3) {
                currentAnswer = currentProb.num1; 
                blockLeft.textContent = ``;
                blockMiddle.textContent = `${op} ${n2Str}`;
                blockRight.textContent = `＝ ${ans}`;
                
                answerInputBox.style.order = "1"; 
                blockLeft.style.order = "2";
                blockMiddle.style.order = "3";
                blockRight.style.order = "4";
            } else {
                currentAnswer = currentProb.num2; 
                blockLeft.textContent = `${n1Str} ${op}`;
                blockMiddle.textContent = ``;
                blockRight.textContent = `＝ ${ans}`;
                
                blockLeft.style.order = "1";
                answerInputBox.style.order = "2"; 
                blockMiddle.style.order = "3";
                blockRight.style.order = "4";
            }
        } else {
            currentAnswer = currentProb.answer;
            blockLeft.textContent = `${n1Str} ${op}`;
            blockMiddle.textContent = `${n2Str}`;
            blockRight.textContent = `＝`;
            
            blockLeft.style.order = "1";
            blockMiddle.style.order = "2";
            blockRight.style.order = "3";
            answerInputBox.style.order = "4";
        }
    }

    // テンキー入力
    document.querySelectorAll('.key-btn[data-val]').forEach(button => {
        button.addEventListener('click', () => {
            const val = button.dataset.val;
            if (val === 'clear') userTypedInput = "";
            else if (val === '-') {
                if (userTypedInput.startsWith('-')) userTypedInput = userTypedInput.slice(1);
                else userTypedInput = '-' + userTypedInput;
            } else {
                if (userTypedInput.replace('-', '').length < 5) userTypedInput += val;
            }
            answerInputBox.textContent = userTypedInput;
        });
    });

    document.getElementById('enter-btn').addEventListener('click', evaluateUserAnswer);

    function evaluateUserAnswer() {
        if (userTypedInput === "" || userTypedInput === "-") return;
        const userAnsInt = parseInt(userTypedInput);
        const currentProb = problemsList[currentIdx];

        if (userAnsInt === currentAnswer) {
            audioCorrect.currentTime = 0; 
            audioCorrect.play();
            triggerFeedback('◯');

            // 復習モードで、かつ1回もミスせずに一発正解できた場合のみプールから削除
            if (currentAppMode === "review") {
                if (!isCurrentProblemWrongOnce) {
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

            isCurrentProblemWrongOnce = true;

            // 間違えた問題をプールにストック
            if (currentAppMode === "normal") {
                if (!currentRoundWrongPool.some(p => p.num1 === currentProb.num1 && p.num2 === currentProb.num2 && p.opSymbol === currentProb.opSymbol)) {
                    currentRoundWrongPool.push(currentProb);
                }
                saveProblemToPersistentPool(currentProb);
            }

            userTypedInput = "";
            answerInputBox.textContent = "";
        }
    }

    function saveProblemToPersistentPool(prob) {
        let pool = JSON.parse(localStorage.getItem('calc_incorrect_pool')) || [];
        const isDuplicate = pool.some(p => p.num1 === prob.num1 && p.num2 === prob.num2 && p.opSymbol === prob.opSymbol && p.answer === prob.answer);
        if (!isDuplicate) {
            prob.originalOpMode = lastPlayedOp; 
            pool.push(prob);
            localStorage.setItem('calc_incorrect_pool', JSON.stringify(pool));
        }
    }

    function removeProblemFromPersistentPool(prob) {
        let pool = JSON.parse(localStorage.getItem('calc_incorrect_pool')) || [];
        pool = pool.filter(p => !(p.num1 === prob.num1 && p.num2 === prob.num2 && p.opSymbol === prob.opSymbol && p.answer === prob.answer));
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
            const totalTimeSec = Math.floor((Date.now() - startTime) / 1000);
            const avgSpeed = parseFloat((totalTimeSec / totalQuestions).toFixed(2));

            document.getElementById('res-total-time').textContent = `${Math.floor(totalTimeSec / 60)}分${totalTimeSec % 60}秒`;
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
            
            document.getElementById('res-review-count').textContent = `${totalQuestions}問`;
            document.getElementById('res-review-wrong').textContent = `${wrongCount}回`;
            reviewStatsBox.classList.remove('hidden');
            
            instantReviewBtn.classList.add('hidden');
        }

        switchView(resultView);
    }

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
