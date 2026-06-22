document.addEventListener('DOMContentLoaded', () => {
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
    
    const filterOp = document.getElementById('filter-op');
    const filterRange = document.getElementById('filter-range');

    const progressDisplay = document.getElementById('progress-display');
    const timerDisplay = document.getElementById('timer-display');
    const answerInputBox = document.getElementById('answer-input-box');

    // 各数式パーツのDOM参照
    const blockLeft = document.getElementById('block-left');
    const blockMiddle = document.getElementById('block-middle');
    const blockRight = document.getElementById('block-right');

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

    const FLASH_DURATION = 350;

    // タブ切り替え
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

    startBtn.addEventListener('click', startCountdown);
    backSetupBtn.addEventListener('click', () => switchView(setupView));
    
    clearDataBtn.addEventListener('click', () => {
        if(confirm("全モードの学習データをすべて消去してもよろしいですか？")) {
            localStorage.removeItem('calc_training_records');
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
        document.getElementById('countdown-number').textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count > 0) document.getElementById('countdown-number').textContent = count;
            else { clearInterval(interval); initGame(); }
        }, 1000);
    }

    function initGame() {
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
        
        // 演算モード決定
        if (opMode === 'mushikui-pm') {
            selectedOp = Math.random() < 0.5 ? '+' : '-';
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
                // 【元に戻す】 -20 〜 20 の範囲から一様にランダム
                num1 = getRandomIntIncludingZero(-20, 20);
                num2 = getRandomIntIncludingZero(-20, 20);
            }
            answer = num1 + num2;

        } else if (selectedOp === '-') {
            if (isPositiveOnly) {
                // 答えも正になるよう調整 (num1 > num2)
                num1 = getRandomIntIncludingZero(0, 20);
                num2 = getRandomIntIncludingZero(0, num1); // num2 <= num1
            } else {
                // 【元に戻す】 -20 〜 20 の範囲から一様にランダム（0を除く）
                num1 = getRandomIntIncludingZero(-20, 20);
                num2 = getRandomIntIncludingZero(-20, 20);
            }
            answer = num1 - num2;

        } else if (selectedOp === '*') {
            if (isPositiveOnly) {
                num1 = getRandomIntIncludingZero(0, 10); // 0〜10
                num2 = getRandomIntIncludingZero(0, 10); // 0〜10
            } else {
                // 【元に戻す】 -9 〜 9 の範囲から一様にランダム
                num1 = getRandomIntIncludingZero(-10, 10);
                num2 = getRandomIntIncludingZero(-10, 10);
            }
            answer = num1 * num2;

        } else if (selectedOp === '/') {
            if (isPositiveOnly) {
                num2 = getRandomIntIncludingZero(1, 10);   // 割る数(1〜9)
                answer = getRandomIntIncludingZero(0, 10); // 答え(1〜9)
                num1 = num2 * answer;                       // 割られる数
            } else {
                // 【元に戻す】 割る数と答えをシンプルにランダム生成して逆算（割り切れる整数を維持）
                num2 = getRandomIntExcludingZero(-10, 10);
                answer = getRandomIntIncludingZero(-9, 9);
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

    function getRandomIntIncludingZero(min, max) {
        let val = 0;
        val = Math.floor(Math.random() * (max - min + 1)) + min;
        if (val === 0) val = Math.floor(Math.random() * (max - min + 1)) + min; // 再度生成
        return val;
    }

    // 【大幅改修】虫食い算の表示制御ロジック
    function showNextProblem() {
        userTypedInput = "";
        answerInputBox.textContent = "";
        progressDisplay.textContent = `第 ${currentIdx + 1} / ${totalQuestions} 問`;
        
        const currentProb = problemsList[currentIdx];
        
        const n1Str = currentProb.num1 < 0 ? `(${currentProb.num1})` : currentProb.num1;
        const n2Str = currentProb.num2 < 0 ? `(${currentProb.num2})` : currentProb.num2;
        const op = currentProb.opSymbol;
        const ans = currentProb.answer;

        // 現在選択されているのが「虫食いモード」かどうか
        const isMushikui = (lastPlayedOp === 'mushikui-pm' || lastPlayedOp === 'mushikui-all');

        if (isMushikui) {
            // 0:答えが空欄, 1:左が空欄, 2:右が空欄
            const blankPattern = Math.floor(Math.random() * 3);

            if (blankPattern === 0) {
                currentAnswer = currentProb.answer; // 答えを当てる
                blockLeft.textContent = `${n1Str} ${op}`;
                blockMiddle.textContent = `${n2Str}`;
                blockRight.textContent = `＝`;
                
                blockLeft.style.order = "1";
                blockMiddle.style.order = "2";
                blockRight.style.order = "3";
                answerInputBox.style.order = "4"; // 一番右
            } else if (blankPattern === 1) {
                currentAnswer = currentProb.num1; // 左の数を当てる
                blockLeft.textContent = ``;
                blockMiddle.textContent = `${op} ${n2Str}`;
                blockRight.textContent = `＝ ${ans}`;
                
                answerInputBox.style.order = "1"; // 一番左
                blockLeft.style.order = "2";
                blockMiddle.style.order = "3";
                blockRight.style.order = "4";
            } else {
                currentAnswer = currentProb.num2; // 右の数を当てる
                blockLeft.textContent = `${n1Str} ${op}`;
                blockMiddle.textContent = ``;
                blockRight.textContent = `＝ ${ans}`;
                
                blockLeft.style.order = "1";
                answerInputBox.style.order = "2"; // 中央
                blockMiddle.style.order = "3";
                blockRight.style.order = "4";
            }
        } else {
            // 通常モード時のデフォルト表示
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

    // テンキー
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

        if (userAnsInt === currentAnswer) {
            triggerFeedback('◯');
            currentIdx++;
            setTimeout(() => {
                if (currentIdx < totalQuestions) showNextProblem();
                else endGame();
            }, FLASH_DURATION - 100);
        } else {
            triggerFeedback('×');
            wrongCount++;
            userTypedInput = "";
            answerInputBox.textContent = "";
        }
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
        const totalTimeSec = Math.floor((Date.now() - startTime) / 1000);
        const avgSpeed = parseFloat((totalTimeSec / totalQuestions).toFixed(2));

        document.getElementById('res-total-time').textContent = `${Math.floor(totalTimeSec / 60)}分${totalTimeSec % 60}秒`;
        document.getElementById('res-wrong-count').textContent = `${wrongCount}回`;
        document.getElementById('res-avg-speed').textContent = `${avgSpeed}秒`;

        switchView(resultView);

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

    // 履歴・グラフ描画
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
