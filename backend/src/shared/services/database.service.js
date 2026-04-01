const knex = require('knex');
const knexConfig = require('../../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

let db = null;

async function initializeDatabase() {
  try {
    if (!db) {
      db = knex(config);
      
      // Run migrations
      await db.migrate.latest();
      
      // Seed initial data if not already present
      const rolesCount = await db('roles').count('* as count').first();
      if (rolesCount.count === 0) {
        await seedRoles();
        await seedWorkflowPhases();
      }

      console.log('Database initialized successfully');
    }
    return db;
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

async function seedRoles() {
  const roles = [
    { id: 'role_admin', code: 'admin', name: 'Administrator' },
    { id: 'role_team_member', code: 'team_member', name: 'Team Member' }
  ];
  
  await db('roles').insert(roles);
  console.log('Roles seeded');
}

async function seedWorkflowPhases() {
  const phases = [
    { id: 'phase_lead', code: 'lead', name: 'Lead', sort_order: 1 },
    { id: 'phase_prospecting', code: 'prospecting', name: 'Prospecting', sort_order: 2 },
    { id: 'phase_qualification', code: 'qualification', name: 'Qualification', sort_order: 3 },
    { id: 'phase_proposal', code: 'proposal', name: 'Proposal', sort_order: 4 },
    { id: 'phase_negotiation', code: 'negotiation', name: 'Negotiation', sort_order: 5 },
    { id: 'phase_won', code: 'won', name: 'Won', sort_order: 6 },
    { id: 'phase_archived', code: 'archived', name: 'Archived', sort_order: 7 }
  ];

  await db('workflow_phases').insert(phases);
  console.log('Workflow phases seeded');
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

async function closeDatabase() {
  if (db) {
    await db.destroy();
    db = null;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};
