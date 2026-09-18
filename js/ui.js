window.UI = {
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
    }
  },

  setBadges(conferenceTitle, role, difficultyName) {
    const titleEl = document.getElementById('conference-header-title');
    if (titleEl) {
      titleEl.textContent = conferenceTitle;
    }
    const roleBadge = document.getElementById('current-role-badge');
    if (roleBadge) {
      roleBadge.textContent = role;
    }
    const diffBadge = document.getElementById('current-difficulty-badge');
    if (diffBadge) {
      diffBadge.textContent = difficultyName;
    }
  },

  // キャラクターのメタデータ定義（職種ごとのアイコン・スタイル・表示名）
  ROLE_MAP: {
    '医師': { roleClass: 'doctor', icon: '🩺', displayName: '医師' },
    '管理栄養士': { roleClass: 'dietitian', icon: '🥗', displayName: '管理栄養士' },
    '栄養士': { roleClass: 'dietitian', icon: '🥗', displayName: '管理栄養士' },
    '看護師': { roleClass: 'nurse', icon: '🌸', displayName: '看護師' },
    '師長': { roleClass: 'nurse', icon: '🌸', displayName: '病棟師長' },
    'WOC': { roleClass: 'woc', icon: '🌸', displayName: 'WOC認定看護師' },
    'ST': { roleClass: 'st', icon: '🗣️', displayName: 'ST（言語聴覚士）' },
    '言語聴覚士': { roleClass: 'st', icon: '🗣️', displayName: 'ST（言語聴覚士）' },
    'PT': { roleClass: 'pt', icon: '🏃', displayName: 'PT（理学療法士）' },
    '理学療法士': { roleClass: 'pt', icon: '🏃', displayName: 'PT（理学療法士）' },
    'OT': { roleClass: 'ot', icon: '🎨', displayName: 'OT（作業療法士）' },
    '作業療法士': { roleClass: 'ot', icon: '🎨', displayName: 'OT（作業療法士）' },
    '薬剤師': { roleClass: 'pharmacist', icon: '💊', displayName: '薬剤師' },
    '臨床検査技師': { roleClass: 'technician', icon: '🔬', displayName: '検査技師' },
    '検査技師': { roleClass: 'technician', icon: '🔬', displayName: '検査技師' },
    '技師': { roleClass: 'technician', icon: '🔬', displayName: '検査技師' },
    '医療ソーシャルワーカー': { roleClass: 'msw', icon: '🤝', displayName: 'MSW' },
    'MSW': { roleClass: 'msw', icon: '🤝', displayName: 'MSW' },
    'ソーシャルワーカー': { roleClass: 'msw', icon: '🤝', displayName: 'MSW' },
    'ケアマネ': { roleClass: 'msw', icon: '📋', displayName: 'ケアマネジャー' },
    '医療安全': { roleClass: 'safety', icon: '🛡️', displayName: '医療安全管理者' },
    '安全管理': { roleClass: 'safety', icon: '🛡️', displayName: '医療安全管理者' },
    '心理': { roleClass: 'msw', icon: '💭', displayName: '公認心理師' }
  },

  getRoleMeta(sender) {
    if (!sender) return { roleClass: '', icon: '💬', displayName: sender };
    for (const [key, meta] of Object.entries(this.ROLE_MAP)) {
      if (sender.includes(key)) {
        return {
          roleClass: meta.roleClass,
          icon: meta.icon,
          displayName: sender // 送信者名そのものを活かす（例: 医師 佐藤）
        };
      }
    }
    return { roleClass: 'ai', icon: '💬', displayName: sender };
  },

  renderConferenceCards(conferenceList, onSelect) {
    const grid = document.getElementById('conference-grid');
    if (!grid) return;

    grid.innerHTML = '';
    conferenceList.forEach(conf => {
      const card = document.createElement('div');
      card.className = 'conference-card';
      card.setAttribute('data-id', conf.id);

      card.innerHTML = `
        <div class="card-top">
          <span class="card-icon">${conf.icon || '🏥'}</span>
          <span class="card-tag">${conf.tag || '多職種'}</span>
        </div>
        <div class="card-title">${conf.title}</div>
        <p class="card-desc">${conf.description}</p>
        <div class="card-roles">参加: ${conf.keyRoles}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.conference-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        onSelect(conf.id);
      });

      grid.appendChild(card);
    });
  },

  populateTargetSelect(scenario) {
    const targetSelect = document.getElementById('target-select');
    if (!targetSelect) return;

    targetSelect.innerHTML = '<option value="全体">👥 全員</option>';
    if (scenario && scenario.ai_roles) {
      scenario.ai_roles.forEach(ai => {
        const option = document.createElement('option');
        option.value = ai.role;
        option.textContent = `${ai.icon || '💬'} ${ai.title || ai.name || ai.role}`;
        targetSelect.appendChild(option);
      });
    }
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
      displaySender = `${icon} ${displaySender}`;
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
      const delay = i === 0 ? 300 : 650;
      await new Promise(resolve => setTimeout(resolve, delay));
      this.toggleTypingIndicator(false);
      this.addMessage(msg.sender, msg.text, false, false);
    }
  },

  toggleTypingIndicator(show) {
    const indicator = document.getElementById('typing-indicator');
    const container = document.getElementById('chat-container');
    
    if (indicator) {
      if (show) {
        indicator.classList.remove('hidden');
      } else {
        indicator.classList.add('hidden');
      }
    }
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  },

  updateStatusBar(modelName) {
    const bar = document.getElementById('status-bar');
    if (bar) {
      bar.style.display = 'none';
    }
  },

  populatePatientInfo(scenario) {
    const container = document.getElementById('patient-info-content');
    if (!container) return;

    const p = scenario.patient || {};
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
        <p class="character-desc">${r.personality || r.description || ''}</p>
      </div>
    `).join('');

    const initialInfoHtml = (p.initial_info || []).map(info => `<li>${info}</li>`).join('');

    container.innerHTML = `
      <div class="patient-info-section">
        <h4>対象患者・事例</h4>
        <p><strong>年齢・性別:</strong> ${p.age ? `${p.age}歳 ${p.gender || ''}` : (p.gender || '該当事例')}</p>
        <p><strong>主診断・状況:</strong> ${p.primary_disease || ''}</p>
      </div>
      <div class="patient-info-section">
        <h4>背景・経緯</h4>
        <p>${p.background || ''}</p>
      </div>
      <div class="patient-info-section">
        <h4>初期情報・共有事項</h4>
        <ul id="patient-dynamic-info-list">
          ${initialInfoHtml}
        </ul>
      </div>
      <div class="patient-info-section">
        <h4>カンファレンス参加メンバー</h4>
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
      li.style.color = '#d73a49';
      li.style.fontWeight = 'bold';
      li.style.opacity = '0';
      li.style.transition = 'opacity 0.5s ease-in';
      list.appendChild(li);
      
      setTimeout(() => {
        li.style.opacity = '1';
      }, 50);
    }
  },

  setupModal() {
    // 将来のUI拡張用
  }
};
