exports.up = async (knex) => {
  await knex.schema.createTable("discovery_notes", (table) => {
    table.text("id").primary();
    table.text("partner_id").notNullable().references("id").inTable("partners").onDelete("CASCADE");
    table.text("template_id").nullable();
    table.text("template_name").nullable();
    table.text("guided_answers").notNullable().defaultTo("[]");
    table.text("freeform_text").nullable();
    table.text("created_by").notNullable().references("id").inTable("users");
    table.text("updated_by").notNullable().references("id").inTable("users");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("discovery_notes");
};
