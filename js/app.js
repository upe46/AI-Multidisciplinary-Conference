let currentScenario = null;
let isSending = false;

function loadScenario() {
  if (window.SCENARIOS && window.SCENARIOS.nst_01) {
    currentScenario = window.SCENARIOS.nst_01;
  } else {
    alert("シナリオデータの読み込みに失敗しました。scenarios.jsが正しく読み込まれているか確認してください。");
  }
}

function setInputEnabled(enabled) {
  document.getElementById('message-input').disabled = !enabled;
  document.getElementById('send-btn').disabled = !enabled;
  isSending = !enabled;
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
    document.getElementById('message-input').focus();
  } catch (error) {
    window.UI.toggleTypingIndicator(false);
    window.UI.addErrorMessage("カンファレンスの開始に失敗しました: " + error.message, () => startConference());
    setInputEnabled(true);
  }
}

async function handleSetupSubmit(e) {
  e.preventDefault();
  
  if (!currentScenario) return;

  const role = document.getElementById('role-select').value;
  const difficulty = document.getElementById('difficulty-select').value;
  const difficultyName = currentScenario.difficulty_levels[difficulty].name;

  // Setup UI
  window.UI.setBadges(role, difficultyName);
  window.UI.populatePatientInfo(currentScenario);
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
  const text = inputEl.value.trim();
  
  if (!text) return;

  const target = targetEl.value;
  const apiMessage = target === '全体' ? text : `【${target}へ】${text}`;

  // Add user message to UI (常に「あなた」として表示)
  window.UI.addMessage('あなた', text, true);
  inputEl.value = '';
  inputEl.style.height = '36px';
  
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
      // リトライ：最後のユーザーメッセージを再送信
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
  el.style.height = '36px';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function init() {
  loadScenario();

  // Setup form
  document.getElementById('setup-form').addEventListener('submit', handleSetupSubmit);
  
  // Send button
  document.getElementById('send-btn').addEventListener('click', handleSendMessage);
  
  // Textarea: Enter to send, Shift+Enter for newline, auto-resize
  const inputEl = document.getElementById('message-input');
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  inputEl.addEventListener('input', () => autoResize(inputEl));

  // Setup Speech
  const micBtn = document.getElementById('mic-btn');
  new window.SpeechInput(inputEl, micBtn);
}

// Start app
init();
