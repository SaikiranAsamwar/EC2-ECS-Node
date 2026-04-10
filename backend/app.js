const express = require('express');
const cors = require('cors');
const path = require('node:path');

const connectDB = require('./db');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// connect DB
connectDB();

// routes
app.use('/projects', projectRoutes);
app.use('/api/projects', projectRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'devops-dashboard-api' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

app.use((error, req, res, next) => {
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid project id' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(error.errors).map((fieldError) => fieldError.message)
    });
  }

  console.error(error);
  return res.status(500).json({ message: 'Internal server error' });
});

app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});
