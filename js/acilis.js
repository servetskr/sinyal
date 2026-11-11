// Kayıtlı oturum ya da uygulama adresi varsa tanıtım yerine açılış ekranı gösterilir (sayfa çizilmeden önce, eşzamanlı)
try{if(sessionStorage.getItem('sinyal-oturum')||/^#\/./.test(location.hash)||localStorage.getItem('sinyal-bulut')||localStorage.getItem('sinyal-ogrenci')){document.getElementById('tanitim').hidden=true;document.getElementById('acilis').hidden=false}}catch(e){}
