using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;  
using SmartMed.API.Data;
using SmartMed.API.DTOs;
using SmartMed.API.Models;
using SmartMed.API.Services;
using System.IdentityModel.Tokens.Jwt; 
using System.Security.Claims;          
using System.Security.Cryptography;
using System.Text;

namespace SmartMed.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly EmailService _emailService; // <-- Bunu ekle

        public AuthController(ApplicationDbContext context, IConfiguration configuration, EmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService; // <-- Eşitle
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto request)
        {
            
            if (await _context.Users.AnyAsync(u => u.TcKimlikNo == request.TcNo))
            {
                return BadRequest("Bu TC Kimlik Numarası ile zaten kayıt olunmuş.");
            }

            var passwordHash = CreatePasswordHash(request.Sifre);

            
            string atananRol = "Patient"; 

          
            string girilenIsim = request.AdSoyad.Trim();

            if (girilenIsim.StartsWith("Dr.", StringComparison.OrdinalIgnoreCase) ||
                girilenIsim.StartsWith("Dr ", StringComparison.OrdinalIgnoreCase))
            {
               
                var isStaffMember = await _context.Doctors.AnyAsync(d => d.FullName == girilenIsim);

                if (isStaffMember)
                {
                    atananRol = "Doctor"; 
                }
                else
                {
                    
                    return BadRequest("Bu isimde bir doktor hastane kadrosunda bulunamadı. Lütfen Yönetici ile görüşün."); 
                }
            }
            

            var newUser = new User
            {
                TcKimlikNo = request.TcNo,
                FullName = request.AdSoyad,
                PhoneNumber = request.Telefon,
                Email = request.Email,
                PasswordHash = passwordHash,
                Role = atananRol,
                BirthYear = request.BirthYear
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Kayıt başarıyla tamamlandı! Atanan Rol: {atananRol}" });
        }
        
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.TcKimlikNo == request.TcNo);

            if (user == null)
            {
                return BadRequest("Bu TC numarasına ait kullanıcı bulunamadı.");
            }

            if (!VerifyPasswordHash(request.Sifre, user.PasswordHash))
            {
                return BadRequest("Şifre hatalı.");
            }

           
            string token = CreateToken(user);

            int yas = DateTime.Now.Year - user.BirthYear;
            bool vipDurumu = yas >= 65;

            return Ok(new
            {
                token = token,          
                message = "Giriş Başarılı!",
                adSoyad = user.FullName,
                role = user.Role,       
                userId = user.Id,
                isVip = vipDurumu
            });
        }

       
        private string CreateToken(User user)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.FullName),

                new Claim(ClaimTypes.Role, user.Role)
            };

           
            var keyStr = _configuration.GetSection("AppSettings:Token").Value;

            if (string.IsNullOrEmpty(keyStr))
            {
                keyStr = "bu_benim_cok_gizli_anahtarim_lutfen_bunu_degistir_en_az_32_karakter";
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyStr));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var token = new JwtSecurityToken(
                    claims: claims,
                    expires: DateTime.Now.AddDays(1),
                    signingCredentials: creds
                );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            return jwt;
        }

        
        private string CreatePasswordHash(string password)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }

        private bool VerifyPasswordHash(string password, string storedHash)
        {
            var hash = CreatePasswordHash(password);
            return hash == storedHash;
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(string email)
        {
            // 1. Veritabanında bu mail adresine sahip kullanıcıyı bul
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            // Güvenlik Önlemi: Kullanıcı yoksa bile "Mail gönderildi" de ki 
            // kötü niyetli kişiler hangi maillerin kayıtlı olduğunu anlayamasın.
            if (user == null)
            {
                return Ok(new { message = "Eğer sistemde kayıtlıysanız, şifre sıfırlama kodu mail adresinize gönderilmiştir." });
            }

            // 2. 6 haneli rastgele bir kod üret (Örn: 482915)
            var code = new Random().Next(100000, 999999).ToString();

            // 3. Kodu veritabanına kaydet (User tablosundaki yeni alanımıza)
            user.PasswordResetCode = code;

            // Veritabanını güncelle
            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            // 4. Mail Gönderme İşlemi
            // (EmailService'i buraya çağırmak için aşağıdaki küçük ipucuna bak)

            // Mail içeriğini hazırla
            string mesaj = $@"
                <h3>Şifre Sıfırlama İsteği</h3>
                <p>Merhaba {user.FullName},</p>
                <p>Şifrenizi sıfırlamak için kullanacağınız kod aşağıdadır:</p>
                <h1 style='color:#3498db;'>{code}</h1>
                <p>Bu kodu kimseyle paylaşmayınız.</p>
            ";

            // Email servisini çağırıp maili atıyoruz
            _emailService.SendEmail(user.Email, "Şifre Sıfırlama Kodu", mesaj);

            return Ok(new { message = "Sıfırlama kodu mail adresinize başarıyla gönderildi." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
        {
            // 1. Kullanıcıyı bul
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
                return BadRequest("Kullanıcı bulunamadı.");

            // 2. Kod doğru mu?
            if (user.PasswordResetCode != request.Code)
            {
                return BadRequest("Girdiğiniz kod hatalı veya süresi dolmuş.");
            }

            // 3. Şifreyi Güncelle (DÜZELTME BURADA 👇)
            // Artık şifreyi dümdüz değil, Hashleyerek (şifreleyerek) kaydediyoruz.
            user.PasswordHash = CreatePasswordHash(request.NewPassword);

            // 4. Kodu temizle (Tek kullanımlık olsun)
            user.PasswordResetCode = null;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz." });
        }
    }
    public class ResetPasswordDto
    {
        public string Email { get; set; }
        public string Code { get; set; }
        public string NewPassword { get; set; }
    }
}