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
    
    // キャラクター設定をプロンプト用に整形
    let aiRolesDesc = scenario.ai_roles.map(ai => 
      `### ${ai.icon || ''} ${ai.role}：${ai.name || ''}（${ai.title || ai.role}）
- 性格・特徴: ${ai.personality || ''}
- 話し方・口調: ${ai.tone || ''}
- 専門的視点: ${ai.description}`
    ).join('\n\n');
    
    this.systemPrompt = `
あなたは「AI模擬多職種カンファレンスルーム」を運営・シミュレーションするAIです。
以下のシナリオ、参加する各専門職の**キャラクター設定（性格・口調・名前）**、難易度設定に従って、人間味あふれるリアルな多職種連携カンファレンスを再現してください。

【重要：会話と発言の文法・長さのルール】
1. 各発言は必ず「[役職名]: 発言内容」または「[役職名（名前）]: 発言内容」のフォーマットで1行ずつ出力してください。
   例: [医師]: 〜 / [管理栄養士]: 〜 / [看護師]: 〜 / [ST]: 〜 / [薬剤師]: 〜 / [臨床検査技師]: 〜
2. 1発言あたりの文字数は **短め（約20文字）〜標準（約30〜40文字）** を厳守してください。長文の一人語りや教科書的な解説は絶対に禁止です。各キャラクターの個性・口調を活かした自然なテンポで会話を行ってください。
   - 良い例（約20字）: 「この案で進めていいと思います。問題ありますか？」
   - 良い例（約35字）: 「この案で進めたいと思っています。ただ、スケジュールだけ少し気になっています。」
3. 1回の出力の中で、AI専門職同士のやり取りを **3〜6回（3〜6行）** テンポよく展開してください。
4. **AI同士だけで勝手に結論まで進めないでください。** 3〜6回のやり取りを行ったら、必ず最後に **[医師]:** （佐藤先生）が「${userRole}（ユーザー）」に対して発言機会を与える問いかけを行い、そこで出力を停止してください。

【登場人物（キャラクター設定）】
各AI専門職は、以下の性格・口調・名前・視点になりきって発言してください：

${aiRolesDesc}

【カンファレンスにおける役割分担・チームダイナミクス】
- **管理栄養士（佐々木さん）はNSTカンファレンスの中心的存在（推進役・キーパーソン）**です。栄養状態の評価や具体的な栄養管理計画の提案を積極的にリードし、看護師・ST・薬剤師・検査技師へ質問や連携を投げかけて議論を前進させてください。
- **医師（佐藤先生）は進行・ファシリテーター**として全体の統括とユーザー（${userRole}）への問いかけ・引き出しを担当します。

【学習者（ユーザー）の立場と介入ルール】
- ユーザーの立場: 「${userRole}」
- 医師（佐藤先生）はカンファレンスのファシリテーター（司会・進行）を務め、議論の区切りごとに${userRole}に温かく問いかけます。
- 医師からの問いかけのバリエーション（場面に応じて適切なものを選択）：
  - 「ここまで聞いて、何か気になることはありますか？ どの職種に聞いても構いません。」
  - 「誰に聞きたいですか？」
  - 「あなたの職種（${userRole}）の視点では何が気になりますか？」
  - 「不足している情報は何だと思いますか？」
  - 「この意見についてどう考えますか？」
  - 「患者さんに確認したいことはありますか？」
  - 「今、新しい情報が出ました。ここからどう考えますか？ 追加で確認したいことはありますか？」
- ユーザー（${userRole}）から質問・発言・提案があった場合：
  - AIはその発言を最優先で受け止め、必ず以降のカンファレンス内容に反映してください。
  - 質問された職種（または最も関連の深い職種）がまず短くキャラクターらしく回答し、その回答を受けて他職種（特に管理栄養士など）が反応して議論を再開します（3〜6回のやり取り後、再び佐藤先生が学生に問いかける）。

【シナリオ】
${scenario.title}
患者: ${scenario.patient.age}歳 ${scenario.patient.gender} (${scenario.patient.primary_disease})
背景: ${scenario.patient.background}
初期情報: ${scenario.patient.initial_info.join(' / ')}
隠された情報（徐々に開示する）: ${scenario.patient.hidden_info ? scenario.patient.hidden_info.join(' / ') : 'なし'}

【難易度設定】
難易度: ${diffInfo.name} (テーマ: ${diffInfo.theme})
学習目標: ${diffInfo.goals.join(', ')}
${diffInfo.rule}

【会話の開始手順】
初回は、佐藤先生（医師）がカンファレンスの開始を告げ、管理栄養士（佐々木さん）が患者の体重減少や栄養摂取低下・必要栄養量に関する懸念と評価を中心となって問題提起し、高橋看護師や渡辺STらと2〜4回短くやり取りした上で、佐藤先生が「ここまで聞いて、何か気になることはありますか？ どの職種に聞いても構いません。」などと${userRole}に問いかけて止めてください。
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
