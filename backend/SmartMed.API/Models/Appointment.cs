using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SmartMed.API.Models
{
    public class Appointment
    {
        [Key]
        public int Id { get; set; }

        public DateTime AppointmentDate { get; set; }

        public string AppointmentTime { get; set; } = string.Empty;

        public int DoctorId { get; set; }

        [JsonIgnore]
        public Doctor? Doctor { get; set; } 

        
        public int PatientId { get; set; }

       
        [JsonIgnore]
        public User? Patient { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}