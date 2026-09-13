/* ========================================================
   Exame Instrutor — app.js
   SPA simples em JS puro. Sem dependências externas.
   Dados: window.QUESTIONS (definido em data/questions.js)
   ======================================================== */

(function(){
  'use strict';

  // ---------- Config ----------
  const STORAGE_KEY = 'instrutor_progress_v1';
  const HISTORY_KEY = 'instrutor_examHistory_v1';
  const EXAM_SIZE = 100;

  const MATERIAS = [
    { id:'Segurança Rodoviária',        slug:'seguranca',   short:'Segurança Rodoviária', cls:'seguranca' },
    { id:'Psicologia',                  slug:'psicologia',  short:'Psicologia',           cls:'psicologia' },
    { id:'Pedagogia',                   slug:'pedagogia',   short:'Pedagogia',            cls:'pedagogia' },
    { id:'Direito Rodoviário',          slug:'direito',     short:'Direito Rodoviário',   cls:'direito' },
    { id:'Mecânica/Técnica Automóvel',  slug:'mecanica',    short:'Mecânica',             cls:'mecanica' },
  ];

  function materiaMeta(materiaId){
    return MATERIAS.find(m => m.id === materiaId) || { slug:'', cls:'', short: materiaId };
  }

  // ---------- Data indexing ----------
  const ALL = window.QUESTIONS || [];
  const byUid = {};
  const byMateria = {};
  MATERIAS.forEach(m => byMateria[m.id] = []);
  ALL.forEach(q => {
    byUid[q.uid] = q;
    if(!byMateria[q.materia]) byMateria[q.materia] = [];
    byMateria[q.materia].push(q);
  });

  function temasOf(materiaId){
    const map = {};
    (byMateria[materiaId]||[]).forEach(q => {
      const t = q.tema || 'Geral';
      (map[t] = map[t] || []).push(q);
    });
    return Object.keys(map).sort((a,b)=> map[b].length - map[a].length).map(t => ({ tema:t, qs: map[t] }));
  }

  // Distribuição proporcional para o exame simulado (soma = EXAM_SIZE)
  function examDistribution(){
    const total = ALL.length;
    const raw = MATERIAS.map(m => ({ m, exact: byMateria[m.id].length / total * EXAM_SIZE }));
    let counts = raw.map(r => Math.floor(r.exact));
    let used = counts.reduce((a,b)=>a+b,0);
    let remainder = raw.map((r,i) => ({ i, frac: r.exact - counts[i] })).sort((a,b)=> b.frac - a.frac);
    let need = EXAM_SIZE - used;
    for(let k=0;k<need;k++){ counts[remainder[k % remainder.length].i]++; }
    const out = {};
    raw.forEach((r,i) => out[r.m.id] = counts[i]);
    return out;
  }

  // ---------- Progress storage ----------
  function loadProgress(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }catch(e){ return {}; }
  }
  function saveProgress(p){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }
  function loadHistory(){
    try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }catch(e){ return []; }
  }
  function saveHistory(h){
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  }

  let PROGRESS = loadProgress();

  function recordAnswer(uid, correct){
    const p = PROGRESS[uid] || { attempts:0, corrects:0, lastCorrect:null, lastAt:null };
    p.attempts++;
    if(correct) p.corrects++;
    p.lastCorrect = correct;
    p.lastAt = Date.now();
    PROGRESS[uid] = p;
    saveProgress(PROGRESS);
  }

  function materiaStats(materiaId){
    const qs = byMateria[materiaId] || [];
    let attempted = 0, corrects = 0, attempts = 0, wrong = 0;
    qs.forEach(q => {
      const p = PROGRESS[q.uid];
      if(p && p.attempts){
        attempted++;
        attempts += p.attempts;
        corrects += p.corrects;
        if(p.lastCorrect === false) wrong++;
      }
    });
    return {
      total: qs.length,
      attempted, attempts, corrects, wrong,
      acc: attempts ? Math.round(corrects/attempts*100) : null
    };
  }

  function overallStats(){
    let attempted=0, attempts=0, corrects=0;
    ALL.forEach(q => {
      const p = PROGRESS[q.uid];
      if(p && p.attempts){ attempted++; attempts+=p.attempts; corrects+=p.corrects; }
    });
    return { total: ALL.length, attempted, attempts, corrects, acc: attempts? Math.round(corrects/attempts*100): null };
  }

  function wrongQuestions(){
    return ALL.filter(q => {
      const p = PROGRESS[q.uid];
      return p && p.lastCorrect === false;
    });
  }

  // ---------- Utils ----------
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }
  function sample(arr, n){
    return shuffle(arr).slice(0, Math.min(n, arr.length));
  }
  function esc(str){
    if(str==null) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function optionKeys(q){
    return Object.keys(q.opcoes || {}).sort();
  }

  // ---------- Router / state ----------
  const root = document.getElementById('view-root');
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
  let state = { tab:'inicio' };

  function setTab(tab){
    state = { tab };
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
    render();
    window.scrollTo(0,0);
  }
  navButtons.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  function go(view, params){
    state = Object.assign({ tab: state.tab }, { view }, params||{});
    render();
    window.scrollTo(0,0);
  }

  function render(){
    if(state.view === 'examSession') return renderExamSession();
    if(state.view === 'materia') return renderMateriaDetail(state.materiaId);
    if(state.view === 'session') return renderSession();
    if(state.view === 'examIntro') return renderExamIntro();
    if(state.view === 'examResult') return renderExamResult(state.result);
    if(state.view === 'wrongList') return renderWrongList();

    switch(state.tab){
      case 'inicio': return renderInicio();
      case 'exame': return renderExamIntro();
      case 'estudar': return renderEstudar();
      case 'revisao': return renderRevisao();
      case 'stats': return renderStats();
      default: return renderInicio();
    }
  }

  // ---------- Views: Início ----------
  function renderInicio(){
    const os = overallStats();
    let html = `
      <div class="hero">
        <h1>Preparação para o exame de instrutor</h1>
        <p>Banco com ${ALL.length} perguntas reais, organizadas pelas cinco matérias do curso.</p>
      </div>
      <div class="stat-row">
        <div class="stat-box"><div class="num">${os.attempted}<span style="font-size:14px;color:var(--text-faint)"> / ${os.total}</span></div><div class="lbl">Perguntas praticadas</div></div>
        <div class="stat-box"><div class="num">${os.acc==null?'—':os.acc+'%'}</div><div class="lbl">Taxa de acerto global</div></div>
      </div>
      <div class="cta-exam" id="cta-exam">
        <div class="txt">
          <h3>Exame simulado</h3>
          <p>${EXAM_SIZE} perguntas, distribuídas como no exame real</p>
        </div>
        <div class="go">→</div>
      </div>
      <div class="section-label">Progresso por matéria</div>
      <div class="card" style="padding:.3rem 1.1rem;">
        ${MATERIAS.map(m => progressRow(m)).join('')}
      </div>
    `;
    root.innerHTML = html;
    document.getElementById('cta-exam').addEventListener('click', () => { setTabSilently('exame'); go('examIntro'); });
    MATERIAS.forEach(m => {
      const el = document.getElementById('row-'+m.slug);
      if(el) el.addEventListener('click', () => { setTabSilently('estudar'); go('materia', { materiaId:m.id }); });
    });
  }

  function setTabSilently(tab){
    state.tab = tab;
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
  }

  function progressRow(m){
    const s = materiaStats(m.id);
    const pct = s.total ? Math.round(s.attempted/s.total*100) : 0;
    return `
      <div class="progress-row" id="row-${m.slug}">
        <div class="swatch bg-${m.cls}"></div>
        <div class="body">
          <div class="top">
            <span>${esc(m.short)}</span>
            <span class="pct">${s.acc==null?'—':s.acc+'%'}</span>
          </div>
          <div class="bar-track"><div class="bar-fill bg-${m.cls}" style="width:${pct}%"></div></div>
          <div class="sub">${s.attempted}/${s.total} perguntas praticadas${s.wrong? ' · '+s.wrong+' por rever':''}</div>
        </div>
      </div>
    `;
  }

  // ---------- Views: Estudar (lista matérias) ----------
  function renderEstudar(){
    let html = `
      <div class="hero"><h1>Estudar por matéria</h1><p>Escolhe uma matéria para veres os temas e praticares.</p></div>
      <div class="cta-exam" id="start-study">
        <div class="txt">
          <h3>Começar sessão de estudo</h3>
          <p>Perguntas aleatórias de todas as matérias, com correção imediata</p>
        </div>
        <div class="go" aria-hidden="true">→</div>
      </div>
      <div class="section-label">Ou escolhe uma matéria</div>
      <div class="materia-grid">
        ${MATERIAS.map(m => {
          const s = materiaStats(m.id);
          return `
            <div class="materia-card" style="--c:var(--c-${m.cls})" id="mcard-${m.slug}">
              <h4>${esc(m.short)}</h4>
              <div class="count">${s.total} perguntas</div>
              <div class="acc m-${m.cls}">${s.acc==null?'—':s.acc+'%'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    root.innerHTML = html;
    document.getElementById('start-study').addEventListener('click', () => {
      startSession(shuffle(ALL), { label:'Estudo geral', backView:{ view:null } });
    });
    MATERIAS.forEach(m => {
      document.getElementById('mcard-'+m.slug).addEventListener('click', () => go('materia', { materiaId:m.id }));
    });
  }

  function renderMateriaDetail(materiaId){
    const meta = materiaMeta(materiaId);
    const temas = temasOf(materiaId);
    const s = materiaStats(materiaId);
    let html = `
      <button class="back-link" id="back-btn">‹ Matérias</button>
      <div class="hero" style="padding-bottom:.6rem;">
        <h1 class="m-${meta.cls}">${esc(meta.short)}</h1>
        <p>${s.total} perguntas · ${s.attempted} praticadas · ${s.acc==null?'sem dados':'acerto de '+s.acc+'%'}</p>
      </div>
      <div class="card" style="cursor:pointer;" id="all-tema">
        <div class="tema-row" style="border:none;padding:0;background:none;">
          <div>
            <div class="name">Todas as perguntas desta matéria</div>
            <div class="meta">${s.total} perguntas · sessão aleatória</div>
          </div>
          <div class="arrow">›</div>
        </div>
      </div>
      <div class="section-label">Temas</div>
      <div class="tema-list">
        ${temas.map((t,i) => {
          const tStats = temaStats(t.qs);
          return `
            <div class="tema-row" data-idx="${i}">
              <div>
                <div class="name">${esc(t.tema)}</div>
                <div class="meta">${t.qs.length} perguntas${tStats.attempted? ' · '+tStats.attempted+' praticadas':''}${tStats.acc!=null? ' · '+tStats.acc+'% acerto':''}</div>
              </div>
              <div class="arrow">›</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    root.innerHTML = html;
    document.getElementById('back-btn').addEventListener('click', () => go(null));
    document.getElementById('all-tema').addEventListener('click', () => startSession(shuffle(byMateria[materiaId]), { label: meta.short, backView:{view:'materia', materiaId} }));
    temas.forEach((t,i) => {
      document.querySelector(`.tema-row[data-idx="${i}"]`).addEventListener('click', () => {
        startSession(shuffle(t.qs), { label: t.tema, backView:{view:'materia', materiaId} });
      });
    });
  }

  function temaStats(qs){
    let attempted=0, attempts=0, corrects=0;
    qs.forEach(q => { const p=PROGRESS[q.uid]; if(p&&p.attempts){attempted++;attempts+=p.attempts;corrects+=p.corrects;} });
    return { attempted, acc: attempts? Math.round(corrects/attempts*100): null };
  }

  // ---------- Practice / review session (immediate feedback) ----------
  let SESSION = null; // { queue:[uid...], idx, answers:{}, label, mode:'practice'|'review', backView }

  function startSession(qs, opts){
    if(!qs.length){ return; }
    SESSION = {
      queue: qs.map(q=>q.uid),
      idx: 0,
      answers: {},         // uid -> chosen letter
      correctSoFar: 0,
      total: qs.length,
      label: opts.label || '',
      backView: opts.backView || null,
    };
    go('session');
  }

  function renderSession(){
    if(!SESSION){ return go(null); }
    const uid = SESSION.queue[SESSION.idx];
    const q = byUid[uid];
    const meta = materiaMeta(q.materia);
    const keys = optionKeys(q);
    const chosen = SESSION.answers[uid] || null;

    let optsHtml = keys.map(k => {
      let cls = 'option';
      if(chosen){
        cls += ' disabled';
        if(k === q.correta) cls += ' correct';
        else if(k === chosen) cls += ' incorrect';
      }
      return `<div class="${cls}" data-k="${k}"><div class="letter">${k}</div><div>${esc(q.opcoes[k])}</div></div>`;
    }).join('');

    let feedback = '';
    let explain = '';
    if(chosen){
      const ok = chosen === q.correta;
      feedback = `<div class="feedback-banner ${ok?'good':'bad'}">${ok? '✓ Resposta correta' : '✕ Resposta incorreta — a correta é '+q.correta}</div>`;
      explain = `<div class="explain-block">`;
      if(q.explicacao) explain += `<div class="exp-item"><b>Explicação:</b> ${esc(q.explicacao)}</div>`;
      if(q.porque_correta) explain += `<div class="exp-item"><b>Porque está certa:</b> ${esc(q.porque_correta)}</div>`;
      if(q.porque_erradas) explain += `<div class="exp-item"><b>Sobre as outras opções:</b> ${esc(q.porque_erradas)}</div>`;
      if(q.armadilha) explain += `<div class="trap">⚠ ${esc(q.armadilha)}</div>`;
      if(q.fonte) explain += `<div class="source">Fonte: ${esc(q.fonte)}${q.fonte_pagina?', '+esc(q.fonte_pagina):''}</div>`;
      explain += `</div>`;
    }

    const pct = Math.round((SESSION.idx)/SESSION.total*100);

    root.innerHTML = `
      <button class="back-link" id="back-btn">‹ Terminar sessão</button>
      <div class="session-header">
        <span class="chip m-${meta.cls}"><span class="dot"></span>${esc(meta.short)}${q.tema && q.tema!==q.materia? ' · '+esc(q.tema):''}</span>
        <span class="prog-txt">${SESSION.idx+1} / ${SESSION.total}</span>
      </div>
      <div class="session-bar"><div class="session-bar-fill" style="width:${pct}%"></div></div>
      <div class="q-card">
        <div class="q-text">${esc(q.pergunta)}</div>
        <div class="options">${optsHtml}</div>
        ${feedback}
        ${explain}
      </div>
      <div class="session-actions">
        <button class="btn" id="prev-btn" ${SESSION.idx===0?'disabled':''}>Pergunta anterior</button>
        <button class="btn btn-primary" id="next-btn" ${chosen?'':'disabled'}>${SESSION.idx+1 < SESSION.total ? 'Próxima pergunta' : 'Concluir sessão'}</button>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', endSession);
    if(!chosen){
      keys.forEach(k => {
        root.querySelector(`.option[data-k="${k}"]`).addEventListener('click', () => selectOption(k));
      });
    }
    document.getElementById('prev-btn').addEventListener('click', previousQuestion);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  function selectOption(k){
    const uid = SESSION.queue[SESSION.idx];
    const q = byUid[uid];
    const correct = k === q.correta;
    recordAnswer(uid, correct);
    if(correct) SESSION.correctSoFar++;
    SESSION.answers[uid] = k;
    renderSession();
  }

  function previousQuestion(){
    if(SESSION.idx === 0){ return; }
    SESSION.idx--;
    renderSession();
  }

  function nextQuestion(){
    if(SESSION.idx+1 >= SESSION.total){ return endSession(); }
    SESSION.idx++;
    renderSession();
  }

  function endSession(){
    const back = SESSION ? SESSION.backView : null;
    SESSION = null;
    if(back) go(back.view, back);
    else go(null);
  }

  // ---------- Exame simulado ----------
  function renderExamIntro(){
    const dist = examDistribution();
    root.innerHTML = `
      <div class="hero"><h1>Exame simulado</h1><p>${EXAM_SIZE} perguntas escolhidas aleatoriamente, na mesma proporção das cinco matérias do curso. Sem correção imediata — o resultado aparece só no final, tal como no exame real.</p></div>
      <div class="card">
        <div class="section-label" style="margin-top:0;">Distribuição das perguntas</div>
        ${MATERIAS.map(m => `
          <div style="display:flex;justify-content:space-between;padding:.4rem 0;font-size:14px;">
            <span class="m-${m.cls}">${esc(m.short)}</span><span style="font-family:var(--font-display);font-weight:600;">${dist[m.id]}</span>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:1.1rem;" id="start-exam">Começar exame</button>
    `;
    document.getElementById('start-exam').addEventListener('click', startExam);
  }

  function startExam(){
    const dist = examDistribution();
    let picked = [];
    MATERIAS.forEach(m => { picked = picked.concat(sample(byMateria[m.id], dist[m.id])); });
    picked = shuffle(picked);
    SESSION = {
      queue: picked.map(q=>q.uid),
      idx: 0,
      answers: {},       // uid -> chosen letter
      total: picked.length,
      isExam: true,
    };
    go('examSession');
  }

  // Sessão de exame (sem correção imediata)
  function renderExamSession(){
    if(!SESSION){ return go(null); }
    const uid = SESSION.queue[SESSION.idx];
    const q = byUid[uid];
    const meta = materiaMeta(q.materia);
    const keys = optionKeys(q);
    const chosen = SESSION.answers[uid] || null;

    let optsHtml = keys.map(k => {
      let cls = 'option' + (chosen===k ? ' selected' : '');
      return `<div class="${cls}" data-k="${k}"><div class="letter">${k}</div><div>${esc(q.opcoes[k])}</div></div>`;
    }).join('');

    const pct = Math.round((SESSION.idx)/SESSION.total*100);
    const isLast = SESSION.idx+1 >= SESSION.total;

    root.innerHTML = `
      <button class="back-link" id="back-btn">‹ Abandonar exame</button>
      <div class="session-header">
        <span class="chip m-${meta.cls}"><span class="dot"></span>${esc(meta.short)}</span>
        <span class="prog-txt">${SESSION.idx+1} / ${SESSION.total}</span>
      </div>
      <div class="session-bar"><div class="session-bar-fill" style="width:${pct}%"></div></div>
      <div class="q-card">
        <div class="q-text">${esc(q.pergunta)}</div>
        <div class="options">${optsHtml}</div>
      </div>
      <div class="session-actions">
        <button class="btn" id="prev-btn" ${SESSION.idx===0?'disabled':''}>Anterior</button>
        <button class="btn btn-primary" id="next-btn" style="flex:1;" ${chosen?'':'disabled'}>${isLast? 'Terminar exame':'Seguinte'}</button>
      </div>
    `;
    document.getElementById('back-btn').addEventListener('click', () => {
      if(confirm('Queres mesmo abandonar o exame? O progresso desta tentativa não fica registado.')){ SESSION=null; go(null); }
    });
    keys.forEach(k => {
      root.querySelector(`.option[data-k="${k}"]`).addEventListener('click', () => {
        SESSION.answers[uid] = k;
        renderExamSession();
      });
    });
    document.getElementById('prev-btn').addEventListener('click', () => { SESSION.idx--; renderExamSession(); });
    document.getElementById('next-btn').addEventListener('click', () => {
      if(isLast) finishExam(); else { SESSION.idx++; renderExamSession(); }
    });
  }

  function finishExam(){
    const byMat = {};
    MATERIAS.forEach(m => byMat[m.id] = { total:0, correct:0 });
    let correct = 0;
    const wrongDetails = [];
    SESSION.queue.forEach(uid => {
      const q = byUid[uid];
      const chosen = SESSION.answers[uid] || null;
      const ok = chosen === q.correta;
      recordAnswer(uid, ok);
      byMat[q.materia].total++;
      if(ok){ byMat[q.materia].correct++; correct++; }
      else wrongDetails.push({ q, chosen });
    });
    const result = {
      date: Date.now(),
      total: SESSION.total,
      correct,
      byMateria: byMat,
      wrongDetails,
    };
    const hist = loadHistory();
    hist.unshift({ date: result.date, total: result.total, correct: result.correct, byMateria: byMat });
    saveHistory(hist.slice(0, 50));
    SESSION = null;
    go('examResult', { result });
  }

  function renderExamResult(result){
    const pct = Math.round(result.correct/result.total*100);
    root.innerHTML = `
      <div class="result-hero">
        <div class="big-pct" style="color:${pct>=70?'var(--good)':'var(--bad)'}">${pct}%</div>
        <div class="sub">${result.correct} de ${result.total} perguntas corretas</div>
      </div>
      <div class="card">
        <div class="section-label" style="margin-top:0;">Resultado por matéria</div>
        <table class="result-mat-table">
          <thead><tr><th>Matéria</th><th>Certas</th><th>Total</th><th>%</th></tr></thead>
          <tbody>
            ${MATERIAS.map(m => {
              const b = result.byMateria[m.id];
              const p = b.total ? Math.round(b.correct/b.total*100) : 0;
              return `<tr><td class="m-${m.cls}">${esc(m.short)}</td><td class="num">${b.correct}</td><td class="num">${b.total}</td><td class="num">${p}%</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${result.wrongDetails.length ? `
        <div class="section-label">Perguntas erradas (${result.wrongDetails.length})</div>
        ${result.wrongDetails.map(({q,chosen}) => wrongItemHtml(q, chosen)).join('')}
      ` : `<div class="empty-state"><div class="glyph">🎉</div>Não erraste nenhuma pergunta neste exame.</div>`}
      <button class="btn btn-primary btn-block" style="margin-top:1rem;" id="done-btn">Voltar ao início</button>
    `;
    document.getElementById('done-btn').addEventListener('click', () => { setTabSilently('inicio'); go(null); });
  }

  function wrongItemHtml(q, chosen){
    const meta = materiaMeta(q.materia);
    return `
      <div class="wrong-item">
        <div class="q">${esc(q.pergunta)}</div>
        <div class="ans-line you">A tua resposta: ${chosen? chosen+') '+esc(q.opcoes[chosen]) : '(não respondida)'}</div>
        <div class="ans-line correct">Correta: ${q.correta}) ${esc(q.opcoes[q.correta])}</div>
        ${q.explicacao? `<div class="exp">${esc(q.explicacao)}</div>` : ''}
        ${q.armadilha? `<div class="exp">⚠ ${esc(q.armadilha)}</div>` : ''}
        <div class="chip m-${meta.cls}" style="margin-top:.5rem;"><span class="dot"></span>${esc(meta.short)}</div>
      </div>
    `;
  }

  // ---------- Revisão (perguntas erradas) ----------
  function renderRevisao(){
    const wrongs = wrongQuestions();
    const byMat = {};
    MATERIAS.forEach(m => byMat[m.id] = []);
    wrongs.forEach(q => { (byMat[q.materia] = byMat[q.materia]||[]).push(q); });

    if(!wrongs.length){
      root.innerHTML = `
        <div class="hero"><h1>Revisão</h1><p>Perguntas onde a tua última resposta foi incorreta.</p></div>
        <div class="empty-state"><div class="glyph">✓</div>Sem perguntas pendentes de revisão.<br>Continua a praticar — os erros aparecem aqui automaticamente.</div>
      `;
      return;
    }

    root.innerHTML = `
      <div class="hero"><h1>Revisão</h1><p>${wrongs.length} perguntas para reveres, com base na tua última tentativa.</p></div>
      <button class="btn btn-primary btn-block" id="review-all">Rever todas (${wrongs.length})</button>
      <div class="section-label">Por matéria</div>
      <div class="card" style="padding:.3rem 1.1rem;">
        ${MATERIAS.filter(m => byMat[m.id].length).map(m => `
          <div class="progress-row" data-slug="${m.slug}">
            <div class="swatch bg-${m.cls}"></div>
            <div class="body">
              <div class="top"><span>${esc(m.short)}</span><span class="pct">${byMat[m.id].length}</span></div>
              <div class="sub">perguntas por rever</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="section-label">Lista</div>
      <div id="wrong-preview"></div>
    `;
    document.getElementById('review-all').addEventListener('click', () => startSession(shuffle(wrongs), { label:'Revisão', backView:{view:'revisao'} }));
    MATERIAS.forEach(m => {
      const el = root.querySelector(`.progress-row[data-slug="${m.slug}"]`);
      if(el) el.addEventListener('click', () => startSession(shuffle(byMat[m.id]), { label:m.short, backView:{view:'revisao'} }));
    });

    const preview = document.getElementById('wrong-preview');
    preview.innerHTML = wrongs.slice(0,30).map(q => {
      const meta = materiaMeta(q.materia);
      return `<div class="tema-row" style="cursor:default;"><div><div class="name">${esc(q.pergunta)}</div><div class="meta"><span class="m-${meta.cls}">${esc(meta.short)}</span>${q.tema && q.tema!==q.materia? ' · '+esc(q.tema):''}</div></div></div>`;
    }).join('');
  }

  // ---------- Estatísticas ----------
  function renderStats(){
    const os = overallStats();
    const hist = loadHistory();
    root.innerHTML = `
      <div class="hero"><h1>Estatísticas</h1><p>O teu progresso é guardado neste dispositivo.</p></div>
      <div class="stat-row">
        <div class="stat-box"><div class="num">${os.attempted}/${os.total}</div><div class="lbl">Perguntas com pelo menos 1 tentativa</div></div>
        <div class="stat-box"><div class="num">${os.acc==null?'—':os.acc+'%'}</div><div class="lbl">Acerto global (todas as tentativas)</div></div>
      </div>
      <div class="card">
        <div class="section-label" style="margin-top:0;">Por matéria</div>
        <table class="stat-table">
          <thead><tr><th>Matéria</th><th>Banco</th><th>Praticadas</th><th>Acerto</th></tr></thead>
          <tbody>
            ${MATERIAS.map(m => {
              const s = materiaStats(m.id);
              return `<tr><td class="m-${m.cls}">${esc(m.short)}</td><td class="num">${s.total}</td><td class="num">${s.attempted}</td><td class="num">${s.acc==null?'—':s.acc+'%'}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="section-label">Histórico de exames simulados</div>
      <div class="card">
        ${hist.length ? hist.map(h => {
          const pct = Math.round(h.correct/h.total*100);
          const d = new Date(h.date);
          return `<div class="history-item"><span class="date">${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</span><span class="score" style="color:${pct>=70?'var(--good)':'var(--bad)'}">${h.correct}/${h.total} · ${pct}%</span></div>`;
        }).join('') : `<div class="empty-state" style="padding:1.2rem;">Ainda não fizeste nenhum exame simulado.</div>`}
      </div>
      <button class="btn btn-danger btn-block" style="margin-top:1.4rem;" id="reset-btn">Repor todo o progresso</button>
    `;
    document.getElementById('reset-btn').addEventListener('click', () => {
      if(confirm('Isto apaga todo o progresso guardado neste dispositivo (respostas, estatísticas e histórico de exames). Continuar?')){
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(HISTORY_KEY);
        PROGRESS = {};
        setTabSilently('inicio');
        go(null);
      }
    });
  }

  function renderWrongList(){ renderRevisao(); }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', () => {
    if(!ALL.length){
      root.innerHTML = `<div class="empty-state"><div class="glyph">⚠</div>Não foi possível carregar o banco de perguntas.<br>Verifica se o ficheiro data/questions.js está presente.</div>`;
      return;
    }
    setTab('inicio');
  });
})();
