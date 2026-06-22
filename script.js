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
    let chartInstance = null; // Chart.jsのインスタンスを保持

    // エフェクト表示時間（ミリ秒単位でここで秒数調整が可能です）
    const POPUP_DURATION = 500; // 0.5秒

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
        renderRecords(); // 記録タブを開いた時に再描画
    });

    // ==================== ゲーム制御ロジック ====================
    startBtn.addEventListener('click', startCountdown);
    backSetupBtn.addEventListener('click', () => {
        switchView(setupView);
    });
    clearDataBtn.addEventListener('click', () => {
        if(confirm("これまでの学習データをすべて消去してもよろしいですか？")) {
            localStorage.removeItem('calc_training_records');
            renderRecords();
        }
    });
    graphLimitSelect.addEventListener('change', renderRecords);

    function switchView(targetView) {
        [setupView, countdownView, gameView, resultView].forEach(v => v.classList.add('hidden'));
        targetView.classList.remove('hidden');
    }

    // 3秒カウントダウン
    function startCountdown() {
        switchView(countdownView);
        let count = 3;
        const countNumEl = document.getElementById('countdown-number');
        countNumEl.textContent = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countNumEl.textContent = count;
            } else {
                clearInterval(interval);
                initGame();
            }
        }, 1000);
    }

    // ゲームの初期設定
    function initGame() {
        const opMode = document.getElementById('op-select').value;
        const rangeMode = document.getElementById('range-select').value;
        totalQuestions = parseInt(document.getElementById('count-select').value);

        currentIdx = 0;
        wrongCount = 0;
        userTypedInput = "";
        answerInputBox.textContent = "";
        problemsList = [];

        // 全問題データを事前に一括生成
        for (let i = 0; i < totalQuestions; i++) {
            problemsList.push(generateSingleProblem(opMode, rangeMode));
        }

        switchView(gameView);
        showNextProblem();

        // 経過時間タイマースタート
        startTime = Date.now();
        updateTimerText();
        timerInterval = setInterval(updateTimerText, 1000);
    }

    // タイマー表示更新
    function updateTimerText() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const sec = String(elapsed % 60).padStart(2, '0');
        timerDisplay.textContent = `${min}:${sec}`;
    }

    // 問題の出題ロジック
    function generateSingleProblem(opMode, rangeMode) {
        let num1, num2, answer, selectedOp;
        
        // 演算モード決定
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
                num1 = Math.floor(Math.random() * 20) + 1; // 1〜20
                num2 = Math.floor(Math.random() * 20) + 1;
            } else {
                num1 = getRandomIntExcludingZero(-20, 20);
                num2 = getRandomIntExcludingZero(-20, 20);
            }
            answer = num1 + num2;

        } else if (selectedOp === '-') {
            if (isPositiveOnly) {
                // 答えが正になるよう調整（num1 >= num2）
                num1 = Math.floor(Math.random() * 20) + 2;
                num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
            } else {
                num1 = getRandomIntExcludingZero(-20, 20);
                num2 = getRandomIntExcludingZero(-20, 20);
            }
            answer = num1 - num2;

        } else if (selectedOp === '*') {
            if (isPositiveOnly) {
                num1 = Math.floor(Math.random() * 9) + 1; // 1〜9（九九の範囲辺り）
                num2 = Math.floor(Math.random() * 9) + 1;
            } else {
                num1 = getRandomIntExcludingZero(-9, 9);
                num2 = getRandomIntExcludingZero(-9, 9);
            }
            answer = num1 * num2;

        } else if (selectedOp === '/') {
            // 割り切れるペアを逆算で自動作成する
            if (isPositiveOnly) {
                num2 = Math.floor(Math.random() * 9) + 1; // 割る数(1〜9)
                answer = Math.floor(Math.random() * 9) + 1; // 答え(1〜9)
                num1 = num2 * answer; // 割られる数
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
        while(val === 0) {
            val = Math.floor(Math.random() * (max - min + 1)) + min;
        }
        return val;
    }

    function showNextProblem() {
        userTypedInput = "";
        answerInputBox.textContent = "";
        
        progressDisplay.textContent = `第 ${currentIdx + 1} / ${totalQuestions} 問`;
        
        const currentProb = problemsList[currentIdx];
        currentAnswer = currentProb.answer;

        // 負の数に読みやすさのカッコをつける
        const n1Str = currentProb.num1 < 0 ? `(${currentProb.num1})` : currentProb.num1;
        const n2Str = currentProb.num2 < 0 ? `(${currentProb.num2})` : currentProb.num2;

        formulaText.textContent = `${n1Str} ${currentProb.opSymbol} ${n2Str} = `;
    }

    // ==================== テンキー入力制御 ====================
    document.querySelectorAll('.key-btn[data-val]').forEach(button => {
        button.addEventListener('click', () => {
            const val = button.dataset.val;

            if (val === 'clear') {
                userTypedInput = "";
            } else if (val === '-') {
                // 先頭にマイナスを付与・解除を切り替えるトグル動作
                if (userTypedInput.startsWith('-')) {
                    userTypedInput = userTypedInput.slice(1);
                } else {
                    userTypedInput = '-' + userTypedInput;
                }
            } else {
                // 入力文字数制限（常識的な範囲として最大5桁）
                if (userTypedInput.replace('-', '').length < 5) {
                    userTypedInput += val;
                }
            }
            answerInputBox.textContent = userTypedInput;
        });
    });

    // 「決定」ボタンでの判定
    document.getElementById('enter-btn').addEventListener('click', evaluateUserAnswer);

    function evaluateUserAnswer() {
        if (userTypedInput === "" || userTypedInput === "-") return;

        const userAnsInt = parseInt(userTypedInput);

        if (userAnsInt === currentAnswer) {
            // 正解エフェクト
            triggerFeedback('◯');
            
            currentIdx++;
            if (currentIdx < totalQuestions) {
                showNextProblem();
            } else {
                // 全問終了
                endGame();
            }
        } else {
            // 不正解エフェクト (次の問題へいかず、入力をリセットして再挑戦)
            triggerFeedback('×');
            wrongCount++;
            userTypedInput = "";
            answerInputBox.textContent = "";
        }
    }

    // マルバツのポップアップ関数
    function triggerFeedback(symbol) {
        feedbackOverlay.textContent = symbol;
        feedbackOverlay.className = symbol === '◯' ? 'correct-pop' : 'incorrect-pop';
        
        setTimeout(() => {
            feedbackOverlay.className = 'hidden';
        }, POPUP_DURATION);
    }

    // ゲーム終了、結果の保存
    function endGame() {
        clearInterval(timerInterval);
        const totalTimeSec = Math.floor((Date.now() - startTime) / 1000);
        const avgSpeed = parseFloat((totalTimeSec / totalQuestions).toFixed(2));

        // リザルト画面に表示
        document.getElementById('res-total-time').textContent = `${Math.floor(totalTimeSec / 60)}分${totalTimeSec % 60}秒`;
        document.getElementById('res-wrong-count').textContent = `${wrongCount}回`;
        document.getElementById('res-avg-speed').textContent = `${avgSpeed}秒`;

        switchView(resultView);

        // ローカルストレージにデータを保存
        const timestamp = new Date().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
        const newRecord = {
            date: timestamp,
            totalQuestions: totalQuestions,
            wrongCount: wrongCount,
            avgSpeed: avgSpeed,
            rawTimestamp: Date.now() // ソート用
        };

        let currentRecords = JSON.parse(localStorage.getItem('calc_training_records')) || [];
        currentRecords.push(newRecord);
        localStorage.setItem('calc_training_records', JSON.stringify(currentRecords));
    }

    // ==================== 記録の可視化 (Chart.js) ====================
    function renderRecords() {
        let records = JSON.parse(localStorage.getItem('calc_training_records')) || [];
        
        // 時系列順にソート
        records.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

        // プルダウンによる表示件数切り替え
        const limit = graphLimitSelect.value;
        if (limit !== 'all') {
            const numLimit = parseInt(limit);
            records = records.slice(-numLimit);
        }

        // テーブル（履歴）用に最新順のコピーも作る
        const latestRecords = [...records].reverse();
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

        // グラフ用データ配列の用意
        const labels = records.map(r => r.date);
        const speedData = records.map(r => r.avgSpeed);
        // 誤答率をパーセンテージで算出 (誤答数 / 出題数 * 100)
        const wrongRateData = records.map(r => parseFloat(((r.wrongCount / r.totalQuestions) * 100).toFixed(1)));

        // 既存のグラフオブジェクトがあれば一度破棄する (Chart.jsの仕様)
        if (chartInstance) {
            chartInstance.destroy();
        }

        const ctx = document.getElementById('record-chart').getContext('2d');
        if(records.length === 0) {
            ctx.clearRect(0, 0, 400, 220);
            return;
        }

        // 2軸複合グラフの生成
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '誤答率 (%)',
                        data: wrongRateData,
                        backgroundColor: 'rgba(224, 109, 109, 0.4)',
                        borderColor: 'rgba(224, 109, 109, 1)',
                        borderWidth: 1,
                        yAxisID: 'y-wrong',
                        order: 2
                    },
                    {
                        label: '1問平均速度 (秒)',
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
                        title: { display: true, text: '速度 (秒/問)', font: { size: 10 } },
                        min: 0
                    },
                    'y-wrong': {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: '誤答率 (%)', font: { size: 10 } },
                        min: 0,
                        max: 100,
                        grid: { drawOnChartArea: false } // 右側のグリッド線が左側と被ってごちゃつくのを防ぐ
                    },
                    x: {
                        ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } }
                    }
                },
                plugins: {
                    legend: { labels: { boxWidth: 12, font: { size: 11 } } }
                }
            }
        });
    }
});
