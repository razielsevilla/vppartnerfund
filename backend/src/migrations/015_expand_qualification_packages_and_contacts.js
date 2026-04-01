exports.up = async (knex) => {
  await knex.schema.alterTable("partner_qualification_profiles", (table) => {
    table.text("role_packages").notNullable().defaultTo("[]");
    table.text("benefit_packages").notNullable().defaultTo("[]");
  });

  await knex.schema.alterTable("partner_contacts", (table) => {
    table.text("link_url").nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("partner_contacts", (table) => {
    table.dropColumn("link_url");
  });

  await knex.schema.alterTable("partner_qualification_profiles", (table) => {
    table.dropColumn("benefit_packages");
    table.dropColumn("role_packages");
  });
};
