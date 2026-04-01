const express = require("express");
const { requireAuth, requireRole } = require("../../../shared/middleware/auth.middleware");
const {
  uploadArtifactHandler,
  listArtifactsHandler,
  getArtifactHandler,
  updateArtifactStatusHandler,
} = require("../controllers/vault.controller");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(["admin", "team_member"]));

router.post("/partners/:partnerId/artifacts", uploadArtifactHandler);
router.get("/partners/:partnerId/artifacts", listArtifactsHandler);
router.get("/artifacts/:artifactId", getArtifactHandler);
router.put("/artifacts/:artifactId/status", updateArtifactStatusHandler);

module.exports = router;
