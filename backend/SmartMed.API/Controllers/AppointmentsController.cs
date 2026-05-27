using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMed.API.Data;
using SmartMed.API.DTOs;
using SmartMed.API.Models;
using System.Security.Claims;
using SmartMed.API.Services; // 👈 BÖLÜM 1: Bunu en üste ekle

namespace SmartMed.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly EmailService _emailService;

        public AppointmentsController(ApplicationDbContext context, EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpPost]
        public async Task<ActionResult<Appointment>> CreateAppointment(AppointmentCreateDto request)
        {
            // 1. React'tan gelen saat metnini (Örn: "09:00") TimeSpan formatına çeviriyoruz
            if (!TimeSpan.TryParse(request.AppointmentTime, out TimeSpan time))
            {
                return BadRequest("Geçersiz saat formatı.");
            }

            // 2. Sadece GÜN bilgisi olan tarihin üzerine SAATİ ekleyip TAM randevu zamanını buluyoruz
            // (Örn: 25 Şubat 00:00 + 09:00 saat = 25 Şubat 09:00)
            DateTime exactAppointmentDateTime = request.AppointmentDate.Date.Add(time);

            // 3. Geçmiş tarih kontrolünü artık gece 00:00'a göre değil, GERÇEK randevu saatine göre yapıyoruz
            if (exactAppointmentDateTime <= DateTime.Now)
            {
                return BadRequest("Geçmiş bir tarih veya saate randevu alamazsınız.");
            }

            // --- DOLULUK KONTROLÜ ---
            // Artık ToString("HH:mm") yerine, direkt request içinden gelen saati kullanıyoruz
            string talepEdilenSaat = request.AppointmentTime;

            // Veritabanına sor: "Bu doktora, bu tarihte ve bu saatte kayıtlı bir randevu var mı?"
            bool slotDoluMu = await _context.Appointments.AnyAsync(a =>
                a.DoctorId == request.DoctorId &&
                a.AppointmentDate.Date == request.AppointmentDate.Date && // Sadece gün kontrolü
                a.AppointmentTime == talepEdilenSaat); // Saat kontrolü

            if (slotDoluMu)
            {
                // Eğer orada "Hayalet Randevu (Blok)" veya "Gerçek Hasta" varsa buraya girer.
                return BadRequest("Seçilen randevu saati maalesef doludur.");
            }
            // ---------------------------------------------

            // Eğer yer boşsa randevuyu oluştur
            var newAppointment = new Appointment
            {
                DoctorId = request.DoctorId,
                PatientId = request.PatientId,
                AppointmentDate = request.AppointmentDate.Date, // Sadece tarihi veritabanına ekle
                AppointmentTime = talepEdilenSaat, // Saati doğru bir şekilde "09:00" olarak ekle
                AiAnalysis = request.AiAnalysis, // 👈 YENİ: DTO'dan gelen metni modele aktar
                Status = "Bekliyor" // Başlangıç durumu
            };

            _context.Appointments.Add(newAppointment);
            await _context.SaveChangesAsync();

            // --- BÖLÜM 3: ANLIK ONAY MAİLİ GÖNDERİMİ ---
            var patient = await _context.Users.FindAsync(request.PatientId);
            var doctor = await _context.Doctors.Include(d => d.Specialty).FirstOrDefaultAsync(d => d.Id == request.DoctorId);

            if (patient != null && !string.IsNullOrEmpty(patient.Email) && doctor != null)
            {
                string bolumAdi = doctor.Specialty != null ? doctor.Specialty.Name : "Poliklinik";
                string konu = "✅ Randevunuz Başarıyla Oluşturuldu";

                string mailIcerigi = $@"
                    <div style='font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: auto;'>
                        <div style='text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px;'>
                            <h2 style='color: #10b981; margin: 0;'>SmartMed Hastanesi</h2>
                        </div>
                        <h3 style='color: #0f172a;'>Randevu Onayı</h3>
                        <p style='color: #334155; font-size: 16px;'>Sayın <strong>{patient.FullName}</strong>,</p>
                        <p style='color: #475569; line-height: 1.6;'>Hastanemizden almış olduğunuz randevu işlemi başarıyla tamamlanmıştır. Detaylar aşağıdadır:</p>
                        
                        <table style='background-color: #f8fafc; padding: 15px; width: 100%; border-radius: 8px; margin-top:20px; border-left: 4px solid #10b981;'>
                            <tr>
                                <td style='width:100px; color: #64748b;'><strong>Tarih:</strong></td>
                                <td style='color: #0f172a; font-weight: bold;'>{newAppointment.AppointmentDate:dd.MM.yyyy}</td>
                            </tr>
                            <tr>
                                <td style='color: #64748b;'><strong>Saat:</strong></td>
                                <td style='color: #0f172a; font-weight: bold;'>{newAppointment.AppointmentTime}</td>
                            </tr>
                            <tr>
                                <td style='color: #64748b;'><strong>Bölüm:</strong></td>
                                <td style='color: #0f172a; font-weight: bold;'>{bolumAdi}</td>
                            </tr>
                            <tr>
                                <td style='color: #64748b;'><strong>Doktor:</strong></td>
                                <td style='color: #0f172a; font-weight: bold;'>{doctor.FullName}</td>
                            </tr>
                        </table>

                        <p style='margin-top: 25px; color: #475569; line-height: 1.6;'>Lütfen randevu saatinizden 15 dakika önce hastanemizde olunuz. Sağlıklı günler dileriz.</p>
                        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;'>
                        <small style='color: #94a3b8;'>SmartMed Hastane Yönetimi | Bu otomatik bir mesajdır.</small>
                    </div>";

                _emailService.SendEmail(patient.Email, konu, mailIcerigi);
            }
            // --------------------------------------------------

            return Ok(newAppointment);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Appointment>>> GetAppointments()
        {
            return await _context.Appointments
                .Include(a => a.Doctor)
                .ThenInclude(d => d.Specialty)
                .ToListAsync();
        }

        [HttpGet("patient/{patientId}")]
        public async Task<IActionResult> GetMyAppointments(int patientId)
        {
            var appointments = await _context.Appointments
                .Include(a => a.Doctor)
                .ThenInclude(d => d.Specialty)
                .Where(a => a.PatientId == patientId)
                .OrderByDescending(a => a.AppointmentDate)
                .ToListAsync();

            var result = appointments.Select(a => new AppointmentDetailDto
            {
                Id = a.Id,
                DoctorName = a.Doctor != null ? a.Doctor.FullName : "Bilinmiyor",
                SpecialtyName = a.Doctor != null && a.Doctor.Specialty != null ? a.Doctor.Specialty.Name : "-",
                Date = a.AppointmentDate.ToString("yyyy-MM-dd"),
                Time = a.AppointmentTime,
                IsPast = a.AppointmentDate < DateTime.Today
            });

            return Ok(result);
        }

        [Authorize(Roles = "Doctor")]
        [HttpGet("stats")]
        public async Task<IActionResult> GetDoctorStats()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim.Value);

            var user = await _context.Users.FindAsync(userId);
            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.FullName == user.FullName);

            if (doctor == null) return BadRequest("Doktor profili bulunamadı.");

            var today = DateTime.Today;

            // --- GÜNCELLEME BURADA YAPILDI ---
            // '&& a.PatientId != user.Id' diyerek doktorun bloklamak için aldığı sahte randevuları filtreledik.

            var totalAppointments = await _context.Appointments
     .CountAsync(a => a.DoctorId == doctor.Id
                   && a.AppointmentDate.Date == today
                   && a.PatientId != user.Id);

            // Bekleyen randevuları "Status" kelimesine göre say:
            var waiting = await _context.Appointments
                .CountAsync(a => a.DoctorId == doctor.Id
                              && a.AppointmentDate.Date == today
                              && a.Status == "Bekliyor"
                              && a.PatientId != user.Id);

            // Tamamlanan randevuları "Status" kelimesine göre say:
            var completed = await _context.Appointments
                .CountAsync(a => a.DoctorId == doctor.Id
                              && a.AppointmentDate.Date == today
                              && a.Status == "Tamamlandı"
                              && a.PatientId != user.Id);

            return Ok(new
            {
                Total = totalAppointments,
                Waiting = waiting,
                Completed = completed
            });
        }

        [Authorize(Roles = "Doctor")]
        [HttpGet("weekly-stats")]
        public async Task<IActionResult> GetWeeklyStats()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim.Value);

            var user = await _context.Users.FindAsync(userId);
            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.FullName == user.FullName);
            if (doctor == null) return BadRequest("Doktor bulunamadı.");

            DateTime today = DateTime.Today;
            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
            DateTime monday = today.AddDays(-1 * diff).Date;

            int[] weeklyCounts = new int[6];

            for (int i = 0; i < 6; i++)
            {
                DateTime currentDay = monday.AddDays(i);

                // --- GÜNCELLEME BURADA DA YAPILDI ---
                // Grafikte de sahte bloklar görünmeyecek.
                int count = await _context.Appointments
                    .CountAsync(a => a.DoctorId == doctor.Id
                                  && a.AppointmentDate.Date == currentDay
                                  && a.PatientId != user.Id); // <--- FİLTRE

                weeklyCounts[i] = count;
            }

            return Ok(weeklyCounts);
        }
        [HttpGet("occupied-slots")]
        public async Task<IActionResult> GetOccupiedSlots([FromQuery] int doctorId, [FromQuery] DateTime date)
        {
            var appointments = await _context.Appointments
                .Where(a => a.DoctorId == doctorId && a.AppointmentDate.Date == date.Date)
                .ToListAsync();

            // DÜZELTME BURADA YAPILDI 🛠️
            // Eskiden: a.AppointmentDate.ToString("HH:mm") yapıyorduk. Hayalet randevularda bu "00:00" geliyordu.
            // Şimdi: Direkt a.AppointmentTime (String) değerini alıyoruz. "13:00", "13:15" gibi doğru gelir.

            var occupiedTimes = appointments
                .Select(a => a.AppointmentTime)
                .ToList();

            return Ok(occupiedTimes);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppointment(int id)
        {
            var appointment = await _context.Appointments.FindAsync(id);
            if (appointment == null)
            {
                return NotFound("Randevu bulunamadı.");
            }

            _context.Appointments.Remove(appointment);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Randevu başarıyla iptal edildi." });
        }

        // --- YENİ EKLENECEK METOT (Muayene Et Butonu İçin) ---
        [Authorize(Roles = "Doctor")]
        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteAppointment(int id)
        {
            var appointment = await _context.Appointments.FindAsync(id);
            if (appointment == null) return NotFound();

            appointment.Status = "Tamamlandı"; // Durumu güncelle
            await _context.SaveChangesAsync();
            return Ok(new { message = "Muayene başarıyla tamamlandı." });
        }


        [Authorize(Roles = "Doctor")]
        [HttpGet("daily-appointments")]
        public async Task<IActionResult> GetDailyAppointments()
        {
            // 1. Giriş yapan doktoru bul
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim.Value);

            var user = await _context.Users.FindAsync(userId);
            var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.FullName == user.FullName);
            if (doctor == null) return BadRequest("Doktor profili bulunamadı.");

            var today = DateTime.Today;

            // 2. Sadece bu doktora ait, bugünkü ve GERÇEK (bloklanmamış) randevuları getir
            var appointments = await _context.Appointments
                .Include(a => a.Patient)
                .Where(a => a.DoctorId == doctor.Id
                            && a.AppointmentDate.Date == today
                            && a.PatientId != user.Id) // Kendi blokladığı saatleri listede gösterme
                .OrderBy(a => a.AppointmentTime)
                .Select(a => new
                {
                    a.Id,
                    a.AppointmentTime,
                    PatientName = a.Patient != null ? a.Patient.FullName : "Bilinmeyen Hasta",
                    // AI analizi yoksa null döner, React'ta buna göre işlem yapacağız
                    AiSummary = a.AiAnalysis,
                    // AI yoksa hastanın manuel şikayetini gösterelim
                    ManualComplaint = a.PatientComplaint ?? "Şikayet belirtilmemiş",
                    a.Status
                })
                .ToListAsync();

            return Ok(appointments);
        }


    }
}
