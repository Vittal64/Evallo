import express from 'express';
import db from '../config/db.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();
router.use(protect);

// GET logs for org (with filters: action, date range)
router.get('/', async (req, res) => {
  const { action, startDate, endDate } = req.query;
  let query = 'SELECT * FROM logs WHERE organisation_id = ?';
  const params = [req.user.orgId];

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }
  if (startDate) {
    query += ' AND timestamp >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND timestamp <= ?';
    params.push(endDate);
  }
  query += ' ORDER BY timestamp DESC LIMIT 100'; // Limit for perf

  try {
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;