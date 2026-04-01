exports.up = async (knex) => {
  await knex.schema.createTable("master_taxonomy_items", (table) => {
    table.text("id").primary();
    table.text("taxonomy_key").notNullable();
    table.text("value").notNullable();
    table.text("label").notNullable();
    table.integer("sort_order").notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.text("updated_by").notNullable().references("id").inTable("users");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.unique(["taxonomy_key", "value"]);
    table.index(["taxonomy_key", "sort_order"], "master_taxonomy_key_sort_idx");
  });

  await knex.schema.createTable("settings_audit_logs", (table) => {
    table.text("id").primary();
    table.text("domain").notNullable();
    table.text("action").notNullable();
    table.text("actor_id").notNullable().references("id").inTable("users");
    table.text("payload").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index(["domain", "created_at"], "settings_audit_domain_created_idx");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("settings_audit_logs");
  await knex.schema.dropTable("master_taxonomy_items");
};
