// Package admin holds account-cleanup helpers shared between the staff
// dashboard's cleanup tool and the secret-gated dev admin endpoints.
package admin

import (
	"gorm.io/gorm"

	"nile-connect/lib/models"
)

// CascadeDeleteUser removes a user and everything they own/participated in.
func CascadeDeleteUser(database *gorm.DB, userID string) {
	database.Where("author_id = ?", userID).Delete(&models.Post{})
	database.Where("author_id = ?", userID).Delete(&models.Comment{})
	database.Where("user_id = ?", userID).Delete(&models.PostLike{})
	database.Where("sender_id = ? OR receiver_id = ?", userID, userID).Delete(&models.Message{})
	database.Where("user_id = ? OR partner_id = ?", userID, userID).Delete(&models.TypingStatus{})
	database.Where("student_id = ?", userID).Delete(&models.Application{})
	database.Where("employer_id = ?", userID).Delete(&models.Job{})
	database.Where("organiser_id = ?", userID).Delete(&models.Event{})
	database.Where("student_id = ?", userID).Delete(&models.EventRegistration{})
	database.Where("requester_id = ? OR recipient_id = ?", userID, userID).Delete(&models.Connection{})
	database.Where("user_id = ? OR actor_id = ?", userID, userID).Delete(&models.Notification{})
	database.Where("student_id = ? OR staff_id = ?", userID, userID).Delete(&models.ServiceRequest{})
	database.Where("user_id = ?", userID).Delete(&models.PasswordReset{})
	database.Where("user_id = ?", userID).Delete(&models.EmployerProfile{})
	database.Where("user_id = ?", userID).Delete(&models.Document{})
	database.Where("author_id = ?", userID).Delete(&models.ApplicationNote{})
	database.Where("user_id = ?", userID).Delete(&models.EmailVerification{})
	database.Where("viewer_id = ? OR profile_user_id = ?", userID, userID).Delete(&models.ProfileView{})
	database.Where("endorser_id = ? OR profile_user_id = ?", userID, userID).Delete(&models.Endorsement{})
	database.Delete(&models.User{}, "id = ?", userID)
}
