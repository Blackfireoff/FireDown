import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaDownload, FaSpinner } from 'react-icons/fa';
import { VIDEO_FORMATS, AUDIO_FORMATS, isValidYoutubeUrl } from './constants';

const DownloadForm = ({ 
  url, 
  setUrl, 
  format, 
  setFormat, 
  quality, 
  setQuality, 
  fileFormat, 
  setFileFormat, 
  downloading,
  onAddToQueue,
  onSingleDownload,
  isAddingToQueue = false
}) => {
  const [urlError, setUrlError] = useState('');

  const handleFormatChange = (e) => {
    const newFormat = e.target.value;
    setFormat(newFormat);
    setFileFormat(newFormat === 'video' ? VIDEO_FORMATS[0].value : AUDIO_FORMATS[0].value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) {
      setUrlError('Veuillez entrer une URL');
      return;
    }

    if (!isValidYoutubeUrl(url)) {
      setUrlError('Veuillez entrer une URL YouTube valide (youtube.com ou youtu.be)');
      return;
    }

    setUrlError('');
    onAddToQueue();
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setUrlError('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">URL YouTube</label>
        <input
          type="url"
          value={url}
          onChange={handleUrlChange}
          className={`mt-1 block w-full rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500 ${
            urlError ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="https://youtube.com/..."
          disabled={isAddingToQueue}
        />
        {urlError && (
          <p className="mt-2 text-sm text-red-600">
            {urlError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={format}
            onChange={handleFormatChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            disabled={isAddingToQueue}
          >
            <option value="video">Vidéo</option>
            <option value="audio">Audio</option>
          </select>
        </div>

        {format === 'video' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Qualité</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              disabled={isAddingToQueue}
            >
              <option value="highest">Meilleure</option>
              <option value="medium">Moyenne</option>
              <option value="lowest">Basse</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Format</label>
          <select
            value={fileFormat}
            onChange={(e) => setFileFormat(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            disabled={isAddingToQueue}
          >
            {(format === 'video' ? VIDEO_FORMATS : AUDIO_FORMATS).map(fmt => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: isAddingToQueue ? 1 : 1.02 }}
          whileTap={{ scale: isAddingToQueue ? 1 : 0.98 }}
          type="submit"
          disabled={isAddingToQueue || !url}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isAddingToQueue ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isAddingToQueue ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <FaSpinner className="w-4 h-4" />
            </motion.div>
          ) : (
            <FaPlus />
          )}
          {isAddingToQueue ? 'Ajout en cours...' : 'Ajouter à la liste'}
        </motion.button>
      </div>
    </form>
  );
};

export default DownloadForm; 