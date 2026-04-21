/**
 * Voice Search — uses native Web Speech API on web, and a graceful fallback
 * on native (alerts user that STT requires a dev build with expo-speech-recognition).
 * Returns a transcript string or null.
 */
import { Platform, Alert } from 'react-native';

export const startVoiceSearch = () =>
  new Promise((resolve) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { resolve(null); return; }
      const recog = new SR();
      recog.lang = 'en-US';
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      recog.onresult = (e) => resolve(e.results?.[0]?.[0]?.transcript || null);
      recog.onerror = () => resolve(null);
      recog.onend = () => {};
      try { recog.start(); } catch { resolve(null); }
      return;
    }
    Alert.alert(
      'Voice search',
      'Voice search will be available in the next dev build. Type your query for now.',
      [{ text: 'OK', onPress: () => resolve(null) }],
    );
  });
