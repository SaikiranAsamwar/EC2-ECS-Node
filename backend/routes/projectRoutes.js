const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// GET all projects
router.get('/', async (req, res) => {
  const projects = await Project.find();
  res.json(projects);
});

// POST new project
router.post('/', async (req, res) => {
  const { name, tech, status } = req.body;

  const project = new Project({ name, tech, status });
  await project.save();

  res.send("Project saved 🚀");
});

module.exports = router;
