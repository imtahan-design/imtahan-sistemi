// Admin Panel Modulu
// Bu modul admin və moderatorlar üçün idarəetmə səhifəsini, kateqoriya renderini və util funksiyaları bir mərkəzdə toplayır.
(function() {
  // Admin Dashboard açılışı və istiqamətləmə
  window.showAdminDashboard = function(doPush) {
    if (doPush === undefined) doPush = true;
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) return showNotification('Bu səhifə yalnız səlahiyyətli şəxslər üçündür!', 'error');
    if (currentUser.role === 'admin' && typeof WeeklyExamManager !== 'undefined') {
      WeeklyExamManager.checkAutoGenerateWeeklyExam();
    }
    if (doPush) {
      var url = new URL(window.location);
      url.searchParams.set('page', 'admin');
      url.searchParams.delete('cat');
      window.history.pushState({ page: 'admin' }, '', url);
    }
    currentAdminParentId = null;
    hideAllSections();
    document.getElementById('admin-dashboard-section').classList.remove('hidden');
    var statsBox = document.getElementById('visitor-stats-display');
    if (statsBox) statsBox.classList.add('hidden');
    renderAdminCategories();
  };

  // Statistika bölməsinin görünməsi və yüklənməsi
  window.toggleAdminStats = function() {
    var box = document.getElementById('visitor-stats-display');
    if (!box) return;
    var willShow = box.classList.contains('hidden');
    if (willShow) {
      box.classList.remove('hidden');
      loadAdminDashboardStats();
    } else {
      box.classList.add('hidden');
    }
  };

  // Admin statistikasını yükləyən util
  window.loadAdminDashboardStats = async function() {
    try {
      if (!db) return;
      var cachedStats = sessionStorage.getItem('adminStatsCache');
      if (cachedStats) {
        var cacheData = JSON.parse(cachedStats);
        var isZero = (cacheData.data.totalUsers === 0 && cacheData.data.totalQuestions === 0);
        if (Date.now() - cacheData.timestamp < 300000 && !isZero) {
          var stats = cacheData.data;
          var totalUsersElem = document.getElementById('total-visitors');
          if (totalUsersElem) totalUsersElem.textContent = stats.totalUsers;
          var todayRegElem = document.getElementById('today-registrations');
          if (todayRegElem) todayRegElem.textContent = stats.todayReg;
          var totalAttemptsElem = document.getElementById('total-finished-quizzes');
          if (totalAttemptsElem) totalAttemptsElem.textContent = stats.totalAttempts;
          var totalQuestionsElem = document.getElementById('total-active-questions');
          if (totalQuestionsElem) totalQuestionsElem.textContent = stats.totalQuestions;
          return;
        }
      }
      var totalUsers = 0;
      var todayReg = 0;
      try {
        var usersSnapshot = await db.collection('users').get();
        totalUsers = usersSnapshot.size;
        var startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        var startTs = firebase && firebase.firestore && firebase.firestore.Timestamp ? firebase.firestore.Timestamp.fromDate(startOfDay) : null;
        todayReg = usersSnapshot.docs.filter(function(doc) {
          var d = doc.data();
          var ts = d.createdAt || d.created_at || d.createdOn;
          if (!ts) return false;
          if (ts.seconds) return ts.seconds >= (startTs ? startTs.seconds : Math.floor(startOfDay.getTime()/1000));
          if (typeof ts === 'number') return ts >= startOfDay.getTime();
          if (typeof ts === 'string') {
            var t = Date.parse(ts);
            return !isNaN(t) && t >= startOfDay.getTime();
          }
          return false;
        }).length;
      } catch(e) { console.warn("Users stats error:", e); }
      var totalUsersElem2 = document.getElementById('total-visitors');
      if (totalUsersElem2) totalUsersElem2.textContent = totalUsers;
      var todayRegElem2 = document.getElementById('today-registrations');
      if (todayRegElem2) todayRegElem2.textContent = todayReg;
      var totalAttempts = 0;
      try {
        var attemptsSnapshot = await db.collection('student_attempts').get();
        totalAttempts = attemptsSnapshot.size;
      } catch(e) { console.warn("Attempts stats error:", e); }
      var totalAttemptsElem2 = document.getElementById('total-finished-quizzes');
      if (totalAttemptsElem2) totalAttemptsElem2.textContent = totalAttempts;
      var totalQuestions = 0;
      try {
        if (typeof categories !== 'undefined') {
          categories.forEach(function(cat) { if (cat.questions) totalQuestions += cat.questions.length; });
        }
        var publicQuestionsSnapshot = await db.collection('public_questions').select('id').get();
        totalQuestions += publicQuestionsSnapshot.size;
      } catch(e) { console.warn("Questions stats error:", e); }
      var totalQuestionsElem2 = document.getElementById('total-active-questions');
      if (totalQuestionsElem2) totalQuestionsElem2.textContent = totalQuestions;
      var cachePayload = {
        timestamp: Date.now(),
        data: {
          totalUsers: totalUsers,
          todayReg: todayReg,
          totalAttempts: totalAttempts,
          totalQuestions: totalQuestions
        }
      };
      sessionStorage.setItem('adminStatsCache', JSON.stringify(cachePayload));
    } catch (e) {
      console.error("Admin statistika yükləmə xətası:", e);
    }
  };

  // Kateqoriya siyahısını render edən funksiya (admin panel)
  window.renderAdminCategories = function() {
    var grid = document.getElementById('admin-categories-grid');
    grid.innerHTML = '';
    var filteredCategories = categories.filter(function(cat) { return cat.parentId === currentAdminParentId; });
    var title = document.getElementById('admin-dashboard-title');
    var backBtn = document.getElementById('admin-back-btn');
    if (currentAdminParentId) {
      var parent = categories.find(function(c) { return c.id === currentAdminParentId; });
      title.textContent = "Bölmə: " + (parent ? parent.name : '...');
      backBtn.classList.remove('hidden');
      if (currentAdminParentId === 'special_prokurorluq' && currentUser.role === 'admin') {
        var toolBtn = document.createElement('button');
        toolBtn.className = 'btn-warning ml-2';
        toolBtn.innerHTML = '<i class="fas fa-magic"></i> Sualları Bölmələrə Payla';
        toolBtn.onclick = window.organizeProkurorluqQuestions;
        title.appendChild(toolBtn);
      }
    } else {
      title.textContent = currentUser.role === 'moderator' ? 'Moderator Paneli' : 'Admin Paneli - Kateqoriyalar';
      backBtn.classList.add('hidden');
    }
    var exportBtn = document.querySelector('.btn-success[onclick="exportData()"]');
    var restoreBtn = document.getElementById('restore-btn-global');
    var addCatBtn = document.querySelector('.btn-primary[onclick="showAddCategoryModal()"]');
    if (currentUser && currentUser.role === 'moderator') {
      if (exportBtn) exportBtn.classList.add('hidden');
      if (restoreBtn) restoreBtn.classList.add('hidden');
      if (addCatBtn) addCatBtn.classList.add('hidden');
    } else if (currentUser && currentUser.role === 'admin') {
      if (exportBtn) exportBtn.classList.remove('hidden');
      if (restoreBtn) restoreBtn.classList.remove('hidden');
      if (addCatBtn) addCatBtn.classList.remove('hidden');
    }
    filteredCategories.forEach(function(cat, index) {
      var div = document.createElement('div');
      div.className = 'category-card animate-up';
      div.style.animationDelay = (index * 0.08) + 's';
      var icon = 'fa-book';
      var nameLower = (cat.name || '').toLowerCase();
      if (nameLower.indexOf('ingilis') > -1) icon = 'fa-language';
      if (nameLower.indexOf('cinayət') > -1 || nameLower.indexOf('cinayet') > -1) icon = 'fa-gavel';
      if (nameLower.indexOf('mülki') > -1 || nameLower.indexOf('mulki') > -1) icon = 'fa-balance-scale';
      if (nameLower.indexOf('dövlət') > -1 || nameLower.indexOf('dovlet') > -1) icon = 'fa-university';
      if (nameLower.indexOf('konstitusiya') > -1) icon = 'fa-scroll';
      if (nameLower.indexOf('biologiya') > -1) icon = 'fa-dna';
      if (nameLower.indexOf('kimya') > -1) icon = 'fa-flask';
      if (nameLower.indexOf('dərslik') > -1 || nameLower.indexOf('derslik') > -1) icon = 'fa-graduation-cap';
      var hasSub = categories.some(function(c) { return c.parentId === cat.id; });
      div.innerHTML = ''
        + '<div class="cat-card-header">'
        +   '<i class="fas ' + icon + '"></i>'
        +   (currentUser.role === 'admin' ? '<div class="cat-card-tools">'
        +     '<button class="edit-cat-btn" onclick="showEditCategoryModal(\'' + cat.id + '\', event)"><i class="fas fa-edit"></i></button>'
        +     '<button class="delete-cat-btn" onclick="deleteCategory(\'' + cat.id + '\', event)"><i class="fas fa-trash"></i></button>'
        +   '</div>' : '')
        + '</div>'
        + '<h3>' + escapeHtml(cat.name || '') + '</h3>'
        + (hasSub ? '' : '<p>' + (cat.questions ? cat.questions.length : 0) + ' sual</p>')
        + (hasSub ? '<p class="text-xs text-primary"><i class="fas fa-folder"></i> Alt bölmələr var</p>' : '')
        + '<div class="category-actions">'
        +   '<button class="btn-secondary" onclick="enterAdminCategory(\'' + cat.id + '\')">Bölməyə Bax</button>'
        +   '<button class="btn-primary" onclick="openCategoryQuestions(\'' + cat.id + '\')">Suallar (' + (cat.questions ? cat.questions.length : 0) + ')</button>'
        +   (cat.id === 'public_general' ? '<button class="btn-outline" onclick="openGlobalPublicQuestions()"><i class="fas fa-users"></i> Ümumi Suallar</button>' : '')
        + '</div>';
      grid.appendChild(div);
    });
  };

  // Admin panelində naviqasiya (alt-bölmələrə daxil ol/geri qayıt)
  window.enterAdminCategory = function(id) {
    currentAdminParentId = id;
    var url = new URL(window.location);
    if (id) {
      url.searchParams.set('adminCat', id);
      url.searchParams.set('page', 'admin');
    } else {
      url.searchParams.delete('adminCat');
    }
    window.history.pushState({ currentAdminParentId: id }, '', url);
    renderAdminCategories();
  };

  window.navigateAdminUp = function() {
    if (!currentAdminParentId) return;
    var current = categories.find(function(c) { return c.id === currentAdminParentId; });
    var newId = current ? current.parentId : null;
    window.enterAdminCategory(newId);
  };

  window.openCategoryQuestions = function(id) {
    openCategory(id);
  };

  // Kateqoriya yaratma/redaktə modal idarəsi
  window.showAddCategoryModal = function() {
    document.getElementById('category-modal-title').textContent = 'Yeni Kateqoriya';
    document.getElementById('edit-cat-id').value = '';
    document.getElementById('new-cat-name').value = '';
    document.getElementById('new-cat-time').value = '45';
    document.getElementById('save-category-btn').textContent = 'Yarat';
    document.getElementById('category-modal').classList.remove('hidden');
  };

  window.showEditCategoryModal = function(id, event) {
    if (event) event.stopPropagation();
    var cat = categories.find(function(c) { return c.id === id; });
    if (!cat) return;
    document.getElementById('category-modal-title').textContent = 'Kateqoriyanı Redaktə Et';
    document.getElementById('edit-cat-id').value = cat.id;
    document.getElementById('new-cat-name').value = cat.name;
    document.getElementById('new-cat-time').value = cat.time;
    document.getElementById('save-category-btn').textContent = 'Yadda Saxla';
    document.getElementById('category-modal').classList.remove('hidden');
  };

  window.saveCategory = function() {
    if (!currentUser || currentUser.role !== 'admin') return showNotification('Bu hərəkət üçün admin icazəsi lazımdır!', 'error');
    var id = document.getElementById('edit-cat-id').value;
    var name = document.getElementById('new-cat-name').value;
    var time = parseInt(document.getElementById('new-cat-time').value);
    if (!name) return showNotification('Ad daxil edin!', 'error');
    if (id) {
      var index = categories.findIndex(function(c) { return c.id === id; });
      if (index !== -1) {
        categories[index].name = name;
        categories[index].time = time || 45;
        updateCategoryInDB(categories[index]);
      }
    } else {
      var newCat = {
        id: String(Date.now()),
        name: name,
        time: time || 45,
        questions: [],
        createdBy: currentUser.id,
        parentId: currentAdminParentId
      };
      categories.push(newCat);
      addCategoryToDB(newCat);
    }
    if (typeof saveCategories === 'function') saveCategories();
    closeModal('category-modal');
    renderAdminCategories();
  };

  async function addCategoryToDB(cat) {
    if (db) {
      await db.collection('categories').doc(String(cat.id)).set(cat, { merge: true });
    }
  }

  async function updateCategoryInDB(cat) {
    if (db) {
      await db.collection('categories').doc(String(cat.id)).update({
        name: cat.name,
        time: cat.time
      });
    }
  }

  window.deleteCategory = function(id, event) {
    event.stopPropagation();
    if (!currentUser || currentUser.role !== 'admin') return showNotification('Bu hərəkət üçün admin icazəsi lazımdır!', 'error');
    if (confirm('Bu kateqoriyanı silmək istədiyinizə əminsiniz?')) {
      if (db) {
        db.collection('categories').doc(String(id)).delete().catch(console.error);
      }
      categories = categories.filter(function(c) { return String(c.id) !== String(id); });
      if (typeof saveCategories === 'function') saveCategories();
      renderAdminCategories();
    }
  };

  // Ümumi sualların 'public_general' kateqoriyasına köçürülməsi
  window.migratePublicQuestionsToGlobal = async function() {
    if (!db) return;
    try {
      var migratedDoc = await db.collection('settings').doc('migration_v1_public_questions').get();
      if (migratedDoc.exists && migratedDoc.data().done) {
        return;
      }
      var snapshot = await db.collection('public_questions').get();
      if (snapshot.empty) return;
      var batch = db.batch();
      var count = 0;
      var totalUpdated = 0;
      snapshot.docs.forEach(function(doc) {
        var data = doc.data();
        if (data.categoryId !== 'public_general') {
          var ref = db.collection('public_questions').doc(doc.id);
          batch.update(ref, {
            categoryId: 'public_general',
            originalCategoryId: data.categoryId,
            migratedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          count++;
          totalUpdated++;
        }
        if (count >= 450) {
          batch.commit();
          batch = db.batch();
          count = 0;
        }
      });
      if (count > 0) await batch.commit();
      await db.collection('settings').doc('migration_v1_public_questions').set({ done: true, date: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) { console.error("Migration error:", e); }
  };

  // Admin sual siyahısında "Daha çox göstər"
  window.loadMoreAdminQuestions = function() {
    adminQuestionViewState.topCount += 5;
    renderQuestions();
  };

  // Admin: AI ilə sual generasiyası (Gemini)
  window.generateAdminAIQuestions = async function() {
    var context = document.getElementById('admin-ai-context-text').value.trim();
    var count = document.getElementById('admin-ai-question-count').value;
    var difficulty = document.getElementById('admin-ai-difficulty').value;
    var btn = document.getElementById('btn-admin-generate-ai');
    var loading = document.getElementById('admin-ai-loading');
    if (btn) btn.disabled = true;
    if (loading) loading.classList.remove('hidden');
    if (!context) {
      if (loading) loading.classList.add('hidden');
      if (btn) btn.disabled = false;
      return showNotification('Zəhmət olmasa mövzu mətni daxil edin.', 'error');
    }
    var questionStats = AIUsageLimits.checkDailyLimit('question');
    if (questionStats.count >= 5) {
      if (loading) loading.classList.add('hidden');
      if (btn) btn.disabled = false;
      return showNotification('Gündəlik limit dolub.', 'warning');
    }
    var questionCooldown = AIUsageLimits.checkCooldown('question');
    if (questionCooldown > 0) {
      if (loading) loading.classList.add('hidden');
      if (btn) btn.disabled = false;
      return showNotification('Zəhmət olmasa ' + questionCooldown + ' saniyə gözləyin.', 'warning');
    }
    if (count == 0) {
      if (loading) loading.classList.add('hidden');
      if (btn) btn.disabled = false;
      return showNotification('Sual sayı ən azı 5 olmalıdır.', 'warning');
    }
    if (context.length < 10) {
      if (loading) loading.classList.add('hidden');
      if (btn) btn.disabled = false;
      return showNotification('Daxil edilən məlumat çox qısadır.', 'warning');
    }
    var difficultyText = "";
    if (difficulty === "easy") difficultyText = "Suallar asan səviyyədə olsun. ";
    else if (difficulty === "hard") difficultyText = "Suallar çətin səviyyədə olsun. ";
    else difficultyText = "Suallar orta çətinlikdə olsun. ";
    var prompt = "Sən bir peşəkar müəllimsən. Aşağıdakı məlumat əsasında " + count + " dənə çoxseçimli (test) sual hazırla. " + difficultyText
      + "Cavablar yalnız Azərbaycan dilində olsun.\nHər sualın 4 variantı olsun.\n"
      + "Variantların daxilində prefixlər yazma.\nNəticəni yalnız JSON kimi qaytar:\n[\n  {\"text\":\"Sual\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correct\":0}\n]\n"
      + "Məlumat: " + context;
    var models = ["gemini-3-flash-preview","gemini-3-pro-preview","gemini-2.5-pro","gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.0-flash","gemini-2.0-flash-lite"];
    var apiVersions = ["v1beta","v1"];
    var lastError = "";
    var success = false;
    async function geminiRequest(apiVer, modelName, contents, generationConfig) {
      var useBackend = !GEMINI_API_KEY;
      if (useBackend) {
        var resp = await fetch(BACKEND_URL + "/api/ai/generate", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiVer: apiVer, modelName: modelName, contents: contents, generationConfig: generationConfig })
        });
        return await resp.json();
      }
      var apiUrl = "https://generativelanguage.googleapis.com/" + apiVer + "/models/" + modelName + ":generateContent?key=" + GEMINI_API_KEY;
      var response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contents, generationConfig: generationConfig })
      });
      var ct = response.headers.get('content-type') || '';
      if (ct.indexOf('application/json') > -1) {
        var data = await response.json();
        if (data && data.error && (data.error.status === "PERMISSION_DENIED" || data.error.status === "UNAUTHENTICATED")) {
          var resp2 = await fetch(BACKEND_URL + "/api/ai/generate", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiVer: apiVer, modelName: modelName, contents: contents, generationConfig: generationConfig })
          });
          return await resp2.json();
        }
        return data;
      } else {
        var text = await response.text();
        throw new Error('Non-JSON response: ' + text.slice(0, 200));
      }
    }
    for (var v = 0; v < apiVersions.length && !success; v++) {
      for (var m = 0; m < models.length && !success; m++) {
        try {
          var generationConfig = apiVersions[v] === "v1beta" ? { response_mime_type: "application/json" } : {};
          var data = await geminiRequest(apiVersions[v], models[m], [{ parts: [{ text: prompt }] }], generationConfig);
          if (data.error) {
            var errorMsg = (typeof data.error === 'string') ? data.error : (data.error.message || JSON.stringify(data.error));
            lastError = errorMsg;
            continue;
          }
          if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
            lastError = "AI cavabı boşdur";
            continue;
          }
          var aiResponse = data.candidates[0].content.parts[0].text;
          var jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            lastError = "Format xətası (JSON tapılmadı)";
            continue;
          }
          var questions = JSON.parse(jsonMatch[0]);
          var list = document.getElementById('admin-questions-list');
          var firstQuestion = list.querySelector('.manual-question-item');
          if (list.children.length === 1 && firstQuestion) {
            var textarea = firstQuestion.querySelector('textarea');
            if (textarea && !textarea.value.trim()) {
              list.innerHTML = '';
            }
          }
          questions.forEach(function(q, idx) {
            addAdminQuestionForm();
            var items = list.querySelectorAll('.manual-question-item');
            var lastItem = items[items.length - 1];
            if (lastItem) {
              var textarea = lastItem.querySelector('textarea');
              if (textarea) textarea.value = q.text || "";
              var inputs = lastItem.querySelectorAll('.manual-opt');
              if (q.options && Array.isArray(q.options)) {
                var firstRadio = lastItem.querySelector('input[type="radio"]');
                if (firstRadio) {
                  var uniqueId = firstRadio.name.split('_')[1];
                  while (inputs.length < q.options.length && inputs.length < 10) {
                    addAdminOption(uniqueId);
                    inputs = lastItem.querySelectorAll('.manual-opt');
                  }
                }
                q.options.forEach(function(opt, i) { if (inputs[i]) inputs[i].value = opt; });
              }
              var radios = lastItem.querySelectorAll('input[type="radio"]');
              if (radios && radios[q.correct] !== undefined) {
                radios[q.correct].checked = true;
              }
            }
          });
          switchAdminQuestionTab('manual');
          showNotification(questions.length + ' sual uğurla yaradıldı!', 'success');
          success = true;
          AIUsageLimits.updateDailyLimit('question');
          AIUsageLimits.updateCooldown('question');
          break;
        } catch (error) {
          lastError = error.message || String(error);
        }
      }
    }
    if (!success) {
      showNotification('Xəta: ' + lastError, 'error');
    }
    if (loading) loading.classList.add('hidden');
    if (btn) btn.disabled = false;
  };

  // Admin sual metodları arasında keçid
  window.switchAdminQuestionTab = function(method) {
    document.querySelectorAll('.admin-method-content').forEach(function(c) { c.classList.add('hidden'); });
    document.querySelectorAll('[id^="admin-tab-"]').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById('admin-method-' + method).classList.remove('hidden');
    document.getElementById('admin-tab-' + method).classList.add('active');
  };
})();
