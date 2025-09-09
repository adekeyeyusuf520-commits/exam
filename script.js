// ===== STATE =====
let EXAM = { questions: [] };
let state = {
  currentQ: 0,
  answers: [],
  started: false,
  timer: null,
  remainingSeconds: 0
};

// ===== DOM ELEMENTS =====
const qCard = document.getElementById("qCard");
const qGrid = document.getElementById("qGrid");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const prevBtn = document.getElementById("prevBtn");
const submitBtn = document.getElementById("submitBtn");
const resultsEl = document.getElementById("results");
const scoreChart = document.getElementById("scoreChart");
const exportBtn = document.getElementById("exportBtn");

// Pause/Resume Buttons
const pauseBtn = document.createElement("button");
pauseBtn.textContent = "Pause Timer";
pauseBtn.id = "pauseBtn";
const resumeBtn = document.createElement("button");
resumeBtn.textContent = "Resume Timer";
resumeBtn.id = "resumeBtn";
resumeBtn.style.display = "none";
document.querySelector(".controls").appendChild(pauseBtn);
document.querySelector(".controls").appendChild(resumeBtn);

exportBtn.style.display = "none";

// ===== UTILITY FUNCTIONS =====
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ===== EXAM FUNCTIONS =====
function startExam(config) {
  if (state.started) return;
  state.started = true;

  // Shuffle questions
  EXAM.questions = shuffleArray(config.questions);

  // Shuffle options for each question
  EXAM.questions.forEach(q => {
    const correctAnswer = q.options[q.answer];
    q.options = shuffleArray(q.options);
    q.answer = q.options.indexOf(correctAnswer);
  });

  state.answers = new Array(EXAM.questions.length).fill(null);
  state.remainingSeconds = config.timeMinutes * 60;

  document.getElementById("examTitle").textContent = config.title;
  document.getElementById("duration").textContent = config.timeMinutes + " mins";
  document.getElementById("qcount").textContent = EXAM.questions.length;
  statusEl.textContent = "In Progress";

  buildQuestionGrid();
  renderQuestion();
  startTimer();
}

function buildQuestionGrid() {
  qGrid.innerHTML = "";
  EXAM.questions.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.className = "qbtn";
    btn.textContent = idx + 1;
    btn.addEventListener("click", () => goToQuestion(idx));
    qGrid.appendChild(btn);
  });
}

function renderQuestion() {
  const q = EXAM.questions[state.currentQ];
  if (!q) return;

  qCard.innerHTML = `
    <div class="q-header">
      <div class="q-title">${q.text}</div>
      <div class="marks">${q.marks} mark(s)</div>
    </div>
    <div class="options">
      ${q.options
        .map(
          (opt, i) => `
        <div class="opt ${state.answers[state.currentQ] === i ? "selected" : ""}" data-index="${i}">
          <input type="radio" name="q${q.id}" ${state.answers[state.currentQ] === i ? "checked" : ""}/>
          ${opt}
        </div>
      `
        )
        .join("")}
    </div>
  `;

  qCard.querySelectorAll(".opt").forEach((el) => {
    el.addEventListener("click", () => {
      state.answers[state.currentQ] = parseInt(el.dataset.index);
      renderQuestion();
      updateGrid();
    });
  });

  updateGrid();
  updateProgress();
}

function updateGrid() {
  qGrid.querySelectorAll(".qbtn").forEach((btn, idx) => {
    btn.classList.toggle("answered", state.answers[idx] != null);
    btn.classList.toggle("current", idx === state.currentQ);
  });
}

function goToQuestion(idx) {
  state.currentQ = idx;
  renderQuestion();
}

// ===== NAVIGATION =====
prevBtn.addEventListener("click", () => {
  if (state.currentQ > 0) {
    state.currentQ--;
    renderQuestion();
  }
});
document.getElementById("nextBtn").addEventListener("click", () => {
  if (state.currentQ < EXAM.questions.length - 1) {
    state.currentQ++;
    renderQuestion();
  }
});

// ===== TIMER =====
function startTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.remainingSeconds--;
    const mins = Math.floor(state.remainingSeconds / 60);
    const secs = state.remainingSeconds % 60;
    timerEl.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    if (state.remainingSeconds <= 0) {
      clearInterval(state.timer);
      submitExam();
    }
  }, 1000);
}

pauseBtn.addEventListener("click", () => {
  clearInterval(state.timer);
  pauseBtn.style.display = "none";
  resumeBtn.style.display = "inline-block";
});

resumeBtn.addEventListener("click", () => {
  startTimer();
  resumeBtn.style.display = "none";
  pauseBtn.style.display = "inline-block";
});

// ===== PROGRESS BAR =====
function updateProgress() {
  const percent = ((state.currentQ + 1) / EXAM.questions.length) * 100;
  const bar = document.getElementById("progressBar");
  if (bar) bar.style.width = percent + "%";
}

// ===== SUBMIT & FEEDBACK =====
submitBtn.addEventListener("click", submitExam);
function submitExam() {
  clearInterval(state.timer);
  let score = 0;
  let feedbackHTML = "";

  EXAM.questions.forEach((q, idx) => {
    const userAns = state.answers[idx];
    const correct = userAns === q.answer;
    if (correct) score += q.marks;

    feedbackHTML += `
      <div class="stat">
        Q${idx + 1}: ${correct ? "✅ Correct" : "❌ Wrong"} 
        <br><small>Answer: ${q.options[q.answer]}</small>
      </div>
    `;
  });

  resultsEl.style.display = "block";
  resultsEl.innerHTML = `
    <h3>Results</h3>
    <div class="stat-grid">${feedbackHTML}</div>
    <div class="stat-grid" style="margin-top:12px">
      <div class="stat">Total Questions: ${EXAM.questions.length}</div>
      <div class="stat">Answered: ${state.answers.filter((a) => a != null).length}</div>
      <div class="stat">Score: ${score}</div>
    </div>
  `;

  renderChart(score);
  exportBtn.style.display = "inline-block";
  resultsEl.scrollIntoView({ behavior: "smooth" });
}

// ===== CHART =====
function renderChart(score) {
  new Chart(scoreChart, {
    type: "doughnut",
    data: {
      labels: ["Score", "Remaining"],
      datasets: [
        {
          data: [score, EXAM.questions.length - score],
          backgroundColor: ["#16a34a", "#334155"]
        }
      ]
    },
    options: { responsive: true, plugins: { legend: { display: true } } }
  });
}

// ===== CALCULATOR =====
const calcToggle = document.getElementById("calcToggle");
const calcEl = document.getElementById("calculator");
const calcClose = document.getElementById("calcClose");
const calcDisplay = document.getElementById("calcDisplay");
const calcKeys = document.getElementById("calcKeys");
const calcAns = document.getElementById("calcAns");
const calcClear = document.getElementById("calcClear");
const calcBack = document.getElementById("calcBack");

let lastAns = 0;
const buttons = [
  "7","8","9","/","sqrt",
  "4","5","6","*","^",
  "1","2","3","-","(",
  "0",".","=","+","%",
  "exp",")"
];
buttons.forEach((b) => {
  const btn = document.createElement("button");
  btn.textContent = b;
  btn.addEventListener("click", () => pressCalc(b));
  calcKeys.appendChild(btn);
});

calcToggle.addEventListener("click", () => { calcEl.style.display = "block"; });
calcClose.addEventListener("click", () => { calcEl.style.display = "none"; });
calcClear.addEventListener("click", () => { calcDisplay.value = ""; });
calcBack.addEventListener("click", () => { calcDisplay.value = calcDisplay.value.slice(0, -1); });
calcAns.addEventListener("click", () => { calcDisplay.value += lastAns; });

function pressCalc(key) {
  if (key === "=") {
    try {
      const expr = calcDisplay.value
        .replace(/\^/g, "**")
        .replace(/sqrt/g, "Math.sqrt")
        .replace(/exp/g, "Math.exp");
      lastAns = eval(expr);
      calcDisplay.value = lastAns;
    } catch {
      calcDisplay.value = "Error";
    }
  } else {
    calcDisplay.value += key;
  }
}

// ===== EXPORT PDF =====
exportBtn.addEventListener("click", () => {
  html2canvas(document.querySelector(".app")).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jspdf.jsPDF();
    pdf.addImage(imgData, "PNG", 10, 10, 190, 0);
    pdf.save("exam_results.pdf");
  });
});

// ===== LOAD CONFIG ON PAGE LOAD =====
window.addEventListener("DOMContentLoaded", () => {
  fetch("exam-config.json")
    .then((res) => res.json())
    .then((config) => startExam(config))
    .catch((err) => {
      console.error("Config load failed:", err);
      alert("Could not load exam-config.json");
    });
});
