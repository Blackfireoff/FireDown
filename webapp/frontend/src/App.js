import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import DownloadForm from './components/DownloadForm';
import DownloadProgress from './components/DownloadProgress';
import DownloadQueue from './components/DownloadQueue';
import ErrorMessage from './components/ErrorMessage';
import { cleanYoutubeUrl } from './components/constants';

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
    const maxRetries = 300; // 5 minutes maximum

    console.log('Starting progress tracking for download ID:', downloadId);
    
    while (!isComplete && downloading && retryCount < maxRetries) {
      try {
        console.log(`[Attempt ${retryCount + 1}] Checking status for download ID:`, downloadId);
        const response = await axios.get(`http://localhost:8000/status/${downloadId}`, {
          timeout: 5000 // 5 secondes timeout pour la requête de statut
        });
        
        if (!response.data) {
          console.log('No data in status response');
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const status = response.data;
        console.log('Status response:', status);
        
        if (status.filename) {
          console.log('File is ready:', status.filename);
          setProgress(100);
          
          try {
            console.log('Initiating file download...');
            const fileUrl = `http://localhost:8000/download/${encodeURIComponent(status.filename)}`;
            console.log('Download URL:', fileUrl);
            
            // Utiliser fetch pour télécharger le fichier
            const fetchResponse = await fetch(fileUrl);
            const blob = await fetchResponse.blob();
            
            // Créer une URL pour le blob
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Créer et configurer le lien de téléchargement
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = status.filename; // Force le téléchargement avec le nom du fichier
            
            // Ajouter le lien au document, cliquer dessus, puis le supprimer
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Libérer l'URL du blob
            window.URL.revokeObjectURL(blobUrl);
            
            console.log('Download process complete');
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
            console.log('Download progress:', status.progress);
            setProgress(status.progress);
            if (status.title) {
              console.log('Updating video title:', status.title);
              setCurrentVideoInfo(prev => ({
                ...prev,
                title: status.title
              }));
            }
          } else {
            console.log('No progress information in status');
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error checking download status:', error);
        console.error('Error details:', error.response || error.message);
        
        if (error.response?.status === 404) {
          console.log('Download not found, might be completed or failed');
          setError('Le téléchargement a échoué ou n\'existe plus');
          isComplete = true;
        } else {
          retryCount++;
          console.log('Retrying... Attempt:', retryCount);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (retryCount >= maxRetries) {
      console.log('Maximum retry count reached');
      setError('Le téléchargement a pris trop de temps');
      setDownloading(false);
      setCurrentVideoInfo(null);
    }
  };

  const fetchVideoInfo = async (videoUrl) => {
    try {
      const cleanedUrl = cleanYoutubeUrl(videoUrl);
      const response = await axios.get(`http://localhost:8000/video-info?url=${encodeURIComponent(cleanedUrl)}`);
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
      
      // Créer une nouvelle session avec les paramètres dans l'URL
      const sessionResponse = await axios.post(
        `http://localhost:8000/create-session?url=${encodeURIComponent(cleanedUrl)}&format=${format}&quality=${quality}&fileFormat=${fileFormat}`
      );
      
      const { session_id, video_info } = sessionResponse.data;
      setSessionId(session_id);
      
      // Mettre à jour la file d'attente avec les informations de la vidéo/playlist
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
      const response = await axios.post('http://localhost:8000/start-download', {
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
          const statusResponse = await axios.get(`http://localhost:8000/check-status/${downloadId}`);
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
            const downloadResponse = await axios.get(
              `http://localhost:8000/download-file/${downloadId}`,
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
            await axios.post(`http://localhost:8000/cleanup/${downloadId}`);
            
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
      
      // Démarrer la session de téléchargement
      await axios.post(`http://localhost:8000/start-session/${sessionId}`);
      
      let completedDownloads = 0;
      
      // Démarrer les téléchargements individuels
      for (const item of queue) {
        try {
          // Démarrer le téléchargement avec le session_id
          const response = await axios.post('http://localhost:8000/start-download', {
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
            const statusResponse = await axios.get(`http://localhost:8000/check-status/${downloadId}`);
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
      
      // Une fois tous les téléchargements terminés, télécharger le ZIP
      try {
        const response = await axios.get(
          `http://localhost:8000/session/${sessionId}/download`,
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
        
      } catch (error) {
        console.error('Error downloading ZIP:', error);
        setError('Erreur lors du téléchargement du fichier ZIP');
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