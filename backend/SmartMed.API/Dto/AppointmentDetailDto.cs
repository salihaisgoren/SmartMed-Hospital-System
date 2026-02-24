namespace SmartMed.API.DTOs
{
    public class AppointmentDetailDto
    {
        public int Id { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string SpecialtyName { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty; 
        public string Time { get; set; } = string.Empty; 
        public bool IsPast { get; set; } 
    }
}