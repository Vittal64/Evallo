import express from 'express';
import db from '../config/db.js';
import { protect } from '../middlewares/auth.js';
import { logAction } from '../utils/logger.js';

const router = express.Router();
router.use(protect);

// GET all employees for org
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, first_name, last_name, email, phone, created_at FROM employees WHERE organisation_id = ? ORDER BY created_at DESC',
      [req.user.orgId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET employee by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM employees WHERE id = ? AND organisation_id = ?',
      [req.params.id, req.user.orgId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE employee
router.post('/', async (req, res) => {
  const { first_name, last_name, email, phone } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ message: 'First and last name required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO employees (organisation_id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)',
      [req.user.orgId, first_name, last_name, email, phone]
    );

    const newEmployee = { id: result.insertId, first_name, last_name, email, phone };
    await logAction(req.user.orgId, req.user.userId, 'employee_created', newEmployee);

    res.status(201).json(newEmployee);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: err.message });
  }
});

// UPDATE employee
router.put('/:id', async (req, res) => {
  const { first_name, last_name, email, phone } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ message: 'First and last name required' });
  }

  try {
    const [existing] = await db.execute(
      'SELECT id FROM employees WHERE id = ? AND organisation_id = ?',
      [req.params.id, req.user.orgId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await db.execute(
      'UPDATE employees SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ? AND organisation_id = ?',
      [first_name, last_name, email, phone, req.params.id, req.user.orgId]
    );

    await logAction(req.user.orgId, req.user.userId, 'employee_updated', {
      employeeId: req.params.id,
      changes: { first_name, last_name, email, phone }
    });

    res.json({ id: req.params.id, first_name, last_name, email, phone });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.execute(
      'SELECT id FROM employees WHERE id = ? AND organisation_id = ?',
      [req.params.id, req.user.orgId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await db.execute('DELETE FROM employees WHERE id = ? AND organisation_id = ?', [req.params.id, req.user.orgId]);

    await logAction(req.user.orgId, req.user.userId, 'employee_deleted', { employeeId: req.params.id });

    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;