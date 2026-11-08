const express = require('express');
const bodyParser = require('body-parser');
const log = require('debug')('history-service');

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
const historyRoutes = require('./app');
app.use('/', historyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'history-service',
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  log(`Listening at port ${PORT}`);
  console.log(`History service listening on port ${PORT}`);
});
