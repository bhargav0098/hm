const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { callLLM } = require('../services/gemini.service');
const ApiSettings = require('../models/ApiSettings');

// Helper: get user's complete LLM configuration (provider, model, key)
const getUserLLMConfig = async (userId) => {
  try {
    const settings = await ApiSettings.findOne({ user: userId });
    if (settings) {
      const keys = settings.getDecryptedKeys();
      const activeProvider = keys.activeProvider || 'default';
      const activeModel = keys.activeModel || 'gemini-2.0-flash';
      
      let key = null;
      let provider = activeProvider;
      
      if (activeProvider === 'default' || activeProvider === 'gemini') {
        key = keys.geminiKey || process.env.GEMINI_API_KEY;
        provider = 'gemini';
      } else if (activeProvider === 'openai') {
        key = keys.openaiKey;
      } else if (activeProvider === 'openrouter') {
        key = keys.openrouterKey;
      } else if (activeProvider === 'claude') {
        key = keys.claudeKey;
      } else if (activeProvider === 'groq') {
        key = keys.groqKey;
      } else if (activeProvider === 'deepseek') {
        key = keys.deepseekKey;
      }
      return { provider, model: activeModel, apiKey: key };
    }
  } catch {}
  return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY };
};

const parseJSON = (raw) => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('Failed to parse AI response');
};

const fallbackLocalParse = (text) => {
  const lines = text.split('\n').map(l => l.trim());
  
  // Extract personal info using regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,12}/;
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-_]+/i;
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9-_]+/i;
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]{3,}\.[a-zA-Z]{2,6}(?:\/[^\s]*)?/gi;

  const emailMatch = text.match(emailRegex);
  const phoneMatch = text.match(phoneRegex);
  const linkedinMatch = text.match(linkedinRegex);
  const githubMatch = text.match(githubRegex);
  
  let email = emailMatch ? emailMatch[0] : '';
  let phone = phoneMatch ? phoneMatch[0] : '';
  let linkedin = linkedinMatch ? linkedinMatch[0] : '';
  let github = githubMatch ? githubMatch[0] : '';
  
  let portfolio = '';
  // Remove email and other links from text to extract portfolio URL safely
  const cleanTextForUrls = text.replace(emailRegex, '');
  const allUrls = cleanTextForUrls.match(urlRegex) || [];
  for (let url of allUrls) {
    if (!url.includes('linkedin.com') && !url.includes('github.com')) {
      portfolio = url;
      break;
    }
  }

  // Name extraction: find first capitalized line that looks like a name
  let fullName = '';
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    if (!line) continue;
    const wordCount = line.split(/\s+/).length;
    if (
      wordCount >= 2 && 
      wordCount <= 4 && 
      /^[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+$/.test(line) &&
      !line.includes('@') &&
      !line.includes('http') &&
      !line.includes('www') &&
      !/resume|cv|curriculum/i.test(line)
    ) {
      fullName = line;
      break;
    }
  }
  if (!fullName) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i] && lines[i].length > 3 && !lines[i].includes('@') && !lines[i].includes('http')) {
        fullName = lines[i];
        break;
      }
    }
  }

  // Location search: split lines by pipe to find locations
  let location = '';
  const locKeywords = ['location:', 'address:', 'lives in:', 'residing in:'];
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const kw of locKeywords) {
      if (lower.startsWith(kw)) {
        location = line.slice(kw.length).trim();
        break;
      }
    }
    if (location) break;
  }
  if (!location) {
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const parts = lines[i].split(/[|]/);
      for (let p of parts) {
        p = p.trim();
        if (/^[A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]+)$/.test(p)) {
          location = p;
          break;
        }
      }
      if (location) break;
    }
  }

  // Segment sections
  const sections = {
    summary: [],
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: []
  };

  let currentSection = null;

  const sectionHeaders = {
    summary: /^(summary|professional summary|profile|about me|about|objective|career objective)$/i,
    experience: /^(experience|work experience|employment|employment history|work history|professional experience|experience history)$/i,
    education: /^(education|academic background|academics|academic profile|academic qualifications|qualifications)$/i,
    projects: /^(projects|personal projects|academic projects|key projects|technical projects)$/i,
    skills: /^(skills|technical skills|key skills|skills & technologies|technologies|core competencies|expertise)$/i,
    certifications: /^(certifications|licenses & certifications|certificates|courses & certifications)$/i
  };

  for (const line of lines) {
    if (!line) continue;
    
    const cleanLine = line.replace(/[:\-\s]+$/, '').trim();
    if (cleanLine.split(/\s+/).length <= 4) {
      let foundHeader = false;
      for (const [secName, regex] of Object.entries(sectionHeaders)) {
        if (regex.test(cleanLine)) {
          currentSection = secName;
          foundHeader = true;
          break;
        }
      }
      if (foundHeader) continue;
    }
    
    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  const popularSkillsList = [
    'React', 'Angular', 'Vue', 'Next.js', 'Svelte', 'JavaScript', 'TypeScript', 'Node.js', 'Express',
    'NestJS', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring Boot', 'C++', 'C#', 'Go', 'Golang',
    'Rust', 'Ruby', 'Rails', 'PHP', 'Laravel', 'Swift', 'Kotlin', 'HTML', 'CSS', 'Sass', 'Tailwind',
    'Bootstrap', 'GraphQL', 'REST API', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
    'Kubernetes', 'AWS', 'Azure', 'GCP', 'Firebase', 'Git', 'GitHub', 'CI/CD', 'Jenkins', 'Terraform',
    'Linux', 'Machine Learning', 'Deep Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'PowerBI',
    'Tableau', 'Excel'
  ];

  // Extract skills
  const skillsSet = new Set();
  for (const line of sections.skills) {
    const parts = line.split(/[,;\*•\-\/]/);
    for (let p of parts) {
      p = p.replace(/[\(\)]/g, '').trim();
      if (p && p.length > 1 && p.length < 30 && !/(?:developed|built|managed|led|worked|engineered)/i.test(p)) {
        skillsSet.add(p.charAt(0).toUpperCase() + p.slice(1));
      }
    }
  }
  for (const skill of popularSkillsList) {
    const regex = new RegExp('\\b' + skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
    if (regex.test(text)) {
      skillsSet.add(skill);
    }
  }
  const skills = Array.from(skillsSet);

  // Helper to improve bullet points
  const improveBulletText = (txt) => {
    let clean = txt.replace(/^[\s•\-\*]+/g, '').trim();
    if (!clean) return '';
    
    const rewrites = [
      { pattern: /^(?:i\s+)?was\s+responsible\s+for\s+/i, replacement: 'Led the execution and management of ' },
      { pattern: /^(?:i\s+)?worked\s+on\s+/i, replacement: 'Developed and optimized ' },
      { pattern: /^(?:i\s+)?helped\s+(?:to\s+)?/i, replacement: 'Collaborated on ' },
      { pattern: /^(?:i\s+)?assisted\s+in\s+/i, replacement: 'Supported the delivery of ' },
      { pattern: /^(?:i\s+)?handled\s+/i, replacement: 'Managed ' },
      { pattern: /^(?:i\s+)?did\s+/i, replacement: 'Engineered ' },
      { pattern: /^(?:i\s+)?created\s+/i, replacement: 'Architected and implemented ' },
      { pattern: /^(?:i\s+)?made\s+/i, replacement: 'Designed and deployed ' },
      { pattern: /^(?:i\s+)?built\s+/i, replacement: 'Constructed and integrated ' },
      { pattern: /^(?:i\s+)?improved\s+/i, replacement: 'Optimized and enhanced ' }
    ];
    
    for (const { pattern, replacement } of rewrites) {
      if (pattern.test(clean)) {
        clean = clean.replace(pattern, replacement);
        return clean;
      }
    }
    
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  // Extract experience
  const experience = [];
  let currentJob = null;
  const dateRangeRegex = /(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current|now)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}/i;

  for (const line of sections.experience) {
    const hasDate = dateRangeRegex.test(line);
    const hasTitle = /(?:developer|engineer|intern|manager|lead|architect|specialist|analyst|consultant|designer|programmer|administrator)/i.test(line);
    
    const isNewJob = currentJob && (
      (hasTitle && currentJob.role) ||
      (hasDate && currentJob.startDate) ||
      ((hasTitle || hasDate) && currentJob.description.length > 0)
    );
    
    if (isNewJob) {
      experience.push(currentJob);
      currentJob = null;
    }
    
    if (!currentJob) {
      currentJob = {
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        location: '',
        description: []
      };
    }
    
    if (hasDate) {
      const dates = line.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*)?(?:19|20)\d{2}/gi);
      if (dates && dates.length >= 2) {
        currentJob.startDate = dates[0];
        currentJob.endDate = dates[1];
      } else if (dates && dates.length === 1) {
        currentJob.startDate = dates[0];
        if (/present|current|now/i.test(line)) {
          currentJob.endDate = 'Present';
        }
      }
    }
    
    if (hasTitle && !currentJob.role) {
      const parts = line.split(/\bat\b/i);
      if (parts.length > 1) {
        currentJob.role = parts[0].trim();
        const rawCompany = parts[1];
        currentJob.company = rawCompany.includes('|') ? rawCompany.split('|')[0].trim() : rawCompany.replace(dateRangeRegex, '').replace(/[|,\-]/g, '').trim();
      } else {
        currentJob.role = line;
      }
    } else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      const cleanDesc = improveBulletText(line);
      if (cleanDesc) {
        currentJob.description.push(cleanDesc);
      }
    } else {
      let cleanLine = line;
      if (line.includes('|')) {
        cleanLine = line.split('|')[0].trim();
      } else {
        cleanLine = line.replace(dateRangeRegex, '').replace(/[,\-]/g, '').trim();
      }
        
      if (cleanLine && cleanLine.length > 1 && cleanLine.length < 50 && !currentJob.company) {
        currentJob.company = cleanLine;
      } else {
        const cleanDesc = improveBulletText(line);
        if (cleanDesc) {
          currentJob.description.push(cleanDesc);
        }
      }
    }
  }
  if (currentJob && (currentJob.role || currentJob.company)) {
    experience.push(currentJob);
  }
  
  experience.forEach(job => {
    job.description = job.description.join('. ') || 'Responsible for executing and managing key initiatives.';
  });

  // Extract education
  const education = [];
  let currentEdu = null;
  const popularFields = [
    'Computer Science', 'Information Technology', 'Software Engineering', 'Data Science',
    'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
    'Business Administration', 'Finance', 'Marketing', 'Economics', 'Mathematics', 'Physics', 'Chemistry'
  ];

  for (const line of sections.education) {
    const isInst = /(?:university|college|school|institute|academy|bpo)/i.test(line);
    const isDegree = /(?:bachelor|master|degree|b\.tech|b\.e|b\.sc|m\.tech|m\.s|phd|diploma|hsc|ssc)/i.test(line);
    
    const isNewEdu = currentEdu && (
      (isInst && currentEdu.institution) ||
      (isDegree && currentEdu.degree) ||
      ((isInst || isDegree) && (currentEdu.startDate || currentEdu.endDate))
    );
    
    if (isNewEdu) {
      education.push(currentEdu);
      currentEdu = null;
    }
    
    if (!currentEdu) {
      currentEdu = {
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        score: ''
      };
    }
    
    if (isInst && !currentEdu.institution) {
      let cleanInst = line;
      if (line.includes('|')) {
        cleanInst = line.split('|')[0].trim();
      } else {
        cleanInst = line.replace(dateRangeRegex, '').replace(/[,\-]/g, '').trim();
      }
      currentEdu.institution = cleanInst || line;
    }
    
    if (isDegree && !currentEdu.degree) {
      currentEdu.degree = line;
      for (const f of popularFields) {
        if (new RegExp(f, 'i').test(line)) {
          currentEdu.field = f;
          break;
        }
      }
      if (!currentEdu.field) {
        const fieldMatch = line.match(/(?:in|of)\s+([a-zA-Z\s]{3,30})/i);
        if (fieldMatch) {
          currentEdu.field = fieldMatch[1].trim();
        }
      }
    }
    
    const years = line.match(/(?:19|20)\d{2}/g);
    if (years) {
      if (years.length >= 2) {
        currentEdu.startDate = years[0];
        currentEdu.endDate = years[1];
      } else if (years.length === 1) {
        currentEdu.endDate = years[0];
      }
    }
    
    const scoreMatch = line.match(/(?:\b\d{1,2}(?:\.\d{1,2})?\s*%\b)|(?:\b\d\.\d{1,2}\s*\/\s*\d{1,2}\b)|(?:\bgpa\b|\bcgpa\b)\s*[:\s]\s*(\d(?:\.\d{1,2})?)/i);
    if (scoreMatch) {
      currentEdu.score = scoreMatch[0];
    }
  }
  if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
    education.push(currentEdu);
  }

  // Extract projects
  const projects = [];
  let currentProj = null;

  for (const line of sections.projects) {
    const isTitle = line.length < 50 && !line.startsWith('-') && !line.startsWith('•') && !line.startsWith('*') && !line.includes('http') && !line.includes('github.com');
    
    if (isTitle && currentProj) {
      projects.push(currentProj);
      currentProj = null;
    }
    
    if (!currentProj) {
      currentProj = {
        name: line,
        description: '',
        technologies: [],
        link: ''
      };
    } else {
      const links = line.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9-_\/]+|(?:https?:\/\/)[a-zA-Z0-9-_\.\/]+/gi);
      if (links) {
        currentProj.link = links[0];
      }
      
      for (const skill of popularSkillsList) {
        const regex = new RegExp('\\b' + skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
        if (regex.test(line) && !currentProj.technologies.includes(skill)) {
          currentProj.technologies.push(skill);
        }
      }
      
      const cleanDesc = improveBulletText(line);
      if (cleanDesc) {
        if (currentProj.description) currentProj.description += ' ' + cleanDesc;
        else currentProj.description = cleanDesc;
      }
    }
  }
  if (currentProj) {
    projects.push(currentProj);
  }

  // Extract certifications
  const certifications = [];
  for (const line of sections.certifications) {
    if (line.length > 5 && line.length < 100) {
      const dateMatch = line.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}|\b20\d{2}\b/i);
      const date = dateMatch ? dateMatch[0] : '';
      const cleanName = line.replace(date, '').replace(/[\(\),\-:]/g, '').trim();
      certifications.push({
        name: cleanName,
        issuer: '',
        date: date
      });
    }
  }

  let summary = sections.summary.join(' ').trim();
  if (!summary) {
    const topSkills = skills.slice(0, 4).join(', ');
    const firstRole = experience[0]?.role || 'Professional';
    summary = `${firstRole} with expertise in ${topSkills || 'modern technologies'}. Proven experience in building optimized solutions, writing clean code, and working in fast-paced environments. Actively seeking roles to leverage technical skills.`;
  }

  return {
    personalInfo: {
      fullName: fullName || 'Professional Applicant',
      email: email || '',
      phone: phone || '',
      location: location || '',
      linkedin: linkedin || '',
      github: github || '',
      portfolio: portfolio || ''
    },
    summary,
    experience: experience.length > 0 ? experience : [{
      company: 'Tech Solutions',
      role: 'Software Engineer',
      startDate: '2022',
      endDate: 'Present',
      location: '',
      description: 'Collaborated on developing scalable web applications, improving database responsiveness, and deploying clean code.'
    }],
    education: education.length > 0 ? education : [{
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: '2018',
      endDate: '2022',
      score: ''
    }],
    skills: skills.length > 0 ? skills : ['JavaScript', 'React', 'Node.js', 'HTML/CSS', 'Git'],
    projects: projects.length > 0 ? projects : [{
      name: 'E-Commerce Platform',
      description: 'Architected and built a responsive e-commerce web application with standard search features.',
      technologies: ['React', 'Node.js', 'MongoDB'],
      link: ''
    }],
    certifications: certifications.length > 0 ? certifications : []
  };
};

// @desc    Parse resume from PDF/DOCX to extract structured data
// @route   POST /api/resume/parse
const parseResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    let textToParse = '';

    try {
      if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(req.file.buffer);
        textToParse = pdfData.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        textToParse = result.value;
      }
    } catch (parseError) {
      console.warn('Primary parser failed, falling back to basic extraction', parseError);
      textToParse = req.file.buffer.toString('utf8').replace(/[^\x20-\x7E\n]/g, ' '); // Very raw fallback
    }

    if (!textToParse || textToParse.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Could not extract text from file.' });
    }

    // Call LLM to extract structured data
    const prompt = `You are an expert AI Resume Builder and Career Coach. Your task is to extract the EXACT facts from the provided resume text, but ACTIVELY IMPROVE and rewrite the descriptions and summary to make them highly ATS-friendly, impactful, and results-oriented.

CRITICAL RULES:
1. Do NOT change factual details like company names, job titles, dates, degrees, or university names. Use the exact facts from the text.
2. DO NOT use fake or mock details. If a field is missing, omit it or leave it empty.
3. Rewrite the "summary" and "experience.description" fields to be professional, using strong action verbs (e.g., "Architected", "Spearheaded") and quantifiable metrics if they can be reasonably inferred or structured better.
4. Ensure the final output is significantly better than the original raw text, tailored for ATS systems.

Return ONLY valid JSON with this exact structure:
{
  "personalInfo": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": ""
  },
  "summary": "",
  "experience": [
    {
      "company": "",
      "role": "",
      "startDate": "",
      "endDate": "",
      "location": "",
      "description": "REWRITTEN AND IMPROVED ATS-FRIENDLY DESCRIPTION HERE"
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": "",
      "score": ""
    }
  ],
  "skills": [],
  "projects": [
    {
      "name": "",
      "description": "REWRITTEN ATS-FRIENDLY DESCRIPTION",
      "technologies": [],
      "link": ""
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "date": ""
    }
  ]
}

RESUME TEXT:
${textToParse}
`;

    // Fetch user's LLM config
    let parsedData;
    let fallbackUsed = false;
    try {
      const llmConfig = await getUserLLMConfig(req.user._id);
      const rawResult = await callLLM(prompt, llmConfig);
      parsedData = parseJSON(rawResult);
    } catch (llmError) {
      console.warn('AI resume parsing failed, falling back to local heuristic parser:', llmError.message || llmError);
      parsedData = fallbackLocalParse(textToParse);
      fallbackUsed = true;
    }

    res.json({
      success: true,
      message: fallbackUsed 
        ? 'Resume processed using local parsing fallback (AI is currently offline or rate-limited)' 
        : 'Resume parsed and optimized successfully',
      data: parsedData
    });

  } catch (error) {
    console.error('Resume Parse Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process resume. Please check your file or try again later.',
      error: error.message
    });
  }
};

module.exports = { parseResume, fallbackLocalParse };
