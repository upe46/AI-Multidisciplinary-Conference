let currentScenario = null;
let selectedConferenceId = null;
let selectedRole = "";
let selectedDifficulty = "";
let isSending = false;

function updateValidationState() {
  const startBtn = document.getElementById('start-conference-btn');
  const validationMsg = document.getElementById('setup-validation-msg');
  const validationText = validationMsg ? validationMsg.querySelector('.validation-text') : null;
  const validationIcon = validationMsg ? validationMsg.querySelector('.validation-icon') : null;

  const missingItems = [];
  if (!selectedConferenceId) missingItems.push('① カンファレンスの種類');
  if (!selectedRole) missingItems.push('② 参加する立場');
  if (!selectedDifficulty) missingItems.push('③ 難易度');

  if (missingItems.length === 0) {
    if (startBtn) startBtn.disabled = false;
    if (validationMsg) {
      validationMsg.classList.add('ready');
      if (validationText) validationText.textContent = 'すべての項目が選択されました。「カンファレンスを開始する」を押してください。';
      if (validationIcon) validationIcon.textContent = '✅';
    }
  } else {
    if (startBtn) startBtn.disabled = true;
    if (validationMsg) {
      validationMsg.classList.remove('ready');
      if (validationText) validationText.textContent = `選択してください: ${missingItems.join('、')}`;
      if (validationIcon) validationIcon.textContent = 'ℹ️';
    }
  }
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
  e.preventDefault();
  
  if (!selectedConferenceId || !selectedRole || !selectedDifficulty) {
    updateValidationState();
    return;
  }

  currentScenario = window.SCENARIOS[selectedConferenceId];
  if (!currentScenario) {
    alert("シナリオデータの取得に失敗しました。");
    return;
  }

  const difficultyObj = currentScenario.difficulty_levels ? currentScenario.difficulty_levels[selectedDifficulty] : null;
  const difficultyName = difficultyObj ? difficultyObj.name : "標準";

  // Reset chat and setup UI
  resetChatContainer();
  window.UI.setBadges(currentScenario.title, selectedRole, difficultyName);
  window.UI.populatePatientInfo(currentScenario);
  window.UI.populateTargetSelect(currentScenario);
  window.UI.setupModal();
  window.UI.showScreen('conference-screen');
  
  // Initialize AI
  window.API.setSystemPrompt(currentScenario, selectedRole, selectedDifficulty);
  
  // Start conference
  startConference();
}

async function handleSendMessage() {
  if (isSending) return;

  const inputEl = document.getElementById('message-input');
  const targetEl = document.getElementById('target-select');
  const text = inputEl.value.trim();
  
  if (!text) return;

  const target = targetEl ? targetEl.value : '全体';
  const apiMessage = target === '全体' ? text : `【${target}へ】${text}`;

  // Add user message to UI
  window.UI.addMessage('あなた', text, true);
  inputEl.value = '';
  inputEl.style.height = '40px';
  
  // Send to API
  setInputEnabled(false);
  window.UI.toggleTypingIndicator(true);
  try {
    const responseText = await window.API.sendMessage(apiMessage);
    window.UI.toggleTypingIndicator(false);
    await window.UI.parseAiResponseAndAddMessages(responseText);
    setInputEnabled(true);
    inputEl.focus();
  } catch (error) {
    window.UI.toggleTypingIndicator(false);
    window.UI.addErrorMessage("送信に失敗しました: " + error.message, () => {
      window.UI.toggleTypingIndicator(true);
      setInputEnabled(false);
      window.API.sendMessage(apiMessage).then(async resp => {
        window.UI.toggleTypingIndicator(false);
        await window.UI.parseAiResponseAndAddMessages(resp);
        setInputEnabled(true);
        inputEl.focus();
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
  el.style.height = '40px';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function init() {
  // 1. Render Conference Cards
  if (window.CONFERENCE_LIST && window.UI.renderConferenceCards) {
    window.UI.renderConferenceCards(window.CONFERENCE_LIST, (confId) => {
      selectedConferenceId = confId;
      const inputEl = document.getElementById('selected-conference-id');
      if (inputEl) inputEl.value = confId;
      updateValidationState();
    });
  }

  // 2. Role selection listener
  const roleSelect = document.getElementById('role-select');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      selectedRole = e.target.value;
      updateValidationState();
    });
  }

  // 3. Difficulty cards listener
  const diffCards = document.querySelectorAll('.difficulty-card');
  diffCards.forEach(card => {
    card.addEventListener('click', () => {
      diffCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedDifficulty = card.getAttribute('data-difficulty');
      const diffInput = document.getElementById('selected-difficulty');
      if (diffInput) diffInput.value = selectedDifficulty;
      updateValidationState();
    });
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

  // Initial validation check
  updateValidationState();
}

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  init();
}
