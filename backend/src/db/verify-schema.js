#!/usr/bin/env node
const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];
const db = knex(config);

async function verifySchema() {
  try {
    console.log('Verifying database schema...\n');

    // Check if tables exist by running a query on each
    const tables = [
      'roles',
      'users',
      'user_sessions',
      'workflow_phases',
      'workflow_transition_rules',
      'workflow_health_config',
      'workflow_stage_stall_thresholds',
      'partners',
      'partner_qualification_profiles',
      'partner_contacts',
      'partner_relationship_notes',
      'workflow_transitions',
      'activity_logs',
      'tasks',
      'discovery_notes',
    ];

    for (const table of tables) {
      try {
        await db.raw(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✓ ${table} exists`);
      } catch (err) {
        console.log(`✗ ${table} does not exist: ${err.message}`);
      }
    }

    // Check seeded data
    const rolesCount = await db('roles').count('* as count').first();
    console.log(`\n✓ Roles table has ${rolesCount.count} rows`);

    const phasesCount = await db('workflow_phases').count('* as count').first();
    console.log(`✓ Workflow phases table has ${phasesCount.count} rows`);

    const phases = await db('workflow_phases').select('code', 'name', 'sort_order');
    console.log('\nWorkflow phases:');
    phases.forEach((p) => {
      console.log(`  - ${p.code}: ${p.name} (order: ${p.sort_order})`);
    });

  } catch (err) {
    console.error('Schema verification failed:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

verifySchema();
