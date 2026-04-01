exports.up = async (knex) => {
  // Create workflow_phases table
  await knex.schema.createTable('workflow_phases', (table) => {
    table.text('id').primary();
    table.text('code').unique().notNullable();
    table.text('name').unique().notNullable();
    table.integer('sort_order').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create partners table
  await knex.schema.createTable('partners', (table) => {
    table.text('id').primary();
    table.text('organization_name').notNullable();
    table.text('organization_type').notNullable();
    table.text('industry_niche').notNullable();
    table.text('website_url').nullable();
    table.text('location').nullable();
    table.text('past_relationship').nullable();
    table.text('current_phase_id').notNullable().references('id').inTable('workflow_phases');
    table.date('last_contact_date').nullable();
    table.text('next_action_step').nullable();
    table.text('impact_tier').nullable();
    table.timestamp('archived_at').nullable();
    table.text('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create partner_contacts table
  await knex.schema.createTable('partner_contacts', (table) => {
    table.text('id').primary();
    table.text('partner_id').notNullable().references('id').inTable('partners').onDelete('CASCADE');
    table.text('full_name').notNullable();
    table.text('job_title').nullable();
    table.text('email').nullable();
    table.text('phone').nullable();
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create partner_relationship_notes table
  await knex.schema.createTable('partner_relationship_notes', (table) => {
    table.text('id').primary();
    table.text('partner_id').notNullable().references('id').inTable('partners').onDelete('CASCADE');
    table.text('note_type').notNullable();
    table.text('content').notNullable();
    table.text('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('partner_relationship_notes');
  await knex.schema.dropTable('partner_contacts');
  await knex.schema.dropTable('partners');
  await knex.schema.dropTable('workflow_phases');
};
