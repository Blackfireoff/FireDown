import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrash, FaDownload } from 'react-icons/fa';

const DownloadQueue = ({ 
  queue, 
  downloading, 
  onDownloadAll, 
  onDownloadSingle, 
  onRemoveFromQueue 
}) => {
  if (queue.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">File d'attente ({queue.length})</h2>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDownloadAll}
          disabled={downloading}
          className="flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <FaDownload /> Tout télécharger
        </motion.button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {queue.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg"
            >
              {item.thumbnail && (
                <img src={item.thumbnail} alt="" className="w-24 h-24 object-cover rounded" />
              )}
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <div className="text-sm text-gray-500">
                  <p>Durée: {item.duration}</p>
                  <p>Format: {item.format} ({item.fileFormat}) - Qualité: {item.quality}</p>
                  {item.size && <p>Taille estimée: {item.size}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onDownloadSingle(item)}
                  disabled={downloading}
                  className="p-2 text-blue-600 hover:text-blue-800"
                >
                  <FaDownload />
                </button>
                <button
                  onClick={() => onRemoveFromQueue(item.id)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <FaTrash />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DownloadQueue; 