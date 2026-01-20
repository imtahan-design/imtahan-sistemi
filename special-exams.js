// Xüsusi İmtahan Modulu: Prokurorluq/Hakimlik/Vəkillik
// Bu modul xüsusi hüquq imtahanlarının (Prokurorluq, Hakimlik, Vəkillik) idarə olunmasını, sual seçimini və başlanğıc axınını mərkəzləşdirir.
// Qlobal obyektlərdən (categories, db, currentUser) istifadə edir və mövcud UI axınına inteqrasiya olunur.
(function() {
  // Xüsusi bölmələr sxemi (Prokurorluq üçün əsas siyahı)
  window.PROKURORLUQ_SUBS = [
    { id: '1768674522030', count: 20, name: 'Cinayət Məcəlləsi', keys: ['cinayət məcəlləsi', 'cinayet mecellesi', 'cm'] },
    { id: '1768683898010', count: 20, name: 'Cinayət-Prosessual Məcəlləsi', keys: ['cinayət-prosessual', 'cpm', 'cinayet prosessual'] },
    { id: '1766934946320', count: 6, name: 'Konstitusiya', keys: ['konstitusiya'] },
    { id: '1768696058306', count: 3, name: 'Normativ hüquqi aktlar', keys: ['normativ hüquqi aktlar', 'normativ aktlar'] },
    { id: '1768735010552', count: 5, name: 'İnzibati Xətalar Məcəlləsi', keys: ['inzibati xətalar', 'ixm'] },
    { id: 'special_prokurorluq_human_rights', count: 2, name: 'İnsan hüquqları Konvensiyası', keys: ['konvensiya', 'insan hüquqları'] },
    { id: '1768750915800', count: 2, name: 'Mülki Məcəllə', keys: ['mülki məcəllə', 'mulki mecelle'] },
    { id: '1768737630088', count: 2, name: 'Mülki-Prosessual Məcəllə', keys: ['mülki-prosessual', 'mpm'] },
    { id: '1768745670510', count: 2, name: 'Əmək Məcəlləsi', keys: ['əmək məcəlləsi'] },
    { id: '1768696474731', count: 8, name: 'Prokurorluq haqqında Qanun', keys: ['prokurorluq haqqında', 'prokurorluq qanunu'] },
    { id: '1768696605470', count: 6, name: 'Prokurorluqda qulluq haqqında Qanun', keys: ['prokurorluqda qulluq'] },
    { id: '1767194888783', count: 3, name: 'Korrupsiyaya qarşı mübarizə', keys: ['korrupsiya'] },
    { id: '1768698786812', count: 1, name: 'Polis haqqında Qanun', keys: ['polis haqqında'] }
  ];

  // Hakimlik və Vəkillik üçün eyni sxem – müstəqil kopyalar
  window.HAKIMLIK_SUBS = JSON.parse(JSON.stringify(window.PROKURORLUQ_SUBS));
  window.VEKILLIK_SUBS = JSON.parse(JSON.stringify(window.PROKURORLUQ_SUBS));

  // Prokurorluq alt-bölmələrini seed/merge edən util (admin üçün)
  window.seedProkurorluqSubcategories = async function() {
    var parentId = 'special_prokurorluq';
    var parent = categories.find(function(c) { return c.id === parentId; });
    if (!parent && typeof db !== 'undefined') {
      // Lazım gəlsə, parent yaradılacaq (güvənli fallback)
    }

    var schema = window.PROKURORLUQ_SUBS;
    var hasChanges = false;

    for (var i = 0; i < schema.length; i++) {
      var item = schema[i];
      var officialCat = categories.find(function(c) { return c.id === item.id; });
      var duplicates = categories.filter(function(c) {
        return c.parentId === parentId &&
          c.id !== item.id &&
          (c.name.trim().toLowerCase() === item.name.trim().toLowerCase() ||
           (item.name.indexOf('Konvensiya') > -1 && c.name.indexOf('Konvensiya') > -1));
      });

      if (duplicates.length > 0) {
        if (!officialCat) {
          officialCat = {
            id: item.id,
            name: item.name,
            parentId: parentId,
            questions: [],
            isHiddenFromPublic: false,
            createdBy: 'system',
            time: 45
          };
          categories.push(officialCat);
          hasChanges = true;
        }
        duplicates.forEach(function(dup) {
          if (dup.questions && dup.questions.length > 0) {
            var existingIds = new Set((officialCat.questions || []).map(function(q) { return q.id; }));
            var newQuestions = dup.questions.filter(function(q) { return !existingIds.has(q.id); });
            if (newQuestions.length > 0) {
              officialCat.questions = (officialCat.questions || []).concat(newQuestions);
              hasChanges = true;
            }
          }
          var idx = categories.indexOf(dup);
          if (idx > -1) categories.splice(idx, 1);
          if (typeof db !== 'undefined' && db) {
            db.collection('categories').doc(dup.id).delete().catch(console.error);
          }
        });
        if (typeof db !== 'undefined' && db) {
            db.collection('categories').doc(officialCat.id).set(officialCat).catch(console.error);
          }
        } else if (officialCat) {
             // If official cat exists but no duplicates, ensure it is visible
             if (officialCat.isHiddenFromPublic) {
                 officialCat.isHiddenFromPublic = false;
                 hasChanges = true;
                 if (typeof db !== 'undefined' && db) {
                    db.collection('categories').doc(officialCat.id).update({ isHiddenFromPublic: false }).catch(console.error);
                 }
             }
        } else if (!officialCat) {
          var newSub = {
            id: item.id,
            name: item.name,
            parentId: parentId,
            questions: [],
            isHiddenFromPublic: false, // Force false here too, just in case
          createdBy: 'system',
          time: 45
        };
        categories.push(newSub);
        if (typeof db !== 'undefined' && db) {
          db.collection('categories').doc(item.id).set(newSub).catch(console.error);
        }
        hasChanges = true;
      }
    }
    if (hasChanges && typeof saveCategories === 'function') {
      saveCategories();
    }
  };

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
    var schema = window.PROKURORLUQ_SUBS;
    for (var sIndex = 0; sIndex < schema.length; sIndex++) {
      var item = schema[sIndex];

      var cat = categories.find(function(c) { return c.parentId === 'special_prokurorluq' && c.name === item.name; });
      if (!cat && item.isDynamic) {
        cat = categories.find(function(c) { return c.parentId === 'special_prokurorluq' && (c.name.indexOf('Konvensiya') > -1 || c.id === 'special_prokurorluq_human_rights'); });
      }

      if ((!cat || !cat.questions || cat.questions.length === 0) && db && cat) {
        try {
          var doc = await db.collection('categories').doc(cat.id).get();
          if (doc.exists) cat = { id: doc.id, data: doc.data() };
        } catch (e) { console.error("Error fetching special cat " + (cat && cat.id), e); }
      }

      if (!cat || !cat.questions || cat.questions.length === 0) {
        continue;
      }

      var availableQuestions = cat.questions.filter(function(q) { return !usedQuestionIds.has(String(q.id)); });
      var shuffled = availableQuestions.sort(function() { return 0.5 - Math.random(); });
      var selectedCount = 0;
      var subjectSelected = [];
      for (var qIndex = 0; qIndex < shuffled.length; qIndex++) {
        var q = shuffled[qIndex];
        if (selectedCount >= item.count) break;
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
        if (catId.indexOf('prokuror') > -1) { cat = {name: 'Prokurorluq', id: catId}; examType = 'prokurorluq'; }
      } else {
        var lowerName = (cat.name || '').toLowerCase();
        if (catId === 'special_prokurorluq' || lowerName.indexOf('prokuror') > -1) examType = 'prokurorluq';
      }

      if (!cat) {
        alert("Xəta: Kateqoriya tapılmadı! Səhifəni yeniləyin.");
        return;
      }

      if (examType && examType === 'prokurorluq') {
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
