const API_KEY = "AQ.Ab8RN6Lcsb0Qz3kMPBce8pn3sYq-WbM2i1d6vZVsA7owhO9WFQ";

// 優先順にモデルを試行する
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
    const diffInfo = scenario.difficulty_levels ? scenario.difficulty_levels[difficulty] : { name: "標準", theme: "標準", goals: [], rule: "" };
    
    // キャラクター設定をプロンプト用に整形
    let aiRolesDesc = scenario.ai_roles.map(ai => 
      `### ${ai.icon || ''} ${ai.role}：${ai.name || ''}（${ai.title || ai.role}）
- 性格・特徴: ${ai.personality || ''}
- 話し方・口調: ${ai.tone || ''}
- 専門的視点: ${ai.description || ''}
- 注力テーマ: ${(ai.focus || []).join('、')}`
    ).join('\n\n');

    // 進行役（ファシリテーター）と推進役（キーパーソン）を特定
    const facilitator = scenario.ai_roles.find(r => 
      (r.title && r.title.includes('進行')) || 
      (r.focus && r.focus.some(f => f.includes('進行')))
    ) || scenario.ai_roles[0];

    const keyPerson = scenario.ai_roles.find(r => 
      (r.title && r.title.includes('キーパーソン')) || 
      (r.personality && (r.personality.includes('中心') || r.personality.includes('キーパーソン')))
    ) || scenario.ai_roles[1] || scenario.ai_roles[0];
    
    this.systemPrompt = `
あなたは「AI模擬多職種カンファレンスルーム」を運営・シミュレーションするAIです。
以下のシナリオ、参加する各専門職の**キャラクター設定（性格・口調・名前）**、難易度設定に従って、人間味あふれるリアルな多職種連携カンファレンスを再現してください。

【重要：会話と発言の文法・長さのルール】
1. 各発言は必ず「[役職名]: 発言内容」または「[役職名（名前）]: 発言内容」のフォーマットで1行ずつ出力してください。
   例: [${facilitator.role}]: 〜 / [${keyPerson.role}]: 〜
2. 1発言あたりの文字数は **短め（約20文字）〜標準（約30〜40文字）** を厳守してください。長文の一人語りや教科書的な解説は絶対に禁止です。各キャラクターの個性・口調を活かした自然なテンポで会話を行ってください。
   - 良い例（約20字）: 「この方針で進めてよいと思います。気になる点はありますか？」
   - 良い例（約35字）: 「こちらの視点からは問題なさそうです。ただ、退院後のフォローが少し心配ですね。」
3. 1回の出力の中で、AI専門職同士のやり取りを **3〜6回（3〜6行）** テンポよく展開してください。
4. **AI同士だけで勝手に結論まで進めないでください。** 3〜6回のやり取りを行ったら、必ず最後に **[${facilitator.role}]:** （${facilitator.name || facilitator.role}）が「${userRole}（ユーザー）」に対して発言を促す問いかけ（進行役が医師の場合は高圧的・威圧的に問い詰める形）を行い、そこで出力を停止してください。

【登場人物（キャラクター設定）】
各AI専門職は、以下の性格・口調・名前・視点になりきって発言してください：

${aiRolesDesc}

【重要指示：医師の発言トーン】
- カンファレンスに参加する**医師**は、非常にプライドが高く威圧的・高圧的な態度で発言してください。曖昧さや無駄口を嫌い、常に迅速な結論と論理的根拠を厳しく求めます。「で、要点は何だ？」「根拠は？」「おい、君は何を見ているんだ？」「手短に言え」「時間の無駄だ」といった厳しく突き放すような高圧的な口調を徹底してください。

【カンファレンスにおける役割分担・チームダイナミクス】
- **${keyPerson.role}（${keyPerson.name || keyPerson.role}）は本カンファレンスの推進役（キーパーソン）**として専門的な評価や具体的な介入提案を積極的にリードし、他職種へ質問や連携を投げかけて議論を前進させてください。
- **${facilitator.role}（${facilitator.name || facilitator.role}）は進行・ファシリテーター**として全体の統括とユーザー（${userRole}）への問いかけ・引き出しを担当します。${facilitator.role === '医師' ? '医師として高圧的かつ威圧感を持って参加者やユーザーに厳しく問い詰めてください。' : ''}

【学習者（ユーザー）の立場と介入ルール】
- ユーザーの立場: 「${userRole}」
- ${facilitator.role}（${facilitator.name || facilitator.role}）は進行役を務め、議論の区切りごとに${userRole}に問いかけます。${facilitator.role === '医師' ? '医師からの問いかけは常に高圧的・威圧的（「おい、${userRole}。黙って突っ立ってるだけか？ 何が気になってるんだ」「手短に言え」「根拠を持って答えろ」など）にしてください。' : ''}
- 問いかけのバリエーション（場面に応じて適切なものを選択）：
${facilitator.role === '医師' ? `  - 「おい、${userRole}。黙って突っ立ってるだけか？ 君は何が気になってるんだ。」
  - 「手短に言え。${userRole}の視点から見て、何が問題だと考えてる？」
  - 「で、君はどう考える？ 曖昧な意見じゃなく根拠を持って答えろ。」
  - 「不足している情報は何だ？ 早く言ってみろ、時間の無駄だ。」
  - 「誰かに質問があるなら端的に言え。もたもたするな。」
  - 「おい、新しい情報が出たぞ。ぼーっとしてないで、ここからどう動くか言ってみろ。」` : `  - 「ここまで聞いて、何か気になることはありますか？ どの職種に聞いても構いません。」
  - 「誰に聞きたいですか？」
  - 「あなたの職種（${userRole}）の視点では何が気になりますか？」
  - 「不足している情報や確認したいことはありますか？」
  - 「この意見についてどう考えますか？」`}
- ユーザー（${userRole}）から質問・発言・提案があった場合：
  - AIはその発言を最優先で受け止め、必ず以降のカンファレンス内容に反映してください。
  - 質問された職種（または関連する職種）がまず短く回答し、他職種が反応して3〜6回テンポよく議論を展開し、最後に進行役が${userRole}に問いかけて停止します（進行役が医師の場合は鋭く高圧的に問い詰める）。

【シナリオ】
${scenario.title}
対象患者・事例: ${scenario.patient.age ? `${scenario.patient.age}歳 ${scenario.patient.gender}` : scenario.patient.gender} (${scenario.patient.primary_disease})
背景: ${scenario.patient.background}
初期情報: ${(scenario.patient.initial_info || []).join(' / ')}
隠された情報（徐々に開示する）: ${(scenario.patient.hidden_info || []).join(' / ')}

【難易度設定】
難易度: ${diffInfo.name} (テーマ: ${diffInfo.theme})
学習目標: ${(diffInfo.goals || []).join(', ')}
${diffInfo.rule}

【会話の開始手順】
初回は、${facilitator.name || facilitator.role}（${facilitator.role}）が${facilitator.role === '医師' ? '高圧的に「時間がないから手短に進めるぞ」などと' : ''}カンファレンスの開始を告げ、${keyPerson.name || keyPerson.role}（${keyPerson.role}）が本事例の重要課題について問題提起し、他職種と2〜4回短くやり取りした上で、${facilitator.role}が${facilitator.role === '医師' ? '「おい、${userRole}。ただ聞いてるだけじゃないだろうな？ 何か気になる点はあるのか、手短に言え。」などと高圧的に' : '「ここまで聞いて、何か気になりますか？ どの職種に質問しても構いません。」と'}${userRole}に問いかけて止めてください。
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
        throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  },

  async sendMessage(userMessage = null, isInitial = false) {
    if (userMessage) {
      this.conversationHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: this.systemPrompt }]
      },
      contents: isInitial ? [
        {
          role: "user",
          parts: [{ text: "カンファレンスを開始してください。" }]
        }
      ] : this.conversationHistory,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };

    let lastError = null;
    const modelsToTry = this.activeModel 
      ? [this.activeModel, ...MODEL_CANDIDATES.filter(m => m !== this.activeModel)]
      : MODEL_CANDIDATES;

    for (const model of modelsToTry) {
      try {
        const data = await this._callModel(model, payload);
        const candidate = data.candidates?.[0];
        
        if (candidate && candidate.content && candidate.content.parts?.[0]?.text) {
          const aiText = candidate.content.parts[0].text;
          
          this.activeModel = model;
          
          if (!isInitial) {
            this.conversationHistory.push({
              role: "model",
              parts: [{ text: aiText }]
            });
          } else {
            this.conversationHistory = [
              { role: "user", parts: [{ text: "カンファレンスを開始してください。" }] },
              { role: "model", parts: [{ text: aiText }] }
            ];
          }

          return aiText;
        } else {
          throw new Error("応答の形式が不正です。");
        }
      } catch (err) {
        console.warn(`モデル ${model} でのエラー:`, err.message);
        lastError = err;
      }
    }

    throw new Error(`全モデルへのリクエストが失敗しました。(${lastError?.message || "不明なエラー"})`);
  }
};
