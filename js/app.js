let currentScenario = null;
let isSending = false;
let isInitialized = false;

function getSelectedConferenceId() {
  const checked = document.querySelector('input[name="conference"]:checked');
  return checked ? checked.value : 'nst';
}

function getSelectedRole() {
  const select = document.getElementById('role-select');
  return select ? select.value : '医学生';
}

function getSelectedDifficulty() {
  const checked = document.querySelector('input[name="difficulty"]:checked');
  return checked ? checked.value : 'beginner';
}

function syncRadioCardsUI() {
  // Update conference card styles
  document.querySelectorAll('.conference-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.checked) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Update difficulty card styles
  document.querySelectorAll('.difficulty-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.checked) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

function setInputEnabled(enabled) {
  const msgInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  if (msgInput) msgInput.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
  isSending = !enabled;
}

function resetChatContainer() {
  const container = document.getElementById('chat-container');
  if (container) {
    container.innerHTML = `
      <div class="message system">
        <div class="message-content">カンファレンスが開始されました。</div>
      </div>
    `;
  }
}

async function startConference() {
  window.UI.toggleTypingIndicator(true);
  setInputEnabled(false);
  try {
    const responseText = await window.API.sendMessage(null, true);
    window.UI.toggleTypingIndicator(false);
    await window.UI.parseAiResponseAndAddMessages(responseText);
    window.UI.updateStatusBar(window.API.activeModel);
    setInputEnabled(true);
    const msgInput = document.getElementById('message-input');
    if (msgInput) msgInput.focus();
  } catch (error) {
    window.UI.toggleTypingIndicator(false);
    window.UI.addErrorMessage("カンファレンスの開始に失敗しました: " + error.message, () => startConference());
    setInputEnabled(true);
  }
}

async function handleSetupSubmit(e) {
  if (e) e.preventDefault();
  
  const confId = getSelectedConferenceId();
  const role = getSelectedRole();
  const difficulty = getSelectedDifficulty();

  currentScenario = window.SCENARIOS[confId] || window.SCENARIOS.nst;
  if (!currentScenario) {
    alert("シナリオデータの取得に失敗しました。");
    return;
  }

  const difficultyObj = currentScenario.difficulty_levels ? currentScenario.difficulty_levels[difficulty] : null;
  const difficultyName = difficultyObj ? difficultyObj.name : "標準";

  // Reset chat and setup UI
  resetChatContainer();
  window.UI.setBadges(currentScenario.title, role, difficultyName);
  window.UI.populatePatientInfo(currentScenario);
  window.UI.populateTargetSelect(currentScenario);
  window.UI.setupModal();
  window.UI.showScreen('conference-screen');
  
  // Initialize AI
  window.API.setSystemPrompt(currentScenario, role, difficulty);
  
  // Start conference
  startConference();
}

async function handleSendMessage() {
  if (isSending) return;

  const inputEl = document.getElementById('message-input');
  const targetEl = document.getElementById('target-select');
  const text = inputEl ? inputEl.value.trim() : '';
  
  if (!text) return;

  const target = targetEl ? targetEl.value : '全体';
  const apiMessage = target === '全体' ? text : `【${target}へ】${text}`;

  // Add user message to UI
  window.UI.addMessage('あなた', text, true);
  if (inputEl) {
    inputEl.value = '';
    inputEl.style.height = '40px';
  }
  
  // Send to API
  setInputEnabled(false);
  window.UI.toggleTypingIndicator(true);
  try {
    const responseText = await window.API.sendMessage(apiMessage);
    window.UI.toggleTypingIndicator(false);
    await window.UI.parseAiResponseAndAddMessages(responseText);
    setInputEnabled(true);
    if (inputEl) inputEl.focus();
  } catch (error) {
    window.UI.toggleTypingIndicator(false);
    window.UI.addErrorMessage("送信に失敗しました: " + error.message, () => {
      window.UI.toggleTypingIndicator(true);
      setInputEnabled(false);
      window.API.sendMessage(apiMessage).then(async resp => {
        window.UI.toggleTypingIndicator(false);
        await window.UI.parseAiResponseAndAddMessages(resp);
        setInputEnabled(true);
        if (inputEl) inputEl.focus();
      }).catch(err => {
        window.UI.toggleTypingIndicator(false);
        window.UI.addErrorMessage("再試行にも失敗しました: " + err.message);
        setInputEnabled(true);
      });
    });
    setInputEnabled(true);
  }
}

// Textarea auto-resize
function autoResize(el) {
  if (!el) return;
  el.style.height = '40px';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function init() {
  if (isInitialized) return;
  isInitialized = true;

  // Radio button change listeners for Conference and Difficulty
  document.querySelectorAll('input[name="conference"]').forEach(radio => {
    radio.addEventListener('change', syncRadioCardsUI);
  });

  document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
    radio.addEventListener('change', syncRadioCardsUI);
  });

  // Back button listener
  const backBtn = document.getElementById('back-to-setup-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (confirm('カンファレンス選択画面に戻りますか？現在の進行内容はリセットされます。')) {
        window.UI.showScreen('setup-screen');
      }
    });
  }

  // Setup form submit
  const setupForm = document.getElementById('setup-form');
  if (setupForm) {
    setupForm.addEventListener('submit', handleSetupSubmit);
  }
  
  // Send button & input handlers
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }
  
  const inputEl = document.getElementById('message-input');
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        handleSendMessage();
      }
    });
    inputEl.addEventListener('input', () => autoResize(inputEl));
  }

  // Setup Speech input
  const micBtn = document.getElementById('mic-btn');
  if (micBtn && inputEl && window.SpeechInput) {
    new window.SpeechInput(inputEl, micBtn);
  }

  // Initial sync of radio cards
  syncRadioCardsUI();
}

// Start app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
