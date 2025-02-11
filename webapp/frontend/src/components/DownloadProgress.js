import React from 'react';
import { motion } from 'framer-motion';

const DownloadProgress = ({ 
  downloading, 
  currentVideoInfo, 
  progress, 
  batchProgress 
}) => {
  if (!downloading) return null;

  return (
    <div className="mt-6 bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-4">
        {currentVideoInfo && currentVideoInfo.thumbnail && (
          <img src={currentVideoInfo.thumbnail} alt="" className="w-24 h-24 object-cover rounded" />
        )}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">
            {currentVideoInfo ? currentVideoInfo.title : 'Téléchargement en cours...'}
          </h3>
          {batchProgress.total > 0 ? (
            <>
              <div className="text-sm text-gray-600 mb-2">
                Fichiers téléchargés: {batchProgress.current} / {batchProgress.total}
              </div>
              {batchProgress.currentItem && (
                <div className="text-sm text-gray-600 mb-2">
                  En cours: {batchProgress.currentItem.title}
                </div>
              )}
            </>
          ) : null}
          <div className="mt-2">
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
        </div>
      </div>
    </div>
  );
};

export default DownloadProgress; 