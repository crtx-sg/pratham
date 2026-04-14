const { Router } = require('express');
const pool = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

// Get the full schema for a department
router.get('/schema/:department', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM questionnaire_nodes WHERE department = $1 AND is_active = true ORDER BY sort_order',
      [req.params.department.toUpperCase()]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('schema error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get next question for a session
router.get('/next/:session_id', authMiddleware, async (req, res) => {
  try {
    const { session_id } = req.params;

    // Get session department
    const sessResult = await pool.query('SELECT department FROM sessions WHERE id = $1', [session_id]);
    if (!sessResult.rows.length) return res.status(404).json({ error: 'Session not found' });
    const department = sessResult.rows[0].department;

    // Get all answered question IDs for this session
    const answeredResult = await pool.query(
      'SELECT question_id, answer_raw, answer_structured FROM session_answers WHERE session_id = $1 ORDER BY created_at',
      [session_id]
    );
    const answered = answeredResult.rows;
    const answeredIds = new Set(answered.map(a => a.question_id));

    // Load full DAG
    const dagResult = await pool.query(
      'SELECT * FROM questionnaire_nodes WHERE department = $1 AND is_active = true ORDER BY sort_order',
      [department]
    );
    const nodes = Object.fromEntries(dagResult.rows.map(n => [n.id, n]));

    // Find the first node (lowest sort_order that's the entry point)
    const startNode = dagResult.rows[0];
    if (!startNode) return res.json({ done: true, question: null });

    // Traverse the DAG following answered paths
    let currentId = startNode.id;

    for (const ans of answered) {
      const node = nodes[ans.question_id];
      if (!node) continue;

      // Determine next node based on answer
      const nextId = resolveNext(node, ans.answer_raw, ans.answer_structured);
      if (!nextId) break;
      currentId = nextId;
    }

    // If current node is answered, we need to find the next unanswered
    if (answeredIds.has(currentId)) {
      const node = nodes[currentId];
      const lastAns = answered.find(a => a.question_id === currentId);
      if (node && lastAns) {
        const nextId = resolveNext(node, lastAns.answer_raw, lastAns.answer_structured);
        currentId = nextId || null;
      } else {
        currentId = null;
      }
    }

    if (!currentId || !nodes[currentId]) {
      return res.json({ done: true, question: null });
    }

    // Check for terminal node
    if (currentId === 'q_done') {
      return res.json({ done: true, question: null });
    }

    const question = nodes[currentId];
    res.json({
      done: false,
      question,
      progress: { answered: answered.length, total: dagResult.rows.length - 1 }
    });
  } catch (err) {
    console.error('next question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit an answer
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { session_id } = req.session_data;
    const { question_id, answer_raw, answer_structured, input_mode } = req.body;

    if (!question_id || answer_raw === undefined) {
      return res.status(400).json({ error: 'question_id and answer_raw required' });
    }

    // Store answer
    await pool.query(
      `INSERT INTO session_answers (session_id, question_id, answer_raw, answer_structured, input_mode)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [session_id, question_id, answer_raw, answer_structured ? JSON.stringify(answer_structured) : null, input_mode || 'text']
    );

    // Check triage flags on this question
    const nodeResult = await pool.query('SELECT * FROM questionnaire_nodes WHERE id = $1', [question_id]);
    let triage_flag = null;
    if (nodeResult.rows.length) {
      const node = nodeResult.rows[0];
      if (node.triage_flag && node.triage_answer) {
        const answerVal = (answer_structured?.value || answer_raw || '').toString().toLowerCase();
        if (answerVal === node.triage_answer.toLowerCase()) {
          triage_flag = node.triage_flag;
          // Update session triage if escalating
          await pool.query(
            `UPDATE sessions SET triage_level = CASE
              WHEN triage_level = 'RED' THEN 'RED'
              WHEN $1 = 'RED' THEN 'RED'
              WHEN triage_level = 'AMBER' THEN 'AMBER'
              ELSE $1 END,
            updated_at = NOW() WHERE id = $2`,
            [triage_flag, session_id]
          );
        }
      }
    }

    // Update session state to INTERVIEW if not already
    await pool.query(
      `UPDATE sessions SET state = CASE WHEN state IN ('CONSENTED', 'INIT', 'REGISTERED') THEN 'INTERVIEW' ELSE state END, updated_at = NOW() WHERE id = $1`,
      [session_id]
    );

    res.json({ stored: true, triage_flag });
  } catch (err) {
    console.error('answer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all answers for a session
router.get('/answers/:session_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM session_answers WHERE session_id = $1 ORDER BY created_at',
      [req.params.session_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('get answers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function resolveNext(node, answerRaw, answerStructured) {
  const answerVal = (answerStructured?.value || answerRaw || '').toString().toLowerCase();

  // Check conditional rules first
  if (node.next_rules && Array.isArray(node.next_rules)) {
    for (const rule of node.next_rules) {
      if (rule.if_answer && rule.if_answer.toLowerCase() === answerVal && rule.go_to) {
        return rule.go_to;
      }
    }
  }

  return node.next_default || null;
}

module.exports = router;
