const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const { ALL_ROLE_CODES } = require("../../../shared/constants/roles");
const {
  listTeamStructureHandler,
  createTeamMemberHandler,
  updateTeamMemberHandler,
  deleteTeamMemberHandler,
  updateGroupHandler,
} = require("../controllers/team.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/structure", listTeamStructureHandler);
router.post("/groups/:groupId/members", requireRole(ALL_ROLE_CODES), createTeamMemberHandler);
router.put("/members/:memberId", requireRole(ALL_ROLE_CODES), updateTeamMemberHandler);
router.delete("/members/:memberId", requireRole(ALL_ROLE_CODES), deleteTeamMemberHandler);
router.put("/groups/:groupId", requireRole(ALL_ROLE_CODES), updateGroupHandler);

module.exports = router;
