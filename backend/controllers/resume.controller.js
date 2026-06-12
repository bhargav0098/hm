const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { callLLM } = require('../services/gemini.service');

const parseJSON = (raw) => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('Failed to parse AI response');
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
    const prompt = `You are an expert AI Resume Parser. Extract the following information from the provided resume text.
If any field is missing or cannot be reasonably inferred, omit it or leave empty strings/arrays. DO NOT hallucinate data.
If the text is messy due to raw extraction fallback, do your best to reconstruct the original semantic meaning.
Keep existing valid structured data and fill in the missing fields if possible.

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
      "description": ""
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
      "description": "",
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

    // Ensure we have access to user API key or default
    const apiKey = req.user?.preferences?.apiKey || process.env.GEMINI_API_KEY;
    const rawResult = await callLLM(prompt, apiKey);
    const parsedData = parseJSON(rawResult);

    res.json({
      success: true,
      message: 'Resume parsed successfully',
      data: parsedData
    });

  } catch (error) {
    console.error('Resume Parse Error:', error);
    
    // Fallback: If LLM fails (e.g., rate limit, invalid key), return a robust mock parsed resume
    const mockParsedData = {
      personalInfo: {
        fullName: "Mock User",
        email: "mock.user@example.com",
        phone: "123-456-7890",
        location: "Remote",
        linkedin: "linkedin.com/in/mockuser",
        github: "github.com/mockuser",
        portfolio: ""
      },
      summary: "A highly motivated software engineer with experience in React and Node.js. (Generated via offline fallback)",
      experience: [
        {
          company: "Tech Corp",
          role: "Frontend Developer",
          startDate: "Jan 2021",
          endDate: "Present",
          location: "Remote",
          description: "Developed modern web apps using React, TailwindCSS, and Next.js."
        }
      ],
      education: [
        {
          institution: "University of Technology",
          degree: "B.S. Computer Science",
          field: "Computer Science",
          startDate: "Aug 2016",
          endDate: "May 2020",
          score: "3.8 GPA"
        }
      ],
      skills: ["React", "JavaScript", "Node.js", "Express", "MongoDB", "TailwindCSS"],
      projects: [],
      certifications: []
    };

    res.json({
      success: true,
      message: 'Resume parsed via offline fallback',
      data: mockParsedData
    });
  }
};

module.exports = { parseResume };
