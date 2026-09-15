window.UI = {
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
  },

  setBadges(role, difficultyName) {
    document.getElementById('current-role-badge').textContent = role;
    document.getElementById('current-difficulty-badge').textContent = difficultyName;
  },

  // キャラクターのメタデータ定義
  ROLE_MAP: {
    '医師': { roleClass: 'doctor', icon: '🩺', displayName: '医師 佐藤' },
    '管理栄養士': { roleClass: 'dietitian', icon: '🥗', displayName: '管理栄養士 佐々木' },
    '栄養士': { roleClass: 'dietitian', icon: '🥗', displayName: '管理栄養士 佐々木' },
    '看護師': { roleClass: 'nurse', icon: '🌸', displayName: '看護師 高橋' },
    'ST': { roleClass: 'st', icon: '🗣️', displayName: 'ST 渡辺' },
    '言語聴覚士': { roleClass: 'st', icon: '🗣️', displayName: 'ST 渡辺' },
    '薬剤師': { roleClass: 'pharmacist', icon: '💊', displayName: '薬剤師 松本' },
    '臨床検査技師': { roleClass: 'technician', icon: '🔬', displayName: '検査技師 中村' },
    '検査技師': { roleClass: 'technician', icon: '🔬', displayName: '検査技師 中村' },
    '技師': { roleClass: 'technician', icon: '🔬', displayName: '検査技師 中村' },
    '医療ソーシャルワーカー': { roleClass: 'msw', icon: '🤝', displayName: 'MSW 小林' },
    'MSW': { roleClass: 'msw', icon: '🤝', displayName: 'MSW 小林' },
    'ソーシャルワーカー': { roleClass: 'msw', icon: '🤝', displayName: 'MSW 小林' },
  },

  getRoleMeta(sender) {
    if (!sender) return { roleClass: '', icon: '💬', displayName: sender };
    for (const [key, meta] of Object.entries(this.ROLE_MAP)) {
      if (sender.includes(key)) {
        return meta;
      }
    }
    return { roleClass: 'ai', icon: '💬', displayName: sender };
  },

  addMessage(sender, text, isUser = false, isSystem = false) {
    const container = document.getElementById('chat-container');
    const msgDiv = document.createElement('div');
    
    let roleClass = '';
    let icon = '';
    let displaySender = sender;

    if (!isSystem && !isUser && sender) {
      const meta = this.getRoleMeta(sender);
      roleClass = meta.roleClass;
      icon = meta.icon;
      displaySender = `${icon} ${meta.displayName}`;
    } else if (isUser) {
      displaySender = `👤 あなた`;
    }

    msgDiv.className = `message ${isSystem ? 'system' : (isUser ? 'user' : 'ai')} ${roleClass}`;
    
    if (!isSystem && displaySender) {
      const senderDiv = document.createElement('div');
      senderDiv.className = 'message-sender';
      senderDiv.textContent = displaySender;
      msgDiv.appendChild(senderDiv);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    msgDiv.appendChild(contentDiv);

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },

  addErrorMessage(text, retryCallback) {
    const container = document.getElementById('chat-container');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message system';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;

    if (retryCallback) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'retry-btn';
      retryBtn.textContent = '再試行';
      retryBtn.addEventListener('click', () => {
        msgDiv.remove();
        retryCallback();
      });
      contentDiv.appendChild(document.createElement('br'));
      contentDiv.appendChild(retryBtn);
    }

    msgDiv.appendChild(contentDiv);
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },

  async parseAiResponseAndAddMessages(aiResponseText) {
    const lines = aiResponseText.split('\n');
    const messageList = [];
    let currentSender = "AI";
    let currentMessage = [];
    
    const flushMessage = () => {
      if (currentMessage.length > 0) {
        messageList.push({
          sender: currentSender,
          text: currentMessage.join('\n')
        });
        currentMessage = [];
      }
    };

    for (let line of lines) {
      // コマンドのパース（追加情報があればサイドバーに反映）
      const updateMatch = line.match(/【UPDATE_INFO:\s*(.*?)】/);
      if (updateMatch) {
        this.addSidebarInfo(updateMatch[1].trim());
        line = line.replace(/【UPDATE_INFO:\s*.*?】/, '').trim();
      }

      // Match "[看護師]: ...", "管理栄養士: ...", "**ST**: ..." etc.
      const match = line.match(/^\*{0,2}\[?([^\:\]\*]+)\]?\*{0,2}\s*[:：]\s*(.*)$/);
      if (match) {
        const potentialSender = match[1].trim();
        if (potentialSender.length > 0 && potentialSender.length < 25) {
          flushMessage();
          currentSender = potentialSender;
          if (match[2]) {
            currentMessage.push(match[2].trim());
          }
          continue;
        }
      }
      
      if (line.trim() !== '') {
        currentMessage.push(line.trim());
      }
    }
    flushMessage();

    // 0.5〜0.8秒（650ms）の間隔で順番に発言を表示する
    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      this.toggleTypingIndicator(true);
      // 最初のメッセージ前は短め、2発言目以降は約650ms待機
      const delay = i === 0 ? 300 : 650;
      await new Promise(resolve => setTimeout(resolve, delay));
      this.toggleTypingIndicator(false);
      this.addMessage(msg.sender, msg.text, false, false);
    }
  },

  toggleTypingIndicator(show) {
    const indicator = document.getElementById('typing-indicator');
    const container = document.getElementById('chat-container');
    
    if (show) {
      indicator.classList.remove('hidden');
    } else {
      indicator.classList.add('hidden');
    }
    container.scrollTop = container.scrollHeight;
  },

  updateStatusBar(modelName) {
    const bar = document.getElementById('status-bar');
    if (bar) {
      // ユーザーの要望により、使用モデル名は画面に表示しない
      bar.style.display = 'none';
    }
  },

  populatePatientInfo(scenario) {
    const container = document.getElementById('patient-info-content');
    const p = scenario.patient;
    const aiRoles = scenario.ai_roles || [];
    
    const rolesHtml = aiRoles.map(r => `
      <div class="character-card">
        <div class="character-header">
          <span class="character-icon">${r.icon || '💬'}</span>
          <div class="character-titles">
            <span class="character-name">${r.name || r.role}</span>
            <span class="character-role">${r.title || r.role}</span>
          </div>
        </div>
        <p class="character-desc">${r.personality || r.description}</p>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="patient-info-section">
        <h4>基本情報</h4>
        <p>${p.age}歳 ${p.gender}</p>
        <p><strong>主疾患:</strong> ${p.primary_disease}</p>
      </div>
      <div class="patient-info-section">
        <h4>背景</h4>
        <p>${p.background}</p>
      </div>
      <div class="patient-info-section">
        <h4>初期・判明した情報</h4>
        <ul id="patient-dynamic-info-list">
          ${p.initial_info.map(info => `<li>${info}</li>`).join('')}
        </ul>
      </div>
      <div class="patient-info-section">
        <h4>カンファレンス参加者</h4>
        <div class="character-list">
          ${rolesHtml}
        </div>
      </div>
    `;
  },

  addSidebarInfo(infoText) {
    const list = document.getElementById('patient-dynamic-info-list');
    if (list) {
      const li = document.createElement('li');
      li.textContent = infoText;
      li.style.color = '#d73a49'; // 新規追加を強調（赤系）
      li.style.fontWeight = 'bold';
      li.style.opacity = '0';
      li.style.transition = 'opacity 0.5s ease-in';
      list.appendChild(li);
      
      // アニメーション用
      setTimeout(() => {
        li.style.opacity = '1';
      }, 50);
    }
  },

  setupModal() {
    // モーダルは廃止され、サイドバーに常時表示されるようになったため、ここでは何もしません。
    // 将来的に別のUI制御が必要な場合のために関数は残しています。
  }
};
