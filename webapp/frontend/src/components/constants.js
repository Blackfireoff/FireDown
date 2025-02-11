export const VIDEO_FORMATS = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mkv', label: 'MKV' },
  { value: 'avi', label: 'AVI' },
  { value: 'webm', label: 'WebM' },
  { value: 'mov', label: 'MOV' },
  { value: 'flv', label: 'FLV' },
];

export const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'wav', label: 'WAV' },
  { value: 'aac', label: 'AAC' },
  { value: 'ogg', label: 'OGG' },
  { value: 'opus', label: 'OPUS' },
  { value: 'flac', label: 'FLAC' },
];

// Fonction pour valider une URL YouTube
export const isValidYoutubeUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.youtube.com' || 
           urlObj.hostname === 'youtube.com' || 
           urlObj.hostname === 'youtu.be';
  } catch (e) {
    return false;
  }
};

// Fonction pour nettoyer l'URL YouTube
export const cleanYoutubeUrl = (url) => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      // Pour les URLs youtu.be
      if (urlObj.hostname === 'youtu.be') {
        return `https://youtube.com/watch?v=${urlObj.pathname.slice(1)}`;
      }
      // Pour les URLs youtube.com
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `https://youtube.com/watch?v=${videoId}`;
      }
    }
    return url;
  } catch (e) {
    return url;
  }
}; 