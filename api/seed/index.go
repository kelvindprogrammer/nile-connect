package handler

import (
	"net/http"

	"nile-connect/lib/db"
	"nile-connect/lib/models"
	"nile-connect/lib/respond"

	"golang.org/x/crypto/bcrypt"
)

// Handler seeds three demo accounts into the database.
// Visit /api/seed once after deploy to create the accounts.
// Idempotent — safe to call multiple times.
func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		respond.Error(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	database, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "database unavailable")
		return
	}

	const password = "NileDemo2025!"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	h := string(hash)

	type result struct {
		Role    string `json:"role"`
		Email   string `json:"email"`
		Password string `json:"password"`
		Status  string `json:"status"`
	}

	var results []result

	// ── Student demo account ──────────────────────────────────────────────────
	var studentCount int64
	database.Model(&models.User{}).Where("email = ?", "student@demo.nileconnect.com").Count(&studentCount)
	if studentCount == 0 {
		subtype := "current"
		student := models.User{
			FullName:       "Demo Student",
			Username:       "demo_student",
			Email:          "student@demo.nileconnect.com",
			PasswordHash:   h,
			Role:           "student",
			StudentSubtype: subtype,
			Major:          "Computer Science",
			GraduationYear: 2026,
			IsVerified:     true,
		}
		database.Create(&student)
		results = append(results, result{"student", student.Email, password, "created"})
	} else {
		// Update password in case it changed
		database.Model(&models.User{}).Where("email = ?", "student@demo.nileconnect.com").Update("password_hash", h)
		results = append(results, result{"student", "student@demo.nileconnect.com", password, "already exists (password refreshed)"})
	}

	// ── Staff demo account ────────────────────────────────────────────────────
	var staffCount int64
	database.Model(&models.User{}).Where("email = ?", "staff@demo.nileconnect.com").Count(&staffCount)
	if staffCount == 0 {
		staff := models.User{
			FullName:     "Demo Staff",
			Username:     "demo_staff",
			Email:        "staff@demo.nileconnect.com",
			PasswordHash: h,
			Role:         "staff",
			IsVerified:   true,
		}
		database.Create(&staff)
		results = append(results, result{"staff", staff.Email, password, "created"})
	} else {
		database.Model(&models.User{}).Where("email = ?", "staff@demo.nileconnect.com").Update("password_hash", h)
		results = append(results, result{"staff", "staff@demo.nileconnect.com", password, "already exists (password refreshed)"})
	}

	// ── Employer demo account ─────────────────────────────────────────────────
	var empCount int64
	database.Model(&models.User{}).Where("email = ?", "employer@demo.nileconnect.com").Count(&empCount)
	if empCount == 0 {
		employer := models.User{
			FullName:     "Demo Employer",
			Username:     "demo_employer",
			Email:        "employer@demo.nileconnect.com",
			PasswordHash: h,
			Role:         "employer",
			IsVerified:   true,
		}
		database.Create(&employer)

		// Create approved employer profile so they can log in immediately
		var created models.User
		database.Where("email = ?", "employer@demo.nileconnect.com").First(&created)
		profile := models.EmployerProfile{
			UserID:       created.ID,
			CompanyName:  "Demo Company",
			Industry:     "Technology",
			Location:     "Abuja, Nigeria",
			About:        "Demo employer account for testing.",
			ContactEmail: "employer@demo.nileconnect.com",
			Status:       "approved",
		}
		database.Create(&profile)
		results = append(results, result{"employer", employer.Email, password, "created"})
	} else {
		database.Model(&models.User{}).Where("email = ?", "employer@demo.nileconnect.com").Update("password_hash", h)
		// Ensure employer profile is approved
		var emp models.User
		database.Where("email = ?", "employer@demo.nileconnect.com").First(&emp)
		database.Model(&models.EmployerProfile{}).Where("user_id = ?", emp.ID).Update("status", "approved")
		results = append(results, result{"employer", "employer@demo.nileconnect.com", password, "already exists (password refreshed)"})
	}

	respond.OK(w, map[string]any{
		"message":  "Demo accounts ready. Use these credentials on the login page.",
		"accounts": results,
		"note":     "All accounts share the same password shown above.",
	})
}
