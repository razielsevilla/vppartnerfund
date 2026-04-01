exports.up = async (knex) => {
  await knex.schema.createTable("task_reminder_events", (table) => {
    table.text("id").primary();
    table.text("task_id").notNullable().references("id").inTable("tasks").onDelete("CASCADE");
    table.text("partner_id").notNullable().references("id").inTable("partners").onDelete("CASCADE");
    table.text("reminder_type").notNullable();
    table.date("due_date").notNullable();
    table.timestamp("triggered_at").notNullable().defaultTo(knex.fn.now());
    table.text("triggered_by").notNullable().references("id").inTable("users");
    table.unique(["task_id", "reminder_type", "due_date"]);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("task_reminder_events");
};
