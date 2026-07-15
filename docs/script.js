// Minimal CSV parser and client-side pagination (50 items/page)

function parseCSV(text){
  const rows = [];
  let i=0; const len=text.length;
  let row=[]; let field=''; let inQuotes=false;
  while(i<len){
    const c=text[i];
    if(inQuotes){
      if(c==='"'){
        if(text[i+1]==='"'){ field += '"'; i+=2; continue; }
        inQuotes=false; i++; continue;
      }
      field += c; i++; continue;
    }
    if(c==='"'){ inQuotes=true; i++; continue; }
    if(c===','){ row.push(field); field=''; i++; continue; }
    if(c==='\r'){ i++; continue; }
    if(c==='\n'){ row.push(field); rows.push(row); row=[]; field=''; i++; continue; }
    field += c; i++;
  }
  if(field!=='' || row.length>0){ row.push(field); rows.push(row); }
  return rows;
}

function uniq(arr){ return Array.from(new Set(arr)).filter(Boolean); }

const PAGE_SIZE = 50;
let currentPage = 1;
let gamesData = [];
let filteredData = [];

async function loadAndRender(){
  const res = await fetch('listing.csv');
  const txt = await res.text();
  const rows = parseCSV(txt);
  if(rows.length===0) return;
  const headers = rows[0].map(h=>h.trim());
  const data = rows.slice(1).map(r=>{
    const obj={};
    for(let i=0;i<headers.length;i++){ obj[headers[i]||('col'+i)] = r[i]||'' }
    return obj;
  });
  gamesData = data;
  filteredData = data;
  populateCategoryFilter(data, headers);
  setupSearch();
  renderPage(1);
}

function populateCategoryFilter(data, headers){
  const catName = 'Main Category';
  const sel = document.getElementById('category');
  if(!headers.includes(catName)) return;
  const cats = uniq(data.map(d=>d[catName] && d[catName].trim()));
  cats.sort((a,b)=> (a||'').localeCompare(b||''));
  cats.forEach(c=>{ if(!c) return; const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o)});
  sel.addEventListener('change',()=>{ applyFilters(); });
}

function setupSearch(){
  const search = document.getElementById('search');
  const clear = document.getElementById('clear');
  let t;
  search.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>applyFilters(),150)});
  clear.addEventListener('click',()=>{ search.value=''; document.getElementById('category').value=''; applyFilters(); });
}

function applyFilters(){
  const q = document.getElementById('search').value.toLowerCase().trim();
  const cat = document.getElementById('category').value;
  filteredData = gamesData.filter(g=>{
    if(cat && (g['Main Category']||'')!==cat) return false;
    if(!q) return true;
    const keys = ['Titre en anglais','Titre en Japonais','Editeurs','Main Category','Sub Category'];
    return keys.some(k=> (g[k]||'').toLowerCase().includes(q));
  });
  renderPage(1);
}

function renderPage(page){
  currentPage = Math.max(1, Math.min(page, Math.ceil(filteredData.length / PAGE_SIZE) || 1));
  const start = (currentPage-1)*PAGE_SIZE;
  const list = filteredData.slice(start, start + PAGE_SIZE);
  renderTable(list);
  renderPager('pager-top');
  renderPager('pager-bottom');
}

function renderTable(data){
  const tbody = document.querySelector('#games tbody');
  tbody.innerHTML='';
  const countEl = document.getElementById('count');
  countEl.textContent = `${filteredData.length.toLocaleString()} jeux — page ${currentPage} / ${Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))}`;
  for(const g of data){
    const tr = document.createElement('tr');
    const cells = [
      g['Titre en anglais']||g['Title']||'',
      g['Titre en Japonais']||'',
      g['Editeurs']||'',
      g['Numéro de série']||g['Serial']||'',
      g['Date']||'',
      g['Main Category']||'',
      g['Sub Category']||''
    ];
    cells.forEach(c=>{ const td=document.createElement('td'); td.textContent=c; tr.appendChild(td); });
    tbody.appendChild(tr);
  }
}

function renderPager(containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML='';
  const total = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  // Prev
  const prev = document.createElement('button'); prev.textContent='◀'; prev.disabled = currentPage===1; prev.addEventListener('click',()=>renderPage(currentPage-1)); container.appendChild(prev);
  // page window
  const maxButtons = 9; // total numbered buttons to show
  let start = Math.max(1, currentPage - Math.floor(maxButtons/2));
  let end = start + maxButtons -1;
  if(end>total){ end=total; start=Math.max(1,end-maxButtons+1); }
  for(let p=start;p<=end;p++){
    const b = document.createElement('button'); b.textContent = String(p); if(p===currentPage) b.classList.add('active'); b.addEventListener('click',()=>renderPage(p)); container.appendChild(b);
  }
  // Next
  const next = document.createElement('button'); next.textContent='▶'; next.disabled = currentPage===total; next.addEventListener('click',()=>renderPage(currentPage+1)); container.appendChild(next);
}

loadAndRender().catch(console.error);
