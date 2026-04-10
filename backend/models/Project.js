const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [80, 'Project name must be less than 80 characters']
  },
  tech: {
    type: String,
    required: [true, 'Tech stack is required'],
    trim: true,
    maxlength: [120, 'Tech stack must be less than 120 characters']
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed'],
    default: 'In Progress'
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Project', projectSchema);
