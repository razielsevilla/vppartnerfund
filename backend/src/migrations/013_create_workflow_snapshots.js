exports.up = async (knex) => {
  await knex.schema.createTable("workflow_snapshots", (table) => {
    table.text("id").primary();
    table.text("period_type").notNullable();
    table.date("period_start").notNullable();
    table.date("period_end").notNullable();
    table.text("snapshot_payload").notNullable();
    table.text("created_by").notNullable().references("id").inTable("users");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index(["period_type", "created_at"], "workflow_snapshots_period_created_idx");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("workflow_snapshots");
};
