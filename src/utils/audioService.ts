import { AudioAnalysisData, AudioSignalQuality } from '../types';

/**
 * Audio service handling microphone capture, real-time audio quality/waveform analysis,
 * native French TTS, and Wolof audio playback.
 */

export class AudioService {
  private static mediaRecorder: MediaRecorder | null = null;
  private static audioChunks: Blob[] = [];
  private static activeStream: MediaStream | null = null;
  private static audioContext: AudioContext | null = null;
  private static analyserNode: AnalyserNode | null = null;
  private static sourceNode: MediaStreamAudioSourceNode | null = null;
  private static analysisAnimFrame: number | null = null;
  private static analysisListeners: Set<(data: AudioAnalysisData) => void> = new Set();

  /**
   * Subscribe to live audio quality metrics (volume, waveform, clipping, quality classification)
   */
  static subscribeAnalysis(listener: (data: AudioAnalysisData) => void): () => void {
    this.analysisListeners.add(listener);
    return () => {
      this.analysisListeners.delete(listener);
    };
  }

  private static emitAnalysis(data: AudioAnalysisData): void {
    this.analysisListeners.forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        console.error('Erreur écouteur analyse audio:', err);
      }
    });
  }

  /**
   * Start recording microphone audio with real-time waveform & signal quality analysis
   */
  static async startRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return;
    }

    this.audioChunks = [];
    
    // Request microphone stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    this.activeStream = stream;

    // Attach Web Audio API AnalyserNode to the live microphone stream
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.sourceNode = ctx.createMediaStreamSource(stream);
      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 64; // 32 frequency bins, fast and responsive
      this.analyserNode.smoothingTimeConstant = 0.65;
      this.sourceNode.connect(this.analyserNode);

      this.startAnalysisLoop();
    } catch (analysisErr) {
      console.warn('Impossible d\'initialiser l\'analyseur Web Audio:', analysisErr);
    }

    // Pick supported mimeType
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    this.mediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    recorder.start(100);
    this.playChime(440, 0.08); // Subtle cue
  }

  private static startAnalysisLoop(): void {
    if (!this.analyserNode) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    const timeDataArray = new Uint8Array(this.analyserNode.fftSize);

    const step = () => {
      if (!this.analyserNode) return;

      this.analyserNode.getByteFrequencyData(dataArray);
      this.analyserNode.getByteTimeDomainData(timeDataArray);

      // Compute RMS volume (0 - 100)
      let sum = 0;
      for (let i = 0; i < timeDataArray.length; i++) {
        const val = (timeDataArray[i] - 128) / 128.0;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / timeDataArray.length);
      const volume = Math.min(100, Math.round(rms * 250)); // Scaled for speech dynamics

      // Normalized frequency bars (16 bars for UI rendering)
      const numBars = 16;
      const stepSize = Math.floor(dataArray.length / numBars);
      const waveform: number[] = [];
      for (let i = 0; i < numBars; i++) {
        let barSum = 0;
        for (let j = 0; j < stepSize; j++) {
          barSum += dataArray[i * stepSize + j] || 0;
        }
        const barNorm = (barSum / stepSize) / 255.0;
        waveform.push(Number(barNorm.toFixed(3)));
      }

      // Determine signal quality tier
      let quality: AudioSignalQuality = 'silent';
      let qualityLabelFr = 'Microphone silencieux / Parlez maintenant';
      let qualityLabelWo = 'Kàddu gu dégguwul / Wàxal léegi';
      const isClipping = volume >= 85;

      if (volume < 8) {
        quality = 'silent';
        qualityLabelFr = 'En attente de voix (silence)';
        qualityLabelWo = 'Xaaral kàddu gi...';
      } else if (volume < 22) {
        quality = 'low';
        qualityLabelFr = 'Signal un peu faible · Rapprochez le micro';
        qualityLabelWo = 'Kàddu gi dafa néew · Jegeñal micro bi';
      } else if (volume <= 78) {
        quality = 'optimal';
        qualityLabelFr = 'Signal optimal · Haute précision';
        qualityLabelWo = 'Kàddu gi dafa leer · Baax na lool';
      } else {
        quality = 'loud';
        qualityLabelFr = 'Volume trop fort · Éloignez légèrement';
        qualityLabelWo = 'Kàddu gi dafa ëpp · Soriil tuuti';
      }

      this.emitAnalysis({
        volume,
        waveform,
        quality,
        qualityLabelFr,
        qualityLabelWo,
        isClipping
      });

      this.analysisAnimFrame = requestAnimationFrame(step);
    };

    this.analysisAnimFrame = requestAnimationFrame(step);
  }

  private static stopAnalysisLoop(): void {
    if (this.analysisAnimFrame !== null) {
      cancelAnimationFrame(this.analysisAnimFrame);
      this.analysisAnimFrame = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.sourceNode = null;
    }

    this.analyserNode = null;

    // Emit final idle state
    this.emitAnalysis({
      volume: 0,
      waveform: new Array(16).fill(0),
      quality: 'silent',
      qualityLabelFr: 'Microphone arrêté',
      qualityLabelWo: 'Micro bi tëj na',
      isClipping: false
    });
  }

  /**
   * Stop recording and return base64 encoded audio with mimeType
   */
  static async stopRecording(): Promise<{ base64: string; mimeType: string }> {
    this.stopAnalysisLoop();

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Enregistreur non initialisé'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          
          // Stop media tracks
          if (this.activeStream) {
            this.activeStream.getTracks().forEach(track => track.stop());
            this.activeStream = null;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            this.playChime(554.37, 0.08);
            resolve({ base64: base64Data, mimeType });
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(audioBlob);
        } catch (e) {
          reject(e);
        } finally {
          this.mediaRecorder = null;
        }
      };

      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      } else {
        reject(new Error('Enregistreur arrêté'));
      }
    });
  }

  /**
   * Get the primary caregiver voice from device SpeechSynthesis (French high-clarity voice)
   */
  static getCaregiverVoice(): SpeechSynthesisVoice | null {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    return voices.find(v => v.lang.startsWith('fr') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))) ||
           voices.find(v => v.lang.startsWith('fr') && v.default) ||
           voices.find(v => v.lang.startsWith('fr')) ||
           voices[0] || null;
  }

  /**
   * Speak using the caregiver voice (soignant)
   * High clarity, calibrated rate for medical explanations
   */
  static speakCaregiverVoice(text: string, options?: { lang?: string; rate?: number; pitch?: number }): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Synthèse vocale non supportée par le navigateur');
        return resolve();
      }

      window.speechSynthesis.cancel(); // Stop any previous speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || 'fr-FR';
      utterance.rate = options?.rate ?? 0.95; // Slightly slower for absolute clarity in medical consultations
      utterance.pitch = options?.pitch ?? 1.0;

      const voice = this.getCaregiverVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Native device French TTS (100% offline, zero network, matching Android native TTS)
   */
  static speakFrench(text: string): Promise<void> {
    return this.speakCaregiverVoice(text);
  }

  /**
   * Play Wolof Audio returned by Gemini TTS or raw PCM/WAV
   */
  static async playAudioBase64(base64Audio: string, mimeType: string = 'audio/pcm;rate=24000'): Promise<void> {
    try {
      if (mimeType.includes('pcm')) {
        // Decode raw 24kHz 16-bit mono PCM into Web Audio buffer
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
        }

        const ctx = this.getAudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        return new Promise((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } else {
        // Standard audio/wav or audio/mp3 blob
        const audioBlob = this.base64ToBlob(base64Audio, mimeType);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      }
    } catch (e) {
      console.error('Erreur lecture audio:', e);
    }
  }

  /**
   * Pronounce Wolof using the caregiver's voice (soignant) with phonetic calibration
   */
  static speakWolofPhonetic(wolofText: string, phoneticGuide?: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) return resolve();
      window.speechSynthesis.cancel();

      // Clean special Wolof chars into phonetic approximations for the caregiver's French voice engine
      const spokenText = phoneticGuide || wolofText
        .replace(/ñ/g, 'gn')
        .replace(/q/g, 'k')
        .replace(/x/g, 'kh')
        .replace(/c/g, 'tch')
        .replace(/j/g, 'dj');

      const utterance = new SpeechSynthesisUtterance(spokenText);
      // Use the caregiver's voice explicitly for pronunciation
      const voice = this.getCaregiverVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'fr-FR';
      } else {
        utterance.lang = 'fr-FR';
      }
      utterance.rate = 0.90;
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  static stopAllSpeech(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  private static getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    return this.audioContext;
  }

  private static playChime(freq: number, duration: number): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  }

  private static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}
