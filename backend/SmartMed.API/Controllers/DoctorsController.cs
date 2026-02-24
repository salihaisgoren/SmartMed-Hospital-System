using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMed.API.Data;
using SmartMed.API.Models;
using SmartMed.API.Services;

namespace SmartMed.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DoctorsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly EmailService _emailService; // <-- EKLE

        public DoctorsController(ApplicationDbContext context, EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet("specialties")]
        public async Task<IActionResult> GetSpecialtiesWithDoctors()
        {
            var data = await _context.Specialties
                .Include(s => s.Doctors)
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllDoctors()
        {
            var doctors = await _context.Doctors.Include(d => d.Specialty).ToListAsync();
            return Ok(doctors);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<Doctor>> PostDoctor(DoctorCreateDto doctorDto)
        {
            var specialty = await _context.Specialties.FindAsync(doctorDto.SpecialtyId);
            if (specialty == null)
            {
                return BadRequest("Geçersiz Bölüm ID'si.");
            }

            var newDoctor = new Doctor
            {
                FullName = doctorDto.FullName,
                SpecialtyId = doctorDto.SpecialtyId
            };

            _context.Doctors.Add(newDoctor);
            await _context.SaveChangesAsync();

            return Ok(newDoctor);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("add-specialty")]
        public async Task<ActionResult<Specialty>> AddSpecialty([FromBody] string specialtyName)
        {
            if (string.IsNullOrWhiteSpace(specialtyName))
                return BadRequest("Bölüm adı boş olamaz.");

            var newSpecialty = new Specialty { Name = specialtyName };
            _context.Specialties.Add(newSpecialty);
            await _context.SaveChangesAsync();
            return Ok(newSpecialty);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            var doctor = await _context.Doctors.FindAsync(id);
            if (doctor == null)
            {
                return NotFound("Doktor bulunamadı.");
            }

            _context.Doctors.Remove(doctor);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Doktor başarıyla silindi." });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("specialties/{id}")]
        public async Task<IActionResult> DeleteSpecialty(int id)
        {
            var specialty = await _context.Specialties.FindAsync(id);
            if (specialty == null)
            {
                return NotFound("Bölüm bulunamadı.");
            }

           
            bool hasDoctors = await _context.Doctors.AnyAsync(d => d.SpecialtyId == id);
            if (hasDoctors)
            {
                return BadRequest("Bu bölümde hala kayıtlı doktorlar var. Önce onları silmeli veya başka bölüme taşımalısınız.");
            }

            _context.Specialties.Remove(specialty);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Bölüm başarıyla silindi." });
        }
        [HttpPost("emergency-block/{id}")]
        public async Task<IActionResult> BlockAfternoon(int id)
        {
            // --- 1. DOKTORU BULMA ---
            int realDoctorId = 0;
            var user = await _context.Users.FindAsync(id);

            if (user != null)
            {
                var doctorByUser = await _context.Doctors.FirstOrDefaultAsync(d => d.FullName == user.FullName);
                if (doctorByUser != null) realDoctorId = doctorByUser.Id;
            }

            if (realDoctorId == 0)
            {
                var doctorDirect = await _context.Doctors.FindAsync(id);
                if (doctorDirect != null) realDoctorId = doctorDirect.Id;
            }

            if (realDoctorId == 0) return BadRequest("Doktor profili bulunamadı.");

            var today = DateTime.Today;

            // --- 2. MEVCUT GERÇEK RANDEVULARI SİL VE MAİL AT ---
            var existingAppointments = await _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor).ThenInclude(d => d.Specialty)
                .Where(a => a.DoctorId == realDoctorId && a.AppointmentDate.Date == today)
                .ToListAsync();

            int iptalSayisi = 0;

            foreach (var app in existingAppointments)
            {
                if (int.TryParse(app.AppointmentTime.Trim().Split(':')[0], out int saat))
                {
                    if (saat >= 12) // Öğleden sonra
                    {
                        // Sadece GERÇEK hastalar ise mail at (Kendi blokladığımızı silersek mail gitmesin)
                        if (app.PatientId != user.Id)
                        {
                            _context.Appointments.Remove(app);

                            // --- DETAYLI MAİL GÖNDERME KISMI ---
                            if (app.Patient != null && !string.IsNullOrEmpty(app.Patient.Email))
                            {
                                string bolumAdi = app.Doctor?.Specialty?.Name ?? "Poliklinik";
                                string doktorAdi = app.Doctor?.FullName ?? "Doktor";
                                string konu = $"ACİL İPTAL: {bolumAdi} Randevusu";

                                // İSİM DEĞİŞİKLİĞİ BURADA YAPILDI: 'mesaj' -> 'mailIcerigi'
                                string mailIcerigi = $@"
                            <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
                                <h2 style='color: #c0392b;'>Randevu İptal Bildirimi</h2>
                                <p>Sayın <strong>{app.Patient.FullName}</strong>,</p>
                                <p>Bugün (<strong>{app.AppointmentDate:dd.MM.yyyy}</strong>) için planlanan randevunuz, doktorumuzun acil durumu nedeniyle iptal edilmiştir.</p>
                                
                                <table style='background-color: #f9f9f9; padding: 15px; width: 100%; border-radius: 5px; margin-top:10px;'>
                                    <tr>
                                        <td style='width:100px;'><strong>Bölüm:</strong></td>
                                        <td>{bolumAdi}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Doktor:</strong></td>
                                        <td>{doktorAdi}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Saat:</strong></td>
                                        <td>{app.AppointmentTime}</td>
                                    </tr>
                                </table>

                                <p style='margin-top: 20px;'>Yaşanan aksaklık için özür diler, sağlıklı günler dileriz.</p>
                                <hr>
                                <small style='color: #777;'>SmartMed Hastane Yönetimi</small>
                            </div>
                        ";

                                _emailService.SendEmail(app.Patient.Email, konu, mailIcerigi);
                            }
                            iptalSayisi++;
                        }
                        else
                        {
                            // Hayalet randevuyu sil
                            _context.Appointments.Remove(app);
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();


            // --- 3. KAPILARI KİLİTLEME: HAYALET RANDEVU OLUŞTURMA ---
            string[] blokSaatleri = {
        "13:00", "13:15", "13:30", "13:45",
        "14:00", "14:15", "14:30", "14:45",
        "15:00", "15:15", "15:30", "15:45",
        "16:00", "16:15", "16:30", "16:45"
    };

            foreach (var saat in blokSaatleri)
            {
                var blokRandevu = new Appointment
                {
                    DoctorId = realDoctorId,
                    PatientId = user.Id,
                    AppointmentDate = today,
                    AppointmentTime = saat,
                    CreatedAt = DateTime.Now
                };
                _context.Appointments.Add(blokRandevu);
            }

            await _context.SaveChangesAsync();

            // --- SONUÇ MESAJI (İSİM ÇAKIŞMAMASI İÇİN 'sonucMesaji' OLARAK TANIMLANDI) ---
            string sonucMesaji;
            if (iptalSayisi > 0)
            {
                sonucMesaji = $"İşlem başarılı. Öğleden sonra kapatıldı ve {iptalSayisi} adet aktif randevu iptal edilip hastalar bilgilendirildi.";
            }
            else
            {
                sonucMesaji = "İşlem başarılı. Öğleden sonraki tüm saatler yeni randevu alımına kapatıldı.";
            }

            return Ok(new { message = sonucMesaji });
        }
    } 
    public class DoctorCreateDto
    {
        public string FullName { get; set; } = string.Empty;
        public int SpecialtyId { get; set; }
    }


}