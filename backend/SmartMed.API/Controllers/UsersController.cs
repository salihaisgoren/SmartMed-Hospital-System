using Microsoft.AspNetCore.Mvc;
using SmartMed.API.Data;
using SmartMed.API.DTOs;
using System.Security.Cryptography;
using System.Text;
using SmartMed.API.Models;

namespace SmartMed.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound("Kullanıcı bulunamadı.");
            }

          
            var userDto = new
            {
                user.TcKimlikNo,
                user.FullName,
                user.Email,
                user.PhoneNumber
            };

            return Ok(userDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, UserUpdateDto request)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound("Kullanıcı bulunamadı.");
            }

           
            user.Email = request.Email;
            user.PhoneNumber = request.PhoneNumber;

            
            if (!string.IsNullOrEmpty(request.Password))
            {
                
                if (request.Password.Length < 8)
                {
                    return BadRequest(new { message = "Şifreniz en az 8 karakter olmalıdır." });
                }

                
                using var hmac = SHA256.Create();
                var passwordBytes = Encoding.UTF8.GetBytes(request.Password);
                var hashBytes = hmac.ComputeHash(passwordBytes);

                user.PasswordHash = Convert.ToBase64String(hashBytes);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Bilgileriniz (ve varsa şifreniz) başarıyla güncellendi!" });
        }
    }
}