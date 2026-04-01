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
    description:
      "Provides software, API, and cloud infrastructure support for projects and hackathons.",
    tiers: {
      standard: "Temporary software licenses/API access for around 15 users.",
      major: "Around 50 users plus cloud credits and certification vouchers.",
      lead: "100+ users, larger cloud value, and expanded permanent license support.",
    },
  },
  "Knowledge Partner": {
    description:
      "Shares industry expertise through speakers, workshop facilitators, and learning modules.",
    tiers: {
      standard: "One speaker and one learning module.",
      major: "Two speakers, multiple modules, and workshop facilitation.",
      lead: "Expanded curriculum support with keynote-level participation.",
    },
  },
  "Mentorship Partner": {
    description:
      "Provides direct technical guidance, code review, and agile mentorship to teams.",
    tiers: {
      standard: "One mentor lane with async feedback and limited live support.",
      major: "More mentors, judge participation, and stronger live guidance.",
      lead: "High mentor capacity and embedded coaching support.",
    },
  },
  "Venue Partner": {
    description:
      "Supplies physical event spaces from planning rooms to large main venues.",
    tiers: {
      standard: "Planning room support for committee operations.",
      major: "Workshop hall and additional event furniture support.",
      lead: "Premium auditorium and broader venue access coverage.",
    },
  },
  "Logistics Partner": {
    description:
      "Covers event operations such as AV setup, connectivity, and transport.",
    tiers: {
      standard: "Core AV sets and basic infrastructure accessories.",
      major: "Additional AV, connectivity resources, and transport support.",
      lead: "Full-stage operations and high-capacity network/transport setup.",
    },
  },
  "F&B Partner": {
    description:
      "Provides food and beverage support for participants, organizers, and speakers.",
    tiers: {
      standard: "Committee refreshments and bottled water coverage.",
      major: "Scaled catering support for event attendees.",
      lead: "Higher-capacity meals plus VIP/speaker dining support.",
    },
  },
  "Swag Partner": {
    description:
      "Provides merch, shirts, giveaways, and recognition items for events.",
    tiers: {
      standard: "Basic merch packs for participants or staff.",
      major: "Higher-volume merch and event shirt support.",
      lead: "Premium giveaways and larger trophy/prize merchandise support.",
    },
  },
  "Media Partner": {
    description:
      "Amplifies event visibility through digital media, coverage, and livestream content.",
    tiers: {
      standard: "Social media blast support.",
      major: "Added media content and photographer support.",
      lead: "Expanded media team support with livestream and aftermovie outputs.",
    },
  },
  "Community Partner": {
    description:
      "Mobilizes communities and teams to join, compete, and collaborate.",
    tiers: {
      standard: "Basic member mobilization and group dissemination.",
      major: "Stronger attendee/team commitments and co-activation support.",
      lead: "Large mobilization channels and major joint community activations.",
    },
  },
  "Ecosystem Partner": {
    description:
      "Connects participants with incubators, leaders, and broader tech ecosystem opportunities.",
    tiers: {
      standard: "Industry introductions and ecosystem access support.",
      major: "Pitch meeting enablement and stronger integration pathways.",
      lead: "Strategic roadmap/advisory-level ecosystem positioning support.",
    },
  },
  "Resource Partner": {
    description:
      "Provides operating support resources to sustain key event and program activities.",
    tiers: {
      standard: "Baseline operational support commitment.",
      major: "Higher-value support scope for operations and collateral needs.",
      lead: "Top-tier operational backbone support and broader funding coverage.",
    },
  },
  "Grant Partner": {
    description:
      "Provides grants, prizes, and launch support for student innovation.",
    tiers: {
      standard: "Micro-grants for project deployment.",
      major: "Expanded prize pools and higher grant support.",
      lead: "Flagship seed funding and internship-backed launch pathways.",
    },
  },
};

export const FUNCTIONAL_BENEFIT_GUIDES: Record<string, { description: string; responsibilities: string[] }> = {
  "Direct Access to Tech Talent": {
    description: "Gives partners direct recruiting access to student developer talent.",
    responsibilities: [
      "Resume database and post-event demographic access.",
      "Recruitment booth support and interview/networking session setup.",
      "Recruitment messaging via event email/community channels.",
      "Job board and landing page visibility support.",
    ],
  },
  "Talent Vetting and Mentorship": {
    description: "Lets partners evaluate talent in action through mentorship and judging.",
    responsibilities: [
      "Code/project review sessions and one-on-one feedback facilitation.",
      "Mentor spotlighting and finalist judging opportunities.",
      "Partner bounty challenge integration.",
      "Post-event mentor-to-talent linkage support.",
    ],
  },
  "Thought Leadership and Speaking Slots": {
    description: "Positions partner experts as thought leaders through speaking and content slots.",
    responsibilities: [
      "Stage time for talks, workshops, panels, or keynote slots.",
      "Curriculum/masterclass branding and co-branded certifications.",
      "VIP access and speaker-lounge privileges.",
      "Co-created content and whitepaper contribution opportunities.",
    ],
  },
  "Targeted Community Exposure and Media Amplification": {
    description: "Boosts partner visibility across physical and digital event channels.",
    responsibilities: [
      "Logo placement across collaterals and platforms.",
      "Dedicated social media features and sponsor shoutouts.",
      "Livestream/video integration support.",
      "Press and media inclusion support.",
    ],
  },
  "User Onboarding and Technical Testing Grounds": {
    description: "Supports product adoption and technical feedback through event integration.",
    responsibilities: [
      "Tool/API adoption in tracks or bounties.",
      "Developer feedback and user data reporting support.",
      "Technical helpdesk/documentation channel support.",
      "Live product demo and beta testing opportunities.",
    ],
  },
  "CSR Fulfillment and Industry-Academe Bridging": {
    description: "Aligns partner CSR goals with education and ecosystem impact initiatives.",
    responsibilities: [
      "CSR impact reporting and ROI visibility support.",
      "Naming-rights and sponsorship recognition options.",
      "Scholarship acknowledgment and impact-track collaboration.",
      "Regional initiative integration opportunities.",
    ],
  },
  "Physical Venue Traffic": {
    description: "Drives attendees and sustained engagement into partner physical locations.",
    responsibilities: [
      "Foot-traffic campaigns and venue promo integrations.",
      "On-site branding, demo, and venue experience mapping support.",
      "Post-event activation and recurring meetup support.",
      "Geo-targeted check-in and signage enablement.",
    ],
  },
  "Policy Implementation and Economic Development Support": {
    description: "Supports policy dialogue and regional ecosystem/economic development objectives.",
    responsibilities: [
      "Panel/whitepaper channels for roadmap and policy discussions.",
      "Aggregated event data sharing for ecosystem insights.",
      "Government/LGU bridging and closed-door roundtable support.",
      "Innovation mapping and policy advocacy presentation slots.",
    ],
  },
  "Up-Skilling Opportunities": {
    description: "Elevates participant skills through certifications, classes, and learning access.",
    responsibilities: [
      "Co-branded certification and credential pathways.",
      "Learning resource distribution and academy access support.",
      "Project incubation consultation and sandbox enablement.",
      "Specialized masterclass and skill-gap reporting support.",
    ],
  },
  "Teacher Empowerment": {
    description: "Equips faculty with modern tools, programs, and industry-aligned resources.",
    responsibilities: [
      "Faculty engagement and advisory collaboration channels.",
      "Train-the-trainer workshops and educator certifications.",
      "Academic resource/license grant support.",
      "Curriculum co-development and faculty innovation funding pathways.",
    ],
  },
};
