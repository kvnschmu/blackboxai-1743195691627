require('dotenv').config();
const express = require('express');
const apiRouter = require('./routes/api');

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api', apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Ein Fehler ist aufgetreten',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});