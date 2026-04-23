package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/nile-connect/backend/internal/response"
)

type Claims struct {
	jwt.RegisteredClaims
	Role    string `json:"role"`
	Subtype string `json:"subtype"`
}

func Auth(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return response.Unauthorized(c)
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return response.Unauthorized(c)
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			return response.Unauthorized(c)
		}

		// Store claims in context for downstream handlers
		c.Locals("userID", claims.Subject)
		c.Locals("role", claims.Role)
		c.Locals("subtype", claims.Subtype)

		return c.Next()
	}
}

func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := c.Locals("role")
		if userRole == nil {
			return response.Forbidden(c)
		}

		roleStr := userRole.(string)
		for _, allowedRole := range roles {
			if roleStr == allowedRole {
				return c.Next()
			}
		}

		return response.Forbidden(c)
	}
}