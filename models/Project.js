const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: String,
  tech: String,
  status: String
});

module.exports = mongoose.model('Project', projectSchema);
