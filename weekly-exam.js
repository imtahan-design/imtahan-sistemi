// Modul: Həftəlik İmtahan Sistemi
// Məqsəd: Weekly exam ilə bağlı bütün funksiyaları, UI modalları və admin əməliyyatlarını
//         ayrıca modulda toplamaq. Bütün API-lər window altında saxlanılır ki, mövcud
//         çağırışlar (onclick, data-action) eynilə işləsin.
//
// Asılılıqlar: window.db, window.firebase, window.currentUser, window.categories,
//              window.escapeHtml, window.showNotification, window.closeModal
// Dəyişilməyənlər: ID-lər, backend sənədləri, localStorage açarları

(function(){
  // Helper: Weekly Exam sistemində kateqoriyanı tapmaq
  // İstifadə: Qaralama yaradarkən sxem elementinə görə uyğun kateqoriya tapılır
  const WeeklyExamManager = {
    findCategory(schemaItem) {
      let cat = categories.find(c => c.name.toLowerCase() === schemaItem.name.toLowerCase() && c.parentId && c.parentId.startsWith('special_'));
      if (!cat) {
        cat = categories.find(c => c.name.toLowerCase() === schemaItem.name.toLowerCase());
      }
      if (!cat && schemaItem.keys) {
        for (const key of schemaItem.keys) {
          cat = categories.find(c => c.name.toLowerCase().includes(key) && c.parentId && c.parentId.startsWith('special_'));
          if (cat) break;
        }
      }
      if (!cat && schemaItem.keys) {
        for (const key of schemaItem.keys) {
          cat = categories.find(c => c.name.toLowerCase().includes(key));
          if (cat) break;
        }
      }
      return cat;
    },

    // Admin: İdarəetmə pəncərəsini açır (Yarat, Baxış, Yayımla, Arxiv)
    openManagerModal() {
      if (!currentUser || currentUser.role !== 'admin') return showNotification('İcazə yoxdur!', 'error');
      let modal = document.getElementById('weekly-manager-modal');
      if (modal) modal.remove();
      modal = document.createElement('div');
      modal.id = 'weekly-manager-modal';
      modal.className = 'modal';
      const types = [
        { id: 'prokurorluq', name: 'Prokurorluq', icon: 'fa-landmark' },
        { id: 'hakimlik', name: 'Hakimlik', icon: 'fa-balance-scale' },
        { id: 'vekillik', name: 'Vəkillik', icon: 'fa-briefcase' }
      ];
      const cardsHtml = types.map(t => `
        <div class="category-card">
          <div class="cat-card-header">
            <i class="fas ${t.icon}"></i>
            <span class="font-bold">${t.name}</span>
          </div>
          <div class="cat-card-body">
            <div class="flex gap-2">
              <button onclick="WeeklyExamManager.generateDraft('${t.id}')" class="btn-outline m-0 flex-1"><i class="fas fa-wand-magic-sparkles"></i> Yarat</button>
              <button onclick="WeeklyExamManager.viewDraft('${t.id}')" class="btn-outline m-0 flex-1"><i class="fas fa-eye"></i> Baxış</button>
            </div>
            <div class="flex gap-2 mt-2">
              <button onclick="WeeklyExamManager.publishExam('${t.id}')" class="btn-primary m-0 flex-1"><i class="fas fa-paper-plane"></i> Yayımla</button>
              <button onclick="WeeklyExamManager.viewArchives('${t.id}')" class="btn-outline m-0 flex-1"><i class="fas fa-box-archive"></i> Arxiv</button>
            </div>
          </div>
        </div>
      `).join('');
      modal.innerHTML = `
        <div class="modal-content large-modal">
          <div class="modal-header">
            <h2><i class="fas fa-calendar-days"></i> Həftəlik Sınaq İdarəetməsi</h2>
            <button onclick="closeModal('weekly-manager-modal')" class="close-btn">&times;</button>
          </div>
          <div class="p-6">
            <div class="grid-container">
              ${cardsHtml}
            </div>
            <div class="mt-4 text-muted">
              <i class="fas fa-info-circle"></i> Yeni sınaq yaradarkən son 2 həftənin sualları avtomatik istisna edilir.
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    },

    // Admin: Qaralama yaradır (Son 2 həftəni istisna)
    async generateDraft(type = 'prokurorluq') {
      if (!db) return showNotification('Verilənlər bazası bağlantısı yoxdur!', 'error');
      if (!currentUser || currentUser.role !== 'admin') return showNotification('İcazə yoxdur!', 'error');
      let schema = [];
      if (type === 'prokurorluq') schema = window.PROKURORLUQ_SUBS || [];
      else if (type === 'hakimlik') schema = window.HAKIMLIK_SUBS || [];
      else if (type === 'vekillik') schema = window.VEKILLIK_SUBS || [];
      else return showNotification('Bu növ hələ aktiv deyil', 'warning');

      let examQuestions = [];
      let log = [];

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
      const swapCount = 3;
      for(let i=0; i<swapCount; i++) {
        const idx1 = Math.floor(Math.random() * targetSchema.length);
        let idx2 = Math.floor(Math.random() * targetSchema.length);
        while(idx1 === idx2) idx2 = Math.floor(Math.random() * targetSchema.length);
        if (targetSchema[idx1].count > 1) {
          targetSchema[idx1].count--;
          targetSchema[idx2].count++;
        }
      }

      for (const item of targetSchema) {
        const subCat = this.findCategory(item);
        if (!subCat || !subCat.questions || subCat.questions.length === 0) {
          console.warn(`Category not found or empty: ${item.name}`);
          log.push(`TAPILMADI: ${item.name}`);
          continue;
        }
        const available = subCat.questions.filter(q => !excludeIds.has(q.id));
        let pool = available;
        if (available.length < item.count) {
          log.push(`XƏBƏRDARLIQ: ${item.name} - Yeni sual çatışmır (${available.length}/${item.count}). İşlənmişlər qarışdırılır.`);
          pool = subCat.questions;
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
        });
        examQuestions = [...examQuestions, ...selected];
        log.push(`OK: ${item.name} (${selected.length}/${item.count})`);
      }
      if (examQuestions.length === 0) {
        return showNotification('Heç bir sual tapılmadı! Kateqoriyaları yoxlayın.', 'error');
      }
      const draft = {
        id: 'weekly_draft_' + type,
        type: type,
        questions: examQuestions,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id,
        status: 'draft',
        log: log
      };
      try {
        await db.collection('weekly_exams').doc('draft_' + type).set(draft);
        const managerModal = document.getElementById('weekly-manager-modal');
        if (managerModal) managerModal.remove();
        showNotification(`Qaralama yaradıldı! (${examQuestions.length} sual).`, 'success');
        this.openReviewModal(draft);
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
        this.openReviewModal(doc.data());
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
              <button onclick="WeeklyExamManager.viewArchiveDetail('${doc.id}')" class="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500">Bax</button>
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
          this.openReviewModal({ ...data, isArchive: true });
        }
      } catch(e) { console.error(e); }
    },

    // Admin: Qaralamaya baxış pəncərəsi (sual düzəliş/dəyişdir)
    openReviewModal(draft) {
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
          ${!draft.isArchive ? `
          <div class="flex flex-col gap-2">
            <button onclick="WeeklyExamManager.editQuestion('${draft.type}', ${idx})" class="text-xs bg-yellow-600 px-2 py-1 rounded text-white hover:bg-yellow-500">Düzəliş et</button>
            <button onclick="WeeklyExamManager.replaceQuestion('${draft.type}', ${idx})" class="text-xs bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-500">Dəyişdir</button>
          </div>` : ''}
        </div>
      `).join('');
      modal.innerHTML = `
        <div class="bg-gray-900 max-w-4xl mx-auto rounded-lg shadow-xl border border-gray-700 mt-10 animate-up">
          <div class="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-lg">
            <h2 class="text-xl font-bold text-white">
              ${draft.isArchive ? 'Arxiv Sınağı' : 'Həftəlik Sınaq Qaralaması'} 
              (${draft.questions.length} sual) - ${draft.type ? draft.type.toUpperCase() : ''}
            </h2>
            <button onclick="document.getElementById('weekly-review-modal').remove()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
          </div>
          <div class="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            ${draft.log ? `<div class="mb-4 text-xs font-mono bg-black p-2 text-green-400">${draft.log.join('<br>')}</div>` : ''}
            ${questionsHtml}
          </div>
          <div class="p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg flex justify-end gap-3">
            ${draft.isArchive ? 
              `<button onclick="document.getElementById('weekly-review-modal').remove()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Bağla</button>` :
              `<button onclick="WeeklyExamManager.generateDraft('${draft.type}')" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Yenidən Yarat</button>
               <button onclick="WeeklyExamManager.publishExam('${draft.type}')" class="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-500 shadow-lg shadow-green-500/20">Təsdiqlə və Yayımla</button>`
            }
          </div>
        </div>
      `;
    },

    // Admin: Qaralamada sualın mətnini redaktə edir
    async editQuestion(type, index) {
      try {
        const draftRef = db.collection('weekly_exams').doc('draft_' + type);
        const doc = await draftRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        const question = data.questions[index];
        const newText = prompt("Sualı redaktə edin:", question.text);
        if (newText === null || newText === question.text) return;
        if (newText.trim().length < 5) return alert("Sual mətni çox qısadır!");
        data.questions[index].text = newText;
        await draftRef.update({ questions: data.questions });
        this.openReviewModal(data);
        showNotification("Sual yeniləndi!", 'success');
      } catch(e) {
        console.error(e);
        showNotification('Xəta: ' + e.message, 'error');
      }
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
        this.openReviewModal(data);
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
        const draftDoc = await db.collection('weekly_exams').doc('draft_' + type).get();
        if (!draftDoc.exists) {
          return showNotification('Qaralama tapılmadı.', 'error');
        }
        const data = draftDoc.data();
        const weekId = this.getCurrentWeekId();
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
  window.WeeklyExamManager = WeeklyExamManager;

  // UI: Xüsusi kateqoriyada “İmtahana Başla” klikindən sonra seçim modalı
  window.showExamSelectionModal = function(cat, examType) {
    let modal = document.getElementById('exam-selection-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'exam-selection-modal';
    modal.className = 'modal';
    const subjects = (examType === 'prokurorluq' ? (window.PROKURORLUQ_SUBS || []) :
                      examType === 'hakimlik' ? (window.HAKIMLIK_SUBS || []) :
                      examType === 'vekillik' ? (window.VEKILLIK_SUBS || []) : []);
    const subjectsHtml = subjects && subjects.length ? `
      <div class="mt-3">
        <h4 class="m-0 mb-2">İmtahan tərkibi</h4>
        <div style="max-height: 200px; overflow-y: auto;">
          ${subjects.map(s => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--glass-border);">
              <span>${escapeHtml(s.name)}</span>
              <span style="font-size:12px; color:var(--text-muted)">${s.count} sual</span>
            </div>
          `).join('')}
        </div>
      </div>` : '';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header-brand">
          <h2>${cat.name}</h2>
          <button onclick="closeModal('exam-selection-modal')" class="close-btn">&times;</button>
        </div>
        <div class="p-4">
          <p class="text-muted">Bu sınaq hər həftə yenilənir. Son 2 həftənin sualları təkrar olunmur.</p>
          ${subjectsHtml}
          <div class="mt-4">
            <button data-action="start-active-weekly-exam" data-exam-type="${examType}" data-cat-id="${cat.id}" class="btn-primary w-full m-0">
              <i class="fas fa-play"></i> Bu Həftənin Sınağı
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.__DEBUG) console.log('Exam selection modal opened for:', examType, cat.id);
  };

  // UI: Aktiv həftəlik sınağı backend-dən götürüb imtahana başlatmaq
  window.startActiveWeeklyExam = async function(examType, catId) {
    if (window.__DEBUG) console.log(`Starting active weekly exam: ${examType}, category: ${catId}`);
    const password = prompt("Zəhmət olmasa sınaq şifrəsini daxil edin:");
    if (password !== "123") {
      alert("Şifrə yanlışdır!");
      return;
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
      const data = doc.data();
      const cat = categories.find(c => c.id === catId) || { name: 'Sınaq', description: '', time: 180 };
      const generatedExam = {
        id: 'weekly_exam_' + examType,
        name: data.name || cat.name,
        description: data.description || cat.description,
        time: cat.time || 180,
        questions: data.questions,
        isSpecial: true,
        examType: examType,
        weekId: data.weekId,
        publishedAt: data.publishedAt
      };
      localStorage.setItem('generatedExamData', JSON.stringify(generatedExam));
      localStorage.setItem('activeSpecialCategory', 'weekly_exam_' + examType);
      window.location.href = 'dim_view.html';
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
