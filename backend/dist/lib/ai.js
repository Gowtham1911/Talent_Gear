"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseResumeAgainstJob = parseResumeAgainstJob;
exports.generateAssessmentQuestions = generateAssessmentQuestions;
exports.evaluateAnswers = evaluateAnswers;
const openai_1 = __importDefault(require("openai"));
function getOpenAI() {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === "your_openai_api_key_here") {
        throw new Error("OPENAI_API_KEY is not configured in .env");
    }
    return new openai_1.default({ apiKey: key });
}
async function parseResumeAgainstJob(resumeText, jobTitle, jobDescription, jobRequirements) {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You are an expert AI recruiter. Parse the resume and score it against the job posting. Return ONLY valid JSON.`,
            },
            {
                role: "user",
                content: `Job Title: ${jobTitle}
Job Description: ${jobDescription}
Requirements: ${jobRequirements}

Resume:
${resumeText}

Return JSON with this exact structure:
{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "experience": [{"company": "", "role": "", "duration": ""}],
  "education": [{"degree": "", "institution": "", "year": ""}],
  "summary": "",
  "match_score": 0-100,
  "match_reasons": []
}`,
            },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
    });
    return JSON.parse(response.choices[0].message.content);
}
// Fallback questions used when OpenAI key is not configured
function getFallbackQuestions() {
    return [
        { id: 1, type: "aptitude", question: "If a train travels 60 km in 1 hour, how far will it travel in 2.5 hours?", options: ["120 km", "150 km", "180 km", "90 km"], correct_answer: 1, difficulty: "easy", explanation: "60 × 2.5 = 150 km" },
        { id: 2, type: "aptitude", question: "What is the next number in the series: 2, 4, 8, 16, ?", options: ["24", "32", "28", "20"], correct_answer: 1, difficulty: "easy", explanation: "Each number doubles" },
        { id: 3, type: "aptitude", question: "A is twice as old as B. If B is 15, how old is A?", options: ["25", "30", "20", "35"], correct_answer: 1, difficulty: "easy", explanation: "2 × 15 = 30" },
        { id: 4, type: "aptitude", question: "Which word is the odd one out: Apple, Mango, Carrot, Banana?", options: ["Apple", "Mango", "Carrot", "Banana"], correct_answer: 2, difficulty: "easy", explanation: "Carrot is a vegetable, others are fruits" },
        { id: 5, type: "aptitude", question: "If 5 workers complete a job in 10 days, how many days will 10 workers take?", options: ["10", "5", "20", "8"], correct_answer: 1, difficulty: "easy", explanation: "Inverse proportion: 5×10/10 = 5 days" },
        { id: 6, type: "aptitude", question: "What is 15% of 200?", options: ["25", "30", "35", "20"], correct_answer: 1, difficulty: "easy", explanation: "15/100 × 200 = 30" },
        { id: 7, type: "aptitude", question: "Find the missing number: 3, 6, 11, 18, ?", options: ["25", "27", "29", "23"], difficulty: "medium", correct_answer: 1, explanation: "+3,+5,+7,+9 pattern → 18+9=27" },
        { id: 8, type: "aptitude", question: "A shopkeeper sells an item at 20% profit. If cost is ₹500, what is the selling price?", options: ["₹550", "₹600", "₹580", "₹620"], correct_answer: 1, difficulty: "easy", explanation: "500 + 20% of 500 = 600" },
        { id: 9, type: "aptitude", question: "If all Bloops are Razzles and all Razzles are Lazzles, are all Bloops definitely Lazzles?", options: ["Yes", "No", "Cannot determine", "Sometimes"], correct_answer: 0, difficulty: "easy", explanation: "Transitive logic: Bloops→Razzles→Lazzles" },
        { id: 10, type: "aptitude", question: "A clock shows 3:15. What is the angle between the hour and minute hands?", options: ["0°", "7.5°", "15°", "22.5°"], correct_answer: 1, difficulty: "medium", explanation: "Hour hand at 97.5°, minute at 90°, difference = 7.5°" },
        { id: 11, type: "aptitude", question: "Which is the largest prime number less than 20?", options: ["17", "19", "18", "16"], correct_answer: 1, difficulty: "easy", explanation: "19 is prime and less than 20" },
        { id: 12, type: "aptitude", question: "If MANGO is coded as OCPIQ, how is APPLE coded?", options: ["CRRNG", "CQQNG", "CRRNF", "BQQNG"], correct_answer: 0, difficulty: "medium", explanation: "Each letter shifted by +2" },
        { id: 13, type: "aptitude", question: "A pipe fills a tank in 4 hours, another empties it in 8 hours. Both open together — how long to fill?", options: ["6 hours", "8 hours", "10 hours", "12 hours"], correct_answer: 1, difficulty: "medium", explanation: "Net rate = 1/4 - 1/8 = 1/8, so 8 hours" },
        { id: 14, type: "aptitude", question: "What comes next: AZ, BY, CX, ?", options: ["DW", "EV", "DX", "EW"], correct_answer: 0, difficulty: "easy", explanation: "First letter goes forward, second goes backward" },
        { id: 15, type: "aptitude", question: "If 2x + 3 = 11, what is x?", options: ["3", "4", "5", "6"], correct_answer: 1, difficulty: "easy", explanation: "2x = 8, x = 4" },
        { id: 16, type: "dsa", question: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correct_answer: 1, difficulty: "medium", explanation: "Binary search halves the search space each step" },
        { id: 17, type: "dsa", question: "Which data structure uses LIFO order?", options: ["Queue", "Stack", "Linked List", "Tree"], correct_answer: 1, difficulty: "easy", explanation: "Stack follows Last In First Out" },
        { id: 18, type: "dsa", question: "What is the worst-case time complexity of QuickSort?", options: ["O(n log n)", "O(n²)", "O(n)", "O(log n)"], correct_answer: 1, difficulty: "medium", explanation: "Worst case when pivot is always smallest/largest element" },
        { id: 19, type: "dsa", question: "Which traversal of a BST gives sorted output?", options: ["Preorder", "Postorder", "Inorder", "Level order"], correct_answer: 2, difficulty: "medium", explanation: "Inorder traversal of BST visits nodes in ascending order" },
        { id: 20, type: "dsa", question: "What is the space complexity of merge sort?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], correct_answer: 2, difficulty: "medium", explanation: "Merge sort requires O(n) auxiliary space" },
        { id: 21, type: "dsa", question: "In a min-heap, the root element is always?", options: ["Maximum", "Minimum", "Median", "Random"], correct_answer: 1, difficulty: "easy", explanation: "Min-heap property: parent ≤ children, so root is minimum" },
        { id: 22, type: "dsa", question: "Which algorithm is used to find shortest path in a weighted graph?", options: ["BFS", "DFS", "Dijkstra", "Kruskal"], correct_answer: 2, difficulty: "medium", explanation: "Dijkstra's algorithm finds shortest paths from source" },
        { id: 23, type: "dsa", question: "What is the time complexity of inserting into a hash table (average case)?", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], correct_answer: 2, difficulty: "medium", explanation: "Hash table insertion is O(1) average with good hash function" },
        { id: 24, type: "dsa", question: "How many edges does a complete graph with 5 nodes have?", options: ["8", "10", "12", "15"], correct_answer: 1, difficulty: "medium", explanation: "n(n-1)/2 = 5×4/2 = 10" },
        { id: 25, type: "dsa", question: "Which sorting algorithm is stable and has O(n log n) worst case?", options: ["QuickSort", "HeapSort", "MergeSort", "SelectionSort"], correct_answer: 2, difficulty: "medium", explanation: "MergeSort is stable and always O(n log n)" },
    ];
}
async function generateAssessmentQuestions(jobTitle, jobRequirements, aptitudeCount = 15, dsaCount = 10) {
    // If no OpenAI key, use fallback questions
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === "your_openai_api_key_here") {
        console.log("No OpenAI key — using fallback assessment questions");
        return getFallbackQuestions();
    }
    try {
        const openai = getOpenAI();
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert technical interviewer. Generate assessment questions for IT recruitment. Return ONLY valid JSON.`,
                },
                {
                    role: "user",
                    content: `Job: ${jobTitle}
Requirements: ${jobRequirements}

Generate ${aptitudeCount} aptitude questions (logical reasoning, quantitative, verbal) and ${dsaCount} DSA medium-level MCQ questions relevant to this role.

Return JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "aptitude" | "dsa",
      "question": "",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "difficulty": "easy" | "medium",
      "explanation": ""
    }
  ]
}`,
                },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });
        const data = JSON.parse(response.choices[0].message.content);
        return data.questions;
    }
    catch (e) {
        console.error("OpenAI question generation failed, using fallback:", e);
        return getFallbackQuestions();
    }
}
async function evaluateAnswers(questions, answers) {
    let correct = 0;
    let aptitudeCorrect = 0;
    let dsaCorrect = 0;
    let aptitudeTotal = 0;
    let dsaTotal = 0;
    for (const q of questions) {
        if (q.type === "aptitude")
            aptitudeTotal++;
        else
            dsaTotal++;
        if (answers[q.id] === q.correct_answer) {
            correct++;
            if (q.type === "aptitude")
                aptitudeCorrect++;
            else
                dsaCorrect++;
        }
    }
    return {
        score: correct,
        total: questions.length,
        percentage: Math.round((correct / questions.length) * 100),
        breakdown: { aptitude: aptitudeCorrect, dsa: dsaCorrect },
    };
}
