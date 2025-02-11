import React from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaDownload } from 'react-icons/fa';
import { VIDEO_FORMATS, AUDIO_FORMATS } from './constants';

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
  onSingleDownload 
}) => {
  const handleFormatChange = (e) => {
    const newFormat = e.target.value;
    setFormat(newFormat);
    setFileFormat(newFormat === 'video' ? VIDEO_FORMATS[0].value : AUDIO_FORMATS[0].value);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onAddToQueue(); }} className="space-y-6">
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
            onChange={handleFormatChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
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
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
        >
          <FaPlus /> Ajouter à la liste
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => onSingleDownload({ url, format, quality, fileFormat })}
          disabled={downloading || !url}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          <FaDownload /> Téléchargement unique
        </motion.button>
      </div>
    </form>
  );
};

export default DownloadForm; 