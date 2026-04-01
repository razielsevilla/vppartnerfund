exports.up = async (knex) => {
  const hasRoles = await knex.schema.hasTable("roles");
  if (!hasRoles) {
    return;
  }

  const nowIso = new Date().toISOString();

  const desiredRoles = [
    { id: "role_vp_head", code: "vp_head", name: "VP Partnerships Head" },
    { id: "role_liaison_officer", code: "liaison_officer", name: "Liaison Officer" },
    { id: "role_compliance_officer", code: "compliance_officer", name: "Compliance Officer" },
    { id: "role_devcon_officer", code: "devcon_officer", name: "DevCon Officer" },
  ];

  for (const role of desiredRoles) {
    const existing = await knex("roles").where({ code: role.code }).first();
    if (!existing) {
      await knex("roles").insert({
        ...role,
        created_at: nowIso,
      });
    }
  }

  const vpRole = await knex("roles").where({ code: "vp_head" }).first();
  const liaisonRole = await knex("roles").where({ code: "liaison_officer" }).first();

  const legacyAdminRole = await knex("roles").where({ code: "admin" }).first();
  if (legacyAdminRole && vpRole) {
    await knex("users").where({ role_id: legacyAdminRole.id }).update({ role_id: vpRole.id });
  }

  const legacyTeamRole = await knex("roles").where({ code: "team_member" }).first();
  if (legacyTeamRole && liaisonRole) {
    await knex("users").where({ role_id: legacyTeamRole.id }).update({ role_id: liaisonRole.id });
  }

  if (legacyAdminRole) {
    await knex("roles").where({ id: legacyAdminRole.id }).delete();
  }

  if (legacyTeamRole) {
    await knex("roles").where({ id: legacyTeamRole.id }).delete();
  }

  const clientName = String(knex.client.config.client || "");

  if (clientName.includes("sqlite")) {
    await knex.raw("PRAGMA foreign_keys = OFF");

    await knex.schema.createTable("users__rbac_tmp", (table) => {
      table.text("id").primary();
      table.text("role_id").notNullable().references("id").inTable("roles");
      table.text("full_name").notNullable();
      table.text("email").notNullable();
      table.text("password_hash").notNullable();
      table.boolean("is_active").notNullable().defaultTo(true);
      table.boolean("must_reset_password").notNullable().defaultTo(false);
      table.timestamp("last_login_at").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });

    await knex.raw(`
      INSERT INTO users__rbac_tmp (
        id,
        role_id,
        full_name,
        email,
        password_hash,
        is_active,
        must_reset_password,
        last_login_at,
        created_at,
        updated_at
      )
      SELECT
        id,
        role_id,
        full_name,
        email,
        password_hash,
        is_active,
        must_reset_password,
        last_login_at,
        created_at,
        updated_at
      FROM users
    `);

    await knex.schema.dropTable("users");
    await knex.schema.renameTable("users__rbac_tmp", "users");

    await knex.raw("PRAGMA foreign_keys = ON");
  } else {
    await knex.schema.alterTable("users", (table) => {
      table.dropUnique(["email"]);
    });
  }
};

exports.down = async (knex) => {
  const clientName = String(knex.client.config.client || "");

  if (clientName.includes("sqlite")) {
    await knex.raw("PRAGMA foreign_keys = OFF");

    await knex.schema.createTable("users__rollback_tmp", (table) => {
      table.text("id").primary();
      table.text("role_id").notNullable().references("id").inTable("roles");
      table.text("full_name").notNullable();
      table.text("email").unique().notNullable();
      table.text("password_hash").notNullable();
      table.boolean("is_active").notNullable().defaultTo(true);
      table.boolean("must_reset_password").notNullable().defaultTo(false);
      table.timestamp("last_login_at").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });

    await knex.raw(`
      INSERT INTO users__rollback_tmp (
        id,
        role_id,
        full_name,
        email,
        password_hash,
        is_active,
        must_reset_password,
        last_login_at,
        created_at,
        updated_at
      )
      SELECT
        u.id,
        u.role_id,
        u.full_name,
        u.email,
        u.password_hash,
        u.is_active,
        u.must_reset_password,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      INNER JOIN (
        SELECT email, MIN(created_at) AS min_created
        FROM users
        GROUP BY email
      ) earliest
      ON earliest.email = u.email AND earliest.min_created = u.created_at
    `);

    await knex.schema.dropTable("users");
    await knex.schema.renameTable("users__rollback_tmp", "users");

    await knex.raw("PRAGMA foreign_keys = ON");
  } else {
    await knex.schema.alterTable("users", (table) => {
      table.unique(["email"]);
    });
  }

  const legacyRoles = [
    { id: "role_admin", code: "admin", name: "Administrator" },
    { id: "role_team_member", code: "team_member", name: "Team Member" },
  ];

  const nowIso = new Date().toISOString();

  for (const role of legacyRoles) {
    const existing = await knex("roles").where({ code: role.code }).first();
    if (!existing) {
      await knex("roles").insert({
        ...role,
        created_at: nowIso,
      });
    }
  }

  const adminRole = await knex("roles").where({ code: "admin" }).first();
  const teamRole = await knex("roles").where({ code: "team_member" }).first();
  const vpRole = await knex("roles").where({ code: "vp_head" }).first();
  const liaisonRole = await knex("roles").where({ code: "liaison_officer" }).first();
  const complianceRole = await knex("roles").where({ code: "compliance_officer" }).first();
  const devconRole = await knex("roles").where({ code: "devcon_officer" }).first();

  if (vpRole && adminRole) {
    await knex("users").where({ role_id: vpRole.id }).update({ role_id: adminRole.id });
  }

  if (liaisonRole && teamRole) {
    await knex("users").where({ role_id: liaisonRole.id }).update({ role_id: teamRole.id });
  }

  if (complianceRole && teamRole) {
    await knex("users").where({ role_id: complianceRole.id }).update({ role_id: teamRole.id });
  }

  if (devconRole && teamRole) {
    await knex("users").where({ role_id: devconRole.id }).update({ role_id: teamRole.id });
  }

  await knex("roles").whereIn("code", ["vp_head", "liaison_officer", "compliance_officer", "devcon_officer"]).delete();
};
