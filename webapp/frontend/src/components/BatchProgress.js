import React from 'react';
import { Paper, Typography, Box, LinearProgress } from '@mui/material';

const BatchProgress = ({ progress, current, total, currentItem }) => {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        mb: 2,
        position: 'sticky',
        top: 16,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        Progression du téléchargement
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {current} sur {total} fichiers
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            height: 8,
            borderRadius: 4,
            backgroundColor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4
            }
          }}
        />
      </Box>
      
      {currentItem && (
        <Box>
          <Typography variant="body2" color="text.secondary">
            En cours : {currentItem.title}
          </Typography>
          {currentItem.progress > 0 && (
            <LinearProgress 
              variant="determinate" 
              value={currentItem.progress}
              sx={{ 
                mt: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2
                }
              }}
            />
          )}
        </Box>
      )}
    </Paper>
  );
};

export default BatchProgress; 