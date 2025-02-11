import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import DownloadForm from './components/DownloadForm';
import DownloadProgress from './components/DownloadProgress';
import DownloadQueue from './components/DownloadQueue';
import ErrorMessage from './components/ErrorMessage';
import { cleanYoutubeUrl } from './components/constants';

// Création d'une instance axios avec l'URL de base
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000'
});

const VIDEO_FORMATS = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mkv', label: 'MKV' },
  { value: 'avi', label: 'AVI' },
  { value: 'webm', label: 'WebM' },
];

const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'wav', label: 'WAV' },
  { value: 'aac', label: 'AAC' },
  { value: 'flac', label: 'FLAC' },
];

function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('video');
  const [quality, setQuality] = useState('highest');
  const [fileFormat, setFileFormat] = useState('mp4');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState([]);
  const [currentVideoInfo, setCurrentVideoInfo] = useState(null);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    currentItem: null
  });
  const [sessionId, setSessionId] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);

  const handleDownloadProgress = async (downloadId) => {
    let isComplete = false;
    let retryCount = 0;
    const maxRetries = 300;

    while (!isComplete && downloading && retryCount < maxRetries) {
      try {
        const response = await api.get(`/status/${downloadId}`);
        
        if (!response.data) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const status = response.data;
        
        if (status.filename) {
          setProgress(100);
          
          try {
            const fileUrl = `/download/${encodeURIComponent(status.filename)}`;
            const fetchResponse = await fetch(api.defaults.baseURL + fileUrl);
            const blob = await fetchResponse.blob();
            
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = status.filename;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(blobUrl);
            
            isComplete = true;
            setDownloading(false);
            setCurrentVideoInfo(null);
            setProgress(0);

          } catch (downloadError) {
            console.error('Error during file download:', downloadError);
            setError(`Erreur lors du téléchargement: ${downloadError.message}`);
            isComplete = true;
            setDownloading(false);
          }
        } else {
          if (status.progress !== undefined) {
            setProgress(status.progress);
            if (status.title) {
              setCurrentVideoInfo(prev => ({
                ...prev,
                title: status.title
              }));
            }
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error checking download status:', error);
        if (error.response?.status === 404) {
          setError('Le téléchargement a échoué ou n\'existe plus');
          isComplete = true;
        } else {
          retryCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (retryCount >= maxRetries) {
      setError('Le téléchargement a pris trop de temps');
      setDownloading(false);
      setCurrentVideoInfo(null);
    }
  };

  const fetchVideoInfo = async (videoUrl) => {
    try {
      const cleanedUrl = cleanYoutubeUrl(videoUrl);
      const response = await api.get(`/video-info?url=${encodeURIComponent(cleanedUrl)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching video info:', error);
      setError('Impossible de récupérer les informations de la vidéo');
      return null;
    }
  };

  const handleAddToQueue = async () => {
    if (!url) return;
    
    try {
      setIsAddingToQueue(true);
      setError('');
      const cleanedUrl = cleanYoutubeUrl(url);
      
      const sessionResponse = await api.post(
        `/create-session?url=${encodeURIComponent(cleanedUrl)}&format=${format}&quality=${quality}&fileFormat=${fileFormat}`
      );
      
      const { session_id, video_info } = sessionResponse.data;
      setSessionId(session_id);
      
      if (video_info.isPlaylist) {
        const newItems = video_info.playlistItems.map(item => ({
          id: item.id || `${Date.now()}-${Math.random()}`,
          url: item.url || '',
          format,
          quality,
          fileFormat,
          title: item.title || 'Sans titre',
          thumbnail: item.thumbnail || '',
          duration: item.duration || '00:00',
          size: item.size || 'Inconnu',
          status: 'pending'
        }));
        
        setQueue(prev => [...prev, ...newItems]);
      } else {
        const queueItem = {
          id: video_info.id || `${Date.now()}-${Math.random()}`,
          url: cleanedUrl,
          format,
          quality,
          fileFormat,
          thumbnail: video_info.thumbnail || '',
          title: video_info.title || 'Sans titre',
          duration: video_info.duration || '00:00',
          size: video_info.size || 'Inconnu',
          status: 'pending'
        };
        
        setQueue(prev => [...prev, queueItem]);
      }
      
      setUrl('');
      
    } catch (error) {
      console.error('Error adding to queue:', error);
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map(err => err.msg).join(', '));
        } else {
          setError(detail);
        }
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Erreur lors de l\'ajout à la file d\'attente');
      }
    } finally {
      setIsAddingToQueue(false);
    }
  };

  const handleRemoveFromQueue = (id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleDownloadSingle = async (item) => {
    try {
      setDownloading(true);
      setCurrentVideoInfo(item);
      setProgress(0);
      setError('');
      
      console.log('Starting single download for:', item);
      const cleanedUrl = cleanYoutubeUrl(item.url);
      console.log('Cleaned URL:', cleanedUrl);
      
      // Démarrer le téléchargement
      const response = await api.post('start-download', {
        url: cleanedUrl,
        format: item.format,
        quality: item.quality,
        fileFormat: item.fileFormat
      });

      console.log('Download initiated, response:', response.data);
      const downloadId = response.data.download_id;
      
      // Vérifier le statut toutes les 5 secondes
      const checkStatus = async () => {
        try {
          const statusResponse = await api.get(`check-status/${downloadId}`);
          const status = statusResponse.data;
          
          setProgress(status.progress);
          if (status.title) {
            setCurrentVideoInfo(prev => ({
              ...prev,
              title: status.title
            }));
          }

          if (status.error) {
            throw new Error(status.error);
          }

          if (status.is_ready && status.filename) {
            // Télécharger le fichier
            console.log('File is ready, downloading:', status.filename);
            const downloadResponse = await api.get(
              `download-file/${downloadId}`,
              { responseType: 'blob' }
            );

            // Créer le lien de téléchargement
            const blob = new Blob([downloadResponse.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = status.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Nettoyer le fichier sur le serveur
            await api.post(`cleanup/${downloadId}`);
            // Nettoyer le dossier de téléchargement
            await api.post('clean');
            
            setDownloading(false);
            setCurrentVideoInfo(null);
            setProgress(0);
            return;
          }

          // Continuer à vérifier toutes les 5 secondes
          setTimeout(checkStatus, 5000);
        } catch (error) {
          console.error('Error checking status:', error);
          setError(error.message || 'Une erreur est survenue');
          setDownloading(false);
          setCurrentVideoInfo(null);
        }
      };

      // Démarrer la vérification du statut
      checkStatus();
      
    } catch (error) {
      console.error('Download error:', error);
      setError(error.response?.data?.detail || 'Une erreur est survenue');
      setDownloading(false);
      setCurrentVideoInfo(null);
    }
  };

  const handleDownloadAll = async () => {
    if (queue.length === 0 || !sessionId) return;
    
    try {
      setDownloading(true);
      setProgress(0);
      setError('');
      setBatchProgress({
        current: 0,
        total: queue.length,
        currentItem: null
      });
      
      let completedDownloads = 0;
      
      // Démarrer les téléchargements individuels
      for (const item of queue) {
        try {
          // Démarrer le téléchargement avec le session_id
          const response = await api.post('start-download', {
            url: item.url,
            format: item.format,
            quality: item.quality,
            fileFormat: item.fileFormat,
            session_id: sessionId
          });
          
          const downloadId = response.data.download_id;
          
          // Mettre à jour l'état de l'élément dans la file d'attente
          setQueue(prev => prev.map(qItem => 
            qItem.id === item.id 
              ? { ...qItem, status: 'downloading', downloadId }
              : qItem
          ));
          
          // Vérifier le statut jusqu'à ce que le téléchargement soit terminé
          while (true) {
            const statusResponse = await api.get(`check-status/${downloadId}`);
            const status = statusResponse.data;
            
            // Mettre à jour la progression de l'élément
            setQueue(prev => prev.map(qItem =>
              qItem.id === item.id
                ? { ...qItem, progress: status.progress }
                : qItem
            ));
            
            // Mettre à jour les deux barres de progression
            const globalProgress = ((completedDownloads * 100) + status.progress) / queue.length;
            setProgress(globalProgress);
            setBatchProgress(prev => ({
              ...prev,
              current: completedDownloads,
              currentItem: {
                title: item.title,
                progress: status.progress
              }
            }));
            
            if (status.error) {
              setQueue(prev => prev.map(qItem =>
                qItem.id === item.id
                  ? { ...qItem, status: 'error', error: status.error }
                  : qItem
              ));
              throw new Error(status.error);
            }
            
            if (status.is_ready && status.filename) {
              completedDownloads++;
              setQueue(prev => prev.map(qItem =>
                qItem.id === item.id
                  ? { ...qItem, status: 'completed', filename: status.filename }
                  : qItem
              ));
              
              setBatchProgress(prev => ({
                ...prev,
                current: completedDownloads,
                total: queue.length,
                currentItem: null
              }));
              
              break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error(`Error downloading ${item.title}:`, error);
          setQueue(prev => prev.map(qItem =>
            qItem.id === item.id
              ? { ...qItem, status: 'error', error: error.message }
              : qItem
          ));
        }
      }
      
      // Une fois tous les téléchargements terminés, télécharger le fichier
      try {
        if (queue.length === 1) {
          // Pour une seule vidéo, télécharger directement le fichier
          const response = await api.get(
            `session/${sessionId}/download-single`,
            { responseType: 'blob' }
          );
          
          // Créer le lien de téléchargement
          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          // Utiliser le nom du fichier de la vidéo si disponible
          const videoFile = queue[0];
          link.download = videoFile.filename || `video_${sessionId}${getFileExtension(videoFile.fileFormat)}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          // Pour plusieurs vidéos, créer un ZIP
          const response = await api.get(
            `session/${sessionId}/download`,
            { responseType: 'blob' }
          );
          
          // Créer le lien de téléchargement
          const blob = new Blob([response.data], { type: 'application/zip' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `session_${sessionId}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }

        // Nettoyer le dossier de téléchargement
        await api.post('clean');
        
      } catch (error) {
        console.error('Error downloading file:', error);
        setError('Erreur lors du téléchargement du fichier');
      }
      
      setDownloading(false);
      setProgress(0);
      setBatchProgress({
        current: 0,
        total: 0,
        currentItem: null
      });
      
    } catch (error) {
      console.error('Batch download error:', error);
      setError(error.message || 'Une erreur est survenue lors du téléchargement');
      setDownloading(false);
      setBatchProgress({
        current: 0,
        total: 0,
        currentItem: null
      });
    }
  };

  // Fonction utilitaire pour obtenir l'extension de fichier
  const getFileExtension = (format) => {
    return format.startsWith('.') ? format : `.${format}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">FireDown</h1>
              
              <DownloadForm
                url={url}
                setUrl={setUrl}
                format={format}
                setFormat={setFormat}
                quality={quality}
                setQuality={setQuality}
                fileFormat={fileFormat}
                setFileFormat={setFileFormat}
                downloading={downloading}
                onAddToQueue={handleAddToQueue}
                onSingleDownload={handleDownloadSingle}
                isAddingToQueue={isAddingToQueue}
              />

              <DownloadProgress
                downloading={downloading}
                currentVideoInfo={currentVideoInfo}
                progress={progress}
                batchProgress={batchProgress}
              />

              <DownloadQueue
                queue={queue}
                downloading={downloading}
                onDownloadAll={handleDownloadAll}
                onDownloadSingle={handleDownloadSingle}
                onRemoveFromQueue={handleRemoveFromQueue}
              />

              <ErrorMessage error={error} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 