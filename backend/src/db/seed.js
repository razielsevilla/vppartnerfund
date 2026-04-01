#!/usr/bin/env node
const path = require('path');
const bcrypt = require('bcryptjs');
const knex = require('knex');
const knexConfig = require(path.join(__dirname, '../../knexfile'));

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];
const db = knex(config);

function defaultTransitionRules() {
  return [
    {
      id: 'rule_lead_to_prospecting',
      from_phase_id: 'phase_lead',
      to_phase_id: 'phase_prospecting',
      requires_last_contact_date: false,
      requires_next_action_step: false,
      is_active: true,
    },
    {
      id: 'rule_prospecting_to_qualification',
      from_phase_id: 'phase_prospecting',
      to_phase_id: 'phase_qualification',
      requires_last_contact_date: true,
      requires_next_action_step: true,
      is_active: true,
    },
    {
      id: 'rule_qualification_to_proposal',
      from_phase_id: 'phase_qualification',
      to_phase_id: 'phase_proposal',
      requires_last_contact_date: false,
      requires_next_action_step: true,
      is_active: true,
    },
    {
      id: 'rule_proposal_to_negotiation',
      from_phase_id: 'phase_proposal',
      to_phase_id: 'phase_negotiation',
      requires_last_contact_date: false,
      requires_next_action_step: true,
      is_active: true,
    },
    {
      id: 'rule_negotiation_to_won',
      from_phase_id: 'phase_negotiation',
      to_phase_id: 'phase_won',
      requires_last_contact_date: false,
      requires_next_action_step: false,
      is_active: true,
    },
    {
      id: 'rule_lead_to_archived',
      from_phase_id: 'phase_lead',
      to_phase_id: 'phase_archived',
      requires_last_contact_date: false,
      requires_next_action_step: false,
      is_active: true,
    },
    {
      id: 'rule_prospecting_to_archived',
      from_phase_id: 'phase_prospecting',
      to_phase_id: 'phase_archived',
      requires_last_contact_date: false,
      requires_next_action_step: false,
      is_active: true,
    },
    {
      id: 'rule_qualification_to_archived',
      from_phase_id: 'phase_qualification',
      to_phase_id: 'phase_archived',
      requires_last_contact_date: false,
      requires_next_action_step: false,
      is_active: true,
    },
    {
      id: 'rule_proposal_to_archived',
      from_phase_id: 'phase_proposal',
      to_phase_id: 'phase_archived',
      requires_last_contact_date: false,
      requires_next_action_step: false,
      is_active: true,
    },
    {
      id: 'rule_negotiation_to_archived',
      from_phase_id: 'phase_negotiation',
      to_phase_id: 'phase_archived',
      requires_last_contact_date: false,
      requires_next_action_step: false,
      is_active: true,
    },
  ];
}

function defaultStageThresholds() {
  return [
    { phase_id: 'phase_lead', stall_threshold_days: 7 },
    { phase_id: 'phase_prospecting', stall_threshold_days: 10 },
    { phase_id: 'phase_qualification', stall_threshold_days: 14 },
    { phase_id: 'phase_proposal', stall_threshold_days: 14 },
    { phase_id: 'phase_negotiation', stall_threshold_days: 21 },
    { phase_id: 'phase_won', stall_threshold_days: 30 },
  ];
}

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

    // Check if users already exist
    const usersCount = await db('users').count('* as count').first();
    if (usersCount.count > 0 || process.env.NODE_ENV === 'production') {
      console.log('✓ Users already seeded (or production mode), skipping');
    } else {
      const rounds = Number(process.env.AUTH_BCRYPT_ROUNDS || 10);
      const adminPassword = process.env.AUTH_ADMIN_PASSWORD || 'changeme';
      const teamPassword = process.env.AUTH_TEAM_PASSWORD || 'changeme';

      const users = [
        {
          id: 'seed-admin-user',
          role_id: 'role_admin',
          full_name: 'VP Partnerships',
          email: process.env.AUTH_ADMIN_EMAIL || 'admin@devconlaguna.internal',
          password_hash: bcrypt.hashSync(adminPassword, rounds),
          is_active: true,
          must_reset_password: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'seed-team-user',
          role_id: 'role_team_member',
          full_name: 'Partnerships Team Member',
          email: process.env.AUTH_TEAM_EMAIL || 'team@devconlaguna.internal',
          password_hash: bcrypt.hashSync(teamPassword, rounds),
          is_active: true,
          must_reset_password: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      await db('users').insert(users);
      console.log('✓ Users seeded');
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

    const rulesCount = await db('workflow_transition_rules').count('* as count').first();
    if (rulesCount.count > 0) {
      console.log('✓ Workflow transition rules already seeded, skipping');
    } else {
      const nowIso = new Date().toISOString();
      const rules = defaultTransitionRules().map((rule) => ({
        ...rule,
        created_at: nowIso,
        updated_at: nowIso,
      }));
      await db('workflow_transition_rules').insert(rules);
      console.log('✓ Workflow transition rules seeded');
    }

    const configCount = await db('workflow_health_config').count('* as count').first();
    if (configCount.count > 0) {
      console.log('✓ Workflow health config already seeded, skipping');
    } else {
      await db('workflow_health_config').insert({
        key: 'overdue_next_action_days',
        value_int: 14,
        updated_at: new Date().toISOString(),
      });
      console.log('✓ Workflow health config seeded');
    }

    const thresholdsCount = await db('workflow_stage_stall_thresholds').count('* as count').first();
    if (thresholdsCount.count > 0) {
      console.log('✓ Stage stall thresholds already seeded, skipping');
    } else {
      const nowIso = new Date().toISOString();
      await db('workflow_stage_stall_thresholds').insert(
        defaultStageThresholds().map((row) => ({ ...row, updated_at: nowIso })),
      );
      console.log('✓ Stage stall thresholds seeded');
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
