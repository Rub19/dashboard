/* ETHONE legacy compatibility module: quote. */
//  QUOTE OF THE DAY
// ===================================================
const FALLBACK_QUOTES=[
  {content:"The only way to do great work is to love what you do.",author:"Steve Jobs"},
  {content:"In the middle of difficulty lies opportunity.",author:"Albert Einstein"},
  {content:"It does not matter how slowly you go as long as you do not stop.",author:"Confucius"},
  {content:"Life is what happens when you're busy making other plans.",author:"John Lennon"},
  {content:"The future belongs to those who believe in the beauty of their dreams.",author:"Eleanor Roosevelt"},
  {content:"Success is not final, failure is not fatal: it is the courage to continue that counts.",author:"Winston Churchill"},
  {content:"The only impossible journey is the one you never begin.",author:"Tony Robbins"},
  {content:"In the middle of every difficulty lies opportunity.",author:"Albert Einstein"},
  {content:"Believe you can and you're halfway there.",author:"Theodore Roosevelt"},
  {content:"Act as if what you do makes a difference. It does.",author:"William James"},
  {content:"You are never too old to set another goal or to dream a new dream.",author:"C.S. Lewis"},
  {content:"The secret of getting ahead is getting started.",author:"Mark Twain"},
];

async function fetchQuote(){
  const w=document.getElementById('quote-widget');if(!w)return;
  const dayIdx=new Date().getDate()%FALLBACK_QUOTES.length;
  const showQuote=(text,author)=>{
    w.innerHTML='<div class="quote-text">\u201c'+escapeHTML(text)+'\u201d</div><div class="quote-author">\u2014 '+escapeHTML(author)+'</div>';
  };
  // Quotes locales uniquement — APIs externes bloquées par CORS depuis GitHub Pages
  // Rotation basée sur le jour + l'heure pour varier dans la journée
  const hourIdx=Math.floor(new Date().getHours()/6); // change 4x/jour
  const idx=(new Date().getDate()*4+hourIdx)%FALLBACK_QUOTES.length;
  showQuote(FALLBACK_QUOTES[idx].content||FALLBACK_QUOTES[idx].q,FALLBACK_QUOTES[idx].author||FALLBACK_QUOTES[idx].a);
}


// ===================================================
