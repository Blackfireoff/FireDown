import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('video');
  const [quality, setQuality] = useState('highest');
  const [fileFormat, setFileFormat] = useState('mp4');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playlistItems, setPlaylistItems] = useState([]);
  const [error, setError] = useState('');

  const checkDownloadStatus = async (downloadId) => {
    try {
      const response = await axios.get(`http://localhost:8000/status/${downloadId}`);
      if (response.data.filename) {
        setProgress(100);
        // Télécharger le fichier
        const link = document.createElement('a');
        link.href = `http://localhost:8000/download/${response.data.filename}`;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      }
      setProgress(response.data.progress || 0);
      return false;
    } catch (error) {
      console.error('Error checking status:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDownloading(true);
    setProgress(0);
    setPlaylistItems([]);
    setError('');

    try {
      const response = await axios.post('http://localhost:8000/download', {
        url,
        format,
        quality,
        fileFormat
      });

      const downloadId = response.data.download_id;
      
      // Vérifier le statut toutes les secondes jusqu'à ce que le fichier soit prêt
      const checkInterval = setInterval(async () => {
        const isComplete = await checkDownloadStatus(downloadId);
        if (isComplete) {
          clearInterval(checkInterval);
          setDownloading(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.detail || 'Une erreur est survenue');
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">FireDown</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  placeholder="https://youtube.com/..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="video">Vidéo</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Qualité</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="highest">Meilleure</option>
                    <option value="medium">Moyenne</option>
                    <option value="lowest">Basse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Format</label>
                  <select
                    value={fileFormat}
                    onChange={(e) => setFileFormat(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="mp4">MP4</option>
                    <option value="mkv">MKV</option>
                    <option value="mp3">MP3</option>
                    <option value="m4a">M4A</option>
                  </select>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={downloading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {downloading ? 'Téléchargement...' : 'Télécharger'}
              </motion.button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {downloading && (
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                    />
                  </div>
                  <div className="text-center text-sm text-gray-600">{progress}%</div>
                </div>
              </div>
            )}

            {playlistItems.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Playlist Progress</h3>
                <div className="space-y-2">
                  {playlistItems.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm text-gray-600">{item.title}</div>
                        <div className="h-2 bg-purple-200 rounded">
                          <div
                            className="h-2 bg-purple-500 rounded"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default App; 