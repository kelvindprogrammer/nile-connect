package ai

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type CVAnalysisResult struct {
	OverallScore    int      `json:"overall_score"`
	Strengths       []string `json:"strengths"`
	Weaknesses      []string `json:"weaknesses"`
	Suggestions     []string `json:"suggestions"`
	KeywordGaps     []string `json:"keyword_gaps"`
	ExtractedSkills []string `json:"extracted_skills"`
}