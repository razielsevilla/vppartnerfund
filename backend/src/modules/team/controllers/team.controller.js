const {
  TeamServiceError,
  listTeamStructure,
  createMember,
  updateMember,
  deleteMember,
  updateGroup,
} = require("../services/team.service");
const {
  validateCreateMemberPayload,
  validateUpdateGroupPayload,
  validateUpdateMemberPayload,
} = require("../validators/team.validator");

function validationError(res, details) {
  return res.status(400).json({
    error: {
      code: "TEAM_VALIDATION_FAILED",
      message: "Team payload validation failed",
      details,
    },
  });
}

function serviceError(res, error) {
  if (error instanceof TeamServiceError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "TEAM_INTERNAL_ERROR",
      message: "Unexpected team service error",
      details: [],
    },
  });
}

async function listTeamStructureHandler(_req, res) {
  try {
    const groups = await listTeamStructure();
    return res.status(200).json({ groups });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function createTeamMemberHandler(req, res) {
  const validation = validateCreateMemberPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const member = await createMember(req.params.groupId, validation.value, req.user.id);
    return res.status(201).json({ member });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function updateTeamMemberHandler(req, res) {
  const validation = validateUpdateMemberPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const member = await updateMember(req.params.memberId, validation.value);
    return res.status(200).json({ member });
  } catch (error) {
    return serviceError(res, error);
  }
}

async function deleteTeamMemberHandler(req, res) {
  try {
    await deleteMember(req.params.memberId);
    return res.status(204).send();
  } catch (error) {
    return serviceError(res, error);
  }
}

async function updateGroupHandler(req, res) {
  const validation = validateUpdateGroupPayload(req.body);
  if (!validation.isValid) {
    return validationError(res, validation.errors);
  }

  try {
    const group = await updateGroup(req.params.groupId, validation.value);
    return res.status(200).json({ group });
  } catch (error) {
    return serviceError(res, error);
  }
}

module.exports = {
  listTeamStructureHandler,
  createTeamMemberHandler,
  updateTeamMemberHandler,
  deleteTeamMemberHandler,
  updateGroupHandler,
};
