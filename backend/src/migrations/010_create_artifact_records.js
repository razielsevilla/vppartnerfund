exports.up = async (knex) => {
  await knex.schema.createTable("artifact_records", (table) => {
    table.text("id").primary();
    table.text("partner_id").notNullable().references("id").inTable("partners").onDelete("CASCADE");
    table.text("file_name").notNullable();
    table.text("mime_type").notNullable();
    table.integer("size_bytes").notNullable();
    table.text("storage_provider").notNullable();
    table.text("storage_path").notNullable();
    table.text("uploaded_by").notNullable().references("id").inTable("users");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable("artifact_records");
};
