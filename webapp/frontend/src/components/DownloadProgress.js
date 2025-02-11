import React from 'react';
import { motion } from 'framer-motion';

const DownloadProgress = ({ 
  downloading, 
  currentVideoInfo, 
  progress, 
  batchProgress 
}) => {
  if (!downloading) return null;

  const isBatchDownload = batchProgress && batchProgress.total > 1;

  return (
    <div className="mt-8">
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {isBatchDownload 
              ? `Téléchargement groupé (${batchProgress.current}/${batchProgress.total})`
              : 'Téléchargement en cours'
            }
          </h3>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Barre de progression */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Informations sur le fichier en cours */}
        <div className="mt-4">
          {isBatchDownload ? (
            <div>
              {batchProgress.currentItem && (
                <p className="text-sm text-gray-600">
                  {batchProgress.currentItem.title}
                </p>
              )}
            </div>
          ) : (
            currentVideoInfo && (
              <p className="text-sm text-gray-600">
                {currentVideoInfo.title}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadProgress; 