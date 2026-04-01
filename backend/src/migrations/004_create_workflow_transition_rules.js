exports.up = async (knex) => {
  await knex.schema.createTable("workflow_transition_rules", (table) => {
    table.text("id").primary();
    table.text("from_phase_id").notNullable().references("id").inTable("workflow_phases");
    table.text("to_phase_id").notNullable().references("id").inTable("workflow_phases");
    table.boolean("requires_last_contact_date").notNullable().defaultTo(false);
    table.boolean("requires_next_action_step").notNullable().defaultTo(false);
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.unique(["from_phase_id", "to_phase_id"]);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("workflow_transition_rules");
};