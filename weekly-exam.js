// Modul: Həftəlik İmtahan Sistemi
// Məqsəd: Weekly exam ilə bağlı bütün funksiyaları, UI modalları və admin əməliyyatlarını
//         ayrıca modulda toplamaq. Bütün API-lər window altında saxlanılır ki, mövcud
//         çağırışlar (onclick, data-action) eynilə işləsin.
//
// Asılılıqlar: window.db, window.firebase, window.currentUser, window.categories,
//              window.escapeHtml, window.showNotification, window.closeModal
// Dəyişilməyənlər: ID-lər, backend sənədləri, localStorage açarları

(function(){
  function __getUid() {
    try {
      if (typeof firebase !== 'undefined' && firebase && typeof firebase.auth === 'function') {
        var au = firebase.auth().currentUser;
        if (au && au.uid) return String(au.uid);
      }
    } catch(_) {}
    try {
      var u = (typeof window !== 'undefined' ? window.currentUser : null) || (typeof currentUser !== 'undefined' ? currentUser : null);
      var id = u && (u.id || u.uid) ? (u.id || u.uid) : '';
      if (id) return String(id);
    } catch(_) {}
    return '';
  }
  function __isQuestionsDisabled(cat) {
    return !!cat && String(cat.questionsMode || '').toLowerCase() === 'none';
  }
  function __getQuestionsMode(cat) {
    if (!cat) return 'none';
    var m = String(cat.questionsMode || '').toLowerCase();
    if (m === 'none' || m === 'inline' || m === 'subcollection') return m;
    if (__isQuestionsDisabled(cat)) return 'none';
    if (cat.questionsInline === false) return 'subcollection';
    return 'inline';
  }
  function __isSpecialRoot(cat) {
    if (!cat) return false;
    var isSpec = (cat.examType === 'special' || cat.exam_type === 'special' || String(cat.id || '').startsWith('special_'));
    return isSpec && (!cat.parentId);
  }
  async function __weeklyFetchSubcollectionQuestions(catId) {
    if (!db) return [];
    catId = String(catId || '');
    if (!catId) return [];
    var snap = null;
    try {
      snap = await db.collection('category_questions').where('categoryId','==', catId).orderBy('createdAt','asc').get();
    } catch (e) {
      snap = await db.collection('category_questions').where('categoryId','==', catId).get();
    }
    var qs = snap.docs.map(function(d){ return { id: d.id, ...d.data() }; })
      .filter(function(q){ return q && q.deleted !== true && q.legacy !== true; })
      .map(function(q){
        var opts = (Array.isArray(q.options) && q.options.length) ? q.options : (Array.isArray(q.variants) ? q.variants : []);
        var correct = 0;
        if (typeof q.correctIndex === 'number') correct = q.correctIndex;
        else if (typeof q.correct === 'number') correct = q.correct;
        else if (typeof q.answer === 'number') correct = q.answer;
        return { ...q, options: opts, correctIndex: correct };
      });
    return qs;
  }
  async function __weeklyGetQuestionsForCategory(cat, excludeIds, cache) {
    var mode = __getQuestionsMode(cat);
    var id = cat && cat.id != null ? String(cat.id) : '';
    if (!cat || !id) return { mode: 'none', all: [], available: [], totalCount: 0, reason: 'missing' };
    if (__isSpecialRoot(cat)) return { mode: mode, all: [], available: [], totalCount: 0, reason: 'special_root' };
    if (mode === 'none') return { mode: mode, all: [], available: [], totalCount: 0, reason: 'mode_none' };
    if (mode === 'inline') {
      var allInline = (Array.isArray(cat.questions) ? cat.questions : []).filter(function(q){ return q && q.deleted !== true; });
      var availInline = excludeIds ? allInline.filter(function(q){ return !excludeIds.has(String(q.id)); }) : allInline;
      return { mode: mode, all: allInline, available: availInline, totalCount: allInline.length, reason: allInline.length ? 'ok' : 'empty_inline' };
    }
    if (cache && cache.has(id)) {
      var cached = cache.get(id) || [];
      var allCached = cached.filter(function(q){ return q && q.deleted !== true && q.legacy !== true; });
      var availCached = excludeIds ? allCached.filter(function(q){ return !excludeIds.has(String(q.id)); }) : allCached;
      return { mode: mode, all: allCached, available: availCached, totalCount: allCached.length, reason: allCached.length ? 'ok' : 'empty_subcollection' };
    }
    var all = await __weeklyFetchSubcollectionQuestions(id);
    if (cache) cache.set(id, all);
    var avail = excludeIds ? all.filter(function(q){ return !excludeIds.has(String(q.id)); }) : all;
    return { mode: mode, all: all, available: avail, totalCount: all.length, reason: all.length ? 'ok' : 'empty_subcollection' };
  }
  function __collectSubtreeIds(rootId) {
    rootId = String(rootId || '');
    var all = Array.isArray(categories) ? categories : [];
    var byParent = new Map();
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      var pid = c && c.parentId != null ? String(c.parentId) : null;
      var id = c && c.id != null ? String(c.id) : null;
      if (!id) continue;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(id);
    }
    var visited = new Set();
    var q = [rootId];
    while (q.length) {
      var cur = q.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      var kids = byParent.get(cur) || [];
      for (var k = 0; k < kids.length; k++) q.push(kids[k]);
    }
    return visited;
  }
  function __leafCategoriesUnder(rootId) {
    var subtree = __collectSubtreeIds(rootId);
    var all = Array.isArray(categories) ? categories : [];
    var hasChild = new Set();
    all.forEach(function(c) {
      if (!c || c.parentId == null) return;
      var pid = String(c.parentId);
      if (subtree.has(pid)) hasChild.add(pid);
    });
    return all.filter(function(c) {
      if (!c || c.id == null) return false;
      var id = String(c.id);
      if (id === String(rootId)) return false;
      if (!subtree.has(id)) return false;
      if (c.deleted === true) return false;
      if (__isQuestionsDisabled(c)) return false;
      if (hasChild.has(id)) return false;
      if (__isSpecialRoot(c)) return false;
      return true;
    });
  }

  function __normalizeCatName(name) {
    name = String(name || '');
    try { name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch(_) {}
    name = name.toLowerCase();
    name = name.replace(/[\s\.\,\;\:\(\)\[\]\{\}\-–—_]+/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();
    return name;
  }

  function __prokQuotaSchema() {
    return [
      { name: 'Cinayət Məcəlləsi', count: 20 },
      { name: 'Cinayət Prosessual Məcəllə', count: 20 },
      { name: 'Konstitusiya', count: 6 },
      { name: 'Normativ Hüquqi Aktlar', count: 2 },
      { name: 'İnzibati Xətalar Məcəlləsi', count: 5 },
      { name: 'Mülki Məcəllə', count: 2 },
      { name: 'Mülki Prosessual Məcəllə', count: 2 },
      { name: 'Əmək Məcəlləsi', count: 1 },
      { name: 'Prokurorluq haqqında', count: 8 },
      { name: 'Prokurorluq orqanlarında qulluq keçmə', count: 6 },
      { name: 'Korrupsiya', count: 3 },
      { name: 'Polis haqqında qanun', count: 1 },
      { name: 'Əməliyyat-axtarış fəaliyyəti haqqında', count: 2 },
      { name: 'Məhkəmələr və Hakimlər haqqında', count: 1 },
      { name: 'Vəkillər və Vəkillik', count: 1 }
    ];
  }

  function __prokResolveSchemaIds(schema, opts) {
    opts = opts || {};
    var rootId = String(opts.rootId || 'special_prokurorluq');
    var leaves = __leafCategoriesUnder(rootId);
    var direct = leaves.filter(function(c){ return c && String(c.parentId || '') === rootId; });
    var pool1 = direct.length ? direct : leaves;
    var byNorm = new Map();
    for (var i = 0; i < pool1.length; i++) {
      var c = pool1[i] || {};
      var n = __normalizeCatName(c.name);
      if (!n) continue;
      if (!byNorm.has(n)) byNorm.set(n, c);
    }
    var out = [];
    for (var j = 0; j < schema.length; j++) {
      var s = schema[j] || {};
      var n2 = __normalizeCatName(s.name);
      var c2 = byNorm.get(n2) || null;
      if (c2 && c2.id != null) out.push({ id: String(c2.id), name: String(c2.name || s.name || ''), count: Number(s.count) || 0 });
      else out.push({ id: null, name: String(s.name || ''), count: Number(s.count) || 0, missing: true });
    }
    return out;
  }

  function __toMillis(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      var n = Number(v);
      return isNaN(n) ? null : n;
    }
    try { if (typeof v.toMillis === 'function') return v.toMillis(); } catch(_) {}
    try { if (typeof v.toDate === 'function') return v.toDate().getTime(); } catch(_) {}
    return null;
  }

  function __prokSortQuestions(a, b) {
    var aUsed = __toMillis(a && a.lastUsedAt);
    var bUsed = __toMillis(b && b.lastUsedAt);
    var aFresh = (aUsed == null);
    var bFresh = (bUsed == null);
    if (aFresh !== bFresh) return aFresh ? -1 : 1;
    if (aUsed != null && bUsed != null && aUsed !== bUsed) return aUsed - bUsed;
    var aCount = (a && typeof a.usedCount === 'number') ? a.usedCount : Number(a && a.usedCount || 0);
    var bCount = (b && typeof b.usedCount === 'number') ? b.usedCount : Number(b && b.usedCount || 0);
    if (aCount !== bCount) return aCount - bCount;
    var aCreated = __toMillis(a && a.createdAt);
    var bCreated = __toMillis(b && b.createdAt);
    if (aCreated != null && bCreated != null && aCreated !== bCreated) return aCreated - bCreated;
    return String(a && a.id || '').localeCompare(String(b && b.id || ''));
  }

  function __getFlaggedModalOpener() {
    try {
      if (typeof window !== 'undefined' && typeof window.__openFlaggedQuestionModal === 'function') return window.__openFlaggedQuestionModal;
    } catch(_) {}
    try {
      if (typeof __openFlaggedQuestionModal === 'function') return __openFlaggedQuestionModal;
    } catch(_) {}
    return null;
  }

  async function __weeklyFlagReviewFlow(input) {
    input = input || {};
    var questions = Array.isArray(input.questions) ? input.questions : [];
    var openEditor = (input && typeof input.openEditor === 'function') ? input.openEditor : null;
    var opener = __getFlaggedModalOpener();
    if (!opener || typeof window.getFlaggedQuestions !== 'function') return { status: 'ok', questions: questions, changed: false };
    var keptIds = [];
    var deletedCount = 0;
    var keepCount = 0;
    var editCount = 0;
    var changed = false;
    var dbg = false;
    try {
      dbg = !!(window && typeof window.__isDebugFlagsEnabled === 'function' && window.__isDebugFlagsEnabled());
    } catch(_) { dbg = false; }

    for (var safety = 0; safety < 200; safety++) {
      var flaggedAll = [];
      try { flaggedAll = window.getFlaggedQuestions(questions) || []; } catch(_) { flaggedAll = []; }
      var flagged = (Array.isArray(flaggedAll) ? flaggedAll : []).map(function(f){
        var id = f && f.id != null ? String(f.id) : '';
        var idx = questions.findIndex(function(q){ return q && String(q.id) === id; });
        return { id: id, idx: idx, reasons: (f && Array.isArray(f.reasons)) ? f.reasons : [], meta: (f && f.meta) ? f.meta : null, question: f && f.question ? f.question : null };
      }).filter(function(f){
        if (!f.id || f.idx < 0) return false;
        var q = questions[f.idx] || {};
        if (q && q._flagReview && (q._flagReview.status === 'kept' || q._flagReview.action === 'keep')) return false;
        return true;
      });

      if (dbg && safety === 0) {
        var first = flagged[0] || {};
        var fr = Array.isArray(first.reasons) ? first.reasons.slice(0, 3) : [];
        console.log('[debugFlags][weekly] totalQuestions=' + questions.length + ' flaggedCount=' + flagged.length + ' firstReasons=' + JSON.stringify(fr));
      }
      if (!flagged.length) {
        if (dbg) console.log('[debugFlags][weekly] resolved totalQuestions=' + questions.length + ' keepCount=' + keepCount + ' deleteCount=' + deletedCount + ' editCount=' + editCount);
        return { status: 'ok', questions: questions, changed: changed, keptIds: keptIds, deletedCount: deletedCount };
      }

      var cur = flagged[0];
      var q0 = questions[cur.idx] || {};
      var res = await opener({
        id: cur.id,
        reasons: cur.reasons,
        meta: cur.meta,
        question: q0,
        progressText: '1/' + String(flagged.length)
      });

      if (!res || res.action === 'cancel') return { status: 'cancel', questions: questions, changed: changed, keptIds: keptIds, deletedCount: deletedCount };

      if (res.action === 'keep') {
        q0._flagReview = { action: 'keep', status: 'kept', reasons: cur.reasons, reviewedAt: Date.now(), updatedAt: Date.now(), by: __getUid() || (currentUser && currentUser.id ? String(currentUser.id) : null) };
        q0._flagReasons = cur.reasons;
        keptIds.push(cur.id);
        keepCount += 1;
        if (dbg) console.log('[debugFlags][weekly] keep id=' + String(cur.id));
        changed = true;
        continue;
      }

      if (res.action === 'delete') {
        questions.splice(cur.idx, 1);
        deletedCount += 1;
        if (dbg) console.log('[debugFlags][weekly] delete id=' + String(cur.id));
        changed = true;
        continue;
      }

      if (res.action === 'edit') {
        if (openEditor) openEditor(cur.idx);
        editCount += 1;
        if (dbg) console.log('[debugFlags][weekly] edit id=' + String(cur.id) + ' idx=' + String(cur.idx));
        return { status: 'edit', questions: questions, changed: changed, keptIds: keptIds, deletedCount: deletedCount, editIndex: cur.idx };
      }
    }

    if (dbg) console.log('[debugFlags][weekly] safetyLimit totalQuestions=' + questions.length + ' keepCount=' + keepCount + ' deleteCount=' + deletedCount + ' editCount=' + editCount);
    return { status: 'error', questions: questions, changed: changed, keptIds: keptIds, deletedCount: deletedCount };
  }
  window.weeklyDebugLeafStats = async function(rootId, opts) {
    opts = opts || {};
    rootId = String(rootId || '');
    var leaves = __leafCategoriesUnder(rootId);
    var excludeIds = null;
    if (Array.isArray(opts.excludeIds)) {
      excludeIds = new Set(opts.excludeIds.map(function(x){ return String(x); }));
    }
    var fetcher = (opts && typeof opts.fetcher === 'function') ? opts.fetcher : null;
    var rows = [];
    for (var i = 0; i < leaves.length; i++) {
      var c = leaves[i] || {};
      var id = c && c.id != null ? String(c.id) : '';
      var name = String(c.name || '');
      var mode = __getQuestionsMode(c);
      var blockedByRoot = __isSpecialRoot(c);
      var blockedByNone = mode === 'none';
      var blocked = blockedByRoot || blockedByNone || __isQuestionsDisabled(c) || c.deleted === true;
      var allCount = 0;
      var availCount = 0;
      var reason = blockedByRoot ? 'special_root' : blockedByNone ? 'mode_none' : blocked ? 'blocked' : 'ok';
      if (!blocked) {
        if (mode === 'inline') {
          var allInline = (Array.isArray(c.questions) ? c.questions : []).filter(function(q){ return q && q.deleted !== true; });
          allCount = allInline.length;
          availCount = excludeIds ? allInline.filter(function(q){ return !excludeIds.has(String(q.id)); }).length : allCount;
          reason = allCount ? 'ok' : 'empty_inline';
        } else {
          var raw = [];
          if (fetcher) {
            raw = await fetcher(id, c);
          } else {
            raw = await __weeklyFetchSubcollectionQuestions(id);
          }
          var all = (Array.isArray(raw) ? raw : []).filter(function(q){ return q && q.deleted !== true && q.legacy !== true; });
          allCount = all.length;
          availCount = excludeIds ? all.filter(function(q){ return !excludeIds.has(String(q.id)); }).length : allCount;
          reason = allCount ? 'ok' : 'empty_subcollection';
        }
      }
      rows.push({
        id: id,
        name: name,
        mode: mode,
        foundCount: availCount,
        totalCount: allCount,
        reason: reason
      });
    }
    try {
      console.log('[weekly-debug] root=' + rootId + ' leaves=' + rows.length);
      if (typeof console.table === 'function') console.table(rows);
      else rows.forEach(function(r){ console.log('[weekly-debug]', r); });
      var sum = rows.reduce(function(acc, r){ return acc + (Number(r.totalCount) || 0); }, 0);
      console.log('[weekly-debug] totalQuestions=' + sum);
    } catch(_) {}
    return rows;
  };
  window.COUPON_REQUIRED_TYPES = new Set(['prokurorluq']);
  try {
    var __crt = localStorage.getItem('coupon_required_types') || '';
    if (__crt && typeof __crt === 'string') {
      __crt.split(',').map(function(s){ return String(s || '').trim(); }).filter(function(s){ return s.length > 0; }).forEach(function(t){ window.COUPON_REQUIRED_TYPES.add(t); });
    }
    if (Array.isArray(window.COUPON_REQUIRED_TYPES_EXTRA)) {
      window.COUPON_REQUIRED_TYPES_EXTRA.map(function(s){ return String(s || '').trim(); }).filter(function(s){ return s.length > 0; }).forEach(function(t){ window.COUPON_REQUIRED_TYPES.add(t); });
    }
  } catch(_) {}
  window.validateCoupon = async function(code, examId) {
    if (!db) throw new Error('Verilənlər bazası bağlantısı yoxdur');
    code = String(code || '').trim();
    if (!code) throw new Error('Kupon kodu daxil edin');
    var uid = __getUid();
    if (!uid) throw new Error('Zəhmət olmasa hesabla daxil olun');
    const byId = await db.collection('exam_coupons').doc(code).get();
    let doc = byId.exists ? byId : null;
    if (!doc) {
      const q = await db.collection('exam_coupons').where('code','==', code).limit(1).get();
      doc = q.empty ? null : q.docs[0];
    }
    if (!doc) throw new Error('Kupon tapılmadı');
    const couponDocId = doc.id;
    const res = await db.runTransaction(async function(t) {
      const ref = db.collection('exam_coupons').doc(couponDocId);
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error('Kupon tapılmadı');
      const d = snap.data() || {};
      if (String(d.examId || '') !== String(examId)) throw new Error('Bu kupon bu imtahana uyğun deyil');
      const now = new Date();
      const s = d.startTime && typeof d.startTime.toDate === 'function' ? d.startTime.toDate() : new Date(d.startTime || 0);
      const e = d.endTime && typeof d.endTime.toDate === 'function' ? d.endTime.toDate() : new Date(d.endTime || 0);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) throw new Error('Kupon tarix intervalı düzgün deyil');
      if (now < s) throw new Error('Kupon hələ aktiv deyil');
      if (now > e) throw new Error('Kuponun müddəti bitib');
      if (d.usedBy) {
        if (String(d.usedBy) === String(uid)) return { status: 'ok', couponDocId: couponDocId };
        throw new Error('Kupon artıq istifadə olunub');
      }
      return { status: 'ok', couponDocId: couponDocId };
    });
    if (res && res.status) return res;
    return { status: 'ok', couponDocId: couponDocId };
  };
  window.markCouponUsed = async function(code, examId, couponDocId) {
    if (!db) throw new Error('Verilənlər bazası bağlantısı yoxdur');
    code = String(code || '').trim();
    if (!code) throw new Error('Kupon kodu daxil edin');
    var uid = __getUid();
    if (!uid) throw new Error('Zəhmət olmasa hesabla daxil olun');
    var docId = String(couponDocId || '').trim();
    if (!docId) {
      const byId = await db.collection('exam_coupons').doc(code).get();
      let doc = byId.exists ? byId : null;
      if (!doc) {
        const q = await db.collection('exam_coupons').where('code','==', code).limit(1).get();
        doc = q.empty ? null : q.docs[0];
      }
      if (!doc) throw new Error('Kupon tapılmadı');
      docId = doc.id;
    }
    const res = await db.runTransaction(async function(t) {
      const ref = db.collection('exam_coupons').doc(docId);
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error('Kupon tapılmadı');
      const d = snap.data() || {};
      if (String(d.examId || '') !== String(examId)) throw new Error('Bu kupon bu imtahana uyğun deyil');
      const now = new Date();
      const s = d.startTime && typeof d.startTime.toDate === 'function' ? d.startTime.toDate() : new Date(d.startTime || 0);
      const e = d.endTime && typeof d.endTime.toDate === 'function' ? d.endTime.toDate() : new Date(d.endTime || 0);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) throw new Error('Kupon tarix intervalı düzgün deyil');
      if (now < s) throw new Error('Kupon hələ aktiv deyil');
      if (now > e) throw new Error('Kuponun müddəti bitib');
      if (d.usedBy) {
        if (String(d.usedBy) === String(uid)) return { status: 'ok' };
        throw new Error('Kupon artıq istifadə olunub');
      }
      t.update(ref, { usedBy: String(uid) });
      return { status: 'ok' };
    });
    if (res && res.status) return res;
    return { status: 'ok' };
  };
  window.showCouponModal = function(examId, onSuccess) {
    let m = document.getElementById('coupon-modal');
    if (m) m.remove();
    m = document.createElement('div');
    m.id = 'coupon-modal';
    m.className = 'fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4';
    m.innerHTML = `
      <div class="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6 animate-up">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">Kuponu daxil edin</h3>
          <button class="text-gray-400 hover:text-white" onclick="document.getElementById('coupon-modal').remove()"><i class="fas fa-times"></i></button>
        </div>
        <form id="coupon-form" class="space-y-3">
          <label class="block text-sm text-gray-300">Kupon kodu</label>
          <input id="coupon-code-input" type="text" class="w-full p-3 rounded-md bg-gray-800 text-white border border-gray-700" placeholder="PROK12345" />
          <button id="coupon-submit-btn" type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md">Təsdiqlə</button>
          <p id="coupon-error" class="text-red-400 text-sm hidden"></p>
        </form>
      </div>
    `;
    document.body.appendChild(m);
    var pending = false;
    var lastAt = 0;
    var debounceMs = 1200;
    const form = m.querySelector('#coupon-form');
    const btn = m.querySelector('#coupon-submit-btn');
    const err = m.querySelector('#coupon-error');
    if (form) form.onsubmit = null;
    if (btn) btn.onclick = null;

    const handler = async function(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      if (e && typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      const now = Date.now();
      if (pending) return;
      if (lastAt && (now - lastAt) < debounceMs) return;
      lastAt = now;
      pending = true;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yoxlanır...';
      }
      try {
        if (err) err.classList.add('hidden');
        const code = String((m.querySelector('#coupon-code-input') || {}).value || '').trim();
        const result = await window.validateCoupon(code, examId);
        if (result && result.status === 'ok') {
          document.getElementById('coupon-modal').remove();
          if (typeof onSuccess === 'function') onSuccess({ code: code, examId: examId, couponDocId: result && result.couponDocId ? result.couponDocId : null });
          return;
        }
        throw new Error('Kupon yoxlama xətası');
      } catch(e) {
        alert('ERR name='+(e?.name)+' code='+(e?.code)+' msg='+(e?.message));
        if (err) { err.textContent = e && e.message ? e.message : 'Xəta baş verdi'; err.classList.remove('hidden'); }
        if (btn) btn.innerHTML = 'Təsdiqlə';
        setTimeout(function(){ if (btn) btn.disabled = false; }, debounceMs);
      } finally {
        pending = false;
      }
    };
    if (form) form.onsubmit = handler;
  };
  // Helper: Weekly Exam sistemində kateqoriyanı tapmaq
  // İstifadə: Qaralama yaradarkən sxem elementinə görə uyğun kateqoriya tapılır
  const WeeklyExamSystem = {
    findCategory(schemaItem) {
      if (!window.categories || !Array.isArray(window.categories)) return null;
      const targetName = (schemaItem.name || '').trim().toLowerCase();
      const targetId = String(schemaItem.id || '');
      const nrm = function(s) {
        try { return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
        catch(_) { return (s || '').toString().toLowerCase().trim(); }
      };
      const tn = nrm(targetName);
      const keys = Array.isArray(schemaItem.keys) ? schemaItem.keys.map(nrm) : [];
      let cat = null;
      if (targetId) {
        cat = categories.find(c => String(c.id) === targetId);
        if (cat && Array.isArray(cat.questions) && cat.questions.length > 0) return cat;
      }
      if (!cat) {
        cat = categories.find(c => {
          const cn = c.name ? nrm(c.name) : '';
          return c.parentId && String(c.parentId).startsWith('special_') && (cn === tn || keys.some(k => cn.includes(k)));
        });
        if (cat && Array.isArray(cat.questions) && cat.questions.length > 0) return cat;
      }
      if (!cat) {
        cat = categories.find(c => {
          const cn = c.name ? nrm(c.name) : '';
          return cn === tn || keys.some(k => cn.includes(k));
        });
        if (cat && Array.isArray(cat.questions) && cat.questions.length > 0) return cat;
      }
      return null;
    },

    // Admin: İdarəetmə pəncərəsini açır (Yarat, Baxış, Yayımla, Arxiv)
    openManagerModal() {
      if (!currentUser || currentUser.role !== 'admin') return showNotification('İcazə yoxdur!', 'error');
      let modal = document.getElementById('weekly-manager-modal');
      if (modal) modal.remove();
      modal = document.createElement('div');
      modal.id = 'weekly-manager-modal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 backdrop-blur-sm';
      
      const types = [
        { id: 'prokurorluq', name: 'Prokurorluq', icon: 'fa-landmark', color: 'blue' }
      ];

      const cardsHtml = types.map(t => `
        <div class="bg-gray-800 rounded-xl border border-gray-700 hover:border-${t.color}-500 transition-all duration-300 shadow-lg overflow-hidden group">
          <div class="p-6 text-center border-b border-gray-700 bg-gray-800 group-hover:bg-gray-750">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-${t.color}-900/30 flex items-center justify-center text-${t.color}-400 group-hover:scale-110 transition-transform">
              <i class="fas ${t.icon} text-2xl"></i>
            </div>
            <h3 class="text-xl font-bold text-white mb-1">${t.name}</h3>
            <p class="text-xs text-gray-400">Həftəlik sınaq idarəetməsi</p>
          </div>
          <div class="p-4 grid grid-cols-2 gap-3 bg-gray-900/50">
            <button onclick="WeeklyExamSystem.generateDraft('${t.id}')" class="flex items-center justify-center gap-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
              <i class="fas fa-magic text-yellow-400"></i> Yarat
            </button>
            <button onclick="WeeklyExamSystem.viewDraft('${t.id}')" class="flex items-center justify-center gap-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
              <i class="fas fa-eye text-blue-400"></i> Baxış
            </button>
            <button onclick="WeeklyExamSystem.publishExam('${t.id}')" class="flex items-center justify-center gap-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors col-span-2 border border-gray-600">
              <i class="fas fa-rocket text-green-400"></i> Yayımla
            </button>
            <button onclick="WeeklyExamSystem.viewArchives('${t.id}')" class="flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors col-span-2">
              <i class="fas fa-history"></i> Arxiv
            </button>
          </div>
        </div>
      `).join('');

      modal.innerHTML = `
        <div class="bg-gray-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-700 animate-up max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                <span class="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <i class="fas fa-cogs text-white"></i>
                </span>
                Həftəlik Sınaq Paneli
              </h2>
              <p class="text-gray-400 text-sm mt-1 ml-14">Yeni sınaqlar yaradın, yoxlayın və yayımlayın</p>
            </div>
            <button onclick="document.getElementById('weekly-manager-modal').remove()" class="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <i class="fas fa-times text-lg"></i>
            </button>
          </div>
          
          <div class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${cardsHtml}
            </div>
            
            <div class="mt-8 p-4 rounded-lg bg-blue-900/20 border border-blue-800/30 flex items-start gap-4">
              <i class="fas fa-info-circle text-blue-400 mt-1"></i>
              <div class="text-sm text-gray-300">
                <strong class="text-blue-300">Məlumat:</strong> Yeni sınaq yaradarkən sistem avtomatik olaraq son 4 yayımlamada istifadə olunan sualları istisna edir (cooldown=4) və bazadan suallar seçir. Yayımlamadan öncə "Baxış" edərək sualları dəyişdirə bilərsiniz.
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    },

    // Admin: Qaralama yaradır (Cooldown=4)
    async generateDraft(type = 'prokurorluq') {
      if (!db) return showNotification('Verilənlər bazası bağlantısı yoxdur!', 'error');
      if (!currentUser || currentUser.role !== 'admin') return showNotification('İcazə yoxdur!', 'error');
      if (String(type) === 'prokurorluq') {
        try {
          var schema0 = __prokResolveSchemaIds(__prokQuotaSchema(), { rootId: 'special_prokurorluq' });
          var missingCats = schema0.filter(function(s){ return s && s.missing; }).map(function(s){ return String(s.name || '').trim(); }).filter(function(s){ return s; });
          if (missingCats.length) {
            showNotification('Kvota mapping üçün kateqoriyalar tapılmadı: ' + missingCats.join(', '), 'error');
            return;
          }

          var excludeIds0 = new Set();
          try {
            var usageDoc = await db.collection('weekly_exams').doc('usage_prokurorluq').get();
            if (usageDoc && usageDoc.exists) {
              var usage = usageDoc.data() || {};
              var recent = Array.isArray(usage.recentPublishes) ? usage.recentPublishes : [];
              recent.slice(-4).forEach(function(p){
                var ids = p && Array.isArray(p.questionIds) ? p.questionIds : [];
                ids.forEach(function(id){ excludeIds0.add(String(id)); });
              });
            }
          } catch (e0) { console.error(e0); }

          var selectedIds0 = new Set();
          var pickedByCat = new Map();
          var fallbackByCat = new Map();
          var shortage = [];
          var qCache0 = new Map();
          for (var i0 = 0; i0 < schema0.length; i0++) {
            var it0 = schema0[i0] || {};
            var catId0 = String(it0.id || '');
            var need0 = Number(it0.count) || 0;
            if (!catId0 || need0 <= 0) continue;
            var all0 = qCache0.has(catId0) ? (qCache0.get(catId0) || []) : await __weeklyFetchSubcollectionQuestions(catId0);
            qCache0.set(catId0, all0);
            var pool0 = (Array.isArray(all0) ? all0 : []).filter(function(q){
              if (!q || q.deleted === true || q.legacy === true) return false;
              var qid = q.id != null ? String(q.id) : '';
              if (!qid) return false;
              if (selectedIds0.has(qid)) return false;
              return true;
            });
            pool0.sort(__prokSortQuestions);
            var allowed0 = pool0.filter(function(q){ return !excludeIds0.has(String(q.id)); });
            var picked0 = allowed0.slice(0, need0);
            picked0.forEach(function(q){ selectedIds0.add(String(q.id)); });
            pickedByCat.set(catId0, picked0);
            if (picked0.length < need0) {
              shortage.push({ catId: catId0, name: String(it0.name || ''), missing: (need0 - picked0.length) });
              var rest0 = pool0.filter(function(q){ return picked0.indexOf(q) < 0; });
              fallbackByCat.set(catId0, rest0);
            }
          }

          if (shortage.length) {
            var msg0 = shortage.map(function(s){ return String(s.name || s.catId) + ' (+' + String(s.missing) + ')'; }).join('\n');
            var ok0 = confirm('Bu kateqoriyada yeni sual qalmayıb, təkrar istifadə olunacaq:\n' + msg0 + '\n\nDavam edilsin?');
            if (!ok0) {
              showNotification('Proses dayandırıldı. Heç nə yazılmadı.', 'info');
              return;
            }
          }

          for (var si0 = 0; si0 < shortage.length; si0++) {
            var s0 = shortage[si0] || {};
            var catId1 = String(s0.catId || '');
            var miss1 = Number(s0.missing) || 0;
            if (!catId1 || miss1 <= 0) continue;
            var fb0 = (fallbackByCat.get(catId1) || []).filter(function(q){ return q && q.id != null && !selectedIds0.has(String(q.id)); });
            fb0.sort(__prokSortQuestions);
            var add0 = fb0.slice(0, miss1);
            add0.forEach(function(q){ selectedIds0.add(String(q.id)); });
            var prev0 = pickedByCat.get(catId1) || [];
            pickedByCat.set(catId1, prev0.concat(add0));
          }

          var examQuestions0 = [];
          for (var i1 = 0; i1 < schema0.length; i1++) {
            var it1 = schema0[i1] || {};
            var catId2 = String(it1.id || '');
            var picked1 = pickedByCat.get(catId2) || [];
            var catObj1 = (Array.isArray(categories) ? categories : []).find(function(c){ return c && String(c.id) === catId2; }) || null;
            var mode1 = catObj1 ? __getQuestionsMode(catObj1) : 'subcollection';
            for (var q1 = 0; q1 < picked1.length; q1++) {
              var qq1 = picked1[q1] || {};
              qq1._sourceSchemaName = String(it1.name || '');
              qq1._sourceCategoryId = catId2;
              qq1._sourceCategoryMode = mode1;
              examQuestions0.push(qq1);
            }
          }

          if (examQuestions0.length !== 80) {
            showNotification('Kvota tam dolmadı: ' + String(examQuestions0.length) + '/80', 'error');
            return;
          }

          try {
            if (typeof window.getFlaggedQuestions === 'function') {
              var flagged00 = window.getFlaggedQuestions(examQuestions0) || [];
              var map00 = new Map();
              (Array.isArray(flagged00) ? flagged00 : []).forEach(function(f){
                if (f && f.id != null && Array.isArray(f.reasons) && f.reasons.length) map00.set(String(f.id), f.reasons);
              });
              examQuestions0.forEach(function(q){
                var rid = q && q.id != null ? String(q.id) : '';
                if (!rid) return;
                var rs = map00.get(rid);
                if (rs) q._flagReasons = rs;
              });
            }
          } catch(_) {}

          var nonce0 = 'prok_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
          const draft0 = {
            id: 'weekly_draft_' + type,
            type: type,
            exam_type: 'special',
            questions: examQuestions0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.id,
            status: 'draft',
            publishNonce: nonce0,
            modelVersion: 2
          };
          await db.collection('weekly_exams').doc('draft_' + type).set(draft0, { merge: true });
          const managerModal0 = document.getElementById('weekly-manager-modal');
          if (managerModal0) managerModal0.remove();
          showNotification('Qaralama yaradıldı! (80 sual).', 'success');
          this.openFullEditor(type);
          return;
        } catch (e1) {
          console.error(e1);
          showNotification('Qaralama yaradılarkən xəta: ' + (e1 && e1.message ? e1.message : String(e1)), 'error');
          return;
        }
      }
      let schema = [];
      var rootId = String(type || '');
      if (!rootId.startsWith('special_')) rootId = 'special_' + rootId;
      const subs = __leafCategoriesUnder(rootId);
      schema = subs.map(s => ({ id: s.id, name: s.name, count: 6 }));
      
      if (!schema || schema.length === 0) {
        return showNotification('Bu imtahan növü üçün sual bölgüsü (sxem) hələ təyin edilməyib.', 'warning');
      }

      let examQuestions = [];
      let log = [];
      let debug = [];
      const qCache = new Map();

      const excludeIds = new Set();
      try {
        const historyDoc = await db.collection('weekly_exams').doc('history_' + type).get();
        if (historyDoc.exists) {
          const historyData = historyDoc.data().history || {};
          const sortedWeeks = Object.keys(historyData).sort();
          const recentWeeks = sortedWeeks.slice(-2);
          recentWeeks.forEach(week => {
            const ids = historyData[week];
            if (Array.isArray(ids)) ids.forEach(id => excludeIds.add(id));
          });
          if (window.__DEBUG) console.log(`History exclusion (last 2 weeks: ${recentWeeks.join(', ')}): ${excludeIds.size} questions.`);
        }
        const activeDoc = await db.collection('weekly_exams').doc('active_' + type).get();
        if (activeDoc.exists) {
          const data = activeDoc.data();
          if (data.questions) data.questions.forEach(q => excludeIds.add(q.id));
        }
        if (window.__DEBUG) console.log(`Total excluded questions: ${excludeIds.size}`);
      } catch(e) { console.error("Error fetching exclusion list:", e); }

      let targetSchema = schema.map(s => ({ ...s }));
      
      // Swap logic only if we have enough items
      if (targetSchema.length >= 2) {
          const swapCount = 3;
          for(let i=0; i<swapCount; i++) {
            const idx1 = Math.floor(Math.random() * targetSchema.length);
            let idx2 = Math.floor(Math.random() * targetSchema.length);
            
            // Safety break to prevent infinite loop
            let safety = 0;
            while(idx1 === idx2 && safety < 50) {
                idx2 = Math.floor(Math.random() * targetSchema.length);
                safety++;
            }
            
            if (idx1 !== idx2) {
                if (targetSchema[idx1].count > 1) {
                  targetSchema[idx1].count--;
                  targetSchema[idx2].count++;
                }
            }
          }
      }

      for (const item of targetSchema) {
        const subCat = categories.find(function(c){ return c && String(c.id) === String(item.id); }) || this.findCategory(item);
        if (!subCat || __isQuestionsDisabled(subCat) || __isSpecialRoot(subCat)) {
          var entry0 = { id: subCat ? String(subCat.id) : String(item.id || ''), name: item.name, mode: subCat ? __getQuestionsMode(subCat) : 'none', total: 0, available: 0, selected: 0, reason: !subCat ? 'missing' : (__isQuestionsDisabled(subCat) ? 'mode_none' : 'special_root') };
          debug.push(entry0);
          log.push(`SKIP: ${entry0.name} (id=${entry0.id} mode=${entry0.mode} reason=${entry0.reason})`);
          continue;
        }
        const qRes = await __weeklyGetQuestionsForCategory(subCat, excludeIds, qCache);
        const available = qRes.available || [];
        let pool = available;
        if (available.length < item.count) {
          var allPool = (qRes.all || []).filter(function(q){ return q && q.deleted !== true && q.legacy !== true; });
          if (allPool.length > 0) {
            log.push(`XƏBƏRDARLIQ: ${item.name} (id=${subCat.id} mode=${qRes.mode}) - Yeni sual çatışmır (${available.length}/${item.count}). İşlənmişlər qarışdırılır.`);
            pool = allPool;
          }
        }
        if (!pool || pool.length === 0) {
          var entry1 = { id: String(subCat.id), name: item.name, mode: qRes.mode, total: qRes.totalCount, available: available.length, selected: 0, reason: qRes.reason };
          debug.push(entry1);
          log.push(`BOŞ: ${entry1.name} (id=${entry1.id} mode=${entry1.mode} total=${entry1.total} available=${entry1.available} reason=${entry1.reason})`);
          continue;
        }
        function pickRandomN(arr, n) {
          var a = arr.slice();
          var len = a.length;
          var m = Math.min(n, len);
          for (var i = 0; i < m; i++) {
            var r = i + Math.floor(Math.random() * (len - i));
            var tmp = a[i];
            a[i] = a[r];
            a[r] = tmp;
          }
          return a.slice(0, m);
        }
        const selected = pickRandomN(pool, item.count);
        selected.forEach(q => {
          q._sourceSchemaName = item.name; 
          q._sourceCategoryId = subCat.id;
          q._sourceCategoryMode = __getQuestionsMode(subCat);
        });
        examQuestions = [...examQuestions, ...selected];
        var entry2 = { id: String(subCat.id), name: item.name, mode: __getQuestionsMode(subCat), total: qRes.totalCount, available: available.length, selected: selected.length, reason: 'ok' };
        debug.push(entry2);
        log.push(`OK: ${item.name} (id=${entry2.id} mode=${entry2.mode}) (${selected.length}/${item.count})`);
      }
      if (examQuestions.length === 0) {
        return showNotification('Heç bir sual tapılmadı! Yalnız alt-kateqoriyalardan sual seçilir; root kateqoriya qadağandır.', 'error');
      }

      try {
        if (typeof window.getFlaggedQuestions === 'function') {
          var flagged0 = window.getFlaggedQuestions(examQuestions) || [];
          var map0 = new Map();
          (Array.isArray(flagged0) ? flagged0 : []).forEach(function(f){
            if (f && f.id != null && Array.isArray(f.reasons) && f.reasons.length) map0.set(String(f.id), f.reasons);
          });
          examQuestions.forEach(function(q){
            var rid = q && q.id != null ? String(q.id) : '';
            if (!rid) return;
            var rs = map0.get(rid);
            if (rs) q._flagReasons = rs;
          });
        }
      } catch(_) {}

      const draft = {
        id: 'weekly_draft_' + type,
        type: type,
        exam_type: 'special',
        questions: examQuestions,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id,
        status: 'draft',
        log: log,
        debug: debug
      };
      try {
        await db.collection('weekly_exams').doc('draft_' + type).set(draft);
        const managerModal = document.getElementById('weekly-manager-modal');
        if (managerModal) managerModal.remove();
        showNotification(`Qaralama yaradıldı! (${examQuestions.length} sual).`, 'success');
        this.openFullEditor(type);
      } catch(e) {
        console.error(e);
        showNotification('Qaralama yadda saxlanılarkən xəta!', 'error');
      }
    },

    // Admin: Qaralamaya baxış pəncərəsini açır
    async viewDraft(type = 'prokurorluq') {
      if (!db) return;
      if (!currentUser || currentUser.role !== 'admin') return showNotification('İcazə yoxdur!', 'error');
      try {
        const doc = await db.collection('weekly_exams').doc('draft_' + type).get();
        if (!doc.exists) {
          return showNotification('Qaralama tapılmadı. Əvvəlcə sınaq yaradın.', 'error');
        }
        const managerModal = document.getElementById('weekly-manager-modal');
        if (managerModal) managerModal.remove();
        this.openFullEditor(type);
      } catch(e) {
        console.error(e);
        showNotification('Xəta: ' + e.message, 'error');
      }
    },

    // Admin: Arxivdəki sınaqlar siyahısı
    async viewArchives(type) {
      if (!db) return;
      if (!currentUser || currentUser.role !== 'admin') return showNotification('İcazə yoxdur!', 'error');
      const btn = document.querySelector(`button[onclick*="viewArchives('${type}')"]`);
      const originalText = btn ? btn.innerHTML : '';
      if(btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
      }
      try {
        const snapshot = await db.collection('weekly_exams')
          .where('status', '==', 'archived')
          .where('type', '==', type)
          .orderBy('archivedAt', 'desc')
          .limit(20)
          .get();
        if (snapshot.empty) {
          showNotification('Arxivdə sınaq tapılmadı.', 'info');
          if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
          return;
        }
        let modal = document.getElementById('weekly-archives-modal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'weekly-archives-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto p-4 flex items-center justify-center';
        const listHtml = snapshot.docs.map(doc => {
          const data = doc.data();
          const date = data.archivedAt ? data.archivedAt.toDate().toLocaleDateString() : 'N/A';
          return `
            <div class="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-center mb-2">
              <div>
                <div class="font-bold text-white">${data.name || 'Sınaq'}</div>
                <div class="text-xs text-gray-400">Arxivlənmə tarixi: ${date} | ID: ${data.weekId}</div>
              </div>
              <button onclick="WeeklyExamSystem.viewArchiveDetail('${doc.id}')" class="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500">Bax</button>
            </div>
          `;
        }).join('');
        modal.innerHTML = `
          <div class="bg-gray-900 w-full max-w-2xl rounded-xl shadow-2xl border border-gray-700 animate-up">
            <div class="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 class="text-xl font-bold text-white">Arxiv - ${type.toUpperCase()}</h2>
              <button onclick="document.getElementById('weekly-archives-modal').remove()" class="text-gray-400 hover:text-white">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              ${listHtml}
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      } catch(e) {
        console.error(e);
        showNotification('Xəta: ' + e.message, 'error');
      } finally {
        if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
      }
    },

    // Admin: Arxiv sınağının detalları
    async viewArchiveDetail(docId) {
      try {
        const doc = await db.collection('weekly_exams').doc(docId).get();
        if(doc.exists) {
          const data = doc.data();
          let modal = document.getElementById('weekly-review-modal');
          if (modal) modal.remove();
          this.openArchiveModal({ ...data, isArchive: true });
        }
      } catch(e) { console.error(e); }
    },

    // Admin: Arxivə baxış pəncərəsi (yalnız oxumaq üçün)
    openArchiveModal(draft) {
      let modal = document.getElementById('weekly-review-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'weekly-review-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto p-4';
        document.body.appendChild(modal);
      }
      const questionsHtml = draft.questions.map((q, idx) => `
        <div class="bg-gray-800 p-4 rounded mb-2 border border-gray-700 flex justify-between items-start gap-4">
          <div class="flex-1">
            <div class="text-xs text-yellow-500 mb-1">${q._sourceSchemaName || 'Naməlum'}</div>
            <p class="text-white text-sm">${escapeHtml(q.text)}</p>
          </div>
        </div>
      `).join('');
      modal.innerHTML = `
        <div class="bg-gray-900 max-w-4xl mx-auto rounded-lg shadow-xl border border-gray-700 mt-10 animate-up">
          <div class="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-lg">
            <h2 class="text-xl font-bold text-white">
              Arxiv Sınağı (${draft.questions.length} sual) - ${draft.type ? draft.type.toUpperCase() : ''}
            </h2>
            <button onclick="document.getElementById('weekly-review-modal').remove()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
          </div>
          <div class="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            ${questionsHtml}
          </div>
          <div class="p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg flex justify-end gap-3">
             <button onclick="document.getElementById('weekly-review-modal').remove()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Bağla</button>
          </div>
        </div>
      `;
    },

    // DEPRECATED: Old review modal is removed. Use openFullEditor instead.
    openReviewModal(draft) {
        if(draft.isArchive) {
            this.openArchiveModal(draft);
        } else {
            this.openFullEditor(draft.type);
        }
    },

    // Admin: Full Editor Modal
    async openFullEditor(type, scrollToIdx = null) {
        try {
            const draftDoc = await db.collection('weekly_exams').doc('draft_' + type).get();
            if (!draftDoc.exists) return;
            const draft = draftDoc.data();
            
            // Remove review modal if exists to avoid overlap
            const reviewModal = document.getElementById('weekly-review-modal');
            if (reviewModal) reviewModal.remove();

            let modal = document.getElementById('weekly-full-editor-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'weekly-full-editor-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto p-4 backdrop-blur-sm';
            
            const questionsHtml = draft.questions.map((q, idx) => this.renderQuestionCard(q, idx, draft.type)).join('');
            
            modal.innerHTML = `
                <div class="bg-gray-900 max-w-5xl mx-auto rounded-xl shadow-2xl border border-gray-700 mt-10 animate-up pb-20 relative min-h-screen">
                <div class="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/95 backdrop-blur rounded-t-xl sticky top-0 z-50 shadow-md">
                    <div>
                        <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                             <span class="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <i class="fas fa-layer-group text-white"></i>
                             </span>
                            Sınaq Qaralaması
                        </h2>
                        <p class="text-sm text-gray-400 mt-1 ml-14">${draft.questions.length} sual - ${draft.type.toUpperCase()}</p>
                    </div>
                    <div class="flex gap-2">
                         <button onclick="WeeklyExamSystem.generateDraft('${draft.type}')" class="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20" title="Bütün sualları yenilə">
                            <i class="fas fa-redo"></i> Yenilə
                        </button>
                        <button onclick="WeeklyExamSystem.saveFullEditor('${draft.type}')" class="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
                            <i class="fas fa-save"></i> Yadda Saxla
                        </button>
                         <button onclick="WeeklyExamSystem.publishExam('${draft.type}')" class="px-4 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20">
                            <i class="fas fa-check-circle"></i> Yayımla
                        </button>
                        <button onclick="document.getElementById('weekly-full-editor-modal').remove()" class="px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-8 space-y-8" id="full-editor-questions-list">
                    ${questionsHtml}
                </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            if (scrollToIdx !== null) {
                setTimeout(() => {
                    const el = document.getElementById(`draft_card_${scrollToIdx}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        } catch(e) {
            console.error(e);
            showNotification('Editor açılarkən xəta: ' + e.message, 'error');
        }
    },

    renderQuestionCard(q, idx) {
        const uniqueId = `draft_${idx}`;
        const opts = (Array.isArray(q.variants) && q.variants.length > 0) ? q.variants : (Array.isArray(q.options) ? q.options : []);
        const corr = q.correctVariant !== undefined && q.correctVariant !== null
            ? parseInt(q.correctVariant)
            : (q.correctIndex !== undefined && q.correctIndex !== null
                ? parseInt(q.correctIndex)
                : (q.correct_option_id !== undefined && q.correct_option_id !== null
                    ? parseInt(q.correct_option_id)
                    : 0));
        const variantsHtml = opts.map((v, vIdx) => {
            const isCorrect = (corr === vIdx);
            const char = String.fromCharCode(65 + vIdx);
            return `
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="${vIdx}" ${isCorrect ? 'checked' : ''} id="opt_${uniqueId}_${vIdx}">
                    <label for="opt_${uniqueId}_${vIdx}"></label>
                </div>
                <input type="text" class="manual-opt w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" value="${escapeHtml(v || '')}" placeholder="${char} variantı">
                <button onclick="this.parentElement.remove(); window.updateOptionValues('${uniqueId}')" class="remove-option-btn text-gray-400 hover:text-red-500 transition-colors ml-2">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            `;
        }).join('');

        return `
        <div class="manual-question-item bg-gray-800/40 border border-gray-700 rounded-xl p-6 hover:border-indigo-500/50 transition-colors relative group" id="draft_card_${idx}" data-idx="${idx}" data-unique-id="${uniqueId}" data-original-id="${q.id || ''}" data-schema="${q._sourceSchemaName || ''}" data-cat-id="${q._sourceCategoryId || ''}">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-700/50">
                <div class="font-bold text-white flex items-center gap-3">
                    <span class="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-sm font-mono text-indigo-400 border border-gray-600 shadow-inner">
                        ${idx + 1}
                    </span>
                    <span class="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                        ${q._sourceSchemaName || 'Sual'}
                    </span>
                </div>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                     <!-- Actions if needed -->
                </div>
            </div>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Sual mətni</label>
                    <textarea class="manual-q-text w-full bg-gray-900/80 border border-gray-600 rounded-lg p-4 text-white min-h-[100px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-y" placeholder="Sualın mətnini daxil edin...">${escapeHtml(q.text)}</textarea>
                </div>
                
                <div>
                    <label class="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2"><i class="fas fa-comment-alt mr-1"></i> İzah (Opsional)</label>
                    <textarea class="manual-q-explanation w-full bg-gray-900/80 border border-gray-600 rounded-lg p-4 text-white h-20 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-y" placeholder="İzah...">${escapeHtml(q.explanation || '')}</textarea>
                </div>

                <div>
                     <label class="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Variantlar</label>
                     <div class="manual-options-grid grid gap-3" id="options_grid_${uniqueId}">
                        ${variantsHtml}
                    </div>
                    <button onclick="window.addManualOption('${uniqueId}')" class="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-blue-400 text-sm font-medium transition-all flex items-center gap-2">
                        <i class="fas fa-plus"></i> Variant Əlavə Et
                    </button>
                </div>
            </div>
        </div>
        `;
    },

    async saveFullEditor(type) {
        try {
            var draftRef0 = db.collection('weekly_exams').doc('draft_' + type);
            var existing0 = null;
            try { existing0 = await draftRef0.get(); } catch(_) { existing0 = null; }
            var oldQs0 = (existing0 && existing0.exists) ? (existing0.data().questions || []) : [];
            var oldById0 = new Map((Array.isArray(oldQs0) ? oldQs0 : []).map(function(q){ return [String(q && q.id), q || {}]; }));

            const container = document.getElementById('full-editor-questions-list');
            if (!container) return;
            const items = container.querySelectorAll('.manual-question-item');
            const questions = [];
            
            items.forEach(item => {
                const uniqueId = item.getAttribute('data-unique-id');
                const text = item.querySelector('.manual-q-text').value;
                const explanation = item.querySelector('.manual-q-explanation').value;
                
                // Get Variants
                const variants = [];
                const optionsGrid = document.getElementById(`options_grid_${uniqueId}`);
                if (optionsGrid) {
                    optionsGrid.querySelectorAll('.manual-option-input').forEach(opt => {
                        variants.push(opt.querySelector('.manual-opt').value);
                    });
                }
                
                // Get Correct Variant
                let correctVariant = 0;
                const checked = document.querySelector(`input[name="correct_${uniqueId}"]:checked`);
                if (checked) correctVariant = parseInt(checked.value);
                
                questions.push({
                    id: item.getAttribute('data-original-id'),
                    text: text,
                    explanation: explanation,
                    variants: variants,
                    correctVariant: correctVariant,
                    options: variants,
                    correctIndex: correctVariant,
                    _sourceSchemaName: item.getAttribute('data-schema'),
                    _sourceCategoryId: item.getAttribute('data-cat-id')
                });
            });

            questions.forEach(function(q){
              var old = oldById0.get(String(q && q.id));
              if (!old) return;
              if (old._flagReview) q._flagReview = old._flagReview;
              if (old._flagReasons) q._flagReasons = old._flagReasons;
            });

            try {
              if (typeof window.getFlaggedQuestions === 'function') {
                var flagged1 = window.getFlaggedQuestions(questions) || [];
                var map1 = new Map();
                (Array.isArray(flagged1) ? flagged1 : []).forEach(function(f){
                  if (f && f.id != null && Array.isArray(f.reasons) && f.reasons.length) map1.set(String(f.id), f.reasons);
                });
                questions.forEach(function(q){
                  var rid = q && q.id != null ? String(q.id) : '';
                  if (!rid) return;
                  var rs = map1.get(rid);
                  if (rs) q._flagReasons = rs;
                  else if (!(q._flagReview && q._flagReview.status === 'kept')) delete q._flagReasons;
                });
              }
            } catch(_) {}
            
            await db.collection('weekly_exams').doc('draft_' + type).update({
                questions: questions,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Dəyişikliklər yadda saxlanıldı!', 'success');
            document.getElementById('weekly-full-editor-modal').remove();
            this.viewDraft(type); // Re-open review modal
            
        } catch(e) {
            console.error(e);
            showNotification('Yadda saxlama xətası: ' + e.message, 'error');
        }
    },

    // Admin: Qaralamada sualın mətnini redaktə edir (Updated to use Full Editor)
    async editQuestion(type, index) {
      this.openFullEditor(type, index);
    },

    // Admin: Qaralamada sualı başqa sual ilə əvəz edir
    async replaceQuestion(type, index) {
      try {
        const draftRef = db.collection('weekly_exams').doc('draft_' + type);
        const doc = await draftRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        const oldQ = data.questions[index];
        const subCat = categories.find(c => c.id === oldQ._sourceCategoryId);
        if (!subCat) return alert('Kateqoriya tapılmadı');
        const currentIds = new Set(data.questions.map(q => q.id));
        const available = subCat.questions.filter(q => !currentIds.has(q.id));
        if (available.length === 0) return alert('Bu kateqoriyada başqa sual qalmayıb!');
        const newQ = available[Math.floor(Math.random() * available.length)];
        newQ._sourceSchemaName = oldQ._sourceSchemaName;
        newQ._sourceCategoryId = oldQ._sourceCategoryId;
        data.questions[index] = newQ;
        await draftRef.update({ questions: data.questions });
        this.openFullEditor(type, index);
      } catch(e) {
        console.error(e);
        alert('Xəta: ' + e.message);
      }
    },

    // Admin: Qaralamanı yayımlayır, aktiv sınaq yaradır və tarixçəni yeniləyir
    async publishExam(type = 'prokurorluq') {
      if (!db) return;
      if (!currentUser || currentUser.role !== 'admin') return showNotification('İcazə yoxdur!', 'error');
      if (!confirm('Sınağı yayımlamaq istədiyinizə əminsiniz?')) return;
      try {
        const draftRef = db.collection('weekly_exams').doc('draft_' + type);
        const draftDoc = await draftRef.get();
        if (!draftDoc.exists) {
          return showNotification('Qaralama tapılmadı.', 'error');
        }
        const data = draftDoc.data();

        var reviewRes = await __weeklyFlagReviewFlow({
          type: type,
          questions: Array.isArray(data.questions) ? data.questions.slice() : [],
          openEditor: (idx) => {
            try {
              const m = document.getElementById('weekly-full-editor-modal');
              if (m) m.remove();
            } catch(_) {}
            this.openFullEditor(type, idx);
          }
        });

        if (!reviewRes || reviewRes.status === 'cancel') return;
        if (reviewRes.status === 'edit') return;
        if (reviewRes.status === 'error') {
          showNotification('Şübhəli sual yoxlamasında xəta: təhlükəsizlik limiti doldu.', 'error');
          return;
        }

        if (reviewRes.changed) {
          data.questions = reviewRes.questions;
          await draftRef.update({
            questions: data.questions,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        const weekId = this.getCurrentWeekId();
        if (String(type) === 'prokurorluq') {
          var fv0 = firebase && firebase.firestore && firebase.firestore.FieldValue ? firebase.firestore.FieldValue : null;
          if (!fv0) throw new Error('Firestore FieldValue yoxdur');
          var typeName0 = 'Prokurorluq';
          var publishNonce0 = data && data.publishNonce ? String(data.publishNonce) : '';
          if (!publishNonce0) {
            publishNonce0 = 'prok_' + String(Date.now()) + '_' + String(Math.random()).slice(2);
            try {
              await draftRef.set({ publishNonce: publishNonce0, updatedAt: fv0.serverTimestamp() }, { merge: true });
              data.publishNonce = publishNonce0;
            } catch(_) {}
          }
          var examDocId0 = 'weekly_prokurorluq_' + publishNonce0;
          var lockDocId0 = 'publish_lock_prokurorluq_' + publishNonce0;
          var examRef0 = db.collection('weekly_exams').doc(examDocId0);
          var lockRef0 = db.collection('weekly_exams').doc(lockDocId0);
          var pointerRef0 = db.collection('weekly_exams').doc('active_prokurorluq');
          var usageRef0 = db.collection('weekly_exams').doc('usage_prokurorluq');
          var historyRef0 = db.collection('weekly_exams').doc('history_prokurorluq');
          var questionIds0 = (Array.isArray(data.questions) ? data.questions : []).map(function(q){ return q && q.id != null ? String(q.id) : ''; }).filter(function(x){ return x; });

          var txRes0 = await db.runTransaction(async function(t) {
            const lockSnap = await t.get(lockRef0);
            const draftSnap = await t.get(draftRef);
            const pointerSnap = await t.get(pointerRef0);
            const usageSnap = await t.get(usageRef0);
            const historySnap = await t.get(historyRef0);

            var oldActiveRef0 = null;
            var oldActiveSnap0 = null;
            if (pointerSnap && pointerSnap.exists) {
              var pd0 = pointerSnap.data ? (pointerSnap.data() || {}) : (pointerSnap._data || {});
              var oldId0 = pd0 && pd0.activeDocId ? String(pd0.activeDocId) : '';
              if (oldId0) {
                oldActiveRef0 = db.collection('weekly_exams').doc(oldId0);
                oldActiveSnap0 = await t.get(oldActiveRef0);
              }
            }

            if (lockSnap && lockSnap.exists) {
              var ld0 = lockSnap.data ? (lockSnap.data() || {}) : (lockSnap._data || {});
              return { deduped: true, examDocId: ld0 && ld0.examDocId ? String(ld0.examDocId) : examDocId0 };
            }

            if (!draftSnap || !draftSnap.exists) throw new Error('Qaralama tapılmadı');
            var dd0 = draftSnap.data ? (draftSnap.data() || {}) : (draftSnap._data || {});
            if (String(dd0.status || '') === 'published' && dd0.publishedExamDocId) {
              return { deduped: true, examDocId: String(dd0.publishedExamDocId) };
            }

            var ts0 = fv0.serverTimestamp();
            if (oldActiveRef0 && oldActiveSnap0 && oldActiveSnap0.exists) {
              var od0 = oldActiveSnap0.data ? (oldActiveSnap0.data() || {}) : (oldActiveSnap0._data || {});
              if (String(od0.status || '') === 'active') {
                t.set(oldActiveRef0, { status: 'inactive', inactivatedAt: ts0, replacedBy: examRef0.id }, { merge: true });
              }
            }

            t.set(examRef0, {
              ...data,
              publishedAt: ts0,
              weekId: weekId,
              status: 'active',
              isSpecial: true,
              exam_type: 'special',
              type: 'prokurorluq',
              publishNonce: publishNonce0,
              sourceDraftId: String(draftRef.id),
              name: `Həftəlik Sınaq - ${typeName0} (${weekId})`,
              description: `${typeName0} üzrə həftəlik rəsmi sınaq imtahanı`
            }, { merge: false });

            t.set(pointerRef0, {
              kind: 'weekly_active_pointer',
              type: 'prokurorluq',
              activeDocId: examRef0.id,
              weekId: weekId,
              updatedAt: ts0
            }, { merge: true });

            t.set(lockRef0, {
              kind: 'weekly_publish_lock',
              type: 'prokurorluq',
              publishNonce: publishNonce0,
              examDocId: examRef0.id,
              weekId: weekId,
              createdAt: ts0
            }, { merge: true });

            t.set(draftRef, {
              status: 'published',
              publishedAt: ts0,
              publishedWeekId: weekId,
              publishedExamDocId: examRef0.id,
              publishedNonce: publishNonce0
            }, { merge: true });

            var recent0 = [];
            if (usageSnap && usageSnap.exists) {
              var ud0 = usageSnap.data ? (usageSnap.data() || {}) : (usageSnap._data || {});
              if (Array.isArray(ud0.recentPublishes)) recent0 = ud0.recentPublishes.slice();
            }
            recent0 = Array.isArray(recent0) ? recent0 : [];
            if (recent0.length > 3) recent0 = recent0.slice(-3);
            recent0.push({ publishNonce: publishNonce0, weekId: weekId, questionIds: questionIds0, publishedAtMs: Date.now() });
            t.set(usageRef0, { cooldown: 4, recentPublishes: recent0, updatedAt: ts0 }, { merge: true });

            var history0 = {};
            if (historySnap && historySnap.exists) {
              var hd0 = historySnap.data ? (historySnap.data() || {}) : (historySnap._data || {});
              history0 = hd0 && hd0.history ? hd0.history : {};
            }
            if (!history0 || typeof history0 !== 'object') history0 = {};
            history0[weekId] = questionIds0;
            var keys0 = Object.keys(history0).sort();
            if (keys0.length > 4) {
              var newHistory0 = {};
              keys0.slice(-4).forEach(function(k){ newHistory0[k] = history0[k]; });
              history0 = newHistory0;
            }
            t.set(historyRef0, { history: history0, lastUpdated: ts0 }, { merge: true });

            if (questionIds0.length) {
              for (var qi0 = 0; qi0 < questionIds0.length; qi0++) {
                var qid0 = questionIds0[qi0];
                var qRef0 = db.collection('category_questions').doc(String(qid0));
                var patch0 = { lastUsedAt: ts0, lastUsedWeeklyKey: weekId, lastUsedWeeklyNonce: publishNonce0 };
                if (typeof fv0.increment === 'function') patch0.usedCount = fv0.increment(1);
                t.set(qRef0, patch0, { merge: true });
              }
            }

            return { deduped: false, examDocId: examRef0.id };
          });

          const review0 = document.getElementById('weekly-review-modal');
          if (review0) review0.remove();
          const editor0 = document.getElementById('weekly-full-editor-modal');
          if (editor0) editor0.remove();
          showNotification(`Həftəlik sınaq (${weekId}) uğurla yayımlandı!`, 'success');
          return txRes0;
        }
        const activeRef = db.collection('weekly_exams').doc('active_' + type);
        const activeDoc = await activeRef.get();
        if (activeDoc.exists) {
          const oldData = activeDoc.data();
          const archivedData = { 
            ...oldData, 
            status: 'archived', 
            archivedAt: firebase.firestore.FieldValue.serverTimestamp() 
          };
          await db.collection('weekly_exams').doc(`archive_${type}_${oldData.weekId || Date.now()}`).set(archivedData);
        }
        const typeNames = { 'prokurorluq': 'Prokurorluq', 'hakimlik': 'Hakimlik', 'vekillik': 'Vəkillik' };
        const typeName = typeNames[type] || type;
        await activeRef.set({
          ...data,
          publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
          weekId: weekId,
          status: 'active',
          isSpecial: true,
          exam_type: 'special',
          name: `Həftəlik Sınaq - ${typeName} (${weekId})`,
          description: `${typeName} üzrə həftəlik rəsmi sınaq imtahanı`
        });
        const historyRef = db.collection('weekly_exams').doc('history_' + type);
        await db.runTransaction(async (t) => {
          const doc = await t.get(historyRef);
          let history = doc.exists ? (doc.data().history || {}) : {};
          if (data.questions) {
            history[weekId] = data.questions.map(q => q.id);
          }
          const keys = Object.keys(history).sort();
          if (keys.length > 4) {
            const newHistory = {};
            keys.slice(-4).forEach(k => newHistory[k] = history[k]);
            history = newHistory;
          }
          t.set(historyRef, { history, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() });
        });
        const review = document.getElementById('weekly-review-modal');
        if (review) review.remove();
        const editor = document.getElementById('weekly-full-editor-modal');
        if (editor) editor.remove();
        showNotification(`Həftəlik sınaq (${weekId}) uğurla yayımlandı!`, 'success');
      } catch(e) {
        console.error(e);
        showNotification('Yayımlama xətası: ' + e.message, 'error');
      }
    },

    // Helper: Cari həftə ID-si (YYYY-W<N>)
    getCurrentWeekId() {
      const d = new Date();
      const year = d.getFullYear();
      const oneJan = new Date(year, 0, 1);
      const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
      return `${year}-W${week}`;
    },

    // Admin: Həftəlik qaralama auto-check (əgər cari həftə üçün yoxdur)
    async checkAutoGenerateWeeklyExam() {
      if (!currentUser || currentUser.role !== 'admin') return;
      const types = ['prokurorluq', 'hakimlik', 'vekillik'];
      for (const type of types) {
        try {
          const weekId = this.getCurrentWeekId();
          const activeDoc = await db.collection('weekly_exams').doc('active_' + type).get();
          if (activeDoc.exists && activeDoc.data().weekId === weekId) {
            continue;
          }
          const draftDoc = await db.collection('weekly_exams').doc('draft_' + type).get();
          let draftIsFresh = false;
          if (draftDoc.exists) {
            const draftData = draftDoc.data();
            const draftDate = draftData.createdAt ? draftData.createdAt.toDate() : new Date(0);
            const now = new Date();
            const diff = now.getDate() - now.getDay() + (now.getDay() == 0 ? -6 : 1);
            const monday = new Date(now.setDate(diff));
            monday.setHours(0,0,0,0);
            if (draftDate >= monday) draftIsFresh = true;
          }
          if (!draftIsFresh) {
            if (window.__DEBUG) console.log(`Auto-generating weekly draft for ${type} (${weekId})`);
            await this.generateDraft(type);
          }
        } catch(e) {
          console.error("Auto-generate check failed for " + type, e);
        }
      }
    }
  };
  window.WeeklyExamSystem = WeeklyExamSystem;
  window.WeeklyExamManager = WeeklyExamSystem;

  // UI: Xüsusi kateqoriyada “İmtahana Başla” klikindən sonra seçim modalı
  window.showExamSelectionModal = function(cat, examType) {
    let modal = document.getElementById('exam-selection-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'exam-selection-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 backdrop-blur-sm';
    
    // Determine icon and color based on exam type
    let iconClass = 'fa-balance-scale';
    let colorClass = 'indigo';
    
    if (examType === 'prokurorluq') {
      iconClass = 'fa-landmark';
      colorClass = 'blue';
    } else if (examType === 'hakimlik') {
      iconClass = 'fa-gavel';
      colorClass = 'purple';
    } else if (examType === 'vekillik') {
      iconClass = 'fa-briefcase';
      colorClass = 'emerald';
    }

    modal.innerHTML = `
      <div class="bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-700 animate-up overflow-hidden">
        <div class="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <h2 class="text-xl font-bold text-white flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-${colorClass}-600 flex items-center justify-center shadow-lg shadow-${colorClass}-500/20">
              <i class="fas ${iconClass} text-white text-sm"></i>
            </span>
            ${cat.name}
          </h2>
          <button onclick="document.getElementById('exam-selection-modal').remove()" class="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="p-6">
          <div class="mb-6 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
            <div class="flex items-start gap-3">
              <div class="mt-1 text-${colorClass}-400">
                <i class="fas fa-info-circle text-lg"></i>
              </div>
              <div>
                <h4 class="text-white font-medium mb-1">Məlumat</h4>
                <p class="text-gray-400 text-sm leading-relaxed">
                  Bu sınaq hər həftə yenilənir. Sistem avtomatik olaraq son 2 həftənin suallarını istisna edir və bazadan təsadüfi suallar seçir.
                </p>
              </div>
            </div>
          </div>

          <button data-action="start-active-weekly-exam" data-exam-type="${examType}" data-cat-id="${cat.id}" 
            class="w-full py-4 px-6 bg-gradient-to-r from-${colorClass}-600 to-${colorClass}-700 hover:from-${colorClass}-500 hover:to-${colorClass}-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-${colorClass}-900/50 transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3">
            <span class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <i class="fas fa-play text-white"></i>
            </span>
            İmtahana Başla
          </button>
          
          <p class="text-center text-gray-500 text-xs mt-4">
            Uğurlar arzulayırıq!
          </p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.__DEBUG) console.log('Exam selection modal opened for:', examType, cat.id);
  };

  // UI: Aktiv həftəlik sınağı backend-dən götürüb imtahana başlatmaq
  window.startActiveWeeklyExam = async function(examType, catId) {
    if (window.__DEBUG) console.log(`Starting active weekly exam: ${examType}, category: ${catId}`);
    var couponInfo = null;
    if (window.COUPON_REQUIRED_TYPES && window.COUPON_REQUIRED_TYPES.has(String(examType))) {
      if (!__getUid()) {
        if (typeof showNotification === 'function') showNotification('Zəhmət olmasa hesabla daxil olun', 'error');
        return;
      }
      const examId = 'active_' + String(examType);
      couponInfo = await new Promise((resolve) => { window.showCouponModal(examId, resolve); });
    }
    const modal = document.getElementById('exam-selection-modal');
    let btn = null;
    if (modal) {
      btn = modal.querySelector('button[data-action="start-active-weekly-exam"]');
      if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        btn.disabled = true;
      }
    }
    try {
      if (typeof db === 'undefined' || !db) {
        throw new Error("Verilənlər bazası ilə əlaqə yoxdur. Səhifəni yeniləyin.");
      }
      const docRef = db.collection('weekly_exams').doc('active_' + examType);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error("Bu kateqoriya üçün hələlik aktiv sınaq yoxdur. Admin sınağı yayımladıqdan sonra cəhd edin.");
      }
      if (couponInfo && couponInfo.code && typeof window.markCouponUsed === 'function') {
        await window.markCouponUsed(couponInfo.code, couponInfo.examId || ('active_' + String(examType)), couponInfo.couponDocId || null);
      }
      window.location.href = 'dim_view.html?weeklyExamType=' + encodeURIComponent(String(examType || ''));
    } catch (e) {
      console.error("Weekly Exam Error:", e);
      alert(e.message);
      if(btn) {
        btn.innerHTML = '<i class="fas fa-play"></i> Bu Həftənin Sınağı';
        btn.disabled = false;
      }
    }
  };

  // UI: İstifadəçi arxiv sınaqlarına giriş (deaktiv, yalnız admin)
  window.showUserArchives = function(examType) {
    const msg = 'Arxiv sınaqlarına giriş bağlanıb.';
    showNotification(msg, 'info');
    alert(msg);
  };

  // UI: Arxiv sınağına başlama (deaktiv)
  window.startArchivedExam = function(docId, examType) {
    const msg = 'Bu funksiya deaktiv edilib.';
    showNotification(msg, 'error');
    alert(msg);
  };

  // Köhnə: Standalone “Həftəlik sınaq” qalıqları (deaktiv mesajı)
  window.startWeeklyExam = async function() {
    const msg = 'Bu sınaq növü ləğv edilib. Zəhmət olmasa müvafiq kateqoriya (Prokurorluq, Hakimlik və s.) altındakı həftəlik sınaqdan istifadə edin.';
    showNotification(msg, 'error');
    alert(msg);
    return;
  };
})();
