package ai

import "errors"

type Client struct {
	APIKey string
	APIURL string
}

func NewClient(apiKey, apiURL string) *Client {
	return &Client{
		APIKey: apiKey,
		APIURL: apiURL,
	}
}

func (c *Client) AnalyseCV(cvText string) (*CVAnalysisResult, error) {
	return nil, errors.New("AI provider not configured yet")
}

func (c *Client) SemanticMatchScore(studentSkills []string, jobTags []string) (int, error) {
	return 0, errors.New("AI provider not configured yet")
}