exports.up = async (knex) => {
  await knex.schema.createTable("partner_qualification_profiles", (table) => {
    table.text("partner_id").primary().references("id").inTable("partners").onDelete("CASCADE");
    table.text("duration_category").nullable();
    table.text("impact_level").nullable();
    table.text("functional_role").nullable();
    table.text("potential_value_props").notNullable().defaultTo("[]");
    table.text("confirmed_value_props").notNullable().defaultTo("[]");
    table.text("updated_by").notNullable().references("id").inTable("users");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("partner_qualification_profiles");
};