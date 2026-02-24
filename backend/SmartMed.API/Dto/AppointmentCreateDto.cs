using System;

namespace SmartMed.API.DTOs
{
    public class AppointmentCreateDto
    {
        public int DoctorId { get; set; }
        public int PatientId { get; set; }
        public DateTime AppointmentDate { get; set; }
        public string AppointmentTime { get; set; } = string.Empty;
    }
}