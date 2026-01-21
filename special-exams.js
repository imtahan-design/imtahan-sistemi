// Xüsusi İmtahan Modulu: Prokurorluq/Hakimlik/Vəkillik
// Bu modul xüsusi hüquq imtahanlarının (Prokurorluq, Hakimlik, Vəkillik) idarə olunmasını, sual seçimini və başlanğıc axınını mərkəzləşdirir.
// Qlobal obyektlərdən (categories, db, currentUser) istifadə edir və mövcud UI axınına inteqrasiya olunur.
(function() {
  window.PROKURORLUQ_SUBS = undefined;
  window.HAKIMLIK_SUBS = undefined;
  window.VEKILLIK_SUBS = undefined;

  window.seedProkurorluqSubcategories = async function() { return; };

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
    var subs = categories.filter(function(c) { return c.parentId === 'special_prokurorluq'; });
    if (!subs || subs.length === 0) {
      throw new Error("Prokurorluq alt-bölmələri tapılmadı.");
    }
    var DEFAULT_TOTAL = 80;
    var perSub = Math.max(1, Math.floor(DEFAULT_TOTAL / subs.length));
    for (var sIndex = 0; sIndex < subs.length; sIndex++) {
      var cat = subs[sIndex];
      if (!cat || !cat.questions || cat.questions.length === 0) continue;
      var availableQuestions = cat.questions.filter(function(q) { return !usedQuestionIds.has(String(q.id)); });
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
      localStorage.setItem('activeSpecialCategory', catId);
      window.location.href = 'dim_view.html';
    } catch (e) {
      console.error("Special Quiz Error:", e);
      alert("Sistem xətası: " + e.message);
    }
  };
})();
