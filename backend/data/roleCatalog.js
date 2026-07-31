// Curated catalog of target roles (mirrors frontend/src/data/roleCatalog.js).
// Used by the AI fallback/mock generators so that every supported role gets
// accurate, correctly-labeled content even when the live Gemini call fails,
// instead of silently falling back to a mismatched generic category.

const ROLE_CATALOG = [
  {
    id: "ai-engineer",
    label: "AI Engineer",
    focus: "generative AI systems, LLM integration and applied machine learning",
    skills: ["Python", "Prompt Engineering", "LLM APIs (OpenAI/Gemini)", "Vector Databases", "LangChain", "PyTorch", "MLOps", "REST APIs"]
  },
  {
    id: "ml-engineer",
    label: "Machine Learning Engineer",
    focus: "training, evaluating and deploying machine learning models",
    skills: ["Python", "NumPy/Pandas", "Scikit-learn", "Statistics & Probability", "Deep Learning (PyTorch/TensorFlow)", "Model Deployment", "SQL", "MLOps"]
  },
  {
    id: "frontend-developer",
    label: "Frontend Developer",
    focus: "building fast, accessible, responsive user interfaces",
    skills: ["HTML/CSS", "JavaScript (ES6+)", "React", "TypeScript", "Responsive Design", "State Management", "Testing (Jest/RTL)", "Web Performance"]
  },
  {
    id: "backend-developer",
    label: "Backend Developer",
    focus: "designing scalable APIs, databases and server-side systems",
    skills: ["Node.js & Express", "REST API Design", "SQL/MongoDB", "Authentication & Security", "Caching (Redis)", "Docker", "System Design", "Testing"]
  },
  {
    id: "fullstack-developer",
    label: "Full Stack Developer",
    focus: "end-to-end web application development across frontend and backend",
    skills: ["React", "Node.js & Express", "REST APIs", "MongoDB/SQL", "Authentication", "Git & CI/CD", "System Design", "Docker"]
  },
  {
    id: "data-analyst",
    label: "Data Analyst",
    focus: "extracting insights from data and communicating them to stakeholders",
    skills: ["SQL", "Excel", "Python (Pandas)", "Statistics", "Data Visualization (Tableau/Power BI)", "A/B Testing", "Data Cleaning", "Storytelling with Data"]
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    focus: "statistical modeling, experimentation and predictive analytics",
    skills: ["Python", "Statistics & Probability", "Machine Learning", "SQL", "Data Visualization", "Feature Engineering", "A/B Testing", "Communication"]
  },
  {
    id: "devops-engineer",
    label: "DevOps Engineer",
    focus: "CI/CD pipelines, infrastructure automation and reliability",
    skills: ["Linux", "Docker & Kubernetes", "CI/CD (GitHub Actions/Jenkins)", "AWS/Azure/GCP", "Infrastructure as Code (Terraform)", "Monitoring (Prometheus/Grafana)", "Scripting (Bash/Python)", "Networking Basics"]
  },
  {
    id: "ui-ux-designer",
    label: "UI/UX Designer",
    focus: "user research, interaction design and high-fidelity visual design",
    skills: ["Figma", "User Research", "Wireframing & Prototyping", "Design Systems", "Interaction Design", "Accessibility (WCAG)", "Usability Testing", "Basic HTML/CSS"]
  },
  {
    id: "qa-engineer",
    label: "QA Engineer",
    focus: "manual and automated testing to ensure software quality",
    skills: ["Manual Testing", "Test Case Design", "Selenium/Playwright", "API Testing (Postman)", "Bug Tracking (Jira)", "CI Integration", "SQL", "Performance Testing"]
  },
  {
    id: "cybersecurity-engineer",
    label: "Cybersecurity Engineer",
    focus: "securing systems, identifying vulnerabilities and incident response",
    skills: ["Network Security", "Linux", "Vulnerability Assessment", "SIEM Tools", "Cryptography Basics", "Penetration Testing Fundamentals", "Cloud Security", "Security Compliance"]
  },
  {
    id: "product-manager",
    label: "Product Manager",
    focus: "product strategy, roadmapping and cross-functional execution",
    skills: ["Product Strategy", "User Research", "Roadmapping", "Data-Informed Decisions (SQL/Analytics)", "Agile/Scrum", "Stakeholder Communication", "Wireframing", "Prioritization Frameworks"]
  },
  {
    id: "cloud-engineer",
    label: "Cloud Engineer",
    focus: "designing and managing cloud infrastructure and services",
    skills: ["AWS/Azure/GCP", "Networking", "Infrastructure as Code (Terraform)", "Docker & Kubernetes", "Linux Administration", "CI/CD", "Cloud Security", "Cost Optimization"]
  },
  {
    id: "mobile-developer",
    label: "Mobile App Developer",
    focus: "building native or cross-platform mobile applications",
    skills: ["React Native / Flutter", "JavaScript or Dart", "REST APIs", "Mobile UI Patterns", "App State Management", "Native Device APIs", "App Store Deployment", "Performance Optimization"]
  },
  {
    id: "software-engineer",
    label: "Software Engineer",
    focus: "general-purpose software design, data structures and algorithms",
    skills: ["Data Structures & Algorithms", "Object-Oriented Design", "Git", "System Design", "Testing", "SQL", "REST APIs", "Debugging"]
  }
];

// Best-effort match of a free-text or catalog role name to a known role entry.
// Falls back to a sensible generic "Software Engineer" style profile built
// from the role name itself, so unknown roles still get *something* coherent
// rather than content for the wrong role.
function matchRole(targetRole) {
  const needle = (targetRole || '').trim().toLowerCase();
  if (!needle) return ROLE_CATALOG.find(r => r.id === 'software-engineer');

  // Exact id / label match first
  let found = ROLE_CATALOG.find(r => r.id === needle || r.label.toLowerCase() === needle);
  if (found) return found;

  // Partial / keyword match (handles things like "Senior Backend Developer")
  found = ROLE_CATALOG.find(r => needle.includes(r.label.toLowerCase()) || r.label.toLowerCase().includes(needle));
  if (found) return found;

  // Keyword heuristics for common variants not in the catalog verbatim
  const kw = [
    [['machine learning', 'ml engineer'], 'ml-engineer'],
    [['ai ', 'artificial intelligence', 'genai', 'llm'], 'ai-engineer'],
    [['front end', 'frontend', 'react developer', 'ui developer'], 'frontend-developer'],
    [['back end', 'backend', 'node', 'api developer'], 'backend-developer'],
    [['full stack', 'fullstack', 'mern', 'mean'], 'fullstack-developer'],
    [['data analyst', 'business analyst'], 'data-analyst'],
    [['data scien'], 'data-scientist'],
    [['devops', 'sre', 'site reliability'], 'devops-engineer'],
    [['ui/ux', 'ux design', 'ui design', 'product design'], 'ui-ux-designer'],
    [['qa', 'quality assurance', 'test engineer', 'sdet'], 'qa-engineer'],
    [['security', 'cyber', 'penetration', 'infosec'], 'cybersecurity-engineer'],
    [['product manager', 'product owner'], 'product-manager'],
    [['cloud engineer', 'cloud architect'], 'cloud-engineer'],
    [['mobile', 'android', 'ios developer', 'flutter', 'react native'], 'mobile-developer'],
  ];
  for (const [words, id] of kw) {
    if (words.some(w => needle.includes(w))) {
      const match = ROLE_CATALOG.find(r => r.id === id);
      if (match) return match;
    }
  }

  // Unknown role: synthesize a generic profile using the actual role name so
  // labeling stays correct even though the skill list is generic.
  return {
    id: 'custom',
    label: targetRole,
    focus: 'core responsibilities and tools relevant to the role',
    skills: ['Core Fundamentals', 'Problem Solving', 'Relevant Tools & Frameworks', 'Communication', 'Portfolio Projects', 'Industry Best Practices']
  };
}

module.exports = { ROLE_CATALOG, matchRole };
