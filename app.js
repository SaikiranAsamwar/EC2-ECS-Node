const express = require('express');
const cors = require('cors');

const connectDB = require('./db');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// connect DB
connectDB();

// routes
app.use('/projects', projectRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});
