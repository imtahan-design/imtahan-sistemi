// Modul: Həftəlik İmtahan Sistemi
// Məqsəd: Weekly exam ilə bağlı bütün funksiyaları, UI modalları və admin əməliyyatlarını
//         ayrıca modulda toplamaq. Bütün API-lər window altında saxlanılır ki, mövcud
//         çağırışlar (onclick, data-action) eynilə işləsin.
//
// Asılılıqlar: window.db, window.firebase, window.currentUser, window.categories,
//              window.escapeHtml, window.showNotification, window.closeModal
// Dəyişilməyənlər: ID-lər, backend sənədləri, localStorage açarları

(function(){
  let __WEEKLY_POOL_QUESTIONS = null;
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
    const byId = await db.collection('exam_coupons').doc(code).get();
    let doc = byId.exists ? byId : null;
    if (!doc) {
      const q = await db.collection('exam_coupons').where('code','==', code).limit(1).get();
      doc = q.empty ? null : q.docs[0];
    }
    if (!doc) throw new Error('Kupon tapılmadı');
    const data = doc.data() || {};
    if (String(data.examId || '') !== String(examId)) throw new Error('Bu kupon bu imtahana uyğun deyil');
    const now = new Date();
    const s = data.startTime && typeof data.startTime.toDate === 'function' ? data.startTime.toDate() : new Date(data.startTime || 0);
    const e = data.endTime && typeof data.endTime.toDate === 'function' ? data.endTime.toDate() : new Date(data.endTime || 0);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) throw new Error('Kupon tarix intervalı düzgün deyil');
    if (now < s) throw new Error('Kupon hələ aktiv deyil');
    if (now > e) throw new Error('Kuponun müddəti bitib');
    if (data.usedBy) throw new Error('Kupon artıq istifadə olunub');
    await db.runTransaction(async (t) => {
      const ref = db.collection('exam_coupons').doc(doc.id);
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error('Kupon tapılmadı');
      const d = snap.data() || {};
      if (d.usedBy) throw new Error('Kupon artıq istifadə olunub');
      if (String(d.examId || '') !== String(examId)) throw new Error('Bu kupon bu imtahana uyğun deyil');
      t.update(ref, { usedBy: String(currentUser && currentUser.id ? currentUser.id : 'guest') });
    });
    return true;
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
        <div class="space-y-3">
          <label class="block text-sm text-gray-300">Kupon kodu</label>
          <input id="coupon-code-input" type="text" class="w-full p-3 rounded-md bg-gray-800 text-white border border-gray-700" placeholder="PROK12345" />
          <button id="coupon-submit-btn" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md">Təsdiqlə</button>
          <p id="coupon-error" class="text-red-400 text-sm hidden"></p>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    const btn = m.querySelector('#coupon-submit-btn');
    btn.onclick = async function() {
      const code = m.querySelector('#coupon-code-input').value;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yoxlanır...';
      try {
        await window.validateCoupon(code, examId);
        document.getElementById('coupon-modal').remove();
        if (typeof onSuccess === 'function') onSuccess();
      } catch(e) {
        const err = m.querySelector('#coupon-error');
        if (err) { err.textContent = e.message; err.classList.remove('hidden'); }
        btn.disabled = false;
        btn.innerHTML = 'Təsdiqlə';
      }
    };
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
      const poolCat = categories.find(c => String(c.id) === 'special_prokurorluq' && Array.isArray(c.questions));
      const poolList = (__WEEKLY_POOL_QUESTIONS && Array.isArray(__WEEKLY_POOL_QUESTIONS)) ? __WEEKLY_POOL_QUESTIONS : (poolCat ? poolCat.questions : null);
      if (poolList) {
        const filtered = poolList.filter(q => {
          const sid = String(q.subjectId || '');
          const sn = nrm(q.subjectName || '');
          return (sid === targetId) || (sn === tn) || sn.includes(tn) || keys.some(k => sn.includes(k));
        });
        if (filtered.length > 0) {
          return { id: targetId || 'special_prokurorluq', name: schemaItem.name, parentId: 'special_prokurorluq', questions: filtered };
        }
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
                <strong class="text-blue-300">Məlumat:</strong> Yeni sınaq yaradarkən sistem avtomatik olaraq son 2 həftənin suallarını istisna edir və bazadan təsadüfi suallar seçir. Yayımlamadan öncə "Baxış" edərək sualları dəyişdirə bilərsiniz.
              </div>
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
      if (type === 'prokurorluq') {
        const subs = categories.filter(c => c.parentId === 'special_prokurorluq');
        schema = subs.map(s => ({ id: s.id, name: s.name, count: 6 }));
      } else if (type === 'hakimlik') {
        const subs = categories.filter(c => c.parentId === 'special_hakimlik');
        schema = subs.map(s => ({ id: s.id, name: s.name, count: 6 }));
      } else if (type === 'vekillik') {
        const subs = categories.filter(c => c.parentId === 'special_vekillik');
        schema = subs.map(s => ({ id: s.id, name: s.name, count: 6 }));
      }
      
      if (!schema || schema.length === 0) {
        return showNotification('Bu imtahan növü üçün sual bölgüsü (sxem) hələ təyin edilməyib.', 'warning');
      }

      try {
        if (!__WEEKLY_POOL_QUESTIONS) {
          const poolDoc = await db.collection('categories').doc('special_prokurorluq').get();
          if (poolDoc.exists) {
            const d = poolDoc.data();
            if (d && Array.isArray(d.questions)) {
              __WEEKLY_POOL_QUESTIONS = d.questions;
            }
          }
        }
      } catch (_) {}

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
        const subCat = this.findCategory(item);
        if (!subCat || !subCat.questions || subCat.questions.length === 0) {
          if (window.__DEBUG) console.warn(`Category not found or empty: ${item.name}`);
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
        const poolCat = categories.find(c => String(c.id) === 'special_prokurorluq' && Array.isArray(c.questions));
        const poolList = (__WEEKLY_POOL_QUESTIONS && Array.isArray(__WEEKLY_POOL_QUESTIONS)) ? __WEEKLY_POOL_QUESTIONS : (poolCat ? poolCat.questions : []);
        if (poolList && poolList.length > 0) {
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
          const filteredPool = poolList.filter(q => !excludeIds.has(q.id));
          const selected80 = pickRandomN(filteredPool.length > 0 ? filteredPool : poolList, 80);
          selected80.forEach(q => {
            q._sourceSchemaName = q.subjectName || 'Prokurorluq (Havuz)';
            q._sourceCategoryId = 'special_prokurorluq';
          });
          examQuestions = selected80;
          log.push(`FALLBACK: Havuzdan seçildi (${examQuestions.length}/80)`);
        } else {
          return showNotification('Heç bir sual tapılmadı! Kateqoriyaları yoxlayın.', 'error');
        }
      }
      const draft = {
        id: 'weekly_draft_' + type,
        type: type,
        exam_type: 'special',
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
    if (window.COUPON_REQUIRED_TYPES && window.COUPON_REQUIRED_TYPES.has(String(examType))) {
      if (!window.currentUser || !window.currentUser.id) {
        if (typeof showNotification === 'function') showNotification('Zəhmət olmasa hesabla daxil olun', 'error');
        return;
      }
      const examId = 'active_' + String(examType);
      await new Promise((resolve) => { window.showCouponModal(examId, resolve); });
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
