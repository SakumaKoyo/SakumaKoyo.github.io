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
    const feedbackOverlay = document.getElementById('feedback-overlay');
    const graphLimitSelect = document.getElementById('graph-limit');
    
    // 絞り込みフィルターUI
    const filterOp = document.getElementById('filter-op');
    const filterRange = document.getElementById('filter-range');

    // プレイ中表示UI
    const progressDisplay = document.getElementById('progress-display');
    const timerDisplay = document.getElementById('timer-display');
    const formulaText = document.getElementById('formula-text');
    const answerInputBox = document.getElementById('answer-input-box');

    // ゲーム用変数
    let totalQuestions = 20;
    let currentIdx = 0;
    let wrongCount = 0;
    let startTime = 0;
    let timerInterval = null;
    let currentAnswer = 0; 
    let userTypedInput = "";
    let problemsList = [];
    let chartInstance = null;
    
    // 現在プレイしたモードの一時保持（結果画面から自動フィルターするため）
    let lastPlayedOp = "+";
    let lastPlayedRange = "positive";

    const POPUP_DURATION = 400; // マルバツ表示時間 (0.4秒に調整)

    // ==================== タブ切り替え ====================
    tabPlayBtn.addEventListener('click', () => {
        tabPlayBtn.classList.add('active');
        tabRecordBtn.classList.remove('active');
        playSection.classList.add('active');
        recordSection.classList.remove('active');
    });

    tabRecordBtn.addEventListener('click', () => {
        tabRecordBtn.classList.add('active');
        tabPlayBtn.classList.remove('active');
        recordSection.classList.add('active');
        playSection.classList.remove('active');
        renderRecords();
    });

    // ==================== ゲーム制御ロジック ====================
    startBtn.addEventListener('click', startCountdown);
    backSetupBtn.addEventListener('click', () => switchView(setupView));
    
    clearDataBtn.addEventListener('click', () => {
        if(confirm("全モードの学習データをすべて消去してもよろしいですか？")) {
            localStorage.removeItem('calc_training_records');
            renderRecords();
        }
    });

    // フィルターが変更されたらグラフを再描画
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
        document.getElementById('countdown-number').textContent = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                document.getElementById('countdown-number').textContent = count;
            } else {
                clearInterval(interval);
                initGame();
            }
        }, 1000);
    }

    function initGame() {
        lastPlayedOp = document.getElementById('op-select').value;
        lastPlayedRange = document.getElementById('range-select').value;
        totalQuestions = parseInt(document.getElementById('count-select').value);

        // 記録タブの初期フィルターを、今から遊ぶモードに自動で合わせておく
        filterOp.value = lastPlayedOp;
        filterRange.value = lastPlayedRange;

        currentIdx = 0;
        wrongCount = 0;
        userTypedInput = "";
        answerInputBox.textContent = "";
        problemsList = [];

        for (let i = 0; i < totalQuestions; i++) {
            problemsList.push(generateSingleProblem(lastPlayedOp, lastPlayedRange));
        }

        switchView(gameView);
        showNextProblem();

        startTime = Date.now();
        updateTimerText();
        timerInterval = setInterval(updateTimerText, 1000);
    }

    function updateTimerText() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const sec = String(elapsed % 60).padStart(2, '0');
        timerDisplay.textContent = `${min}:${sec}`;
    }

    function generateSingleProblem(opMode, rangeMode) {
        let num1, num2, answer, selectedOp;
        
        if (opMode === 'rand-pm') selectedOp = Math.random() < 0.5 ? '+' : '-';
        else if (opMode === 'rand-md') selectedOp = Math.random() < 0.5 ? '*' : '/';
        else if (opMode === 'rand-all') {
            const ops = ['+', '-', '*', '/'];
            selectedOp = ops[Math.floor(Math.random() * ops.length)];
        } else {
            selectedOp = opMode;
        }

        let isPositiveOnly = (rangeMode === 'positive');

        if (selectedOp === '+') {
            if (isPositiveOnly) {
                num1 = Math.floor(Math.random() * 20) + 1;
                num2 = Math.floor(Math.random() * 20) + 1;
            } else {
                num1 = getRandomIntExcludingZero(-20, 20);
                num2 = getRandomIntExcludingZero(-20, 20);
            }
            answer = num1 + num2;
        } else if (selectedOp === '-') {
            if (isPositiveOnly) {
                num1 = Math.floor(Math.random() * 20) + 2;
                num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
            } else {
                num1 = getRandomIntExcludingZero(-20, 20);
                num2 = getRandomIntExcludingZero(-20, 20);
            }
            answer = num1 - num2;
        } else if (selectedOp === '*') {
            if (isPositiveOnly) {
                num1 = Math.floor(Math.random() * 9) + 1;
                num2 = Math.floor(Math.random() * 9) + 1;
            } else {
                num1 = getRandomIntExcludingZero(-9, 9);
                num2 = getRandomIntExcludingZero(-9, 9);
            }
            answer = num1 * num2;
        } else if (selectedOp === '/') {
            if (isPositiveOnly) {
                num2 = Math.floor(Math.random() * 9) + 1;
                answer = Math.floor(Math.random() * 9) + 1;
                num1 = num2 * answer;
            } else {
                num2 = getRandomIntExcludingZero(-9, 9);
                answer = getRandomIntExcludingZero(-9, 9);
                num1 = num2 * answer;
            }
        }

        const opSymbol = selectedOp === '*' ? '×' : selectedOp === '/' ? '÷' : selectedOp;
        return { num1, num2, opSymbol, answer };
    }

    function getRandomIntExcludingZero(min, max) {
        let val = 0;
        while(val === 0) val = Math.floor(Math.random() * (max - min + 1)) + min;
        return val;
    }

    function showNextProblem() {
        userTypedInput = "";
        answerInputBox.textContent = "";
        progressDisplay.textContent = `第 ${currentIdx + 1} / ${totalQuestions} 問`;
        
        const currentProb = problemsList[currentIdx];
        currentAnswer = currentProb.answer;

        const n1Str = currentProb.num1 < 0 ? `(${currentProb.num1})` : currentProb.num1;
        const n2Str = currentProb.num2 < 0 ? `(${currentProb.num2})` : currentProb.num2;
        formulaText.textContent = `${n1Str} ${currentProb.opSymbol} ${n2Str} = `;
    }

    // テンキー入力
    document.querySelectorAll('.key-btn[data-val]').forEach(button => {
        button.addEventListener('click', () => {
            const val = button.dataset.val;
            if (val === 'clear') {
                userTypedInput = "";
            } else if (val === '-') {
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

        if (userAnsInt === currentAnswer) {
            triggerFeedback('◯');
            currentIdx++;
            if (currentIdx < totalQuestions) {
                showNextProblem();
            } else {
                endGame();
            }
        } else {
            triggerFeedback('×');
            wrongCount++;
            userTypedInput = "";
            answerInputBox.textContent = "";
        }
    }

    function triggerFeedback(symbol) {
        feedbackOverlay.textContent = symbol;
        feedbackOverlay.className = symbol === '◯' ? 'correct-pop' : 'incorrect-pop';
        setTimeout(() => { feedbackOverlay.className = 'hidden'; }, POPUP_DURATION);
    }

    function endGame() {
        clearInterval(timerInterval);
        const totalTimeSec = Math.floor((Date.now() - startTime) / 1000);
        const avgSpeed = parseFloat((totalTimeSec / totalQuestions).toFixed(2));

        document.getElementById('res-total-time').textContent = `${Math.floor(totalTimeSec / 60)}分${totalTimeSec % 60}秒`;
        document.getElementById('res-wrong-count').textContent = `${wrongCount}回`;
        document.getElementById('res-avg-speed').textContent = `${avgSpeed}秒`;

        switchView(resultView);

        // 新仕様：opMode と rangeMode を含めてローカルストレージに保存
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
    }

    // ==================== 記録の可視化・モード別絞り込み ====================
    function renderRecords() {
        let allRecords = JSON.parse(localStorage.getItem('calc_training_records')) || [];
        
        // 時系列順にソート
        allRecords.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

        // 【新機能】選択されているモードで絞り込み
        const targetOp = filterOp.value;
        const targetRange = filterRange.value;
        
        let filteredRecords = allRecords.filter(r => {
            // 過去データにmode情報がない旧データの互換性を担保
            return r.opMode === targetOp && r.rangeMode === targetRange;
        });

        // 件数制限の適用
        const limit = graphLimitSelect.value;
        if (limit !== 'all') {
            const numLimit = parseInt(limit);
            filteredRecords = filteredRecords.slice(-numLimit);
        }

        // テーブル履歴用（最新順）
        const latestRecords = [...filteredRecords].reverse();
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';

        latestRecords.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.date}</td>
                <td>${r.totalQuestions}問</td>
                <td>${r.wrongCount}回</td>
                <td><strong>${r.avgSpeed}秒</strong></td>
            `;
            tbody.appendChild(tr);
        });

        // グラフ用配列
        const labels = filteredRecords.map(r => r.date);
        const speedData = filteredRecords.map(r => r.avgSpeed);
        const wrongRateData = filteredRecords.map(r => parseFloat(((r.wrongCount / r.totalQuestions) * 100).toFixed(1)));

        if (chartInstance) {
            chartInstance.destroy();
        }

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
                    'y-speed': {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: '秒/問', font: { size: 10 } },
                        min: 0
                    },
                    'y-wrong': {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: '誤答率(%)', font: { size: 10 } },
                        min: 0,
                        max: 100,
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } }
                    }
                },
                plugins: {
                    legend: { labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        });
    }
});
