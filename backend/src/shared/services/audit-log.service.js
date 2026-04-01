const crypto = require("crypto");

async function logPartnerActivity(db, { partnerId, actionType, actorId, payload }) {
  const nowIso = new Date().toISOString();

  await db("activity_logs").insert({
    id: crypto.randomUUID(),
    partner_id: partnerId,
    action_type: actionType,
    action_description: payload ? JSON.stringify(payload) : null,
    actor_id: actorId,
    happened_at: nowIso,
  });
}

module.exports = {
  logPartnerActivity,
};