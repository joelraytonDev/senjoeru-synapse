/**
 * /api/joeru — chat with Joeru through a running `opencode serve`.
 *
 * A thin proxy rather than a reimplementation: OpenCode owns sessions, agents,
 * tools and models, and duplicating any of that here would mean two sources of
 * truth for what Joeru is. Synapse only forwards.
 *
 * Unlike the rest of the API this path SPENDS TOKENS — it is the one
 * token-consuming surface in the app.
 */
const express = require('express');

/** @param {import('../services/joeru-service').JoeruService} service */
function createJoeruRouter(service) {
  const router = express.Router();

  const fail = (res, err) => res.status(502).json({ error: err.message });

  router.get('/health', async (_req, res) => {
    res.json(await service.health());
  });

  router.get('/sessions', async (_req, res) => {
    try { res.json({ sessions: await service.listSessions() }); }
    catch (err) { fail(res, err); }
  });

  router.post('/sessions', async (req, res) => {
    try { res.json(await service.createSession(req.body?.title)); }
    catch (err) { fail(res, err); }
  });

  router.get('/sessions/:id/messages', async (req, res) => {
    try { res.json({ messages: await service.messages(req.params.id, req.query.limit) }); }
    catch (err) { fail(res, err); }
  });

  router.post('/sessions/:id/abort', async (req, res) => {
    try { res.json({ aborted: await service.abort(req.params.id) }); }
    catch (err) { fail(res, err); }
  });

  router.post('/sessions/:id/messages', async (req, res) => {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'text is required' });

    try {
      res.json(await service.sendMessage(req.params.id, text, {
        agent: req.body?.agent,
        model: req.body?.model,
      }));
    } catch (err) {
      fail(res, err);
    }
  });

  return router;
}

module.exports = { createJoeruRouter };
