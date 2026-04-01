exports.up = async (knex) => {
  await knex.schema.createTable("workflow_artifact_requirements", (table) => {
    table.text("id").primary();
    table.text("to_phase_id").notNullable().references("id").inTable("workflow_phases").onDelete("CASCADE");
    table.text("document_type").notNullable();
    table.text("required_status").notNullable().defaultTo("active");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("workflow_artifact_requirements");
};
