using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SmartMed.API.Models
{
    public class Doctor
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string FullName { get; set; } = string.Empty;

        public int SpecialtyId { get; set; }

        [JsonIgnore] 
        public Specialty? Specialty { get; set; }
    }
}