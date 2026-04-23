package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// CORS configures cross-origin resource sharing.
// allowedOrigins is a comma-separated list of permitted origins read from
// the ALLOWED_ORIGINS environment variable.
// Example: "http://localhost:5173,https://nile-connect.vercel.app"
func CORS(allowedOrigins string) fiber.Handler {
	// Trim any accidental whitespace around commas
	origins := strings.Join(
		func() []string {
			parts := strings.Split(allowedOrigins, ",")
			clean := make([]string, 0, len(parts))
			for _, p := range parts {
				if t := strings.TrimSpace(p); t != "" {
					clean = append(clean, t)
				}
			}
			return clean
		}(),
		",",
	)

	if origins == "" {
		origins = "*"
	}

	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Content-Type,Authorization,Origin,Accept,X-Requested-With",
		AllowCredentials: true,
		MaxAge:           86400, // 24 h preflight cache
	})
}
