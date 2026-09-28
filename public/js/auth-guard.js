/**
 * Digital Apsen - Auth Guard Ketat v1.0.28
 * FIX: Dashboard guru & murid tercampur, sering logout, identitas hilang, logout ga balik ke login
 */

function parseJwtAuth(token){
  try{
    if(!token || typeof token !== 'string') return null;
    token = token.trim();
    if(token === '' || token === 'null' || token === 'undefined') return null;
    const parts = token.split('.');
    if(parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g,'+').replace(/_/g,'/');
    // Fix padding
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const jsonPayload = decodeURIComponent(atob(padded).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  }catch(e){
    console.warn('JWT parse fail:', e.message);
    return null;
  }
}

function getToken(){
  const t = localStorage.getItem('absensiswa_token');
  if(!t || t.trim() === '' || t === 'null' || t === 'undefined') return null;
  return t.trim();
}

function getRole(){
  const token = getToken();
  if(!token) return null;
  const payload = parseJwtAuth(token);
  return payload?.role || null;
}

function clearAuthOnly(){
  // HANYA hapus token & user, JANGAN clear all (biar device_id & welcome_seen tetap)
  localStorage.removeItem('absensiswa_token');
  localStorage.removeItem('absensiswa_user');
  localStorage.removeItem('absensiswa_siswa');
  localStorage.removeItem('absensiswa_guru');
  localStorage.removeItem('absensiswa_kelas');
  localStorage.removeItem('absensiswa_kode');
}

function logoutAndRedirect(target){
  clearAuthOnly();
  // Default ke welcome, bukan ke '/' yang bikin bingung
  window.location.href = target || '/welcome.html';
}

function enforceRole(allowedRoles, options = {}){
  const token = getToken();
  const redirectLogin = options.redirectLogin || '/welcome.html';
  const currentPath = window.location.pathname;

  // Jika tidak ada token tapi butuh auth -> redirect langsung ke login, JANGAN overlay lama
  if(!token){
    if(options.requireAuth){
      console.warn('🔒 Belum login, redirect ke', redirectLogin, 'dari', currentPath);
      // Jangan tampilkan overlay lama, langsung redirect biar ga bikin mental
      if(!options.silent){
        // Tampilkan toast cepat lalu redirect
        const isLoginPage = currentPath.includes('login') || currentPath === '/' || currentPath === '/index.html' || currentPath === '/welcome.html';
        if(!isLoginPage){
          window.location.href = redirectLogin;
          return { allowed: false, reason: 'NO_TOKEN_REDIRECT' };
        }
      }
      return { allowed: false, reason: 'NO_TOKEN' };
    }
    return { allowed: true, role: null, reason: 'PUBLIC' };
  }

  const payload = parseJwtAuth(token);
  if(!payload){
    console.warn('🔒 Token invalid, hapus token saja (bukan clear all)');
    clearAuthOnly();
    window.location.href = redirectLogin;
    return { allowed: false, reason: 'INVALID_TOKEN' };
  }

  // Cek expiry
  if(payload.exp && Date.now() >= payload.exp * 1000){
    console.warn('🔒 Token expired');
    clearAuthOnly();
    alert('Sesi login habis. Silakan login ulang ya!');
    window.location.href = redirectLogin;
    return { allowed: false, reason: 'EXPIRED' };
  }

  const role = payload.role;
  if(!role){
    console.warn('🔒 Role tidak ada di token');
    clearAuthOnly();
    window.location.href = redirectLogin;
    return { allowed: false, reason: 'NO_ROLE' };
  }

  // Jika allowedRoles null/empty, berarti butuh auth saja, role apa saja boleh
  if(!allowedRoles || allowedRoles.length===0){
    return { allowed: true, role, payload };
  }

  // Cek apakah role termasuk allowed - jika tidak, redirect LANGSUNG ke dashboard yang benar (jangan overlay 3.5 detik bikin mental)
  if(!allowedRoles.includes(role)){
    console.warn(`🚫 Role ${role} tidak boleh akses ${currentPath}, butuh ${allowedRoles.join(', ')}`);

    if(!options.silent){
      // Buat overlay tapi dengan redirect CEPAT 1 detik, bukan 3.5 detik, dan pesan jelas
      const existing = document.getElementById('roleMismatchOverlay');
      if(!existing){
        const overlay = document.createElement('div');
        overlay.id = 'roleMismatchOverlay';
        overlay.className = 'fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-6';
        overlay.innerHTML = `
          <div class="bg-white border-[3px] border-black rounded-[20px] p-6 max-w-[340px] w-full text-center [box-shadow:8px_8px_0px_#000]">
            <div class="w-16 h-16 bg-[#FFE600] border-[3px] border-black rounded-full flex items-center justify-center mx-auto">
              <span class="material-symbols-outlined text-[32px]">swap_horiz</span>
            </div>
            <h2 class="font-black text-[16px] uppercase mt-4">Salah Dashboard!</h2>
            <p class="text-[12px] mt-2 leading-[15px]">Kamu login sebagai <b class="bg-black text-white px-2 py-0.5 rounded">${role}</b><br/>tapi buka halaman untuk <b>${allowedRoles.join(' / ')}</b>.</p>
            <p class="text-[10px] mt-2 opacity-60">Otomatis pindah ke dashboard yang benar dalam 1 detik...</p>
            <div class="mt-5 grid grid-cols-1 gap-2">
              ${role==='SISWA' ? '<a href="/dashboard-siswa.html" class="bg-[#67FFB7] border-[2.5px] border-black py-3 rounded-full font-black text-[11px] uppercase text-center">Ke Dashboard Siswa</a>' : ''}
              ${['GURU','WALI_KELAS','ADMIN'].includes(role) ? '<a href="/dashboard-guru.html" class="bg-[#8A4CFC] text-white border-[2.5px] border-black py-3 rounded-full font-black text-[11px] uppercase text-center">Ke Dashboard Guru</a>' : ''}
              <button onclick="localStorage.removeItem('absensiswa_token'); localStorage.removeItem('absensiswa_user'); localStorage.removeItem('absensiswa_siswa'); localStorage.removeItem('absensiswa_guru'); location.href='/welcome.html'" class="bg-black text-white border-[2px] border-black py-2 rounded-full font-black text-[10px] uppercase">Logout & Ganti Akun</button>
            </div>
            <p class="text-[8px] mt-3 opacity-40">Digital Apsen v1.0.28 - Fix Dashboard Tercampur</p>
          </div>
        `;
        document.body.appendChild(overlay);
      }
    }

    // Redirect CEPAT ke dashboard yang benar (1 detik, bukan 3.5 detik)
    setTimeout(()=>{
      if(role==='SISWA') window.location.href = '/dashboard-siswa.html';
      else if(['GURU','WALI_KELAS','ADMIN'].includes(role)) window.location.href = '/dashboard-guru.html';
      else window.location.href = '/welcome.html';
    }, 1000);

    return { allowed: false, role, reason: 'ROLE_MISMATCH', allowedRoles };
  }

  return { allowed: true, role, payload };
}

function requireAuth(){
  return enforceRole(null, { requireAuth: true, redirectLogin: '/welcome.html' });
}

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
    '/rekap.html': { roles: [], requireAuth: true, redirectLogin: '/welcome.html' },
    '/profil.html': { roles: [], requireAuth: true, redirectLogin: '/welcome.html' },
    '/verifikasi-nik.html': { roles: [], requireAuth: true, redirectLogin: '/welcome.html' },
    '/setup.html': { roles: [], requireAuth: false, allowPublic: true },
    '/login-siswa.html': { roles: [], requireAuth: false, allowPublic: true },
    '/login-guru.html': { roles: [], requireAuth: false, allowPublic: true },
    '/daftar-guru.html': { roles: [], requireAuth: false, allowPublic: true },
    '/lupa-password-guru.html': { roles: [], requireAuth: false, allowPublic: true },
    '/index.html': { roles: [], requireAuth: false, allowPublic: true },
    '/': { roles: [], requireAuth: false, allowPublic: true },
    '/welcome.html': { roles: [], requireAuth: false, allowPublic: true },
  };

  const guard = guards[path] || { roles: [], requireAuth: false, allowPublic: true };

  if(guard.roles && guard.roles.length>0){
    return enforceRole(guard.roles, { requireAuth: guard.requireAuth, redirectLogin: guard.redirectLogin, allowPublic: guard.allowPublic });
  } else if(guard.requireAuth){
    return enforceRole(null, { requireAuth: true, redirectLogin: guard.redirectLogin, allowPublic: guard.allowPublic });
  } else {
    return { allowed: true, reason: 'PUBLIC_PAGE' };
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const result = autoGuard();
  console.log('🔒 Auth Guard v1.0.28:', window.location.pathname, result);
  window.authGuard = result;

  // FIX: Jika sudah login, cegah akses ke login pages (biar ga bingung)
  const path = window.location.pathname;
  const isLoginPage = path.includes('login-') || path.includes('daftar-guru') || path.includes('lupa-password');
  if(isLoginPage){
    const role = getRole();
    if(role){
      console.log('Sudah login sebagai', role, 'tapi buka', path, '- redirect ke dashboard');
      // Jangan auto redirect di login page, biar user bisa ganti akun, tapi kasih info
      const info = document.createElement('div');
      info.className = 'bg-[#FFE600] border-[2px] border-black rounded-xl p-3 m-5 text-center';
      info.innerHTML = `<p class="font-black text-[11px] uppercase">Kamu sudah login sebagai ${role}</p><p class="text-[10px] mt-1"><a href="${role==='SISWA'?'/dashboard-siswa.html':'/dashboard-guru.html'}" class="underline font-black">Ke Dashboard ${role}</a> • <button onclick="localStorage.removeItem('absensiswa_token'); localStorage.removeItem('absensiswa_siswa'); localStorage.removeItem('absensiswa_guru'); location.reload()" class="underline font-black">Logout dulu</button></p>`;
      const main = document.querySelector('main');
      if(main && !document.getElementById('alreadyLoggedInfo')){
        info.id = 'alreadyLoggedInfo';
        main.prepend(info);
      }
    }
  }
});

window.AuthGuard = { parseJwtAuth, getToken, getRole, enforceRole, requireAuth, autoGuard, clearAuthOnly, logoutAndRedirect };
console.log('🔒 Digital Apsen Auth Guard v1.0.28 Loaded - Fix Dashboard Tercampur & Sering Logout');
