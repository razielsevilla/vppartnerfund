exports.up = async (knex) => {
  // Create roles lookup table
  await knex.schema.createTable('roles', (table) => {
    table.text('id').primary();
    table.text('code').unique().notNullable();
    table.text('name').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.text('id').primary();
    table.text('role_id').notNullable().references('id').inTable('roles');
    table.text('full_name').notNullable();
    table.text('email').unique().notNullable();
    table.text('password_hash').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('must_reset_password').notNullable().defaultTo(false);
    table.timestamp('last_login_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create user_sessions table
  await knex.schema.createTable('user_sessions', (table) => {
    table.text('id').primary();
    table.text('user_id').notNullable().references('id').inTable('users');
    table.text('session_token_hash').notNullable();
    table.text('ip_address').nullable();
    table.text('user_agent').nullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('revoked_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('user_sessions');
  await knex.schema.dropTable('users');
  await knex.schema.dropTable('roles');
};
