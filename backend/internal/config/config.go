package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	JWTExpiryHours int
	AIAPIKey       string
	AIAPIURL       string
	FileStorageURL string
	AllowedOrigins string
}

func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	port := getEnv("PORT", "8080")
	databaseURL := getEnv("DATABASE_URL", "postgres://localhost:5432/nile_connect")
	jwtSecret := getEnv("JWT_SECRET", "default-jwt-secret-change-in-production")
	jwtExpiryHours, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	aiAPIKey := getEnv("AI_API_KEY", "")
	aiAPIURL := getEnv("AI_API_URL", "")
	fileStorageURL := getEnv("FILE_STORAGE_URL", "/uploads")
	allowedOrigins := getEnv("ALLOWED_ORIGINS", "*")

	return &Config{
		Port:           port,
		DatabaseURL:    databaseURL,
		JWTSecret:      jwtSecret,
		JWTExpiryHours: jwtExpiryHours,
		AIAPIKey:       aiAPIKey,
		AIAPIURL:       aiAPIURL,
		FileStorageURL: fileStorageURL,
		AllowedOrigins: allowedOrigins,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}