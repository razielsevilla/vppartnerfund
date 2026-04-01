exports.up = async (knex) => {
  await knex.schema.createTable("division_groups", (table) => {
    table.text("id").primary();
    table.text("code").notNullable().unique();
    table.text("name").notNullable();
    table.text("target_sector").notNullable();
    table.integer("liaison_min").notNullable().defaultTo(2);
    table.integer("liaison_max").notNullable().defaultTo(3);
    table.integer("compliance_min").notNullable().defaultTo(2);
    table.integer("compliance_max").notNullable().defaultTo(3);
    table.integer("sort_order").notNullable().defaultTo(0);
    table.boolean("is_active").notNullable().defaultTo(true);
    table.text("created_at").notNullable();
    table.text("updated_at").notNullable();
  });

  await knex.schema.createTable("division_members", (table) => {
    table.text("id").primary();
    table.text("group_id").notNullable().references("id").inTable("division_groups").onDelete("CASCADE");
    table.text("full_name").notNullable();
    table.text("officer_type").notNullable();
    table.text("designation").nullable();
    table.text("email").nullable();
    table.text("phone").nullable();
    table.text("status").notNullable().defaultTo("active");
    table.text("notes").nullable();
    table.text("created_by").nullable().references("id").inTable("users");
    table.text("created_at").notNullable();
    table.text("updated_at").notNullable();
  });

  const nowIso = new Date().toISOString();
  await knex("division_groups").insert([
    {
      id: "group_a",
      code: "A",
      name: "Corporate and Industry",
      target_sector: "Tech MNCs, BPOs, SaaS, Telcos",
      liaison_min: 2,
      liaison_max: 3,
      compliance_min: 2,
      compliance_max: 3,
      sort_order: 1,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "group_b",
      code: "B",
      name: "Institutional and Government",
      target_sector: "LGUs, DICT, DOST, Public Agencies",
      liaison_min: 2,
      liaison_max: 3,
      compliance_min: 2,
      compliance_max: 3,
      sort_order: 2,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "group_c",
      code: "C",
      name: "Academe and Community",
      target_sector: "Universities, CS/IT Student Orgs, Local Meetups",
      liaison_min: 2,
      liaison_max: 3,
      compliance_min: 2,
      compliance_max: 3,
      sort_order: 3,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "group_d",
      code: "D",
      name: "Operational and Logistics",
      target_sector: "Venues, Food Vendors, Merch Providers, ISPs",
      liaison_min: 2,
      liaison_max: 3,
      compliance_min: 2,
      compliance_max: 3,
      sort_order: 4,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
  ]);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("division_members");
  await knex.schema.dropTableIfExists("division_groups");
};
