/* ETHONE legacy compatibility module: auth-credentials. */
async function doLogin(){
  const id=document.getElementById('auth-login-id').value.trim();
  const pw=document.getElementById('auth-login-pw').value;
  if(!id||!pw){document.getElementById('auth-error').textContent='Fill in all fields';return;}
  setAuthLoading(true);
  try{
    const isEmail=id.includes('@');
    let email=id;
    if(!isEmail){
      try{
        const res=await fetch(`${WORKER_URL}/supabase/username?username=${encodeURIComponent(id)}`);
        if(res.ok){const j=await res.json();if(j.email)email=j.email;}
      }catch(e){}
      if(email===id) email=id+'@dashboard.local';
    }
    const {data:loginData, error}=await sb.auth.signInWithPassword({email,password:pw});
    setAuthLoading(false);
    if(error){
      document.getElementById('auth-error').textContent='Wrong credentials — if you signed up with an email, use it to sign in';
      return;
    }
    await onAuthSuccess(loginData?.user);
  }catch(e){
    setAuthLoading(false);
    document.getElementById('auth-error').textContent='Connection error — please try again';
    console.error('Login error:',e);
  }
}

async function doRegister(){
  const username=document.getElementById('auth-reg-username').value.trim();
  const email=document.getElementById('auth-reg-email').value.trim();
  const pw=document.getElementById('auth-reg-pw').value;
  if(!username||!pw){document.getElementById('auth-error').textContent='Username and password required';return;}
  if(pw.length<6){document.getElementById('auth-error').textContent='Password too short (6 chars min)';return;}
  setAuthLoading(true);
  try{
    const {data:existing}=await sb.from('profiles').select('id').eq('username',username).single();
    if(existing){setAuthLoading(false);document.getElementById('auth-error').textContent='Username already taken';return;}
    const regEmail=email||username+'@dashboard.local';
    const {error}=await sb.auth.signUp({email:regEmail,password:pw,options:{data:{username}}});
    setAuthLoading(false);
    if(error){document.getElementById('auth-error').textContent=error.message;return;}
    toast(uiLang==='fr'?'Compte créé ! Connexion…':'Account created! Logging in…','success');
    setTimeout(async()=>{
      try{
        const {data:loginData2, error:e2}=await sb.auth.signInWithPassword({email:regEmail,password:pw});
        if(!e2)await onAuthSuccess(loginData2?.user);
      }catch(e){document.getElementById('auth-error').textContent='Login failed after registration';}
    },1000);
  }catch(e){
    setAuthLoading(false);
    document.getElementById('auth-error').textContent='Connection error — please try again';
    console.error('Register error:',e);
  }
}

async function doLogout(){
  await sb.auth.signOut();
  _sbUser=null;_isAdmin=false;
  document.getElementById('auth-screen').style.display='flex';
  document.getElementById('profile-screen').style.display='none';
  document.getElementById('main-sidebar').style.display='none';
  document.getElementById('main-content').style.display='none';
}
