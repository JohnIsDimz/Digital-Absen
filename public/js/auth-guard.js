/**
 * Digital Apsen - Auth Guard Ketat
 * Pastikan murid tidak bisa akses dashboard guru dan sebaliknya
 */

function parseJwtAuth(token){
  try{
    if(!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g,'+').replace(/_/g,'/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  }catch(e){ return null; }
}

function getToken(){ return localStorage.getItem('absensiswa_token'); }
function getRole(){
  const token = getToken();
  if(!token) return null;
  const payload = parseJwtAuth(token);
  return payload?.role || null;
}

function enforceRole(allowedRoles, options = {}){
  const token = getToken();
  const redirectLogin = options.redirectLogin || '/';
  const redirectUnauthorized = options.redirectUnauthorized || null;

  // Jika tidak ada token
  if(!token){
    if(options.requireAuth){
      console.warn('🔒 Belum login, redirect ke login');
      // Tampilkan pesan sopan, bukan error kasar
      const container = document.getElementById('profilContainer') || document.getElementById('riwayatPresensi') || document.getElementById('siswaRealList');
      if(container && !options.silent){
        // Biarin halaman tampilkan empty state Hai Belum Login, jangan redirect paksa untuk UX
        return { allowed: false, reason: 'NO_TOKEN' };
      }
      if(!options.allowPublic){
        window.location.href = redirectLogin;
        return { allowed: false, reason: 'NO_TOKEN_REDIRECT' };
      }
    }
    return { allowed: true, role: null, reason: 'PUBLIC' };
  }

  const payload = parseJwtAuth(token);
  if(!payload){
    console.warn('🔒 Token invalid, clear dan redirect');
    localStorage.clear();
    window.location.href = redirectLogin;
    return { allowed: false, reason: 'INVALID_TOKEN' };
  }

  // Cek expiry
  if(payload.exp && Date.now() >= payload.exp * 1000){
    console.warn('🔒 Token expired');
    localStorage.clear();
    alert('Sesi login kamu sudah berakhir. Yuk login ulang!');
    window.location.href = redirectLogin;
    return { allowed: false, reason: 'EXPIRED' };
  }

  const role = payload.role;

  // Jika allowedRoles null/empty, berarti butuh auth saja, role apa saja boleh
  if(!allowedRoles || allowedRoles.length===0){
    return { allowed: true, role, payload };
  }

  // Cek apakah role termasuk allowed
  if(!allowedRoles.includes(role)){
    console.warn(`🚫 Akses ditolak! Role ${role} tidak boleh akses halaman yang butuh ${allowedRoles.join(', ')}`);
    
    // Tampilkan overlay akses ditolak yang sopan
    if(!options.silent){
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-6';
      overlay.innerHTML = `
        <div class="bg-white border-[3px] border-black rounded-[20px] p-6 max-w-[320px] w-full text-center [box-shadow:8px_8px_0px_#000]">
          <div class="w-16 h-16 bg-[#FF90E8] border-[3px] border-black rounded-full flex items-center justify-center mx-auto">
            <span class="material-symbols-outlined text-[32px]">block</span>
          </div>
          <h2 class="font-black text-[16px] uppercase mt-4">Akses Ditolak</h2>
          <p class="text-[12px] mt-2 leading-[14px]">Hai! Halaman ini khusus <b>${allowedRoles.join(' / ')}</b>.<br/>Kamu login sebagai <b>${role}</b>, jadi tidak bisa akses halaman ini.</p>
          <p class="text-[10px] mt-3 opacity-60">Yuk kembali ke dashboard yang sesuai peran kamu.</p>
          <div class="mt-5 grid grid-cols-1 gap-2">
            ${role==='SISWA' ? '<a href="/dashboard-siswa.html" class="bg-[#67FFB7] border-[2.5px] border-black py-3 rounded-full font-black text-[11px] uppercase text-center">Ke Dashboard Siswa</a>' : ''}
            ${['GURU','WALI_KELAS','ADMIN'].includes(role) ? '<a href="/dashboard-guru.html" class="bg-[#8A4CFC] text-white border-[2.5px] border-black py-3 rounded-full font-black text-[11px] uppercase text-center">Ke Dashboard Guru</a>' : ''}
            <a href="/" class="bg-[#FFE600] border-[2.5px] border-black py-2.5 rounded-full font-black text-[11px] uppercase text-center">Ke Home</a>
            <button onclick="localStorage.clear(); location.href='/'" class="bg-black text-white border-[2px] border-black py-2 rounded-full font-black text-[10px] uppercase">Logout & Login Ulang</button>
          </div>
          <p class="text-[8px] mt-3 opacity-40">Digital Apsen - Keamanan Ketat • Role: ${role}</p>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    // Auto redirect setelah 3 detik jika ada redirectUnauthorized
    if(redirectUnauthorized){
      setTimeout(()=>{ window.location.href = redirectUnauthorized; }, 3000);
    } else {
      // Auto redirect berdasarkan role
      setTimeout(()=>{
        if(role==='SISWA') window.location.href = '/dashboard-siswa.html';
        else if(['GURU','WALI_KELAS','ADMIN'].includes(role)) window.location.href = '/dashboard-guru.html';
        else window.location.href = '/';
      }, 3500);
    }

    return { allowed: false, role, reason: 'ROLE_MISMATCH', allowedRoles };
  }

  return { allowed: true, role, payload };
}

// Helper untuk halaman yang butuh login saja (role apa saja boleh)
function requireAuth(){
  return enforceRole(null, { requireAuth: true });
}

// Helper untuk halaman publik (tidak butuh auth, tapi jika sudah login redirect)
function allowPublicOrRedirect(){
  const token = getToken();
  if(token){
    const role = getRole();
    // Jika sudah login, arahkan ke dashboard sesuai role
    if(role==='SISWA') { /* biarin di home atau redirect? */ }
    else if(['GURU','WALI_KELAS','ADMIN'].includes(role)) { /* biarin */ }
  }
  return { allowed: true };
}

// Auto-inject guard berdasarkan halaman
function autoGuard(){
  const path = window.location.pathname;
  const guards = {
    '/dashboard-siswa.html': { roles: ['SISWA'], requireAuth: true, redirectLogin: '/login-siswa.html' },
    '/dashboard-guru.html': { roles: ['GURU','WALI_KELAS','ADMIN'], requireAuth: true, redirectLogin: '/login-guru.html' },
    '/scan.html': { roles: ['SISWA'], requireAuth: true, redirectLogin: '/login-siswa.html' },
    '/izin.html': { roles: ['SISWA'], requireAuth: true, redirectLogin: '/login-siswa.html' },
    '/kelas.html': { roles: ['GURU','WALI_KELAS','ADMIN'], requireAuth: true, redirectLogin: '/login-guru.html' },
    '/siswa.html': { roles: ['GURU','WALI_KELAS','ADMIN'], requireAuth: true, redirectLogin: '/login-guru.html' },
    '/settings.html': { roles: ['GURU','WALI_KELAS','ADMIN'], requireAuth: true, redirectLogin: '/login-guru.html' },
    '/export.html': { roles: ['GURU','WALI_KELAS','ADMIN'], requireAuth: true, redirectLogin: '/login-guru.html' },
    // rekap, profil, verifikasi-nik boleh kedua role tapi harus login
    '/rekap.html': { roles: [], requireAuth: true, redirectLogin: '/' },
    '/profil.html': { roles: [], requireAuth: true, redirectLogin: '/' },
    '/verifikasi-nik.html': { roles: [], requireAuth: true, redirectLogin: '/' },
    // setup boleh public untuk init pertama, tapi jika sudah ada data harus guru
    '/setup.html': { roles: [], requireAuth: false, allowPublic: true },
    // login pages public
    '/login-siswa.html': { roles: [], requireAuth: false, allowPublic: true },
    '/login-guru.html': { roles: [], requireAuth: false, allowPublic: true },
    '/index.html': { roles: [], requireAuth: false, allowPublic: true },
    '/': { roles: [], requireAuth: false, allowPublic: true },
    '/welcome.html': { roles: [], requireAuth: false, allowPublic: true },
  };

  const guard = guards[path] || guards[path.replace('/','')] || { roles: [], requireAuth: false, allowPublic: true };
  
  if(guard.roles && guard.roles.length>0){
    return enforceRole(guard.roles, { requireAuth: guard.requireAuth, redirectLogin: guard.redirectLogin, allowPublic: guard.allowPublic });
  } else if(guard.requireAuth){
    return enforceRole(null, { requireAuth: true, redirectLogin: guard.redirectLogin, allowPublic: guard.allowPublic });
  } else {
    return { allowed: true, reason: 'PUBLIC_PAGE' };
  }
}

// Jalankan auto guard saat DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  const result = autoGuard();
  console.log('🔒 Auth Guard:', window.location.pathname, result);
  // Simpan untuk debug
  window.authGuard = result;
});

window.AuthGuard = { parseJwtAuth, getToken, getRole, enforceRole, requireAuth, autoGuard };
console.log('🔒 Digital Apsen Auth Guard Loaded - Keamanan Ketat Aktif');
