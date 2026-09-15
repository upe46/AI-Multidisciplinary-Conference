const API_KEY = "AQ.Ab8RN6Lcsb0Qz3kMPBce8pn3sYq-WbM2i1d6vZVsA7owhO9WFQ";

// 優先順にモデルを試行する（2026年8月時点で利用可能なモデル）
const MODEL_CANDIDATES = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite"
];

function getApiUrl(modelName) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
}

window.API = {
  conversationHistory: [],
  systemPrompt: "",
  activeModel: null,
  selectedRole: "",

  setSystemPrompt(scenario, userRole, difficulty) {
    this.selectedRole = userRole;
    const diffInfo = scenario.difficulty_levels[difficulty];
    let aiRolesDesc = scenario.ai_roles.map(ai => `- ${ai.role}: ${ai.description}`).join('\n');
    
    this.systemPrompt = `
あなたは「AI模擬多職種カンファレンスルーム」の運営AIです。
以下のシナリオ、参加AI、難易度設定に従って、専門職同士のカンファレンスをシミュレーションしてください。
各発言は必ず「[役職名]: 発言内容」のフォーマットで出力してください。
【重要】AI同士の会話が発生する場合、1回の出力の中で複数の職種が連続して発言するようにしてください。1職種だけ発言して出力を止めないでください。

【シナリオ】
${scenario.title}
患者: ${scenario.patient.age}歳 ${scenario.patient.gender} (${scenario.patient.primary_disease})
背景: ${scenario.patient.background}
初期情報: ${scenario.patient.initial_info.join(' / ')}
隠された情報（徐々に開示する）: ${scenario.patient.hidden_info ? scenario.patient.hidden_info.join(' / ') : 'なし'}

【参加するAI専門職】
${aiRolesDesc}

【学習者（ユーザー）の情報】
役割: ${userRole} (カンファレンスに参加する学生・新人として扱ってください。AIの医師は登場させず、主治医役も兼任するか、主治医の指示を仰ぐ学生として扱います。)
難易度: ${diffInfo.name} (テーマ: ${diffInfo.theme})
学習目標: ${diffInfo.goals.join(', ')}

【AIの基本ルール】
${scenario.ai_rules.map(rule => `- ${rule}`).join('\n')}
${diffInfo.rule}

最初は「医療ソーシャルワーカー」が進行役としてカンファレンスの開始を宣言し、患者の背景を簡単に説明した上で、医師（ユーザー）に意見や指示を求める形でスタートしてください。
`;
    
    this.conversationHistory = [];
    this.activeModel = null;
  },

  async _callModel(modelName, payload) {
    const url = getApiUrl(modelName);
    
    // タイムアウト設定（15秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY 
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        console.warn(`Model ${modelName} failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error("リクエストがタイムアウトしました。ネットワーク接続を確認してください。");
      }
      throw error;
    }
  },

  async sendMessage(userMessage, isInitial = false) {
    if (userMessage) {
      this.conversationHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
      });
    } else if (isInitial) {
      this.conversationHistory.push({
        role: "user",
        parts: [{ text: "カンファレンスを開始してください。" }]
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: this.systemPrompt }]
      },
      contents: this.conversationHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2500,
      }
    };

    // キャッシュ済みのモデルがあればそれを最初に試す
    const modelsToTry = this.activeModel
      ? [this.activeModel, ...MODEL_CANDIDATES.filter(m => m !== this.activeModel)]
      : [...MODEL_CANDIDATES];

    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}...`);
        const data = await this._callModel(modelName, payload);
        const aiResponseText = data.candidates[0].content.parts[0].text;

        if (this.activeModel !== modelName) {
          this.activeModel = modelName;
          console.log(`✅ Using model: ${modelName}`);
        }

        this.conversationHistory.push({
          role: "model",
          parts: [{ text: aiResponseText }]
        });

        return aiResponseText;
      } catch (error) {
        lastError = error;
        console.log(`⚠️ ${modelName} failed, trying next...`);
        continue;
      }
    }

    // すべてのモデルが失敗した場合、会話履歴から最後の入力を戻す
    this.conversationHistory.pop();
    throw new Error("すべてのモデルが応答できませんでした。しばらく待ってから再度お試しください。\n最終エラー: " + lastError.message);
  }
};
