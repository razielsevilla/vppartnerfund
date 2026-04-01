const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const { ROLE_CODES } = require("../../../shared/constants/roles");
const {
  getMasterDataHandler,
  updateWorkflowPhasesHandler,
  updateTaxonomyHandler,
  listAuditLogsHandler,
} = require("../controllers/settings.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/master-data", getMasterDataHandler);
router.get("/audit-log", requireRole([ROLE_CODES.VP_HEAD]), listAuditLogsHandler);
router.put("/workflow-phases", requireRole([ROLE_CODES.VP_HEAD]), updateWorkflowPhasesHandler);
router.put("/taxonomies/:taxonomyKey", requireRole([ROLE_CODES.VP_HEAD]), updateTaxonomyHandler);

module.exports = router;
