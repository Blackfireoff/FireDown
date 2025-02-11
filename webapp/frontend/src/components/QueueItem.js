import React from 'react';
import { motion } from 'framer-motion';
import { FaDownload, FaTrash } from 'react-icons/fa';

const QueueItem = ({ item, onDownloadSingle, onRemoveFromQueue, downloading }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'downloading':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'downloading':
        return 'Téléchargement en cours';
      case 'completed':
        return 'Terminé';
      case 'error':
        return 'Erreur';
      default:
        return status;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-white rounded-lg shadow-md p-4 mb-4"
    >
      <div className="flex items-center gap-4">
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            className="w-24 h-24 object-cover rounded-lg"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}
        
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">
            {item.title || 'Sans titre'}
          </h3>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Durée: {item.duration || '00:00'}</span>
            {item.size && <span>Taille: {item.size}</span>}
            <span className={getStatusColor(item.status)}>
              {getStatusText(item.status)}
            </span>
          </div>
          
          {item.status === 'downloading' && item.progress && (
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onDownloadSingle(item)}
            disabled={downloading}
            className="p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Télécharger"
          >
            <FaDownload />
          </button>
          <button
            onClick={() => onRemoveFromQueue(item.id)}
            className="p-2 text-red-600 hover:text-red-800"
            title="Supprimer"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default QueueItem; 