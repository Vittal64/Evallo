import db from '../config/db.js';

export const logAction = async (orgId, userId, action, meta = {}) => {
  try {
    await db.execute(
      'INSERT INTO logs (organisation_id, user_id, action, meta) VALUES (?, ?, ?, ?)',
      [orgId, userId || null, action, JSON.stringify(meta)]
    );
  } catch (err) {
    console.error('Logging error:', err);
  }
};