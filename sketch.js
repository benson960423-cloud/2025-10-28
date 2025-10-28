let quizTable;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let quizState = 'start'; // 'start', 'quiz', 'results'
let bgColor;
let optionButtons = [];
let feedback = '';
let feedbackColor = 0;
let nextButton;
let startButton;
let restartButton;
let fireworks = [];
let particles = [];

const TOTAL_QUESTIONS = 5;

function preload() {
  // 載入CSV題庫檔案
  quizTable = loadTable('quiz.csv', 'csv', 'header');
}

// Spark 用於煙火的單一火花
class Spark {
  constructor(x, y, vel, col) {
    this.pos = createVector(x, y);
    this.vel = vel.copy();
    this.col = col || color(255, 200, 50);
    this.lifespan = 255;
    this.size = random(3, 8);
  }

  update() {
    this.pos.add(this.vel);
    this.vel.mult(0.98);
    this.lifespan -= 3;
  }

  show() {
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.lifespan);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }
}

// Firework: 產生一組 spark 並管理
class Firework {
  constructor(x, y) {
    this.x = x || random(width * 0.2, width * 0.8);
    this.y = y || random(height * 0.2, height * 0.5);
    this.sparks = [];
    this.exploded = false;
    this.explode();
  }

  explode() {
    let baseCol = color(random(80, 255), random(80, 255), random(80, 255));
    let count = floor(random(80, 160));
    for (let i = 0; i < count; i++) {
      let v = p5.Vector.random2D().mult(random(2, 12));
      this.sparks.push(new Spark(this.x, this.y, v, baseCol));
    }
    this.exploded = true;
  }

  update() {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      this.sparks[i].update();
      if (this.sparks[i].lifespan <= 0) this.sparks.splice(i, 1);
    }
  }

  show() {
    for (let s of this.sparks) s.show();
  }
}

// FountainParticle: 從底部向上噴發的粒子
class FountainParticle {
  constructor(x, y) {
    this.pos = createVector(x + random(-80, 80), y);
    this.vel = createVector(random(-2, 2), random(-12, -5));
    this.acc = createVector(0, 0.25);
    this.lifespan = 260 + random(0, 140);
    this.col = color(random(120, 255), random(80, 255), random(80, 255));
    this.size = random(4, 10);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 2;
  }

  show() {
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.lifespan);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }
}

// Confetti: 彩帶方塊，從上方掉落或從結果區域飄散
class Confetti {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1, 1), random(1, 4));
    this.size = random(6, 14);
    this.angle = random(TWO_PI);
    this.spin = random(-0.2, 0.2);
    this.col = color(random(50, 255), random(50, 255), random(50, 255));
    this.lifespan = 400 + random(0, 200);
  }

  update() {
    this.vel.y += 0.02; // 微重力
    this.pos.add(this.vel);
    this.angle += this.spin;
    this.lifespan -= 2;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.lifespan);
    rectMode(CENTER);
    rect(0, 0, this.size, this.size * 0.6);
    pop();
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  bgColor = color(230, 240, 255);
  // 開始按鈕
  startButton = createButton('開始測驗');
  startButton.position(width / 2 - 60, height / 2 + 20);
  startButton.size(120, 40);
  startButton.mousePressed(startQuiz);
}

function draw() {
  background(bgColor); // 淡藍色背景

  if (quizState === 'start') {
    drawStartScreen();
  } else if (quizState === 'quiz') {
    drawQuizScreen();
  } else if (quizState === 'results') {
    drawResultsScreen();
  }

  // 更新煙火和粒子
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].show();
  }
  // 更新一般粒子（例如噴泉或 confetti）
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].lifespan <= 0) particles.splice(i, 1);
  }

  // 若在結果畫面且為滿分，定期產生更多煙火以擴大範圍與強度
  if (quizState === 'results' && score === TOTAL_QUESTIONS && frameCount % 40 === 0) {
    let x = random(width * 0.1, width * 0.9);
    let y = random(height * 0.15, height * 0.45);
    fireworks.push(new Firework(x, y));
  }
}

function drawStartScreen() {
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0, 102, 153);
  text('歡迎來到 p5.js 選擇題測驗', width / 2, height / 2 - 40);
}

function drawQuizScreen() {
  // 顯示題目（移到選項上方的左上，與按鈕左側對齊）
  textAlign(LEFT, TOP);
  textSize(20);
  fill(0);
  if (questions.length > 0) {
    const question = questions[currentQuestionIndex].getString('question');
    // 與 displayQuestion 使用相同按鈕寬度計算，以便左對齊
    const estimatedBtnWidth = min(max(260, width * 0.5), width * 0.85);
    const leftX = width / 2 - estimatedBtnWidth / 2;
    const optionsTop = height * 0.22;
    const questionY = height * 0.04; // 比較靠頂部
    // 題目最大高度不超過按鈕區上方的可用空間，避免覆蓋
    const maxQuestionHeight = max(40, optionsTop - questionY - 8);
    text(question, leftX, questionY, estimatedBtnWidth, maxQuestionHeight);
  }

  // 顯示回饋
  if (feedback) {
    textSize(24);
    fill(feedbackColor);
    text(feedback, width / 2, height - 100);
  }
}

function drawResultsScreen() {
  textAlign(CENTER, CENTER);
  
  // 顯示最終成績
  textSize(32);
  fill(0, 102, 153);
  text(`測驗結束！\n你的分數是: ${score} / ${TOTAL_QUESTIONS}`, width / 2, height / 2 - 80);

  // 顯示回饋用語
  let finalFeedback = '';
  let percentage = score / TOTAL_QUESTIONS;
  if (percentage === 1) {
    finalFeedback = '太棒了，全部答對！你是天才！';
    fill(255, 215, 0); // 金色
  } else if (percentage >= 0.8) {
    finalFeedback = '表現優異，繼續努力！';
    fill(0, 128, 0); // 綠色
  } else if (percentage >= 0.6) {
    finalFeedback = '還不錯，再加把勁！';
    fill(255, 165, 0); // 橘色
  } else {
    finalFeedback = '別灰心，下次會更好！';
    fill(255, 0, 0); // 紅色
  }
  textSize(24);
  text(finalFeedback, width / 2, height / 2);

}

function selectRandomQuestions() {
  let rows = quizTable.getRows();
  // 打亂題庫順序
  rows.sort(() => 0.5 - Math.random());
  // 選取前五題
  questions = rows.slice(0, TOTAL_QUESTIONS);
}

function displayQuestion(index) {
  // 清除舊按鈕
  optionButtons.forEach(btn => btn.remove());
  optionButtons = [];
  feedback = '';
  if (nextButton) nextButton.hide();

  if (index < questions.length) {
    let question = questions[index];
    // 自動偵測選項數量（支援 optionA..optionF 或直接 A..F 欄位）
    let options = [];
    const possibleLabels = ['A','B','C','D','E','F'];
    for (let lab of possibleLabels) {
      let key = 'option' + lab;
      try {
        let val = question.getString(key);
        if (val && val.trim() !== '') options.push({label: lab, text: val});
      } catch (e) {}
    }
    if (options.length === 0) {
      for (let lab of possibleLabels) {
        try {
          let val = question.getString(lab);
          if (val && val.trim() !== '') options.push({label: lab, text: val});
        } catch (e) {}
      }
    }

    // 配置選項區間並等比例分配
    const optionsTop = height * 0.22;
    const optionsBottom = height * 0.78;
    const availableHeight = optionsBottom - optionsTop;
    const n = max(1, options.length);
    const slotHeight = availableHeight / n;

  // 把選項縮小：較小的最小寬度，並以畫面寬度的比例作為基底
  const btnWidth = min(max(260, width * 0.5), width * 0.85);
  // 按鈕高度根據 slotHeight 等比例，但有上下限，避免過高
  const btnHeight = min(60, max(36, slotHeight * 0.55));

    for (let i = 0; i < n; i++) {
      let opt = options[i];
      let optionKey = opt.label;
      let optionText = opt.text;
      let btn = createButton(`${optionKey}: ${optionText}`);
      let x = width / 2 - btnWidth / 2;
      let y = optionsTop + slotHeight * i + (slotHeight - btnHeight) / 2;
      btn.position(x, y);
      btn.size(btnWidth, btnHeight);
      btn.class('option-button');
      ((lbl) => btn.mousePressed(() => checkAnswer(lbl)))(optionKey);
      optionButtons.push(btn);
    }

    // 下一題按鈕置底並置中
    if (nextButton) {
      const nextW = 140;
      const nextH = 50;
      nextButton.size(nextW, nextH);
      nextButton.position(width / 2 - nextW / 2, height * 0.92 - nextH / 2);
    }
  } else {
    // 測驗結束
    showResults();
  }
}

function checkAnswer(selectedOption) {
  let correctAnswer = questions[currentQuestionIndex].getString('correctAnswer');
  
  if (selectedOption === correctAnswer) {
    score++;
    feedback = '答對了！';
    feedbackColor = color(0, 150, 0);
  } else {
    feedback = `答錯了，正確答案是 ${correctAnswer}`;
    feedbackColor = color(200, 0, 0);
  }

  // 禁用所有選項按鈕
  optionButtons.forEach(btn => btn.attribute('disabled', ''));
  // 顯示下一題按鈕
  // 置底且置中，與 displayQuestion 的位置一致
  if (nextButton) {
    const nextW = 140;
    const nextH = 50;
    nextButton.size(nextW, nextH);
    nextButton.position(width / 2 - nextW / 2, height * 0.92 - nextH / 2);
  }
  nextButton.show();
  // 變換背景顏色
  bgColor = color(random(220, 255), random(220, 255), random(220, 255));
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < TOTAL_QUESTIONS) {
    displayQuestion(currentQuestionIndex);
  } else {
    showResults();
  }
}

function showResults() {
  quizState = 'results';
  optionButtons.forEach(btn => btn.remove());
  nextButton.remove();

  // 根據分數顯示不同特效
  let percentage = score / TOTAL_QUESTIONS;
  if (percentage === 1) {
    // 大量煙火覆蓋畫面
    for (let i = 0; i < 30; i++) {
      fireworks.push(new Firework(random(width * 0.05, width * 0.95), random(height * 0.05, height * 0.6)));
    }
    // 也產生大量彩帶/confetti
    for (let i = 0; i < 300; i++) {
      particles.push(new Confetti(random(width), random(-height, height * 0.6)));
    }
  } else if (percentage >= 0.6) {
    // 更明顯且範圍更大的噴泉
    for (let i = 0; i < 300; i++) {
      particles.push(new FountainParticle(width * random(0.2, 0.8), height));
    }
    // 加一些彩帶
    for (let i = 0; i < 80; i++) {
      particles.push(new Confetti(random(width), random(-height * 0.5, height * 0.6)));
    }
  }
  

  // 建立 "再答一次" 按鈕
  restartButton = createButton('再答一次');
  restartButton.position(width / 2 - 60, height / 2 + 60);
  restartButton.size(120, 50);
  restartButton.mousePressed(restartQuiz);
}

function restartQuiz() {
  score = 0;
  currentQuestionIndex = 0;
  fireworks = [];
  particles = [];
  if (restartButton) {
    restartButton.remove();
    restartButton = null;
  }
  startQuiz();
}

function startQuiz() {
  if (startButton) {
    startButton.remove();
    startButton = null;
  }

  selectRandomQuestions();
  bgColor = color(230, 240, 255);
  // 建立 "下一題" 按鈕（先建立、之後 displayQuestion 會調整大小與位置）
  nextButton = createButton('下一題');
  nextButton.size(140, 50);
  nextButton.mousePressed(nextQuestion);
  nextButton.hide();

  displayQuestion(currentQuestionIndex);
  quizState = 'quiz';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (quizState === 'start' && startButton) {
    startButton.position(width / 2 - 60, height / 2 + 20);
  } else if (quizState === 'quiz') {
    // 重新建立題目與選項（displayQuestion 會依新尺寸重建按鈕與下一題按鈕位置）
    displayQuestion(currentQuestionIndex);
  } else if (quizState === 'results' && restartButton) {
    restartButton.position(width / 2 - 60, height / 2 + 60);
  }
}

// 粒子類別，用於結束畫面的特效
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 5));
    this.lifespan = 255;
  }

  update() {
    this.pos.add(this.vel);
    this.lifespan -= 2;
  }

  show() {
    noStroke();
    fill(random(255), random(255), random(255), this.lifespan);
    // 畫星星
    beginShape();
    for (let i = 0; i < 5; i++) {
      let angle = TWO_PI / 5 * i;
      let x = this.pos.x + cos(angle) * 5;
      let y = this.pos.y + sin(angle) * 5;
      vertex(x, y);
      angle += TWO_PI / 10;
      x = this.pos.x + cos(angle) * 2;
      y = this.pos.y + sin(angle) * 2;
      vertex(x, y);
    }
    endShape(CLOSE);
  }
}
