exports.up = async (knex) => {
  // Create workflow_transitions table
  await knex.schema.createTable('workflow_transitions', (table) => {
    table.text('id').primary();
    table.text('partner_id').notNullable().references('id').inTable('partners').onDelete('CASCADE');
    table.text('from_phase_id').nullable().references('id').inTable('workflow_phases');
    table.text('to_phase_id').notNullable().references('id').inTable('workflow_phases');
    table.text('change_reason').nullable();
    table.text('changed_by').notNullable().references('id').inTable('users');
    table.timestamp('changed_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create activity_logs table
  await knex.schema.createTable('activity_logs', (table) => {
    table.text('id').primary();
    table.text('partner_id').notNullable().references('id').inTable('partners').onDelete('CASCADE');
    table.text('action_type').notNullable();
    table.text('action_description').nullable();
    table.text('actor_id').notNullable().references('id').inTable('users');
    table.timestamp('happened_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('activity_logs');
  await knex.schema.dropTable('workflow_transitions');
};
