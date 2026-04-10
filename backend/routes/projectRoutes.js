const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

const ALLOWED_STATUS = new Set(['In Progress', 'Completed']);

const normalizePayload = (payload = {}) => ({
  name: typeof payload.name === 'string' ? payload.name.trim() : '',
  tech: typeof payload.tech === 'string' ? payload.tech.trim() : '',
  status: typeof payload.status === 'string' ? payload.status.trim() : 'In Progress'
});

const validatePayload = ({ name, tech, status }, partial = false) => {
  const errors = [];

  if (!partial || name !== undefined) {
    if (!name) {
      errors.push('name is required');
    }
  }

  if (!partial || tech !== undefined) {
    if (!tech) {
      errors.push('tech is required');
    }
  }

  if (!partial || status !== undefined) {
    if (!ALLOWED_STATUS.has(status)) {
      errors.push('status must be either "In Progress" or "Completed"');
    }
  }

  return errors;
};

// GET project stats
router.get('/stats/summary', async (req, res, next) => {
  try {
    const [total, completed, inProgress] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: 'Completed' }),
      Project.countDocuments({ status: 'In Progress' })
    ]);

    res.json({ total, completed, inProgress });
  } catch (error) {
    next(error);
  }
});

// GET all projects with optional filtering and sorting
router.get('/', async (req, res, next) => {
  try {
    const { status, q, sort = 'newest' } = req.query;
    const filter = {};
    const page = Number.parseInt(req.query.page ?? '1', 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit ?? '6', 10) || 6, 20);
    const safePage = Math.max(page, 1);
    const safeLimit = Math.max(limit, 1);

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { tech: { $regex: q, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }
    if (sort === 'name') {
      sortOption = { name: 1 };
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort(sortOption)
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Project.countDocuments(filter)
    ]);

    res.json({
      projects,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total === 0 ? 1 : Math.ceil(total / safeLimit)
    });
  } catch (error) {
    next(error);
  }
});

// GET project by id
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.json(project);
  } catch (error) {
    return next(error);
  }
});

// POST new project
router.post('/', async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);
    const errors = validatePayload(payload);

    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const project = new Project(payload);
    await project.save();

    return res.status(201).json({ message: 'Project created', project });
  } catch (error) {
    return next(error);
  }
});

// PUT update project
router.put('/:id', async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);
    const errors = validatePayload(payload);

    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const project = await Project.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.json({ message: 'Project updated', project });
  } catch (error) {
    return next(error);
  }
});

// PATCH status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';

    if (!ALLOWED_STATUS.has(status)) {
      return res.status(400).json({ message: 'status must be either "In Progress" or "Completed"' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.json({ message: 'Status updated', project });
  } catch (error) {
    return next(error);
  }
});

// DELETE project
router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.json({ message: 'Project deleted' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
