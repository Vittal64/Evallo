import express from 'express';
import db from '../config/db.js';
import { protect } from '../middlewares/auth.js';
import { logAction } from '../utils/logger.js';

const router = express.Router();
router.use(protect);

// GET all teams for org (with employee count)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT t.*, 
       (SELECT COUNT(*) FROM employee_teams et WHERE et.team_id = t.id) as employee_count
       FROM teams t WHERE t.organisation_id = ? ORDER BY t.created_at DESC`,
      [req.user.orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET team by ID (with assigned employees)
router.get('/:id', async (req, res) => {
  try {
    const [teamRows] = await db.execute(
      'SELECT * FROM teams WHERE id = ? AND organisation_id = ?',
      [req.params.id, req.user.orgId]
    );
    if (teamRows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const [assignmentRows] = await db.execute(
      `SELECT e.id, e.first_name, e.last_name, e.email 
       FROM employee_teams et 
       JOIN employees e ON et.employee_id = e.id 
       WHERE et.team_id = ?`,
      [req.params.id]
    );

    res.json({ ...teamRows[0], employees: assignmentRows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE team
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Team name required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO teams (organisation_id, name, description) VALUES (?, ?, ?)',
      [req.user.orgId, name, description]
    );

    const newTeam = { id: result.insertId, name, description };
    await logAction(req.user.orgId, req.user.userId, 'team_created', newTeam);

    res.status(201).json(newTeam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE team
router.put('/:id', async (req, res) => {
  const { name, description } = req.body;

  try {
    const [existing] = await db.execute(
      'SELECT id FROM teams WHERE id = ? AND organisation_id = ?',
      [req.params.id, req.user.orgId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    await db.execute(
      'UPDATE teams SET name = ?, description = ? WHERE id = ? AND organisation_id = ?',
      [name, description, req.params.id, req.user.orgId]
    );

    await logAction(req.user.orgId, req.user.userId, 'team_updated', {
      teamId: req.params.id,
      changes: { name, description }
    });

    res.json({ id: req.params.id, name, description });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE team
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.execute(
      'SELECT id FROM teams WHERE id = ? AND organisation_id = ?',
      [req.params.id, req.user.orgId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    await db.execute('DELETE FROM teams WHERE id = ? AND organisation_id = ?', [req.params.id, req.user.orgId]);

    await logAction(req.user.orgId, req.user.userId, 'team_deleted', { teamId: req.params.id });

    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Assign employee to team (single or batch)
router.post('/:teamId/assign', async (req, res) => {
  const { employeeId, employeeIds } = req.body; // Support single or array
  const ids = employeeId ? [employeeId] : employeeIds || [];
  if (ids.length === 0) {
    return res.status(400).json({ message: 'Employee ID(s) required' });
  }

  try {
    const [team] = await db.execute(
      'SELECT id FROM teams WHERE id = ? AND organisation_id = ?',
      [req.params.teamId, req.user.orgId]
    );
    if (team.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check employees exist
    const placeholders = ids.map(() => '?').join(',');
    const [employees] = await db.execute(
      `SELECT id FROM employees WHERE id IN (${placeholders}) AND organisation_id = ?`,
      [...ids, req.user.orgId]
    );
    if (employees.length !== ids.length) {
      return res.status(400).json({ message: 'One or more employees not found' });
    }

    // Insert assignments (ignore duplicates due to UNIQUE key)
    const values = ids.map(id => [id, req.params.teamId]).flat();
    await db.execute(
      `INSERT IGNORE INTO employee_teams (employee_id, team_id) VALUES ${ids.map(() => '(?, ?)').join(',')}`,
      values
    );

    await logAction(req.user.orgId, req.user.userId, 'employee_assigned_to_team', {
      teamId: req.params.teamId,
      employeeIds: ids
    });

    res.json({ message: 'Assignment(s) created' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unassign employee from team
router.delete('/:teamId/unassign/:employeeId', async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM employee_teams WHERE team_id = ? AND employee_id = ?',
      [req.params.teamId, req.params.employeeId]
    );

    await logAction(req.user.orgId, req.user.userId, 'employee_unassigned_from_team', {
      teamId: req.params.teamId,
      employeeId: req.params.employeeId
    });

    res.json({ message: 'Assignment removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;