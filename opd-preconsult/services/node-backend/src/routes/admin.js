const { Router } = require('express');
const pool = require('../models/db');

const router = Router();

// List questions for department
router.get('/questions/:department', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM questionnaire_nodes WHERE department = $1 ORDER BY sort_order',
      [req.params.department.toUpperCase()]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create question
router.post('/questions', async (req, res) => {
  try {
    const { id, department, text_en, text_hi, text_te, q_type, options_json, required,
            triage_flag, triage_answer, next_default, next_rules, sort_order } = req.body;

    const result = await pool.query(
      `INSERT INTO questionnaire_nodes (id, department, text_en, text_hi, text_te, q_type, options_json, required, triage_flag, triage_answer, next_default, next_rules, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id, department, text_en, text_hi, text_te, q_type, options_json ? JSON.stringify(options_json) : null,
       required !== false, triage_flag || null, triage_answer || null, next_default || null,
       next_rules ? JSON.stringify(next_rules) : null, sort_order || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('create question error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update question
router.put('/questions/:id', async (req, res) => {
  try {
    const fields = req.body;
    const sets = [];
    const vals = [];
    let i = 1;
    for (const [k, v] of Object.entries(fields)) {
      if (k === 'id') continue;
      sets.push(`${k} = $${i}`);
      vals.push(k.includes('json') || k === 'next_rules' ? JSON.stringify(v) : v);
      i++;
    }
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE questionnaire_nodes SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete question
router.delete('/questions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM questionnaire_nodes WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
