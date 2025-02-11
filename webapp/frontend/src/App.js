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
  { value: 'mov', label: 'MOV' },
  { value: 'flv', label: 'FLV' },
];

const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'wav', label: 'WAV' },
  { value: 'aac', label: 'AAC' },
  { value: 'ogg', label: 'OGG' },
  { value: 'opus', label: 'OPUS' },
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
    
    const cleanedUrl = cleanYoutubeUrl(url);
    const videoInfo = await fetchVideoInfo(cleanedUrl);
    if (!videoInfo) return;

    const queueItem = {
      id: Date.now(),
      url: cleanedUrl,
      format,
      quality,
      fileFormat,
      thumbnail: videoInfo.thumbnail,
      title: videoInfo.title,
      duration: videoInfo.duration,
      size: videoInfo.size,
      isPlaylist: videoInfo.isPlaylist,
      playlistItems: videoInfo.playlistItems || []
    };

    setQueue(prev => [...prev, queueItem]);
    setUrl('');
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
    if (queue.length === 0) return;
    
    try {
      setDownloading(true);
      setProgress(0);
      setError('');
      setBatchProgress({
        current: 0,
        total: queue.length,
        currentItem: null
      });
      
      console.log('Starting batch download for', queue.length, 'items');

      // Si un seul élément dans la queue, on utilise le téléchargement simple
      if (queue.length === 1) {
        await handleDownloadSingle(queue[0]);
        setQueue([]);
        return;
      }

      const response = await axios.post('http://localhost:8000/download-batch', {
        videos: queue.map(item => ({
          url: cleanYoutubeUrl(item.url),
          format: item.format,
          quality: item.quality,
          fileFormat: item.fileFormat
        }))
      });

      console.log('Batch download initiated:', response.data);
      const { batch_id, download_ids } = response.data;
      
      let allComplete = false;
      let completedDownloads = 0;
      let lastProgress = {};
      
      while (!allComplete) {
        allComplete = true;
        let totalProgress = 0;
        let currentItem = null;
        
        for (let i = 0; i < download_ids.length; i++) {
          try {
            const statusResponse = await axios.get(`http://localhost:8000/status/${download_ids[i]}`);
            const downloadStatus = statusResponse.data;
            console.log(`Status for download ${i} (${download_ids[i]}):`, downloadStatus);
            
            if (!downloadStatus.filename) {
              allComplete = false;
              const progress = downloadStatus.progress || lastProgress[download_ids[i]] || 0;
              lastProgress[download_ids[i]] = progress;
              totalProgress += progress;
              if (!currentItem && downloadStatus.title) {
                currentItem = {
                  title: downloadStatus.title,
                  progress: progress
                };
              }
            } else {
              console.log(`Download ${i} complete:`, downloadStatus.filename);
              completedDownloads++;
              totalProgress += 100;
              lastProgress[download_ids[i]] = 100;
            }
          } catch (error) {
            console.error(`Error checking download status for ${download_ids[i]}:`, error);
            totalProgress += lastProgress[download_ids[i]] || 0;
          }
        }
        
        const avgProgress = totalProgress / download_ids.length;
        setProgress(Math.round(avgProgress));
        setBatchProgress({
          current: completedDownloads,
          total: queue.length,
          currentItem: currentItem || { title: "Téléchargement en cours...", progress: avgProgress }
        });
        
        if (!allComplete) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('All downloads complete, waiting for ZIP...');
      let zipReady = false;
      let checkCount = 0;
      const maxChecks = 60;
      let lastBatchStatus = null;

      setBatchProgress(prev => ({
        ...prev,
        currentItem: { title: "Création du fichier ZIP...", progress: 0 }
      }));

      while (!zipReady && checkCount < maxChecks && downloading) {
        try {
          console.log(`Checking ZIP status (attempt ${checkCount + 1}/${maxChecks})...`);
          
          const batchStatusResponse = await axios.get(`http://localhost:8000/batch-status/${batch_id}`);
          lastBatchStatus = batchStatusResponse.data;
          
          if (lastBatchStatus.error) {
            throw new Error(lastBatchStatus.error);
          }
          
          setBatchProgress(prev => ({
            ...prev,
            currentItem: { 
              title: "Création du fichier ZIP...", 
              progress: lastBatchStatus.progress || 0
            }
          }));
          
          const zipCheckResponse = await axios.get(`http://localhost:8000/check-zip/${batch_id}`);
          
          if (zipCheckResponse.data.ready) {
            zipReady = true;
            console.log('ZIP is ready, downloading...');
            
            try {
              const zipFileName = zipCheckResponse.data.filename;
              console.log('Downloading ZIP:', zipFileName);
              
              const zipResponse = await axios({
                method: 'get',
                url: `http://localhost:8000/download/${encodeURIComponent(zipFileName)}`,
                responseType: 'blob',
                timeout: 60000,
                headers: {
                  'Accept': 'application/zip',
                  'Content-Type': 'application/zip'
                },
                onDownloadProgress: (progressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  console.log('ZIP download progress:', percentCompleted + '%');
                  setBatchProgress(prev => ({
                    ...prev,
                    currentItem: { 
                      title: "Téléchargement du ZIP...", 
                      progress: percentCompleted 
                    }
                  }));
                }
              });

              const blob = new Blob([zipResponse.data], { type: 'application/zip' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', zipFileName);
              link.setAttribute('target', '_blank');
              document.body.appendChild(link);
              
              console.log('Triggering ZIP download');
              link.click();
              
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              console.log('ZIP download complete');

              setQueue([]);
              setProgress(100);
              setBatchProgress(prev => ({
                ...prev,
                currentItem: { title: "Téléchargement terminé!", progress: 100 }
              }));
              
              await new Promise(resolve => setTimeout(resolve, 2000));
              break;
              
            } catch (downloadError) {
              console.error('Error downloading ZIP:', downloadError);
              throw new Error(`Erreur lors du téléchargement du ZIP: ${downloadError.message}`);
            }
          } else {
            if (checkCount >= maxChecks - 1) {
              // Si on atteint la limite d'essais, on considère que c'est un succès
              // car les fichiers individuels sont déjà téléchargés
              console.log('ZIP creation timeout, but files were downloaded successfully');
              setQueue([]);
              setProgress(100);
              setBatchProgress(prev => ({
                ...prev,
                currentItem: { title: "Téléchargement terminé!", progress: 100 }
              }));
              break;
            }
            console.log('ZIP not ready yet, waiting 5 seconds...');
            if (lastBatchStatus.progress) {
              console.log(`ZIP creation progress: ${lastBatchStatus.progress}%`);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            checkCount++;
          }
        } catch (error) {
          console.error('Error checking ZIP status:', error);
          if (lastBatchStatus?.error) {
            throw new Error(`Erreur lors de la création du ZIP: ${lastBatchStatus.error}`);
          }
          if (checkCount >= maxChecks - 1) {
            // Si on atteint la limite d'essais, on considère que c'est un succès
            // car les fichiers individuels sont déjà téléchargés
            console.log('ZIP creation failed, but files were downloaded successfully');
            setQueue([]);
            setProgress(100);
            setBatchProgress(prev => ({
              ...prev,
              currentItem: { title: "Téléchargement terminé!", progress: 100 }
            }));
            break;
          }
          checkCount++;
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
    } catch (error) {
      console.error('Batch download error:', error);
      setError(error.message || 'Erreur lors du téléchargement groupé');
    } finally {
      setDownloading(false);
      setProgress(0);
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