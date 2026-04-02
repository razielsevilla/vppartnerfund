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
    description: "Provides software, API, and cloud infrastructure support.",
    tiers: {
      standard: "15 Users (Temp License)",
      major: "50 Users & 5 Exam Vouchers",
      lead: "100+ Users, $2000+ Cloud Credits, 20 Vouchers, 15 Permanent Licenses",
    },
  },
  "Knowledge Partner": {
    description: "Shares industry expertise through speakers and learning modules.",
    tiers: {
      standard: "1 Speaker (20 mins) & 1 Learning Module",
      major: "2 Speakers, 3 Modules, & 1 Technical Workshop (90 mins)",
      lead: "3+ Speakers, Full Curriculum, 2 Workshops, & 1 C-Level Keynote",
    },
  },
  "Mentorship Partner": {
    description: "Provides direct technical guidance and mentorship.",
    tiers: {
      standard: "1 Hr Async Feedback & 1 Live Mentor",
      major: "2 Hrs Async, 3 Live Mentors, & 2 Judges",
      lead: "5 Hrs Async, 5+ Live Mentors, 3 Judges, & Dedicated Scrum Masters for up to 5 teams",
    },
  },
  "Venue Partner": {
    description: "Supplies physical event spaces.",
    tiers: {
      standard: "1 Committee Room (20 Pax)",
      major: "2 Rooms, 1 Workshop Hall (100 Pax), & 15 Showcase Tables",
      lead: "Unlimited Rooms, 2 Halls, 30+ Tables, & Premium Main Auditorium (200+ Pax)",
    },
  },
  "Logistics Partner": {
    description: "Covers event operations and transport.",
    tiers: {
      standard: "2 AV Sets, 5 Ext. Cords, 1 Dedicated Router, 1 Transport Van (15 Pax)",
      major: "4 AV Sets & 15 Ext. Cords",
      lead: "Full Stage Setup, 30+ Ext. Cords, Full Venue Network, & 2 Transport Buses (100 Pax)",
    },
  },
  "F&B Partner": {
    description: "Provides food and beverage support.",
    tiers: {
      standard: "Coffee/Pastries (20 Pax) & 20 VIP Waters",
      major: "Coffee (50 Pax), 50 Waters, & Full Meal (100 Pax)",
      lead: "Coffee (100 Pax), 100+ Waters, Full Meal (200 Pax), & Exclusive VIP Dinner (20 Pax)",
    },
  },
  "Swag Partner": {
    description: "Provides merch and recognition items.",
    tiers: {
      standard: "50 Basic Merch Pcs & 30 Staff Shirts",
      major: "100 Basic Merch, 50 Shirts, 50 Tote Bags, & 3 Custom Trophies",
      lead: "200+ Basic Merch, 150+ Tote Bags, & 100+ Premium Tech Giveaways",
    },
  },
  "Media Partner": {
    description: "Amplifies event visibility through media coverage.",
    tiers: {
      standard: "2 Social Cross-posts",
      major: "4 Posts, 1 Feature Article, & 1 Photographer",
      lead: "10+ Posts, 3 Articles, Full Media Team, Live-stream, & Aftermovie",
    },
  },
  "Community Partner": {
    description: "Mobilizes communities and teams.",
    tiers: {
      standard: "Flyers in 2 Groups & 10 Guaranteed Attendees",
      major: "Flyers in 5 Groups, 20 Attendees, & 2 Competing Teams",
      lead: "Flyers in All Channels, 50+ Attendees, 5 Teams, & 1 Co-hosted Joint-Assembly",
    },
  },
  "Ecosystem Partner": {
    description: "Connects participants with incubators and leaders.",
    tiers: {
      standard: "2 Direct Industry Intros",
      major: "5 Intros & 1 Pitch Meeting with Incubators",
      lead: "10+ Intros, 3 Pitch Meetings, 1 Tech Roadmap Integration, & 2 Advisory Board Seats",
    },
  },
  "Resource Partner": {
    description: "Provides operating support resources.",
    tiers: {
      standard: "₱5,000 - ₱10,000 Funding",
      major: "₱10,001 - ₱30,000 Funding",
      lead: "₱30,001+ Funding",
    },
  },
  "Grant Partner": {
    description: "Provides grants and prize pools.",
    tiers: {
      standard: "₱3,000 Micro-grant",
      major: "₱10,000 Micro-grant & ₱10,000 Secondary Prize Pool",
      lead: "₱10,000 Micro-grant, ₱20,000 Secondary Prize, ₱30,000+ Grand Champion Seed Funding, & 2 Guaranteed Paid Internships",
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
