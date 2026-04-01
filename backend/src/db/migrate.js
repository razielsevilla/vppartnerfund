#!/usr/bin/env node
const path = require('path');
const knex = require('knex');
const knexConfig = require(path.join(__dirname, '../../knexfile'));

const command = process.argv[2];
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];
const db = knex(config);

async function run() {
  try {
    switch (command) {
      case 'latest':
        await db.migrate.latest();
        console.log('✓ Migrations completed');
        break;
      case 'rollback':
        await db.migrate.rollback();
        console.log('✓ Migrations rolled back');
        break;
      case 'reset':
        await db.migrate.rollback();
        await db.migrate.latest();
        console.log('✓ Database reset and migrations reapplied');
        break;
      default:
        console.log('Usage: node migrate.js [latest|rollback|reset]');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

run();
