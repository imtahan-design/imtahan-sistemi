// Xüsusi İmtahan Modulu: Prokurorluq/Hakimlik/Vəkillik
// Bu modul xüsusi hüquq imtahanlarının (Prokurorluq, Hakimlik, Vəkillik) idarə olunmasını, sual seçimini və başlanğıc axınını mərkəzləşdirir.
// Qlobal obyektlərdən (categories, db, currentUser) istifadə edir və mövcud UI axınına inteqrasiya olunur.
(function() {
  window.PROKURORLUQ_SUBS = undefined;
  window.HAKIMLIK_SUBS = undefined;
  window.VEKILLIK_SUBS = undefined;

  window.seedProkurorluqSubcategories = async function() { return; };

  function __isQuestionsDisabled(cat) {
    return !!cat && String(cat.questionsMode || '').toLowerCase() === 'none';
  }

  function __isSpecialRoot(cat) {
    if (!cat) return false;
    const isSpec = (cat.examType === 'special' || cat.exam_type === 'special' || String(cat.id || '').startsWith('special_'));
    return isSpec && (!cat.parentId);
  }

  function __collectSubtreeIds(rootId) {
    rootId = String(rootId || '');
    const all = Array.isArray(categories) ? categories : [];
    const byParent = new Map();
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      var pid = c && c.parentId != null ? String(c.parentId) : null;
      var id = c && c.id != null ? String(c.id) : null;
      if (!id) continue;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(id);
    }
    const visited = new Set();
    const q = [rootId];
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
    const subtree = __collectSubtreeIds(rootId);
    const all = Array.isArray(categories) ? categories : [];
    const hasChild = new Set();
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

  async function __loadQuestionsForExam(cat, targetCount) {
    if (!cat || __isQuestionsDisabled(cat) || cat.deleted === true) return [];
    var inlineQs = (Array.isArray(cat.questions) && cat.questionsInline !== false) ? cat.questions : null;
    var qs = inlineQs ? inlineQs.slice() : [];
    if (qs.length > 0) {
      return qs.filter(function(q){ return q && q.deleted !== true && q.legacy !== true; });
    }
    if (!db) return [];
    var pageSize = 100;
    var maxFetch = Math.max(300, Math.min(1500, (targetCount || 0) * 6));
    var out = [];
    var page = 0;
    while (out.length < maxFetch) {
      try {
        var snap = await db.collection('category_questions')
          .where('categoryId', '==', String(cat.id))
          .where('page', '==', page)
          .orderBy('createdAt', 'asc')
          .limit(pageSize)
          .get();
        if (snap.empty) break;
        for (var i = 0; i < snap.docs.length; i++) {
          var d = snap.docs[i];
          var data = d.data() || {};
          if (data.deleted === true || data.legacy === true) continue;
          var q = { id: data.id || d.id, ...data };
          out.push(q);
        }
        if (snap.docs.length < pageSize) break;
        page++;
      } catch (_e) {
        break;
      }
    }
    return out;
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

  async function __specialFlagReviewFlow(questions) {
    var opener = __getFlaggedModalOpener();
    if (!opener || typeof window.getFlaggedQuestions !== 'function') return { status: 'ok', questions: questions, changed: false };
    questions = Array.isArray(questions) ? questions : [];
    var changed = false;

    for (var safety = 0; safety < 200; safety++) {
      var flaggedAll = [];
      try { flaggedAll = window.getFlaggedQuestions(questions) || []; } catch(_) { flaggedAll = []; }
      var flagged = (Array.isArray(flaggedAll) ? flaggedAll : []).map(function(f){
        var id = f && f.id != null ? String(f.id) : '';
        var idx = questions.findIndex(function(q){ return q && String(q.id) === id; });
        return { id: id, idx: idx, reasons: (f && Array.isArray(f.reasons)) ? f.reasons : [] };
      }).filter(function(f){ return f.id && f.idx >= 0; });

      if (!flagged.length) return { status: 'ok', questions: questions, changed: changed };

      var cur = flagged[0];
      var q0 = questions[cur.idx] || {};
      var res = await opener({
        id: cur.id,
        reasons: cur.reasons,
        question: q0,
        progressText: '1/' + String(flagged.length)
      });

      if (!res || res.action === 'cancel') return { status: 'cancel', questions: questions, changed: changed };
      if (res.action === 'delete') {
        questions.splice(cur.idx, 1);
        changed = true;
        continue;
      }
      if (res.action === 'keep' || res.action === 'edit') {
        q0._flagReview = { status: 'kept', reasons: cur.reasons, reviewedAt: Date.now(), by: (currentUser && currentUser.id) ? String(currentUser.id) : null };
        q0._flagReasons = cur.reasons;
        changed = true;
        continue;
      }
    }

    return { status: 'error', questions: questions, changed: changed };
  }

  // Prokurorluq sınağını istifadəçi tarixçəsinə əsaslanaraq generasiya edir
  window.generateProkurorluqExam = async function() {
    if (!currentUser) {
      alert("Xüsusi sınaqları işləmək üçün zəhmət olmasa qeydiyyatdan keçin və ya daxil olun!");
      window.location.href = '#login';
      if (typeof window.showLogin === 'function') window.showLogin();
      throw new Error("İmtahan üçün daxil olmalısınız.");
    }

    var usedQuestionIds = new Set();
    var usedSimilarityGroups = new Set();
    if (db) {
      try {
        var historySnapshot = await db.collection('exam_history')
          .where('userId', '==', currentUser.id)
          .where('examType', '==', 'prokurorluq')
          .get();
        historySnapshot.forEach(function(doc) {
          var data = doc.data();
          if (data.questionIds && Array.isArray(data.questionIds)) {
            data.questionIds.forEach(function(id) { usedQuestionIds.add(id); });
          }
        });
      } catch (e) { console.error("History fetch error:", e); }
    }

    var examQuestions = [];
    var rootId = 'special_prokurorluq';
    var subs = __leafCategoriesUnder(rootId);
    if (!subs || subs.length === 0) {
      throw new Error("Prokurorluq alt-bölmələri tapılmadı.");
    }
    var DEFAULT_TOTAL = 80;
    var perSub = Math.max(1, Math.floor(DEFAULT_TOTAL / subs.length));
    for (var sIndex = 0; sIndex < subs.length; sIndex++) {
      var cat = subs[sIndex];
      var sourceQs = await __loadQuestionsForExam(cat, perSub);
      if (!sourceQs || sourceQs.length === 0) continue;
      var availableQuestions = sourceQs.filter(function(q) {
        if (!q || q.deleted === true) return false;
        return !usedQuestionIds.has(String(q.id));
      });
      var shuffled = availableQuestions.sort(function() { return 0.5 - Math.random(); });
      var selectedCount = 0;
      var subjectSelected = [];
      for (var qIndex = 0; qIndex < shuffled.length; qIndex++) {
        var q = shuffled[qIndex];
        if (selectedCount >= perSub) break;
        if (q.similarityGroupId) {
          if (usedSimilarityGroups.has(q.similarityGroupId)) {
            continue;
          }
        }
        var qWithCat = {};
        for (var k in q) { if (Object.prototype.hasOwnProperty.call(q, k)) qWithCat[k] = q[k]; }
        qWithCat.categoryId = cat.id;
        subjectSelected.push(qWithCat);
        if (q.similarityGroupId) usedSimilarityGroups.add(q.similarityGroupId);
        selectedCount++;
      }
      examQuestions = examQuestions.concat(subjectSelected);
    }

    if (examQuestions.length === 0) {
      throw new Error("Sual bazası boşdur və ya bütün sualları işləmisiniz.");
    }

    var reviewRes = await __specialFlagReviewFlow(examQuestions);
    if (reviewRes && reviewRes.status === 'cancel') {
      throw new Error('Sınaq yaradılması ləğv edildi.');
    }
    if (reviewRes && reviewRes.status === 'error') {
      throw new Error('Şübhəli sual yoxlamasında xəta baş verdi.');
    }
    if (reviewRes && Array.isArray(reviewRes.questions)) examQuestions = reviewRes.questions;

    return {
      id: 'generated_prokurorluq',
      name: 'Prokurorluq üzrə sınaq',
      time: 180,
      questions: examQuestions,
      isSpecial: true,
      examType: 'prokurorluq',
      exam_type: 'special',
      createdAt: Date.now()
    };
  };

  // Xüsusi sınağı açır və uyğun axını seçir
  window.startSpecialQuiz = async function(catId) {
    try {
      if (catId === 'special_weekly_exam' || catId === 'weekly_exam') {
        if (typeof window.startWeeklyExam === 'function') {
          window.startWeeklyExam();
          return;
        }
      }

      var cat = categories.find(function(c) { return c.id === catId; });
      var examType = null;
      if (!cat) {
        var lc = String(catId).toLowerCase();
        if (lc.indexOf('prokuror') > -1) { cat = {name: 'Prokurorluq', id: catId}; examType = 'prokurorluq'; }
        else if (lc.indexOf('hakim') > -1) { cat = {name: 'Hakimlik', id: catId}; examType = 'hakimlik'; }
        else if (lc.indexOf('vekil') > -1 || lc.indexOf('vəkil') > -1) { cat = {name: 'Vəkillik', id: catId}; examType = 'vekillik'; }
      } else {
        var lowerName = (cat.name || '').toLowerCase();
        if (catId === 'special_prokurorluq' || lowerName.indexOf('prokuror') > -1) examType = 'prokurorluq';
        else if (catId === 'special_hakimlik' || lowerName.indexOf('hakim') > -1) examType = 'hakimlik';
        else if (catId === 'special_vekillik' || lowerName.indexOf('vekil') > -1 || lowerName.indexOf('vəkil') > -1) examType = 'vekillik';
      }

      if (!cat) {
        alert("Xəta: Kateqoriya tapılmadı! Səhifəni yeniləyin.");
        return;
      }

      if (examType) {
        if (typeof window.showExamSelectionModal === 'function') {
          window.showExamSelectionModal(cat, examType);
          return;
        }
      }
      try { window.__ACTIVE_SPECIAL_CATEGORY__ = catId; } catch(_) {}
      try { if (typeof window.safeSet === 'function') window.safeSet('activeSpecialCategory', catId); else localStorage.setItem('activeSpecialCategory', catId); } catch(_) {}
      window.location.href = 'dim_view.html';
    } catch (e) {
      console.error("Special Quiz Error:", e);
      alert("Sistem xətası: " + e.message);
    }
  };
})();
