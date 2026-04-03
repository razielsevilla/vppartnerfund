export const ROLE_PACKAGE_FUNCTION_OPTIONS = [
  "Technology Partner",
  "Knowledge Partner",
  "Mentorship Partner",
  "Venue Partner",
  "Logistics Partner",
  "F&B Partner",
  "Swag Partner",
  "Media Partner",
  "Community Partner",
  "Ecosystem Partner",
  "Resource Partner",
  "Grant Partner",
];

export const IMPACT_PACKAGE_OPTIONS: Array<"standard" | "major" | "lead"> = [
  "standard",
  "major",
  "lead",
];

export const IMPACT_LABEL: Record<"standard" | "major" | "lead", string> = {
  standard: "Standard",
  major: "Major",
  lead: "Lead",
};

export type BenefitRolePackage = {
  impactLevel: "standard" | "major" | "lead";
};

export type BenefitSelectionLimits = {
  highestImpact: "standard" | "major" | "lead" | null;
  baseCategories: number;
  bonusCategories: number;
  picksPerBaseCategory: number;
  picksPerBonusCategory: number;
  totalCategories: number;
  totalSelections: number;
};

export const getBenefitSelectionLimits = (rolePackages: BenefitRolePackage[]): BenefitSelectionLimits => {
  if (rolePackages.length === 0) {
    return {
      highestImpact: null,
      baseCategories: 0,
      bonusCategories: 0,
      picksPerBaseCategory: 0,
      picksPerBonusCategory: 3,
      totalCategories: 0,
      totalSelections: 0,
    };
  }

  let highestImpact: "standard" | "major" | "lead" = "standard";
  for (const rolePackage of rolePackages) {
    if (rolePackage.impactLevel === "lead") {
      highestImpact = "lead";
      break;
    }

    if (rolePackage.impactLevel === "major") {
      highestImpact = "major";
    }
  }

  const baseConfig = {
    standard: { categories: 1, picks: 3 },
    major: { categories: 2, picks: 4 },
    lead: { categories: 3, picks: 5 },
  }[highestImpact];

  const bonusCategories = Math.floor(rolePackages.length / 3);
  const picksPerBonusCategory = 3;

  return {
    highestImpact,
    baseCategories: baseConfig.categories,
    bonusCategories,
    picksPerBaseCategory: baseConfig.picks,
    picksPerBonusCategory,
    totalCategories: baseConfig.categories + bonusCategories,
    totalSelections: baseConfig.categories * baseConfig.picks + bonusCategories * picksPerBonusCategory,
  };
};

export const DURATION_OPTIONS: Array<{
  value: "event_based" | "project_based" | "term_based";
  label: string;
}> = [
  { value: "event_based", label: "Event-Based (one-time partnership)" },
  { value: "project_based", label: "Project-Based (multiple events/projects)" },
  { value: "term_based", label: "Term-Based (year-long partnership)" },
];

export const ROLE_GUIDES: Record<
  string,
  {
    description: string;
    tiers: { standard: string; major: string; lead: string };
  }
> = {
  "Technology Partner": {
    description: "Provides software, API, and cloud infrastructure support.",
    tiers: {
      standard: "15 users (temporary software licenses / API access)",
      major: "50 users (temporary licenses); 5 technical certification exam vouchers",
      lead: "100+ users (temporary licenses); $2000+ cloud hosting credits for deployments; 20 technical certification exam vouchers; 15 permanent software licenses for core team",
    },
  },
  "Knowledge Partner": {
    description: "Shares industry expertise through speakers and learning modules.",
    tiers: {
      standard: "1 speaker for short Q&A/panel (20 mins); 1 standardized learning module/PDF",
      major: "2 speakers; 3 learning modules; facilitate 1 dedicated technical workshop (90 mins)",
      lead: "3+ speakers; full curriculum; facilitate 2 technical workshops; 1 C-level executive for keynote address",
    },
  },
  "Mentorship Partner": {
    description: "Provides direct technical guidance and mentorship.",
    tiers: {
      standard: "1 hour asynchronous online AMA/written feedback; 1 live event technical mentor (4-hour shift)",
      major: "2 hours asynchronous feedback; 3 live event technical mentors; 2 judges for Demo Day/Pitch Competition",
      lead: "5 hours asynchronous feedback; 5+ live event technical mentors; 3 judges for Demo Day/Pitch Competition; dedicated Scrum Master embedded per team (up to 5 teams)",
    },
  },
  "Venue Partner": {
    description: "Supplies physical event spaces.",
    tiers: {
      standard: "1 meeting room for committee planning (20 pax)",
      major: "2 meeting rooms for committee planning; 1 mid-sized hall for workshops (100 pax); 15 sets of tables and chairs for project showcase",
      lead: "unlimited meeting rooms; 2 mid-sized halls for workshops; 30+ sets of tables and chairs; 1 premium auditorium for main event (200+ pax)",
    },
  },
  "Logistics Partner": {
    description: "Covers event operations and transport.",
    tiers: {
      standard: "2 sets AV equipment (projectors, mics); 5 heavy-duty extension cords; 1 dedicated high-speed internet router; 1 round-trip transport van (15 pax)",
      major: "4 sets AV equipment; 15 heavy-duty extension cords",
      lead: "full stage setup (AV); 30+ heavy-duty extension cords; full venue network connectivity; 2 round-trip transport buses (100 pax)",
    },
  },
  "F&B Partner": {
    description: "Provides food and beverage support.",
    tiers: {
      standard: "coffee/pastries for organizing committee (20 pax); 20 bottled waters for speakers and VIPs",
      major: "coffee/pastries (50 pax); 50 bottled waters; full meal catering for attendees (100 pax)",
      lead: "coffee/pastries (100 pax); 100+ bottled waters; full meal catering for attendees (200 pax); exclusive VIP/speaker networking dinner (20 pax)",
    },
  },
  "Swag Partner": {
    description: "Provides merch and recognition items.",
    tiers: {
      standard: "50 pcs basic merch (stickers, pens, lanyards); 30 event shirts for organizing staff",
      major: "100 pcs basic merch; 50 event shirts; 50 branded attendee tote bags; 3 custom trophies",
      lead: "200+ pcs basic merch; 150+ branded attendee tote bags; 100+ premium tech giveaways and custom trophies",
    },
  },
  "Media Partner": {
    description: "Amplifies event visibility through media coverage.",
    tiers: {
      standard: "2 social media cross-posts/blasts",
      major: "4 social media cross-posts; 1 pre-event feature article; 1 dedicated event photographer",
      lead: "10+ social media cross-posts; 3 pre-event feature articles; full media team; professional live-stream and aftermovie",
    },
  },
  "Community Partner": {
    description: "Mobilizes communities and teams.",
    tiers: {
      standard: "digital flyers shared to 2 internal group chats; 10 guaranteed registered attendees",
      major: "digital flyers shared to 5 internal group chats; 20 guaranteed registered attendees; 2 formed project teams to compete",
      lead: "digital flyers shared to all channels; 50+ guaranteed registered attendees; 5 formed project teams to compete; 1 co-hosted major joint-assembly",
    },
  },
  "Ecosystem Partner": {
    description: "Connects participants with incubators and leaders.",
    tiers: {
      standard: "2 direct email introductions to industry contacts",
      major: "5 direct email introductions; 1 pitch meeting secured with local incubators",
      lead: "10+ direct email introductions; 3 pitch meetings secured; integration into formal regional tech roadmap (1 document); 2 seats secured on local tech advisory boards",
    },
  },
  "Resource Partner": {
    description: "Provides operating support resources.",
    tiers: {
      standard: "primary operational budget funding: ₱5,000 - ₱10,000",
      major: "primary operational budget funding: ₱10,001 - ₱30,000",
      lead: "primary operational budget funding: ₱30,001+",
    },
  },
  "Grant Partner": {
    description: "Provides grants and prize pools.",
    tiers: {
      standard: "₱3,000 micro-grants for student project deployments",
      major: "₱10,000 micro-grants; ₱10,000 secondary cash prize pool (2nd/3rd place)",
      lead: "₱10,000 micro-grants; ₱20,000 secondary cash prize pool; ₱30,000+ grand champion seed funding/prize pool; 2 guaranteed paid internships for winners",
    },
  },
};

export const BASELINE_BENEFIT = {
  name: "Baseline Benefit (Always Included)",
  responsibilities: [
    "Logo Placement: A small logo featured on the official event website and physical tarpaulin.",
    "Social Media Mention: Inclusion in 1 grouped 'Thank You' sponsor post.",
    "Event Access: 1 VIP Access Pass for a company representative.",
    "Official Recognition: A digital and physical Certificate of Partnership.",
  ],
};

export const FUNCTIONAL_BENEFIT_GUIDES: Record<string, { description: string; responsibilities: string[] }> = {
  "Talent & Recruitment": {
    description: "Connects partners with student developer talent through direct recruitment channels.",
    responsibilities: [
      "Resume Database Access: Full access to the opt-in attendee Resume Database and reports.",
      "Direct Recruitment: Facilitate recruitment via physical booth flyers and networking sessions.",
      "Recruitment Mailing: Career opportunities in 1 dedicated pre-event email blast.",
      "Job Board Integration: Post up to 3 job openings across DEVCON's digital channels.",
      "★ Fast-Track Interview Sessions: Arranged specific time slots for on-the-spot interviews.",
    ],
  },
  "Mentorship & Vetting": {
    description: "Evaluates talent through direct technical guidance and project review.",
    responsibilities: [
      "Code & Project Review: Access to final project GitHub repositories and feedback tables.",
      "Expertise Spotlighting: Feature mentors in digital handbook and 2-minute stage slot.",
      "Hackathon Bounty Creation: Integrate partner tech to define a specific bounty challenge.",
      "Post-Event Incubation: Connect mentors with top participants for a post-event Virtual AMA.",
      "★ Right of First Refusal: 30-day exclusive window to negotiate hiring the Grand Champion's team.",
    ],
  },
  "Thought Leadership & Branding": {
    description: "Positions partner experts as leaders through speaking and content slots.",
    responsibilities: [
      "Stage & Speaking Time: Dedicated 5-15 minute stage time for tech talk or panel.",
      "Curriculum Branding: Officially brand learning materials and co-brand certifications.",
      "Content Co-Creation: Publish 1 co-authored technical blog post on DEVCON's platforms.",
      "★ The Keynote Address: 15 to 30-minute prime Keynote slot on the main stage.",
      "★ Title Sponsorship Naming Rights: 'DEVCON Laguna Roadshow, Co-Presented by [Partner].'",
    ],
  },
  "Exposure & Product Testing": {
    description: "Boosts partner visibility and provides developer feedback on tools.",
    responsibilities: [
      "Premium Logo Placement: Medium/Large logos on mid-to-top tier collaterals.",
      "Live Product Demonstrations: Dedicated stage time or booth space for tech demos.",
      "User Data & Feedback Integration: Compiled developer feedback reports from attendees.",
      "Technical Helpdesk Setup: Dedicated Discord channel and physical space for a helpdesk.",
      "★ Closed Beta Testing: Exclusive beta testing sessions with top student developers.",
    ],
  },
  "Civic Alignment & CSR": {
    description: "Aligns partner CSR goals with regional tech and economic development.",
    responsibilities: [
      "ROI & Impact Reporting: Formalized CSR Impact Report for corporate stakeholders.",
      "Community Scholarships: Publicly acknowledge partner and award scholarships live on stage.",
      "Ecosystem Integration: Panel slots to discuss smart city roadmaps with local government VIPs.",
      "Innovation Mapping: Co-author regional tech whitepapers and economic case studies.",
      "★ Policy Advocacy Presentations: Formal platform to present policy recommendations.",
    ],
  },
  "Upskilling & Academe Bridging": {
    description: "Supports faculty and student learning through certifications and resources.",
    responsibilities: [
      "Continuous Learning Access: Distribute resources and 1-month premium academy access.",
      "Skill-Gap Analysis Reports: Detailed reports analyzing technical proficiencies.",
      "Train-the-Trainer Programs: Host technical upskilling workshops for university faculty.",
      "Academic Resource Grants: Outfit university labs with partner tech or software licenses.",
      "★ Advisory Board Seat: Reciprocal Advisory Board seat bridging partner with university deans.",
    ],
  },
};
