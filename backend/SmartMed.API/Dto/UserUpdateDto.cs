namespace SmartMed.API.DTOs
{
    public class UserUpdateDto
    {
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;

        public string? Password { get; set; }
    }
}