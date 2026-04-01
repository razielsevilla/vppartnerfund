exports.up = async (knex) => {
  await knex.schema.alterTable("artifact_records", (table) => {
    table.text("document_type").notNullable().defaultTo("general");
    table.text("status").notNullable().defaultTo("active");
    table.integer("version_number").notNullable().defaultTo(1);
    table.text("owner_id").nullable().references("id").inTable("users");
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("artifact_records", (table) => {
    table.dropColumn("updated_at");
    table.dropColumn("owner_id");
    table.dropColumn("version_number");
    table.dropColumn("status");
    table.dropColumn("document_type");
  });
};
