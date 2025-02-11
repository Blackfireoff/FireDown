import React from 'react';

const ErrorMessage = ({ error }) => {
  if (!error) return null;

  return (
    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
      {error}
    </div>
  );
};

export default ErrorMessage; 