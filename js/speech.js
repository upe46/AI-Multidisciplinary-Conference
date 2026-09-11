window.SpeechInput = class SpeechInput {
  constructor(inputElement, micButtonElement) {
    this.inputElement = inputElement;
    this.micButtonElement = micButtonElement;
    this.isRecording = false;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'ja-JP';

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.micButtonElement.classList.add('active');
        this.inputElement.placeholder = "音声を聞き取り中...";
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          // Append final transcript
          const currentVal = this.inputElement.value;
          this.inputElement.value = currentVal ? currentVal + ' ' + finalTranscript : finalTranscript;
        }
      };

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        this.stop();
        this.inputElement.placeholder = "音声認識エラーが発生しました";
        setTimeout(() => {
          this.inputElement.placeholder = "メッセージを入力... (他職種への質問、意見など)";
        }, 3000);
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.micButtonElement.classList.remove('active');
        this.inputElement.placeholder = "メッセージを入力... (他職種への質問、意見など)";
      };

      this.micButtonElement.addEventListener('click', () => {
        if (this.isRecording) {
          this.stop();
        } else {
          this.start();
        }
      });
    } else {
      console.warn("Speech Recognition API is not supported in this browser.");
      this.micButtonElement.style.display = 'none';
    }
  }

  start() {
    if (this.recognition && !this.isRecording) {
      this.recognition.start();
    }
  }

  stop() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }
};
