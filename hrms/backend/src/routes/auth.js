import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { logAction } from '../utils/logger.js';

const router = express.Router();

// Register Organisation + First Admin User
router.post('/register', async (req, res) => {
  const { orgName, adminName, email, password } = req.body;
  if (!orgName || !adminName || !email || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  try {
    // Check if org or email exists
    const [existingOrg] = await db.execute('SELECT id FROM organisations WHERE name = ?', [orgName]);
    const [existingUser] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingOrg.length > 0 || existingUser.length > 0) {
      return res.status(400).json({ message: 'Organisation or email already exists' });
    }

    const [orgResult] = await db.execute('INSERT INTO organisations (name) VALUES (?)', [orgName]);
    const orgId = orgResult.insertId;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await db.execute(
      'INSERT INTO users (organisation_id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [orgId, adminName, email, hashedPassword]
    );

    const token = jwt.sign(
      { userId: userResult.insertId, orgId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await logAction(orgId, userResult.insertId, 'organisation_created', {
      orgId,
      adminEmail: email,
      adminName
    });

    res.status(201).json({
      token,
      organisation: { id: orgId, name: orgName },
      user: { id: userResult.insertId, name: adminName, email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT u.id, u.name, u.email, u.organisation_id as orgId, u.password_hash, o.name as orgName FROM users u JOIN organisations o ON u.organisation_id = o.id WHERE u.email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, orgId: user.orgId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await logAction(user.orgId, user.id, 'user_login', { email });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      organisation: { id: user.orgId, name: user.orgName }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout (just logs, no token invalidate needed for JWT)
router.post('/logout', async (req, res) => {
  // For frontend, this just clears token; log here if protected
  res.json({ message: 'Logged out' });
});

export default router;