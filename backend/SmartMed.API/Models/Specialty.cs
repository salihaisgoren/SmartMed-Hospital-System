using System.ComponentModel.DataAnnotations;
using System.Numerics;

namespace SmartMed.API.Models
{
    public class Specialty 
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public List<Doctor>? Doctors { get; set; }
    }
}
