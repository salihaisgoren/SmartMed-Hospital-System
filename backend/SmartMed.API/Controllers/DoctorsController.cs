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

        [HttpPost("block-schedule/{id}")]
        public async Task<IActionResult> BlockSchedule(int id, [FromBody] BlockScheduleRequest request)
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

            // --- 2. SAAT ARALIĞINI 15 DAKİKALIK DİLİMLERE BÖLME ---
            var timeSlots = new List<string>();
            if (TimeSpan.TryParse(request.StartTime, out TimeSpan startSpan) &&
                TimeSpan.TryParse(request.EndTime, out TimeSpan endSpan))
            {
                var currentSpan = startSpan;
                while (currentSpan <= endSpan)
                {
                    timeSlots.Add(currentSpan.ToString(@"hh\:mm"));
                    currentSpan = currentSpan.Add(TimeSpan.FromMinutes(15));
                }
            }
            else
            {
                return BadRequest("Geçersiz saat formatı.");
            }

            var blockDate = request.Date.Date;

            // --- 3. MEVCUT GERÇEK RANDEVULARI SİL VE MAİL AT ---
            var existingAppointments = await _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor).ThenInclude(d => d.Specialty)
                .Where(a => a.DoctorId == realDoctorId && a.AppointmentDate.Date == blockDate && timeSlots.Contains(a.AppointmentTime))
                .ToListAsync();

            int iptalSayisi = 0;

            foreach (var app in existingAppointments)
            {
                // Eğer bu gerçek bir hasta ise (kendi kendimize kapattığımız hayalet randevu değilse)
                if (app.PatientId != (user?.Id ?? 0))
                {
                    _context.Appointments.Remove(app);

                    // --- DETAYLI VE ŞIK MAİL GÖNDERME KISMI (Turkuaz Hastane Temalı) ---
                    if (app.Patient != null && !string.IsNullOrEmpty(app.Patient.Email))
                    {
                        string bolumAdi = app.Doctor?.Specialty?.Name ?? "Poliklinik";
                        string doktorAdi = app.Doctor?.FullName ?? "Doktor";
                        string konu = $"DURUM BİLDİRİMİ: {bolumAdi} Randevunuz Hakkında";

                        string mailIcerigi = $@"
                            <div style='font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: auto;'>
                                <div style='text-align: center; border-bottom: 2px solid #0097A7; padding-bottom: 15px; margin-bottom: 20px;'>
                                    <h2 style='color: #0097A7; margin: 0;'>SmartMed Hastanesi</h2>
                                </div>
                                <h3 style='color: #d32f2f;'>Randevu İptal Bildirimi</h3>
                                <p style='color: #334155; font-size: 16px;'>Sayın <strong>{app.Patient.FullName}</strong>,</p>
                                <p style='color: #475569; line-height: 1.6;'><strong>{app.AppointmentDate:dd.MM.yyyy}</strong> tarihi için planlanan randevunuz, doktorumuzun programındaki mecburi bir değişiklik (ameliyat/toplantı) nedeniyle iptal edilmiştir.</p>
                                
                                <table style='background-color: #f8fafc; padding: 15px; width: 100%; border-radius: 8px; margin-top:20px; border-left: 4px solid #0097A7;'>
                                    <tr>
                                        <td style='width:100px; color: #64748b;'><strong>Bölüm:</strong></td>
                                        <td style='color: #0f172a; font-weight: bold;'>{bolumAdi}</td>
                                    </tr>
                                    <tr>
                                        <td style='color: #64748b;'><strong>Doktor:</strong></td>
                                        <td style='color: #0f172a; font-weight: bold;'>{doktorAdi}</td>
                                    </tr>
                                    <tr>
                                        <td style='color: #64748b;'><strong>İptal Edilen Saat:</strong></td>
                                        <td style='color: #d32f2f; font-weight: bold;'>{app.AppointmentTime}</td>
                                    </tr>
                                </table>

                                <p style='margin-top: 25px; color: #475569; line-height: 1.6;'>Sistem üzerinden yeni bir randevu oluşturabilirsiniz. Yaşanan aksaklık için özür diler, sağlıklı günler dileriz.</p>
                                <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;'>
                                <small style='color: #94a3b8;'>SmartMed Hastane Yönetimi | Bu otomatik bir mesajdır.</small>
                            </div>
                        ";

                        _emailService.SendEmail(app.Patient.Email, konu, mailIcerigi);
                    }
                    iptalSayisi++;
                }
                else
                {
                    // Zaten daha önceden hayalet randevu ile kapatılmışsa, çakışma olmasın diye sil
                    _context.Appointments.Remove(app);
                }
            }

            await _context.SaveChangesAsync();

            // --- 4. KAPILARI KİLİTLEME: HAYALET RANDEVU OLUŞTURMA ---
            foreach (var saat in timeSlots)
            {
                var blokRandevu = new Appointment
                {
                    DoctorId = realDoctorId,
                    PatientId = user?.Id ?? 1, // Sistemi kilitli tutmak için doktorun/adminin kendi idsini kullanırız
                    AppointmentDate = blockDate,
                    AppointmentTime = saat,
                    CreatedAt = DateTime.Now
                };
                _context.Appointments.Add(blokRandevu);
            }

            await _context.SaveChangesAsync();

            // --- SONUÇ MESAJI ---
            string sonucMesaji;
            if (iptalSayisi > 0)
            {
                sonucMesaji = $"İşlem başarılı. Seçili saat aralığı kapatıldı ve {iptalSayisi} adet aktif randevu iptal edilip hastalara bilgi maili gönderildi.";
            }
            else
            {
                sonucMesaji = "İşlem başarılı. Seçili saat aralığı yeni randevu alımına kilitlendi.";
            }

            return Ok(new { message = sonucMesaji });
        }

        // 🟢 GERİ AÇMA (KİLİT KALDIRMA) METODU
        [HttpPost("unblock-schedule/{id}")]
        public async Task<IActionResult> UnblockSchedule(int id, [FromBody] BlockScheduleRequest request)
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

            // --- 2. SAAT ARALIĞINI 15 DAKİKALIK DİLİMLERE BÖLME ---
            var timeSlots = new List<string>();
            if (TimeSpan.TryParse(request.StartTime, out TimeSpan startSpan) &&
                TimeSpan.TryParse(request.EndTime, out TimeSpan endSpan))
            {
                var currentSpan = startSpan;
                while (currentSpan <= endSpan) // Eşittir işareti burada da var!
                {
                    timeSlots.Add(currentSpan.ToString(@"hh\:mm"));
                    currentSpan = currentSpan.Add(TimeSpan.FromMinutes(15));
                }
            }
            else
            {
                return BadRequest("Geçersiz saat formatı.");
            }

            var blockDate = request.Date.Date;

            // --- 3. HAYALET RANDEVULARI (KİLİTLERİ) BUL VE SİL ---
            var existingBlocks = await _context.Appointments
                .Where(a => a.DoctorId == realDoctorId &&
                            a.AppointmentDate.Date == blockDate &&
                            timeSlots.Contains(a.AppointmentTime))
                .ToListAsync();

            int acilanSaatSayisi = 0;

            foreach (var app in existingBlocks)
            {
                // ÇOK ÖNEMLİ: Sadece doktorun kendi hesabıyla oluşturduğu hayalet randevuları sil!
                // Böylece araya kazara sızmış gerçek bir hasta randevusu varsa ona dokunmaz.
                if (app.PatientId == (user?.Id ?? 0))
                {
                    _context.Appointments.Remove(app);
                    acilanSaatSayisi++;
                }
            }

            await _context.SaveChangesAsync();

            // --- 4. SONUÇ MESAJI ---
            return Ok(new { message = $"İşlem başarılı. Seçili aralıktaki {acilanSaatSayisi} adet saat dilimi tekrar randevuya açıldı." });
        }
    } 
    public class DoctorCreateDto
    {
        public string FullName { get; set; } = string.Empty;
        public int SpecialtyId { get; set; }
    }

    public class BlockScheduleRequest
    {
        public DateTime Date { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
    }

}