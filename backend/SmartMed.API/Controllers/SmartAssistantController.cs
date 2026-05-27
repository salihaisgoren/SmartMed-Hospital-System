using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMed.API.Data;
using SmartMed.API.DTOs;
using SmartMed.API.Models;

namespace SmartMed.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SmartAssistantController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SmartAssistantController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("suggestions/by-name/{specialtyName}")]
        public async Task<ActionResult<List<SmartDoctorSuggestionDto>>> GetSmartSuggestionsByNameAsync(string specialtyName)
        {
            var specialty = await _context.Specialties
                .FirstOrDefaultAsync(s => s.Name.ToLower() == specialtyName.ToLower());

            if (specialty == null)
                return Ok(new List<SmartDoctorSuggestionDto>());

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

            // 👇 DÜZELTME 1: 15'er dakikalık tam saat listesi 👇
            var standardTimes = new List<string> {
                "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45",
                "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30", "15:45", "16:00"
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
                        bool isReservedFor65Plus = false;

                        TimeSpan slotTime = TimeSpan.Parse(t);
                        DateTime exactSlotDateTime = checkDate.Date.Add(slotTime);

                        if (i == 0)
                        {
                            isPassed = slotTime <= currentTime.Add(TimeSpan.FromHours(1));
                        }

                        // 👇 DÜZELTME 2: Tüm sabah saatleri için VIP 12 Saat Kuralı 👇
                        int saatDegeri = int.Parse(t.Split(':')[0]);
                        if (saatDegeri < 10 || t == "10:00")
                        {
                            TimeSpan timeUntilAppointment = exactSlotDateTime - DateTime.Now;

                            if (timeUntilAppointment.TotalHours > 12)
                            {
                                isReservedFor65Plus = true;
                            }
                        }

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