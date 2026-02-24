using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMed.API.Data;
using SmartMed.API.DTOs; // DTO'yu buraya using ile ekliyoruz
using SmartMed.API.Models;

namespace SmartMed.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SmartAssistantController : ControllerBase
    {
        private readonly ApplicationDbContext _context; // Kendi DbContext adını buraya yaz (örn: SmartMedDbContext)

        public SmartAssistantController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("suggestions/by-name/{specialtyName}")]
        public async Task<ActionResult<List<SmartDoctorSuggestionDto>>> GetSmartSuggestionsByNameAsync(string specialtyName)
        {
            // 1. ÖNEMLİ DEĞİŞİKLİK: Önce Python'dan gelen isme göre bölümü veritabanından bul.
            // (Büyük/küçük harf sorunu olmasın diye ikisini de ToLower() yapıyoruz)
            var specialty = await _context.Specialties
                .FirstOrDefaultAsync(s => s.Name.ToLower() == specialtyName.ToLower());

            // Eğer veritabanında böyle bir bölüm yoksa, boş liste dön (Sistem çökmez)
            if (specialty == null)
                return Ok(new List<SmartDoctorSuggestionDto>());

            // 2. Bölümü bulduk! Şimdi o bölümün ID'sine sahip doktorları çek
            var doctors = await _context.Doctors
                .Where(d => d.SpecialtyId == specialty.Id)
                .ToListAsync();

            if (!doctors.Any())
                return Ok(new List<SmartDoctorSuggestionDto>());

            var doctorIds = doctors.Select(d => d.Id).ToList();

            var today = DateTime.Today;
            var maxDate = today.AddDays(14);

            var bookedAppointments = await _context.Appointments
                .Where(a => doctorIds.Contains(a.DoctorId)
                         && a.AppointmentDate >= today
                         && a.AppointmentDate <= maxDate)
                .ToListAsync();

            var suggestions = new List<SmartDoctorSuggestionDto>();

            var standardTimes = new List<string> {
                "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
                "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"
            };

            foreach (var doctor in doctors)
            {
                var docAppointments = bookedAppointments.Where(a => a.DoctorId == doctor.Id).ToList();

                DateTime? earliestDate = null;
                string? earliestTime = null;
                var currentTime = DateTime.Now.TimeOfDay;

                for (int i = 0; i <= 14; i++)
                {
                    var checkDate = today.AddDays(i);

                    if (checkDate.DayOfWeek == DayOfWeek.Saturday || checkDate.DayOfWeek == DayOfWeek.Sunday)
                        continue;

                    var bookedTimesOnDay = docAppointments
                        .Where(a => a.AppointmentDate.Date == checkDate.Date)
                        .Select(a => a.AppointmentTime)
                        .ToList();

                    var availableTime = standardTimes.FirstOrDefault(t => {
                        bool isBooked = bookedTimesOnDay.Contains(t);
                        bool isPassed = false;
                        bool isReservedFor65Plus = false; // YENİ: 65 Yaş ve Kilit Kontrolü

                        TimeSpan slotTime = TimeSpan.Parse(t);
                        DateTime exactSlotDateTime = checkDate.Date.Add(slotTime); // Randevunun tam tarih ve saati

                        // Geçmiş saat kontrolü (Bugün için)
                        if (i == 0)
                        {
                            isPassed = slotTime <= currentTime.Add(TimeSpan.FromHours(1));
                        }

                        // YENİ: 09:00 ve 09:30 saatleri için özel iş kuralı (Dinamik Kilit)
                        if (t == "09:00" || t == "09:30")
                        {
                            TimeSpan timeUntilAppointment = exactSlotDateTime - DateTime.Now;

                            // Eğer randevuya 12 saatten FAZLA varsa, yaşını bilmediğimiz anonim kullanıcıya KİLİTLE.
                            if (timeUntilAppointment.TotalHours > 12)
                            {
                                isReservedFor65Plus = true;
                            }
                            // Not: 12 saat veya daha az kalmışsa 'isReservedFor65Plus' false kalır, yani herkese açılır.
                        }

                        // Sonuç: Dolu değilse, saati geçmemişse ve 65 yaş kilit kuralına takılmıyorsa öner!
                        return !isBooked && !isPassed && !isReservedFor65Plus;
                    });

                    if (availableTime != null)
                    {
                        earliestDate = checkDate;
                        earliestTime = availableTime;
                        break;
                    }
                }

                if (earliestDate.HasValue && earliestTime != null)
                {
                    suggestions.Add(new SmartDoctorSuggestionDto
                    {
                        DoctorId = doctor.Id,
                        DoctorName = doctor.FullName,
                        EarliestAvailableDate = earliestDate.Value,
                        EarliestAvailableTime = earliestTime
                    });
                }
            }

            var result = suggestions
                .OrderBy(s => s.EarliestAvailableDate)
                .ThenBy(s => s.EarliestAvailableTime)
                .Take(3)
                .ToList();

            return Ok(result);
        }

    }
}