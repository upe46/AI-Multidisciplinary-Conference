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

  addMessage(sender, text, isUser = false, isSystem = false) {
    const container = document.getElementById('chat-container');
    const msgDiv = document.createElement('div');
    
    let roleClass = '';
    if (!isSystem && !isUser && sender) {
      if (sender.includes('看護師')) roleClass = 'nurse';
      else if (sender.includes('管理栄養士')) roleClass = 'dietitian';
      else if (sender.includes('薬剤師')) roleClass = 'pharmacist';
      else if (sender.includes('臨床検査技師') || sender.includes('技師')) roleClass = 'technician';
      else if (sender.includes('ST') || sender.includes('言語聴覚士')) roleClass = 'st';
      else if (sender.includes('ソーシャルワーカー') || sender.includes('MSW')) roleClass = 'msw';
    }

    msgDiv.className = `message ${isSystem ? 'system' : (isUser ? 'user' : 'ai')} ${roleClass}`;
    
    if (!isSystem && sender) {
      const senderDiv = document.createElement('div');
      senderDiv.className = 'message-sender';
      
      let emoji = '👤';
      if (isUser) {
        emoji = '🧑‍⚕️'; // 医師 (ユーザー)
      } else {
        if (roleClass === 'nurse') emoji = '👩‍⚕️';
        else if (roleClass === 'dietitian') emoji = '🧑‍🍳';
        else if (roleClass === 'pharmacist') emoji = '🧑‍🔬';
        else if (roleClass === 'technician') emoji = '🔬';
        else if (roleClass === 'st') emoji = '🗣️';
        else if (roleClass === 'msw') emoji = '🧑‍💼';
        else emoji = '🤖'; // その他のAI
      }
      
      senderDiv.textContent = `${emoji} ${sender}`;
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

  parseAiResponseAndAddMessages(aiResponseText) {
    const lines = aiResponseText.split('\n');
    let currentSender = "AI";
    let currentMessage = [];
    
    const flushMessage = () => {
      if (currentMessage.length > 0) {
        this.addMessage(currentSender, currentMessage.join('\n'), false, false);
        currentMessage = [];
      }
    };

    for (const line of lines) {
      // Match "[看護師]: ...", "管理栄養士: ...", "**ST**: ..." etc.
      // 役職名には「AI」プレフィックスが含まれない場合も対応
      const match = line.match(/^\*{0,2}\[?([^\:\]\*]+)\]?\*{0,2}\s*[:：]\s*(.*)$/);
      if (match) {
        // "役割: 医師" などのシステムプロンプトの残骸を弾く
        const potentialSender = match[1].trim();
        if (potentialSender.length > 0 && potentialSender.length < 20) {
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
    if (modelName) {
      bar.innerHTML = `使用モデル: <span class="model-name">${modelName}</span>`;
    }
  },

  populatePatientInfo(scenario) {
    const container = document.getElementById('patient-info-content');
    const p = scenario.patient;
    
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
        <h4>初期情報</h4>
        <ul>
          ${p.initial_info.map(info => `<li>${info}</li>`).join('')}
        </ul>
      </div>
    `;
  },

  setupModal() {
    // モーダルは廃止され、サイドバーに常時表示されるようになったため、ここでは何もしません。
    // 将来的に別のUI制御が必要な場合のために関数は残しています。
  }
};
