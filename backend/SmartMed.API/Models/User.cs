using System.ComponentModel.DataAnnotations;

namespace SmartMed.API.Models
{
    public enum UserRole
    {
        Admin = 0,
        Doctor = 1,
        Patient = 2
    }

    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(11)]
        public string TcKimlikNo { get; set; } = string.Empty;

        [Required]
        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string PhoneNumber { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string Role { get; set; } = "Patient";
        public int BirthYear { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public string? PasswordResetCode { get; set; }
    }
}