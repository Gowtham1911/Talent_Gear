import OpenAI from "openai";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "your_openai_api_key_here") throw new Error("OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey: key });
}

export interface ParsedResume {
  name: string; email: string; phone: string; skills: string[];
  experience: { company: string; role: string; duration: string }[];
  education: { degree: string; institution: string; year: string }[];
  summary: string; match_score: number; match_reasons: string[];
}

// ── Local keyword-based ATS parser (works without any API key) ──────────────
function localParseResume(resumeText: string, jobTitle: string, jobRequirements: string): ParsedResume {
  const text = resumeText.toLowerCase();
  const lines = resumeText.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Extract name — first non-empty line that looks like a name
  const nameLine = lines.find(l => /^[a-z][a-z .'-]{3,40}$/i.test(l) && !l.includes("@") && !l.match(/\d{5}/));
  const name = nameLine || "Candidate";

  // Extract email
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "";

  // Extract phone
  const phoneMatch = resumeText.match(/(\+91[\s-]?)?[6-9]\d{9}|(\+?\d[\s-]?){10,13}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  // Extract skills — common tech keywords found in resume
  const allSkills = [
    "javascript","typescript","python","java","c++","c#","go","rust","php","ruby","swift","kotlin",
    "react","nextjs","next.js","angular","vue","svelte","nodejs","node.js","express","fastapi","django","flask","spring","laravel",
    "mysql","postgresql","mongodb","redis","sqlite","oracle","dynamodb",
    "aws","azure","gcp","docker","kubernetes","terraform","jenkins","github actions","ci/cd",
    "git","linux","rest","graphql","grpc","microservices","html","css","tailwind","bootstrap",
    "machine learning","deep learning","tensorflow","pytorch","pandas","numpy","scikit-learn",
    "data structures","algorithms","system design","agile","scrum","jira",
  ];
  const foundSkills = allSkills.filter(s => text.includes(s));

  // ATS scoring — keyword match between resume and job requirements
  const reqWords = jobRequirements.toLowerCase()
    .split(/[\s,;.\n]+/)
    .filter(w => w.length > 3)
    .map(w => w.replace(/[^a-z0-9+#.]/g, ""));

  const uniqueReqWords = [...new Set(reqWords)];
  const matchedWords = uniqueReqWords.filter(w => text.includes(w));
  const keywordScore = uniqueReqWords.length > 0
    ? Math.round((matchedWords.length / uniqueReqWords.length) * 100)
    : 50;

  // Bonus points
  let bonus = 0;
  if (foundSkills.length >= 5) bonus += 10;
  if (foundSkills.length >= 10) bonus += 10;
  if (text.includes("experience") || text.includes("worked") || text.includes("developed")) bonus += 5;
  if (text.includes("degree") || text.includes("b.tech") || text.includes("b.e") || text.includes("bachelor") || text.includes("master")) bonus += 5;
  if (text.includes(jobTitle.toLowerCase().split(" ")[0])) bonus += 10;

  const match_score = Math.min(100, Math.max(10, keywordScore + bonus));

  const match_reasons: string[] = [];
  if (matchedWords.length > 0) match_reasons.push(`Matched ${matchedWords.length} of ${uniqueReqWords.length} required keywords`);
  if (foundSkills.length > 0) match_reasons.push(`Found ${foundSkills.length} relevant skills: ${foundSkills.slice(0, 5).join(", ")}`);
  if (match_score >= 70) match_reasons.push("Resume meets the minimum ATS threshold");
  else match_reasons.push("Resume does not meet the minimum ATS threshold of 70%");

  console.log(`[ATS Local] Score: ${match_score} | Keywords matched: ${matchedWords.length}/${uniqueReqWords.length} | Skills: ${foundSkills.length}`);

  return { name, email, phone, skills: foundSkills, experience: [], education: [], summary: "", match_score, match_reasons };
}

export async function parseResumeAgainstJob(
  resumeText: string, jobTitle: string, jobDescription: string, jobRequirements: string
): Promise<ParsedResume> {
  const key = process.env.OPENAI_API_KEY;

  // Use OpenAI if key is configured
  if (key && key !== "your_openai_api_key_here") {
    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert AI recruiter. Parse the resume and score it against the job posting. Return ONLY valid JSON." },
          { role: "user", content: `Job Title: ${jobTitle}\nJob Description: ${jobDescription}\nRequirements: ${jobRequirements}\n\nResume:\n${resumeText}\n\nReturn JSON:\n{\n  "name": "",\n  "email": "",\n  "phone": "",\n  "skills": [],\n  "experience": [{"company": "", "role": "", "duration": ""}],\n  "education": [{"degree": "", "institution": "", "year": ""}],\n  "summary": "",\n  "match_score": 0-100,\n  "match_reasons": []\n}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      return JSON.parse(response.choices[0].message.content!) as ParsedResume;
    } catch (e) {
      console.error("[AI] OpenAI resume parse failed, falling back to local parser:", e);
    }
  }

  // Fallback: local keyword-based ATS parser — always works
  console.log("[ATS] Using local keyword parser");
  return localParseResume(resumeText, jobTitle, jobRequirements);
}

// MCQ question (aptitude / dsa_mcq / domain)
export interface MCQQuestion {
  id: number;
  type: "aptitude" | "dsa_mcq" | "domain";
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: "easy" | "medium";
  explanation: string;
}

// Coding problem (LeetCode style)
export interface CodingProblem {
  id: number;
  type: "coding";
  title: string;
  difficulty: "easy" | "medium";
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
}

export type AssessmentQuestion = MCQQuestion | CodingProblem;

export interface AssessmentBundle {
  aptitude: MCQQuestion[];
  domain: MCQQuestion[];
  coding: CodingProblem[];
}

function getFallbackBundle(jobTitle: string): AssessmentBundle {
  return {
    aptitude: [
      { id: 1, type: "aptitude", question: "If a train travels 60 km in 1 hour, how far in 2.5 hours?", options: ["120 km", "150 km", "180 km", "90 km"], correct_answer: 1, difficulty: "easy", explanation: "60 × 2.5 = 150" },
      { id: 2, type: "aptitude", question: "Next in series: 2, 4, 8, 16, ?", options: ["24", "32", "28", "20"], correct_answer: 1, difficulty: "easy", explanation: "Each doubles" },
      { id: 3, type: "aptitude", question: "A is twice as old as B. B is 15. How old is A?", options: ["25", "30", "20", "35"], correct_answer: 1, difficulty: "easy", explanation: "2 × 15 = 30" },
      { id: 4, type: "aptitude", question: "Odd one out: Apple, Mango, Carrot, Banana?", options: ["Apple", "Mango", "Carrot", "Banana"], correct_answer: 2, difficulty: "easy", explanation: "Carrot is a vegetable" },
      { id: 5, type: "aptitude", question: "5 workers finish in 10 days. 10 workers take?", options: ["10", "5", "20", "8"], correct_answer: 1, difficulty: "easy", explanation: "Inverse proportion: 5 days" },
      { id: 6, type: "aptitude", question: "15% of 200?", options: ["25", "30", "35", "20"], correct_answer: 1, difficulty: "easy", explanation: "30" },
      { id: 7, type: "aptitude", question: "Missing: 3, 6, 11, 18, ?", options: ["25", "27", "29", "23"], correct_answer: 1, difficulty: "medium", explanation: "+3,+5,+7,+9 → 27" },
      { id: 8, type: "aptitude", question: "20% profit on ₹500 cost. Selling price?", options: ["₹550", "₹600", "₹580", "₹620"], correct_answer: 1, difficulty: "easy", explanation: "₹600" },
      { id: 9, type: "aptitude", question: "All Bloops are Razzles, all Razzles are Lazzles. Are Bloops Lazzles?", options: ["Yes", "No", "Cannot determine", "Sometimes"], correct_answer: 0, difficulty: "easy", explanation: "Transitive logic" },
      { id: 10, type: "aptitude", question: "Clock at 3:15. Angle between hands?", options: ["0°", "7.5°", "15°", "22.5°"], correct_answer: 1, difficulty: "medium", explanation: "7.5°" },
    ],
    domain: [
      { id: 11, type: "domain", question: `Which is a core principle in ${jobTitle} development?`, options: ["DRY (Don't Repeat Yourself)", "WET (Write Everything Twice)", "AHA (Always Have Abstractions)", "None"], correct_answer: 0, difficulty: "medium", explanation: "DRY is a fundamental software principle" },
      { id: 12, type: "domain", question: "What does REST stand for?", options: ["Remote Execution State Transfer", "Representational State Transfer", "Resource Endpoint State Transfer", "None"], correct_answer: 1, difficulty: "easy", explanation: "Representational State Transfer" },
      { id: 13, type: "domain", question: "Which HTTP method is idempotent?", options: ["POST", "PATCH", "PUT", "None of these"], correct_answer: 2, difficulty: "medium", explanation: "PUT is idempotent" },
      { id: 14, type: "domain", question: "What is the purpose of an index in a database?", options: ["Encrypt data", "Speed up queries", "Backup data", "Normalize tables"], correct_answer: 1, difficulty: "easy", explanation: "Indexes speed up SELECT queries" },
      { id: 15, type: "domain", question: "What does CI/CD stand for?", options: ["Code Integration/Code Deployment", "Continuous Integration/Continuous Deployment", "Central Integration/Central Delivery", "None"], correct_answer: 1, difficulty: "easy", explanation: "Continuous Integration / Continuous Deployment" },
      { id: 16, type: "domain", question: "Which of the following is a NoSQL database?", options: ["MySQL", "PostgreSQL", "MongoDB", "SQLite"], correct_answer: 2, difficulty: "easy", explanation: "MongoDB is a NoSQL document database" },
      { id: 17, type: "domain", question: "What is the default HTTP port?", options: ["8080", "443", "80", "21"], correct_answer: 2, difficulty: "easy", explanation: "HTTP uses port 80" },
      { id: 18, type: "domain", question: "Which design pattern ensures only one instance of a class?", options: ["Factory", "Singleton", "Observer", "Decorator"], correct_answer: 1, difficulty: "medium", explanation: "Singleton pattern" },
      { id: 19, type: "domain", question: "What does ORM stand for?", options: ["Object Relational Mapping", "Object Resource Model", "Online Resource Manager", "None"], correct_answer: 0, difficulty: "easy", explanation: "Object Relational Mapping" },
      { id: 20, type: "domain", question: "Which HTTP status code means 'Not Found'?", options: ["200", "301", "404", "500"], correct_answer: 2, difficulty: "easy", explanation: "404 = Not Found" },
    ],
    coding: [
      {
        id: 21, type: "coding", title: "Two Sum", difficulty: "easy",
        description: "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. You may assume exactly one solution exists.",
        examples: [
          { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
          { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
        ],
        constraints: ["2 ≤ nums.length ≤ 10⁴", "-10⁹ ≤ nums[i] ≤ 10⁹", "Only one valid answer exists"],
      },
      {
        id: 22, type: "coding", title: "Longest Substring Without Repeating Characters", difficulty: "medium",
        description: "Given a string `s`, find the length of the longest substring without repeating characters.",
        examples: [
          { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc" with length 3' },
          { input: 's = "bbbbb"', output: "1", explanation: 'The answer is "b" with length 1' },
        ],
        constraints: ["0 ≤ s.length ≤ 5 × 10⁴", "s consists of English letters, digits, symbols and spaces"],
      },
    ],
  };
}

export async function generateAssessmentBundle(jobTitle: string, jobRequirements: string): Promise<AssessmentBundle> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "your_openai_api_key_here") {
    console.log("[AI] No OpenAI key — using fallback questions");
    return getFallbackBundle(jobTitle);
  }
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert technical interviewer. Generate a complete assessment bundle. Return ONLY valid JSON." },
        {
          role: "user", content: `Job: ${jobTitle}\nRequirements: ${jobRequirements}\n\nGenerate exactly:\n- 10 aptitude MCQs (logical reasoning, quantitative, verbal — general, not domain specific)\n- 10 domain MCQs specific to the ${jobTitle} role and requirements\n- 2 coding problems (1 easy LeetCode-style, 1 medium LeetCode-style)\n\nReturn JSON:\n{\n  "aptitude": [{"id":1,"type":"aptitude","question":"","options":["","","",""],"correct_answer":0,"difficulty":"easy","explanation":""}],\n  "domain": [{"id":11,"type":"domain","question":"","options":["","","",""],"correct_answer":0,"difficulty":"medium","explanation":""}],\n  "coding": [{"id":21,"type":"coding","title":"","difficulty":"easy","description":"","examples":[{"input":"","output":"","explanation":""}],"constraints":[""]}]\n}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    return JSON.parse(response.choices[0].message.content!) as AssessmentBundle;
  } catch (e) {
    console.error("[AI] Generation failed, using fallback:", e);
    return getFallbackBundle(jobTitle);
  }
}

// Keep old function name for compatibility
export async function generateAssessmentQuestions(jobTitle: string, jobRequirements: string): Promise<AssessmentQuestion[]> {
  const bundle = await generateAssessmentBundle(jobTitle, jobRequirements);
  return [...bundle.aptitude, ...bundle.domain, ...bundle.coding];
}

export function evaluateAnswers(
  questions: AssessmentQuestion[],
  answers: Record<number, number>
): { score: number; total: number; percentage: number; breakdown: { aptitude: number; domain: number; coding: number } } {
  const mcqs = questions.filter(q => q.type !== "coding") as MCQQuestion[];
  const codingProblems = questions.filter(q => q.type === "coding");
  let correct = 0;
  const breakdown = { aptitude: 0, domain: 0, coding: 0 };

  for (const q of mcqs) {
    if (answers[q.id] === q.correct_answer) {
      correct++;
      if (q.type === "aptitude") breakdown.aptitude++;
      else breakdown.domain++;
    }
  }
  for (const q of codingProblems) {
    if (answers[q.id] !== undefined) breakdown.coding++;
  }

  return {
    score: correct,
    total: mcqs.length,
    percentage: mcqs.length > 0 ? Math.round((correct / mcqs.length) * 100) : 0,
    breakdown,
  };
}
