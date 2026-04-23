package ai

import "errors"

type Session struct {
	History []Message
}

func (s *Session) NextTurn(client *Client, userAnswer string) (string, error) {
	return "", errors.New("AI provider not configured yet")
}