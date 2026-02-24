namespace SmartMed.API.DTOs
{
    public class SmartDoctorSuggestionDto
    {
        public int DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public DateTime EarliestAvailableDate { get; set; }
        public string EarliestAvailableTime { get; set; } = string.Empty;
    }
}