import React from 'react';

const ErrorMessage = ({ error }) => {
  if (!error) return null;

  // Fonction pour extraire le message d'erreur
  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (Array.isArray(error)) {
      return error.map(err => err.msg || JSON.stringify(err)).join(', ');
    }
    if (error.detail) return error.detail;
    if (error.message) return error.message;
    return JSON.stringify(error);
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
      {errorMessage}
    </div>
  );
};

export default ErrorMessage; 