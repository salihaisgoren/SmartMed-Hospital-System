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

        // --- YENİ ALANLAR BURADA ---
        // Hastanın kendi yazdığı şikayet
        public string? PatientComplaint { get; set; }

        // Yapay zeka asistanının oluşturduğu özet (Opsiyonel)
        public string? AiAnalysis { get; set; }

        // Randevu durumu: "Bekliyor", "Tamamlandı", "Gelmedi"
        public string Status { get; set; } = "Bekliyor";

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}