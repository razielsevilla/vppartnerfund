#!/usr/bin/env node
const path = require('path');
const knex = require('knex');
const knexConfig = require(path.join(__dirname, '../../knexfile'));

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];
const db = knex(config);

async function seed() {
  try {
    // Check if roles already exist
    const rolesCount = await db('roles').count('* as count').first();
    if (rolesCount.count > 0) {
      console.log('✓ Roles already seeded, skipping');
    } else {
      const roles = [
        { id: 'role_admin', code: 'admin', name: 'Administrator' },
        { id: 'role_team_member', code: 'team_member', name: 'Team Member' }
      ];
      await db('roles').insert(roles);
      console.log('✓ Roles seeded');
    }

    // Check if workflow phases already exist
    const phasesCount = await db('workflow_phases').count('* as count').first();
    if (phasesCount.count > 0) {
      console.log('✓ Workflow phases already seeded, skipping');
    } else {
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
      console.log('✓ Workflow phases seeded');
    }

    console.log('✓ Seeding completed');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seed();
