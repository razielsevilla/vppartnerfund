exports.up = async (knex) => {
  await knex.schema.createTable("tasks", (table) => {
    table.text("id").primary();
    table.text("title").notNullable();
    table.text("description").nullable();
    table.text("owner_id").notNullable().references("id").inTable("users");
    table.text("partner_id").notNullable().references("id").inTable("partners").onDelete("CASCADE");
    table.text("workflow_phase_id").notNullable().references("id").inTable("workflow_phases");
    table.date("due_date").notNullable();
    table.text("priority").notNullable();
    table.text("status").notNullable();
    table.timestamp("completed_at").nullable();
    table.text("created_by").notNullable().references("id").inTable("users");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("tasks");
};