using System.ComponentModel.DataAnnotations;

namespace SmartMed.API.DTOs
{
    public class LoginDto
    {
        [Required]
        [StringLength(11)]
        public string TcNo { get; set; } = string.Empty; 

        [Required]
        public string Sifre { get; set; } = string.Empty;
    }
}