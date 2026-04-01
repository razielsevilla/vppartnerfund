exports.up = async (knex) => {
  await knex.schema.createTable("workflow_health_config", (table) => {
    table.text("key").primary();
    table.integer("value_int").notNullable();
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("workflow_stage_stall_thresholds", (table) => {
    table.text("phase_id").primary().references("id").inTable("workflow_phases").onDelete("CASCADE");
    table.integer("stall_threshold_days").notNullable();
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("workflow_stage_stall_thresholds");
  await knex.schema.dropTable("workflow_health_config");
};