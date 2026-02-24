using System.ComponentModel.DataAnnotations;

namespace SmartMed.API.DTOs
{
    public class RegisterDto
    {
        [Required]
        [StringLength(11, MinimumLength = 11, ErrorMessage = "TC Kimlik No 11 haneli olmalıdır.")]
        public string TcNo { get; set; } = string.Empty; 

        [Required]
        public string AdSoyad { get; set; } = string.Empty; 

        [Required]
        [Phone]
        public string Telefon { get; set; } = string.Empty; 

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Doğum yılı zorunludur.")]
        [Range(1900, 2026, ErrorMessage = "Lütfen geçerli bir doğum yılı giriniz.")] // Ekstra Koruma
        public int BirthYear { get; set; }

        [Required]
        [MinLength(6)]
        public string Sifre { get; set; } = string.Empty; 
    }
}