/* ==========================================================================
   PainCare Mobile - Core Application Logic (Vanilla JS)
   ========================================================================== */

// --- 1. GLOBAL STATE MANAGER ---
const state = {
  activeScreen: 'screen-welcome',
  navigationHistory: [],
  selectedProfile: null,       // 'criança', 'adulto', 'idoso'
  selectedSpecificity: null,   // key of selected refinement
  selectedScale: null,         // active scale key
  activeCPOTMode: 'intubated', // 'intubated' or 'extubated'
  currentScore: 0,
  maxScore: 10,
  history: JSON.parse(localStorage.getItem('paincare_history')) || []
};

// --- 2. SCREEN ROUTER & NAVIGATION ---
function navigateTo(screenId, pushToHistory = true) {
  const currentScreenEl = document.getElementById(state.activeScreen);
  const targetScreenEl = document.getElementById(screenId);

  if (currentScreenEl) {
    currentScreenEl.classList.remove('active');
  }

  if (targetScreenEl) {
    targetScreenEl.classList.add('active');
    
    // Manage history for back navigation
    if (pushToHistory && state.activeScreen !== screenId) {
      state.navigationHistory.push(state.activeScreen);
    }
    
    state.activeScreen = screenId;
  }

  // Visual/UI cleanups depending on screen
  if (screenId !== 'screen-evaluator') {
    exitPatientMode();
  }
}

function navigateBack() {
  if (state.navigationHistory.length > 0) {
    const previousScreen = state.navigationHistory.pop();
    navigateTo(previousScreen, false);
  } else {
    navigateTo('screen-welcome', false);
  }
}

// --- 3. DATA SCHEMA FOR REFINEMENTS & SCALES ---
const SPECIFICITIES = {
  criança: [
    { key: 'child-under-2', title: 'Até 2 anos ou não verbal', desc: 'Neonatos e lactentes incapazes de se expressar.', scale: 'wong-baker' },
    { key: 'child-2-6', title: 'De 2 a 6 anos', desc: 'Crianças na fase pré-escolar.', scale: 'wong-baker', altScale: 'eva' },
    { key: 'child-over-6', title: 'Acima de 6 anos', desc: 'Crianças em fase escolar capazes de quantificar.', scale: 'eva', altScale: 'evn' }
  ],
  adulto: [
    { key: 'adult-lucid', title: 'Lúcido e Comunicativo', desc: 'Capaz de responder de forma verbal direta.', scale: 'evn', altScale: 'eva' },
    { key: 'adult-illiterate', title: 'Adulto Analfabeto', desc: 'Tem dificuldades com escalas numéricas complexas.', scale: 'wong-baker' },
    { key: 'adult-uti', title: 'Intubado ou Sedado (UTI)', desc: 'Sob ventilação mecânica na terapia intensiva.', scale: 'bps', altScale: 'cpot' }
  ],
  idoso: [
    { key: 'elder-lucid', title: 'Sem Declínio Cognitivo', desc: 'Idoso lúcido e orientado.', scale: 'evn' },
    { key: 'elder-dementia', title: 'Com Demência ou Declínio Cognitivo', desc: 'Incapaz de relatar verbalmente de forma confiável.', scale: 'painad' }
  ]
};

const SCALES = {
  'wong-baker': { title: 'Escala de Wong-Baker', max: 10, type: 'interactive' },
  'eva': { title: 'Escala Visual Analógica (EVA)', max: 10, type: 'interactive' },
  'evn': { title: 'Escala Visual Numérica (EVN)', max: 10, type: 'interactive' },
  'painad': { title: 'Escala PAINAD', max: 10, type: 'observational' },
  'bps': { title: 'Escala Behavioral Pain Scale (BPS)', min: 3, max: 12, type: 'observational' },
  'cpot': { title: 'Escala CPOT', max: 8, type: 'observational' }
};

// --- 4. SCALE HTML GENERATORS & EVENT HANDLERS ---

// A. Wong-Baker (Faces)
function generateWongBakerHTML() {
  const faces = [
    { score: 0, label: 'Sem Dor', desc: 'Muito alegre', class: 'face-0', path: '<path class="svg-mouth" d="M22 36 C26 42, 34 42, 38 36" />' },
    { score: 2, label: 'Dói um Pouco', desc: 'Sorridente', class: 'face-2', path: '<path class="svg-mouth" d="M23 37 C27 40, 33 40, 37 37" />' },
    { score: 4, label: 'Dói um Pouco Mais', desc: 'Preocupado', class: 'face-4', path: '<line class="svg-mouth" x1="22" y1="38" x2="38" y2="38" />' },
    { score: 6, label: 'Dói Ainda Mais', desc: 'Triste', class: 'face-6', path: '<path class="svg-mouth" d="M22 40 C26 35, 34 35, 38 40" />' },
    { score: 8, label: 'Dói Muito', desc: 'Choroso', class: 'face-8', path: '<path class="svg-mouth" d="M22 41 C26 34, 34 34, 38 41" /><path class="svg-tear" d="M19 28 L19 33 L17 31 Z" /><path class="svg-tear" d="M41 28 L41 33 L43 31 Z" />' },
    { score: 10, label: 'Dói o Máximo', desc: 'Desesperado', class: 'face-10', path: '<path class="svg-mouth" d="M20 40 C20 32, 40 32, 40 40 Z" /><path class="svg-tear-line" d="M17 28 L17 38" /><path class="svg-tear-line" d="M43 28 L43 38" />' }
  ];

  let cardsHTML = faces.map(f => `
    <button class="face-card ${f.class}" data-score="${f.score}">
      <svg class="face-svg" viewBox="0 0 60 60">
        <circle class="svg-bg" cx="30" cy="30" r="26" />
        <circle class="svg-eyes" cx="20" cy="24" r="3.5" />
        <circle class="svg-eyes" cx="40" cy="24" r="3.5" />
        ${f.path}
      </svg>
      <div class="face-score">${f.score}</div>
      <div class="face-label">${f.label}</div>
      <div class="face-desc">${f.desc}</div>
    </button>
  `).join('');

  return `
    <div class="wong-baker-container">
      <p class="wong-baker-help">Toque na carinha que representa a intensidade da dor:</p>
      <div class="faces-grid">
        ${cardsHTML}
      </div>
    </div>
  `;
}

function initWongBakerHandlers() {
  document.querySelectorAll('.face-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.face-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const val = parseInt(card.dataset.score);
      state.currentScore = val;
      state.maxScore = 10;
      
      // Delay slightly for visual selection confirmation before showing result
      setTimeout(() => {
        showResultScreen();
      }, 350);
    });
  });
}

// B. Visual Analogue Scale (EVA)
function generateEVAHTML() {
  return `
    <div class="eva-container">
      <p class="wong-baker-help">Deslize a barra para apontar a tonalidade de cor da sua dor:</p>
      
      <div class="eva-display">
        <div class="eva-score-bubble" id="eva-score-badge" style="background-color: var(--severity-none);">0</div>
        <div class="eva-text-label" id="eva-text-label" style="color: var(--severity-none);">Sem Dor</div>
        <div class="eva-desc-label" id="eva-desc-label">Nenhum desconforto</div>
      </div>

      <div class="eva-slider-wrapper">
        <input type="range" min="0" max="10" step="1" value="0" class="eva-slider" id="eva-range-slider">
        <div class="eva-labels-row">
          <span>Sem Dor</span>
          <span>Dor Máxima</span>
        </div>
      </div>

      <button class="btn-primary" id="btn-submit-eva" style="margin-top: 15px;">Confirmar Escore <i class="fa-solid fa-circle-check"></i></button>
    </div>
  `;
}

function updateEVADisplay(val) {
  const badge = document.getElementById('eva-score-badge');
  const label = document.getElementById('eva-text-label');
  const desc = document.getElementById('eva-desc-label');
  
  if (!badge || !label || !desc) return;
  
  badge.textContent = val;
  
  let color = 'var(--severity-none)';
  let labelText = 'Sem Dor';
  let descText = 'Nenhum desconforto ou incômodo.';

  if (val >= 1 && val <= 3) {
    color = 'var(--severity-mild)';
    labelText = 'Dor Leve';
    descText = 'Dor suportável, tolerável sem esforço.';
  } else if (val >= 4 && val <= 6) {
    color = 'var(--severity-mod)';
    labelText = 'Dor Moderada';
    descText = 'Dor que interfere nas atividades normais.';
  } else if (val >= 7) {
    color = 'var(--severity-severe)';
    labelText = 'Dor Grave';
    descText = 'Dor muito intensa, que impede a concentração ou repouso.';
  }

  badge.style.backgroundColor = color;
  badge.style.boxShadow = `0 10px 20px ${color.replace(')', '-glow)')}`;
  label.textContent = labelText;
  label.style.color = color;
  desc.textContent = descText;
}

function initEVAHandlers() {
  const slider = document.getElementById('eva-range-slider');
  const submitBtn = document.getElementById('btn-submit-eva');

  if (slider) {
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      state.currentScore = val;
      state.maxScore = 10;
      updateEVADisplay(val);
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      showResultScreen();
    });
  }
}

// C. Visual Numeric Scale (EVN)
function generateEVNHTML() {
  let gridHTML = '';
  for (let i = 0; i <= 10; i++) {
    let severityClass = 'num-0';
    if (i >= 1 && i <= 3) severityClass = 'num-1';
    if (i >= 4 && i <= 6) severityClass = 'num-4';
    if (i >= 7) severityClass = 'num-7';
    
    gridHTML += `
      <button class="num-card ${severityClass} ${i === 10 ? 'num-card-10' : ''}" data-val="${i}">
        ${i}
      </button>
    `;
  }

  return `
    <div class="evn-container">
      <p class="wong-baker-help">Aponte de 0 a 10 qual é a intensidade da sua dor hoje:</p>
      <div class="numeric-selector-grid">
        ${gridHTML}
      </div>
    </div>
  `;
}

function initEVNHandlers() {
  document.querySelectorAll('.num-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.num-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const val = parseInt(card.dataset.val);
      state.currentScore = val;
      state.maxScore = 10;
      
      setTimeout(() => {
        showResultScreen();
      }, 350);
    });
  });
}

// D. PAINAD (Pain Assessment in Advanced Dementia)
function generatePAINADHTML() {
  const params = [
    {
      title: '1. Respiração (independente de vocalização)',
      name: 'breathing',
      options: [
        { score: 0, title: 'Normal', desc: 'Sem dificuldades respiratórias perceptíveis.' },
        { score: 1, title: 'Dificuldade ocasional', desc: 'Período curto de hiperventilação ou respiração difícil.' },
        { score: 2, title: 'Ruidosa e difícil', desc: 'Período longo de hiperventilação. Respiração de Cheyne-Stokes.' }
      ]
    },
    {
      title: '2. Vocalização Negativa',
      name: 'vocalization',
      options: [
        { score: 0, title: 'Nenhuma', desc: 'Silencioso ou fala neutra/positiva.' },
        { score: 1, title: 'Gemido ou queixa ocasional', desc: 'Fala em voz baixa com qualidade negativa ou de desaprovação.' },
        { score: 2, title: 'Gemidos repetidos / Grito', desc: 'Chamado de socorro repetido, choro, gritos frequentes.' }
      ]
    },
    {
      title: '3. Expressão Facial',
      name: 'face',
      options: [
        { score: 0, title: 'Sorrindo ou inexpressiva', desc: 'Rosto neutro, relaxado e confortável.' },
        { score: 1, title: 'Triste / Assustada', desc: 'Franzindo a testa, olhar assustado ou melancólico.' },
        { score: 2, title: 'Careta facial', desc: 'Contração forte, mímica facial acentuada de dor.' }
      ]
    },
    {
      title: '4. Linguagem Corporal',
      name: 'body',
      options: [
        { score: 0, title: 'Relaxada', desc: 'Sem movimentos involuntários ou tensão aparente.' },
        { score: 1, title: 'Tensa / Inquieta', desc: 'Passos angustiados, mexendo-se constantemente, inquietação.' },
        { score: 2, title: 'Rígida / Punhos fechados', desc: 'Joelhos dobrados, puxando, empurrando ou agredindo.' }
      ]
    },
    {
      title: '5. Consolabilidade',
      name: 'consolability',
      options: [
        { score: 0, title: 'Não necessita consolo', desc: 'Paciente calmo e tranquilo.' },
        { score: 1, title: 'Consolável por voz ou toque', desc: 'Distrai-se ou tranquiliza-se facilmente com estímulo terapêutico.' },
        { score: 2, title: 'Inconsolável', desc: 'Incapaz de consolar, distrair ou acalmar de forma alguma.' }
      ]
    }
  ];

  return generateObservationalHTML(params, 'painad');
}

// E. BPS (Behavioral Pain Scale)
function generateBPSHTML() {
  const params = [
    {
      title: '1. Expressão Facial',
      name: 'face',
      options: [
        { score: 1, title: 'Relaxada', desc: 'Ausência de contração facial.' },
        { score: 2, title: 'Parcialmente contraída', desc: 'Abaixamento de sobrancelhas ou franzimento leve.' },
        { score: 3, title: 'Totalmente contraída', desc: 'Fechamento rígido de pálpebras, testa muito franzida.' },
        { score: 4, title: 'Careta / Mímica facial acentuada', desc: 'Contração extrema do rosto inteiro.' }
      ]
    },
    {
      title: '2. Membros Superiores',
      name: 'limbs',
      options: [
        { score: 1, title: 'Sem movimentos', desc: 'Relaxamento muscular total, braços em posição confortável.' },
        { score: 2, title: 'Parcialmente flexionados', desc: 'Flexão leve nos cotovelos ou punhos.' },
        { score: 3, title: 'Totalmente flexionados', desc: 'Flexão acentuada com os dedos das mãos bem flexionados.' },
        { score: 4, title: 'Permanentemente retraídos', desc: 'Contração permanente e espástica, resistência mecânica.' }
      ]
    },
    {
      title: '3. Tolerância à Ventilação Mecânica',
      name: 'ventilation',
      options: [
        { score: 1, title: 'Tolerando os movimentos', desc: 'Em total sincronia com o ventilador pulmonar.' },
        { score: 2, title: 'Tossindo, tolerando a maior parte', desc: 'Tosse eventual, mas sem brigar com o respirador.' },
        { score: 3, title: 'Lutando contra o ventilador', desc: 'Assincronia frequente, brigando ativamente com os ciclos do aparelho.' },
        { score: 4, title: 'Incapaz de controlar a ventilação', desc: 'Agitação extrema, respirador dispara alarmes constantemente.' }
      ]
    }
  ];

  return generateObservationalHTML(params, 'bps');
}

// F. CPOT (Critical Care Pain Observation Tool)
function generateCPOTHTML() {
  const showIntubated = state.activeCPOTMode === 'intubated';

  const params = [
    {
      title: '1. Expressão Facial',
      name: 'face',
      options: [
        { score: 0, title: 'Relaxada, neutra', desc: 'Sem tensão muscular visível.' },
        { score: 1, title: 'Tensa', desc: 'Franzimento de testa, abaixamento de sobrancelhas.' },
        { score: 2, title: 'Careta extrema', desc: 'Contração intensa de testa e pálpebras fortemente fechadas.' }
      ]
    },
    {
      title: '2. Movimentos Corporais',
      name: 'movements',
      options: [
        { score: 0, title: 'Ausência de movimentos', desc: 'Permanece na mesma posição (normal/confortável).' },
        { score: 1, title: 'Proteção', desc: 'Movimentos lentos e cautelosos, esfregando ou tocando o local dolorido.' },
        { score: 2, title: 'Inquietação / Agitação', desc: 'Puxando tubos, tentando sentar-se ou debater-se no leito.' }
      ]
    },
    {
      title: '3. Tensão Muscular (Flexão passiva)',
      name: 'tension',
      options: [
        { score: 0, title: 'Relaxado', desc: 'Sem resistência mecânica ao flexionar os membros passivamente.' },
        { score: 1, title: 'Tenso / Rígido', desc: 'Resistência leve a moderada ao movimento passivo.' },
        { score: 2, title: 'Muito tenso / Muito rígido', desc: 'Resistência muito forte, incapaz de completar a flexão.' }
      ]
    }
  ];

  // Dynamic 4th parameter for CPOT based on intubation mode
  if (showIntubated) {
    params.push({
      title: '4. Tolerância à Ventilação Mecânica (Entubado)',
      name: 'coping',
      options: [
        { score: 0, title: 'Tolerando respirador', desc: 'Sincronia adequada com o respirador.' },
        { score: 1, title: 'Tossindo, mas tolerando', desc: 'Tosse temporária que se resolve sozinha.' },
        { score: 2, title: 'Lutando contra o ventilador', desc: 'Assincronia severa, briga ativa com respirador.' }
      ]
    });
  } else {
    params.push({
      title: '4. Vocalização (Extubado)',
      name: 'coping',
      options: [
        { score: 0, title: 'Falar em tom normal / Silencioso', desc: 'Nenhum som de sofrimento.' },
        { score: 1, title: 'Suspiros ou gemidos', desc: 'Murmúrios ocasionais ou respiração suspirada.' },
        { score: 2, title: 'Gritando ou soluçando', desc: 'Choro audível alto, queixas fortes frequentes.' }
      ]
    });
  }

  // Add the mode selector layout before observational list
  const selectorHTML = `
    <div class="cpot-mode-selector">
      <button class="cpot-btn ${showIntubated ? 'active' : ''}" data-mode="intubated">
        <i class="fa-solid fa-lungs"></i> Entubado
      </button>
      <button class="cpot-btn ${!showIntubated ? 'active' : ''}" data-mode="extubated">
        <i class="fa-solid fa-microphone-lines-slash"></i> Extubado (Sem Tubo)
      </button>
    </div>
  `;

  return selectorHTML + generateObservationalHTML(params, 'cpot');
}

// Utility to generate structured HTML for observational scorecards
function generateObservationalHTML(params, scaleKey) {
  let listHTML = params.map(p => {
    let optionsHTML = p.options.map(opt => `
      <button class="parameter-option" data-param="${p.name}" data-score="${opt.score}">
        <div class="option-desc">
          <h5>${opt.title}</h5>
          <p>${opt.desc}</p>
        </div>
        <div class="option-score-tag">+${opt.score}</div>
      </button>
    `).join('');

    return `
      <div class="parameter-card">
        <h4 class="parameter-title">${p.title}</h4>
        <div class="parameter-options-grid">
          ${optionsHTML}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="obs-parameters-list" data-scale="${scaleKey}">
      ${listHTML}
    </div>
  `;
}

function updateObservationalLiveScore() {
  const listEl = document.querySelector('.obs-parameters-list');
  if (!listEl) return;

  const scaleKey = listEl.dataset.scale;
  let score = 0;

  // Sum up all selected options
  const selectedOptions = listEl.querySelectorAll('.parameter-option.selected');
  selectedOptions.forEach(opt => {
    score += parseInt(opt.dataset.score);
  });

  // Handle baseline minimum for BPS scale
  if (scaleKey === 'bps' && selectedOptions.length === 0) {
    // Standard starting score for BPS is 3 (minimum possible)
    score = 3;
  } else if (scaleKey === 'bps') {
    // If some options are chosen but not all, we calculate minimum baseline + select differences
    const paramsCount = document.querySelectorAll('.parameter-card').length;
    let selectedValues = [];
    document.querySelectorAll('.parameter-card').forEach(card => {
      const selected = card.querySelector('.parameter-option.selected');
      selectedValues.push(selected ? parseInt(selected.dataset.score) : 1); // default min is 1
    });
    score = selectedValues.reduce((a, b) => a + b, 0);
  }

  state.currentScore = score;
  
  const scoreLabel = document.getElementById('live-score-val');
  if (scoreLabel) scoreLabel.textContent = score;
}

function initObservationalHandlers() {
  // Option Tapping
  document.querySelectorAll('.parameter-option').forEach(option => {
    option.addEventListener('click', () => {
      const paramName = option.dataset.param;
      // Deselect siblings in the same parameter card
      const parentCard = option.closest('.parameter-card');
      parentCard.querySelectorAll('.parameter-option').forEach(sibling => {
        sibling.classList.remove('selected');
      });
      
      option.classList.add('selected');
      updateObservationalLiveScore();
    });
  });

  // CPOT Intubated vs Extubated Toggles
  document.querySelectorAll('.cpot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeCPOTMode = btn.dataset.mode;
      // Re-render scale
      loadScaleEvaluator('cpot');
    });
  });
  
  // Set BPS baseline live score correctly on init
  const listEl = document.querySelector('.obs-parameters-list');
  if (listEl && listEl.dataset.scale === 'bps') {
    updateObservationalLiveScore();
  }
}

// --- 5. INITIAL SPECIFICITIES POPULATOR ---
function loadSpecificityScreen(profile) {
  state.selectedProfile = profile;
  const container = document.getElementById('specificity-options');
  if (!container) return;

  container.innerHTML = '';

  const options = SPECIFICITIES[profile];
  options.forEach(opt => {
    const card = document.createElement('button');
    card.className = 'spec-option-card';
    card.dataset.specKey = opt.key;
    card.dataset.scale = opt.scale;
    if (opt.altScale) card.dataset.altScale = opt.altScale;

    // Pick nice icons depending on key
    let iconClass = 'fa-solid fa-clipboard-user';
    if (opt.key.includes('under-2')) iconClass = 'fa-solid fa-baby';
    else if (opt.key.includes('2-6')) iconClass = 'fa-solid fa-children';
    else if (opt.key.includes('over-6')) iconClass = 'fa-solid fa-graduation-cap';
    else if (opt.key.includes('lucid')) iconClass = 'fa-solid fa-comment-medical';
    else if (opt.key.includes('illiterate')) iconClass = 'fa-solid fa-face-smile-wink';
    else if (opt.key.includes('uti')) iconClass = 'fa-solid fa-bed-pulse';
    else if (opt.key.includes('dementia')) iconClass = 'fa-solid fa-brain';

    card.innerHTML = `
      <div class="spec-option-icon"><i class="${iconClass}"></i></div>
      <div class="spec-option-text">
        <h4>${opt.title}</h4>
        <p>${opt.desc}</p>
      </div>
    `;

    card.addEventListener('click', () => {
      state.selectedSpecificity = opt.key;
      loadScaleSelectorScreen(opt.scale, opt.altScale);
    });

    container.appendChild(card);
  });

  navigateTo('screen-specificity');
}

// --- 6. RECOMMENDATION POPULATOR ---
function loadScaleSelectorScreen(recommendedScaleKey, alternativeScaleKey = null) {
  const titleEl = document.getElementById('rec-scale-title');
  const descEl = document.getElementById('rec-scale-desc');
  const altSection = document.getElementById('alternative-scales-container');
  const altList = document.getElementById('alternative-scales-list');

  if (!titleEl || !descEl) return;

  state.selectedScale = recommendedScaleKey;
  
  const scale = SCALES[recommendedScaleKey];
  titleEl.textContent = scale.title;
  
  // Custom description mappings
  let desc = 'Escala clínica recomendada para este perfil de paciente.';
  if (recommendedScaleKey === 'wong-baker') desc = 'Ideal para crianças pequenas ou pacientes com dificuldade de expressão verbal. Baseia-se em 6 rostos indicativos com scores pares de 0 a 10.';
  else if (recommendedScaleKey === 'eva') desc = 'Gradiente visual e colorido clássico onde o próprio paciente arrasta e indica seu grau subjetivo de desconforto.';
  else if (recommendedScaleKey === 'evn') desc = 'A forma mais comum de avaliar a dor em pacientes lúcidos de forma numérica direta de 0 (sem dor) a 10 (pior dor possível).';
  else if (recommendedScaleKey === 'painad') desc = 'Especificamente criada para idosos com demência avançada que não se expressam verbalmente, baseada em 5 parâmetros de observação direta.';
  else if (recommendedScaleKey === 'bps') desc = 'Escala comportamental padrão-ouro para pacientes entubados ou sob sedação em UTI. Avalia a expressão facial, membros superiores e tolerância à ventilação.';
  else if (recommendedScaleKey === 'cpot') desc = 'Excelente para monitorar a dor em pacientes críticos de UTI de forma objetiva, adaptando-se a pacientes entubados ou já extubados.';
  
  descEl.textContent = desc;

  // Manage alternatives
  if (alternativeScaleKey && altSection && altList) {
    altSection.style.display = 'block';
    altList.innerHTML = '';
    
    const altScale = SCALES[alternativeScaleKey];
    const altBtn = document.createElement('button');
    altBtn.className = 'alt-scale-row';
    altBtn.innerHTML = `
      <span>${altScale.title}</span>
      <div class="btn-mini-play">Usar Esta <i class="fa-solid fa-chevron-right"></i></div>
    `;
    altBtn.addEventListener('click', () => {
      state.selectedScale = alternativeScaleKey;
      loadScaleEvaluator(alternativeScaleKey);
    });
    
    altList.appendChild(altBtn);
  } else if (altSection) {
    altSection.style.display = 'none';
  }

  navigateTo('screen-scale-selector');
}

// --- 7. SCALE EVALUATOR LOADER ---
function loadScaleEvaluator(scaleKey) {
  state.selectedScale = scaleKey;
  
  const titleEl = document.getElementById('evaluator-title');
  const contentArea = document.getElementById('scale-content-area');
  const footerEl = document.getElementById('observational-footer');
  const patientToggle = document.getElementById('btn-patient-mode');

  if (!titleEl || !contentArea || !footerEl || !patientToggle) return;

  const scale = SCALES[scaleKey];
  titleEl.textContent = scale.title;
  contentArea.innerHTML = '';
  
  // Show/Hide patient rotation toggle based on interactive type
  if (scale.type === 'interactive' && (scaleKey === 'wong-baker' || scaleKey === 'eva')) {
    patientToggle.style.display = 'flex';
  } else {
    patientToggle.style.display = 'none';
  }

  // Load HTML template and initialize handlers
  if (scaleKey === 'wong-baker') {
    contentArea.innerHTML = generateWongBakerHTML();
    initWongBakerHandlers();
    footerEl.classList.add('hidden');
    state.maxScore = 10;
  } else if (scaleKey === 'eva') {
    contentArea.innerHTML = generateEVAHTML();
    initEVAHandlers();
    footerEl.classList.add('hidden');
    state.maxScore = 10;
  } else if (scaleKey === 'evn') {
    contentArea.innerHTML = generateEVNHTML();
    initEVNHandlers();
    footerEl.classList.add('hidden');
    state.maxScore = 10;
  } else if (scaleKey === 'painad') {
    contentArea.innerHTML = generatePAINADHTML();
    initObservationalHandlers();
    footerEl.classList.remove('hidden');
    state.maxScore = 10;
  } else if (scaleKey === 'bps') {
    contentArea.innerHTML = generateBPSHTML();
    initObservationalHandlers();
    footerEl.classList.remove('hidden');
    state.maxScore = 12;
  } else if (scaleKey === 'cpot') {
    contentArea.innerHTML = generateCPOTHTML();
    initObservationalHandlers();
    footerEl.classList.remove('hidden');
    state.maxScore = 8;
  }

  navigateTo('screen-evaluator');
}

// Patient flip mode toggler
function togglePatientMode() {
  const mainEl = document.getElementById('main-content');
  const toggleBtn = document.getElementById('btn-patient-mode');
  
  if (!mainEl || !toggleBtn) return;
  
  const isActive = mainEl.classList.contains('patient-mode-active');
  
  if (isActive) {
    exitPatientMode();
  } else {
    mainEl.classList.add('patient-mode-active');
    toggleBtn.classList.add('active');
    toggleBtn.innerHTML = '<i class="fa-solid fa-user-doctor"></i> Sair do Modo Paciente';
    
    // In Patient Mode, hide the header for maximum screen size/focus
    const header = document.querySelector('.app-header');
    if (header) header.style.display = 'none';
    
    const notch = document.querySelector('.phone-notch');
    if (notch) notch.style.display = 'none';
  }
}

function exitPatientMode() {
  const mainEl = document.getElementById('main-content');
  const toggleBtn = document.getElementById('btn-patient-mode');
  
  if (mainEl) mainEl.classList.remove('patient-mode-active');
  if (toggleBtn) {
    toggleBtn.classList.remove('active');
    toggleBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Modo Paciente';
  }
  
  const header = document.querySelector('.app-header');
  if (header) header.style.display = 'flex';
  
  const notch = document.querySelector('.phone-notch');
  if (notch) notch.style.display = 'block';
}

// --- 8. RESULTS GENERATION & CLINICAL SUGGESTIONS ---
const DIRECTIVES = {
  none: [
    'Manter monitorização e rotina padrão de avaliação.',
    'Registrar a ausência de dor no prontuário eletrônico do paciente.'
  ],
  mild: [
    'Avaliar e implementar métodos não farmacológicos (ex: posicionamento confortável, calor/frio localizado, técnicas de respiração/distração).',
    'Reavaliar a dor em até 2 horas.',
    'Registrar a intensidade no prontuário e orientar o paciente a notificar se houver piora.'
  ],
  mod: [
    'Administrar analgésicos comuns (dipirona, paracetamol) ou anti-inflamatórios conforme prescrição médica.',
    'Reavaliar o paciente em 60 minutos após a aplicação da medicação.',
    'Auxiliar em posições de alívio e conforto no leito.',
    'Fazer rastreamento de fatores ambientais que possam aumentar a dor (ex: ruído, luz).'
  ],
  severe: [
    'Notificar a equipe médica assistente imediatamente sobre dor refratária ou severa.',
    'Administrar analgésicos potentes/opioides conforme o protocolo ou prescrição.',
    'Iniciar monitoramento contínuo de sinais vitais (especialmente frequência respiratória e saturação de oxigênio pós-opioides).',
    'Reavaliar o paciente de forma rigorosa em 30 minutos.',
    'Documentar detalhadamente a resposta terapêutica.'
  ]
};

function getSeverityAndColor(score, maxScore) {
  // Normalize percentage for general severity rating
  const pct = score / maxScore;
  
  if (score === 0 || (maxScore === 12 && score === 3)) { // min for BPS is 3, which means no pain
    return { key: 'none', label: 'Sem Dor', class: 'level-none' };
  }
  
  if (maxScore === 12) { // BPS Range: 3-12
    if (score >= 4 && score <= 5) return { key: 'mild', label: 'Dor Leve', class: 'level-mild' };
    if (score >= 6 && score <= 7) return { key: 'mod', label: 'Dor Moderada', class: 'level-mod' };
    return { key: 'severe', label: 'Dor Grave', class: 'level-severe' };
  }
  
  if (maxScore === 8) { // CPOT Range: 0-8
    if (score >= 1 && score <= 2) return { key: 'mild', label: 'Dor Leve', class: 'level-mild' };
    if (score >= 3 && score <= 4) return { key: 'mod', label: 'Dor Moderada', class: 'level-mod' };
    return { key: 'severe', label: 'Dor Grave', class: 'level-severe' };
  }
  
  // Wong-Baker, EVA, EVN, PAINAD (0-10 Range)
  if (score >= 1 && score <= 3) return { key: 'mild', label: 'Dor Leve', class: 'level-mild' };
  if (score >= 4 && score <= 6) return { key: 'mod', label: 'Dor Moderada', class: 'level-mod' };
  return { key: 'severe', label: 'Dor Grave', class: 'level-severe' };
}

function showResultScreen() {
  const resultCard = document.querySelector('.result-hero-card');
  const scoreValEl = document.getElementById('result-score-val');
  const scoreMaxEl = document.getElementById('result-score-max');
  const severityEl = document.getElementById('result-severity-badge');
  const scaleNameEl = document.getElementById('result-scale-name');
  const directivesEl = document.getElementById('result-directives-list');
  const circleProgress = document.getElementById('result-circle-progress');

  if (!resultCard || !scoreValEl || !scoreMaxEl || !severityEl || !scaleNameEl || !directivesEl || !circleProgress) return;

  const score = state.currentScore;
  const max = state.maxScore;
  const scale = SCALES[state.selectedScale];
  
  const sevInfo = getSeverityAndColor(score, max);

  // Update Score Card UI classes and contents
  resultCard.className = `result-hero-card ${sevInfo.class}`;
  scoreValEl.textContent = score;
  scoreMaxEl.textContent = `/${max}`;
  severityEl.textContent = sevInfo.label;
  scaleNameEl.textContent = scale.title;

  // Animate Circular Gauge
  // Circumference = 2 * PI * r = 2 * 3.14 * 50 = 314
  const strokeOffset = 314 - (314 * (score / max));
  circleProgress.style.strokeDashoffset = strokeOffset;

  // Add Suggestions list
  directivesEl.innerHTML = '';
  const list = DIRECTIVES[sevInfo.key];
  list.forEach(dir => {
    const li = document.createElement('li');
    li.innerHTML = `<i class="fa-solid fa-circle-chevron-right"></i> <span>${dir}</span>`;
    directivesEl.appendChild(li);
  });

  navigateTo('screen-result');
}

// --- 9. LOCAL STORAGE ASSESSMENT HISTORY ---
function saveCurrentAssessment() {
  const assessment = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    scaleKey: state.selectedScale,
    scaleName: SCALES[state.selectedScale].title,
    score: state.currentScore,
    maxScore: state.maxScore,
    profile: state.selectedProfile
  };

  state.history.unshift(assessment);
  localStorage.setItem('paincare_history', JSON.stringify(state.history));
  
  // Go back to main
  navigateTo('screen-welcome', false);
  state.navigationHistory = [];
}

function loadHistoryScreen() {
  const container = document.getElementById('history-list');
  const clearContainer = document.getElementById('history-clear-container');
  if (!container || !clearContainer) return;

  container.innerHTML = '';

  if (state.history.length === 0) {
    container.innerHTML = `
      <div class="history-empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <p>Nenhuma avaliação recente salva.</p>
      </div>
    `;
    clearContainer.classList.add('hidden');
  } else {
    clearContainer.classList.remove('hidden');
    
    state.history.forEach(item => {
      const card = document.createElement('div');
      
      const sevInfo = getSeverityAndColor(item.score, item.maxScore);
      let severityClass = 'h-none';
      if (sevInfo.key === 'mild') severityClass = 'h-mild';
      if (sevInfo.key === 'mod') severityClass = 'h-mod';
      if (sevInfo.key === 'severe') severityClass = 'h-severe';

      card.className = `history-card ${severityClass}`;
      
      // Date formatting
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + 
                            date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Profile name translation
      let profilePortuguese = 'Geral';
      if (item.profile === 'criança') profilePortuguese = 'Criança';
      else if (item.profile === 'adulto') profilePortuguese = 'Adulto';
      else if (item.profile === 'idoso') profilePortuguese = 'Idoso';

      card.innerHTML = `
        <div class="history-card-info">
          <h4>${item.scaleName}</h4>
          <p>Avaliado em: <span>${formattedDate}</span></p>
          <p>Perfil do Paciente: <span>${profilePortuguese}</span></p>
        </div>
        <div class="history-card-right">
          <div class="history-score-badge">${item.score}/${item.maxScore}</div>
          <button class="btn-delete-history-item" data-id="${item.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      // Set delete listener
      card.querySelector('.btn-delete-history-item').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      });

      container.appendChild(card);
    });
  }

  navigateTo('screen-history');
}

function deleteHistoryItem(id) {
  state.history = state.history.filter(item => item.id !== id);
  localStorage.setItem('paincare_history', JSON.stringify(state.history));
  loadHistoryScreen();
}

function clearAllHistory() {
  if (confirm('Tem certeza de que deseja apagar todo o histórico de avaliações de dor?')) {
    state.history = [];
    localStorage.removeItem('paincare_history');
    loadHistoryScreen();
  }
}

// --- 10. APP INITIALIZER & BINDERS ---
function initApp() {
  // Bind Profile Selection Cards (Screen 1)
  document.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', () => {
      const profile = card.dataset.profile;
      loadSpecificityScreen(profile);
    });
  });

  // Bind Quick/Direct Tags (Screen 1)
  document.querySelectorAll('.shortcut-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const scaleKey = tag.dataset.scale;
      state.selectedProfile = 'geral';
      loadScaleEvaluator(scaleKey);
    });
  });

  // Bind Common Back buttons
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateBack();
    });
  });

  // Bind Home Logo click
  const logo = document.getElementById('btn-home');
  if (logo) {
    logo.addEventListener('click', () => {
      navigateTo('screen-welcome', false);
      state.navigationHistory = [];
    });
  }

  // Bind Theme Switcher
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      if (currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
      }
    });
  }

  // Bind History Toggles
  const histBtn = document.getElementById('btn-history-view');
  if (histBtn) {
    histBtn.addEventListener('click', () => {
      loadHistoryScreen();
    });
  }
  
  const histBack = document.getElementById('btn-history-back');
  if (histBack) {
    histBack.addEventListener('click', () => {
      navigateBack();
    });
  }

  const clearHistBtn = document.getElementById('btn-clear-history');
  if (clearHistBtn) {
    clearHistBtn.addEventListener('click', () => {
      clearAllHistory();
    });
  }

  // Bind Recommended Scale Card Start action
  const startBtn = document.getElementById('btn-start-scale');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      loadScaleEvaluator(state.selectedScale);
    });
  }

  // Bind Patient mode click
  const pmBtn = document.getElementById('btn-patient-mode');
  if (pmBtn) {
    pmBtn.addEventListener('click', () => {
      togglePatientMode();
    });
  }

  // Bind Observational footer confirming button
  const submitObsBtn = document.getElementById('btn-submit-obs-scale');
  if (submitObsBtn) {
    submitObsBtn.addEventListener('click', () => {
      // Validate that all options have been selected before calculating final score
      const listEl = document.querySelector('.obs-parameters-list');
      if (listEl) {
        const cardsCount = listEl.querySelectorAll('.parameter-card').length;
        const selectedCount = listEl.querySelectorAll('.parameter-option.selected').length;
        
        if (selectedCount < cardsCount) {
          alert('Por favor, avalie todos os parâmetros comportamentais antes de fechar o escore do paciente.');
          return;
        }
      }
      showResultScreen();
    });
  }

  // Bind Save/Discard actions
  const saveBtn = document.getElementById('btn-save-assessment');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveCurrentAssessment();
    });
  }

  const discardBtn = document.getElementById('btn-discard-assessment');
  if (discardBtn) {
    discardBtn.addEventListener('click', () => {
      if (confirm('Tem certeza de que deseja descartar esta avaliação?')) {
        navigateTo('screen-welcome', false);
        state.navigationHistory = [];
      }
    });
  }
}

// Initialize when DOM content is fully loaded
window.addEventListener('DOMContentLoaded', initApp);
