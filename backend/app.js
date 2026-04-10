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

app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});
