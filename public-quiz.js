(function(){
  window.openPublicQuestionsFromDash = function(id) {
    activeCategoryId = 'public_general';
    showPublicQuestions();
  };
  window.openGlobalPublicQuestions = function() {
    activeCategoryId = 'public_general';
    showPublicQuestions();
  };
  window.showPublicQuestions = function() {
    if (!activeCategoryId) return;
    var cat = categories.find(function(c){ return c.id === activeCategoryId; });
    if (!cat) return;
    hideAllSections();
    document.getElementById('public-questions-section').classList.remove('hidden');
    document.getElementById('public-questions-title').textContent = (cat.id === 'public_general') ? 'Ümumi Suallar' : (cat.name + ' - Ümumi Suallar');
    var addBtn = document.getElementById('add-public-q-btn');
    addBtn.classList.remove('hidden');
    window.__publicQuestionsState = { questions: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 };
    loadPublicQuestions(true);
  };
  window.hidePublicQuestions = function() {
    if (activeCategoryId) {
      if (activeCategoryId === 'public_general') {
        showDashboard();
      } else {
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
          openCategory(activeCategoryId);
        } else {
          showDashboard();
        }
      }
    } else {
      showDashboard();
    }
  };
  window.showAddPublicQuestionModal = function() {
    if (!currentUser) {
      showNotification('Sual əlavə etmək üçün qeydiyyatdan keçməlisiniz', 'error');
      return;
    }
    document.getElementById('public-question-modal').classList.remove('hidden');
    document.getElementById('pub-q-text').value = '';
    var optionsContainer = document.getElementById('pub-q-options');
    optionsContainer.innerHTML = '' +
      '<div class="manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border">' +
      '  <input type="radio" name="pub-q-correct" value="0" checked id="pub-opt-0" class="w-5 h-5 cursor-pointer accent-primary">' +
      '  <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="A variantı">' +
      '</div>' +
      '<div class="manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border">' +
      '  <input type="radio" name="pub-q-correct" value="1" id="pub-opt-1" class="w-5 h-5 cursor-pointer accent-primary">' +
      '  <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="B variantı">' +
      '</div>' +
      '<div class="manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border">' +
      '  <input type="radio" name="pub-q-correct" value="2" id="pub-opt-2" class="w-5 h-5 cursor-pointer accent-primary">' +
      '  <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="C variantı">' +
      '</div>' +
      '<div class="manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border">' +
      '  <input type="radio" name="pub-q-correct" value="3" id="pub-opt-3" class="w-5 h-5 cursor-pointer accent-primary">' +
      '  <input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="D variantı">' +
      '</div>';
  };
  window.addPublicOption = function() {
    var optionsContainer = document.getElementById('pub-q-options');
    var optionCount = optionsContainer.querySelectorAll('.manual-option-input').length;
    if (optionCount >= 10) {
      showNotification('Maksimum 10 variant əlavə edə bilərsiniz.', 'error');
      return;
    }
    var charCode = 65 + optionCount;
    var char = String.fromCharCode(charCode);
    var div = document.createElement('div');
    div.className = 'manual-option-input flex items-center gap-3 bg-bg p-3 rounded-12 border';
    div.innerHTML = '' +
      '<input type="radio" name="pub-q-correct" value="' + optionCount + '" id="pub-opt-' + optionCount + '" class="w-5 h-5 cursor-pointer accent-primary">' +
      '<input type="text" class="pub-opt flex-1 border-none bg-transparent p-1 text-sm outline-none" placeholder="' + char + ' variantı">' +
      '<button onclick="this.parentElement.remove()" class="bg-none border-none text-danger cursor-pointer p-1"><i class="fas fa-times"></i></button>';
    optionsContainer.appendChild(div);
  };
  window.submitPublicQuestion = async function() {
    var text = document.getElementById('pub-q-text').value.trim();
    var optInputs = Array.prototype.slice.call(document.querySelectorAll('.pub-opt'));
    var opts = optInputs.map(function(o){ return o.value.trim(); });
    var allRadios = Array.prototype.slice.call(document.querySelectorAll('input[name="pub-q-correct"]'));
    var checkedRadioIndex = allRadios.findIndex(function(r){ return r.checked; });
    var correct = checkedRadioIndex !== -1 ? checkedRadioIndex : 0;
    if (!text || opts.some(function(o){ return !o; })) {
      return showNotification('Zəhmət olmasa bütün sahələri doldurun.', 'error');
    }
    var authorName = (currentUser.name && currentUser.surname) ? (currentUser.name + ' ' + currentUser.surname) : (currentUser.username || 'Anonim');
    var newQ = {
      categoryId: 'public_general',
      text: text,
      options: opts,
      correctIndex: correct,
      authorId: currentUser.id,
      authorName: authorName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (db) {
        await db.collection('public_questions').add(newQ);
      } else {
        var localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
        newQ.id = Date.now();
        newQ.createdAt = new Date().toISOString();
        localPQ.push(newQ);
        localStorage.setItem('public_questions', JSON.stringify(localPQ));
      }
      showNotification('Sual uğurla əlavə edildi!');
      closeModal('public-question-modal');
      loadPublicQuestions();
    } catch (e) {
      console.error(e);
      showNotification('Sual əlavə edilərkən xəta baş verdi.', 'error');
    }
  };
  window.loadPublicQuestions = async function(initial) {
    if (initial === undefined) initial = false;
    var list = document.getElementById('public-questions-list');
    var loadMoreBtn = document.getElementById('public-questions-load-more');
    var PAGE_SIZE = 5;
    var state = window.__publicQuestionsState || (window.__publicQuestionsState = { questions: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 });
    if (initial) {
      list.innerHTML = '<div class="text-center p-6"><i class="fas fa-spinner fa-spin"></i> Yüklənir...</div>';
      state.questions = [];
      state.lastDoc = null;
      state.hasMore = true;
      state.fallbackAll = null;
      state.pageIndex = 0;
      try {
        var ck = 'public_questions_cache_' + activeCategoryId;
        var raw = localStorage.getItem(ck);
        if (raw) {
          var cached = JSON.parse(raw);
          if (cached && Array.isArray(cached.items) && cached.items.length > 0 && (Date.now() - (cached.ts || 0)) < (10 * 60 * 1000)) {
            list.innerHTML = '';
            var first = cached.items.slice(0, PAGE_SIZE);
            state.questions = first;
            appendPublicQuestions(first);
            if (loadMoreBtn) {
              loadMoreBtn.classList.remove('hidden');
              loadMoreBtn.disabled = false;
              loadMoreBtn.innerHTML = 'Daha çox yüklə';
            }
            return;
          }
        }
      } catch (_e) {}
    } else {
      if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
      }
    }
    try {
      var page = [];
      if (db) {
        try {
          var q = db.collection('public_questions').where('categoryId', '==', activeCategoryId).orderBy('createdAt', 'desc').limit(PAGE_SIZE);
          if (state.lastDoc) q = q.startAfter(state.lastDoc);
          var snapshot = await q.get();
          page = snapshot.docs.map(function(doc){ return { id: doc.id, data: doc.data(), createdAt: doc.data().createdAt, authorName: doc.data().authorName, options: doc.data().options, text: doc.data().text, correctIndex: doc.data().correctIndex, likes: doc.data().likes, dislikes: doc.data().dislikes }; });
          state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
          if (page.length < PAGE_SIZE) state.hasMore = false;
          if (initial) {
            try {
              var ck2 = 'public_questions_cache_' + activeCategoryId;
              localStorage.setItem(ck2, JSON.stringify({ items: page, ts: Date.now() }));
            } catch (_e2) {}
          }
        } catch (queryErr) {
          var snapshot2 = await db.collection('public_questions').where('categoryId', '==', activeCategoryId).get();
          var all = snapshot2.docs.map(function(doc){ return { id: doc.id, data: doc.data(), createdAt: doc.data().createdAt, authorName: doc.data().authorName, options: doc.data().options, text: doc.data().text, correctIndex: doc.data().correctIndex, likes: doc.data().likes, dislikes: doc.data().dislikes }; });
          all.sort(function(a, b){
            var ta = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
            var tb = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
            return tb - ta;
          });
          state.fallbackAll = state.fallbackAll || all;
          var start = state.pageIndex * PAGE_SIZE;
          var end = start + PAGE_SIZE;
          page = state.fallbackAll.slice(start, end);
          state.pageIndex += 1;
          if (end >= state.fallbackAll.length) state.hasMore = false;
          if (initial) {
            try {
              var ck3 = 'public_questions_cache_' + activeCategoryId;
              localStorage.setItem(ck3, JSON.stringify({ items: page, ts: Date.now() }));
            } catch (_e3) {}
          }
        }
      } else {
        var allLocal = JSON.parse(localStorage.getItem('public_questions') || '[]').filter(function(q){ return q.categoryId === activeCategoryId; }).sort(function(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); });
        state.fallbackAll = state.fallbackAll || allLocal;
        var start2 = state.pageIndex * PAGE_SIZE;
        var end2 = start2 + PAGE_SIZE;
        page = state.fallbackAll.slice(start2, end2);
        state.pageIndex += 1;
        if (end2 >= state.fallbackAll.length) state.hasMore = false;
      }
      if (state.questions.length === 0 && page.length === 0) {
        list.innerHTML = '<p class="text-center text-muted p-10">Hələ heç kim sual əlavə etməyib. İlk sualı siz əlavə edin!</p>';
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        return;
      }
      if (initial) list.innerHTML = '';
      state.questions = state.questions.concat(page);
      appendPublicQuestions(page);
      if (loadMoreBtn) {
        if (state.hasMore) {
          loadMoreBtn.classList.remove('hidden');
          loadMoreBtn.disabled = false;
          loadMoreBtn.innerHTML = 'Daha çox yüklə';
        } else {
          loadMoreBtn.classList.add('hidden');
        }
      }
    } catch (e) {
      console.error(e);
      list.innerHTML = '<p class="text-center text-danger p-4">Sualları yükləmək mümkün olmadı.</p>';
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.innerHTML = 'Daha çox yüklə';
      }
    }
  };
  function appendPublicQuestions(questions) {
    var list = document.getElementById('public-questions-list');
    questions.forEach(function(q){
      var likes = q.likes || [];
      var dislikes = q.dislikes || [];
      var userLiked = currentUser && likes.includes(currentUser.id);
      var userDisliked = currentUser && dislikes.includes(currentUser.id);
      var div = document.createElement('div');
      div.className = 'public-q-card';
      var isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
      div.innerHTML = '' +
        '<div class="public-q-header">' +
        '  <span><i class="fas fa-user"></i> ' + (q.authorName || 'Anonim') + '</span>' +
        '  <div class="flex items-center gap-3">' +
        '    <span>' + (q.createdAt ? (db ? new Date(q.createdAt.toDate()).toLocaleDateString() : new Date(q.createdAt).toLocaleDateString()) : '') + '</span>' +
        (isAdmin ? '    <button onclick="deletePublicQuestion(\'' + q.id + '\')" class="bg-none border-none text-danger cursor-pointer text-sm" title="Sualı sil"><i class="fas fa-trash"></i></button>' : '') +
        '  </div>' +
        '</div>' +
        '<div class="public-q-text">' + q.text + '</div>' +
        '<div class="public-q-options" id="pub-options-' + q.id + '">' +
        q.options.map(function(opt, idx){
          return '' +
            '<div class="pub-opt-item" onclick="checkPublicAnswer(\'' + q.id + '\',' + idx + ',' + q.correctIndex + ')">' +
            String.fromCharCode(65 + idx) + ') ' + opt +
            '</div>';
        }).join('') +
        '</div>' +
        '<div class="public-q-actions">' +
        '  <div class="like-dislike-group">' +
        '    <button onclick="likeQuestion(\'' + q.id + '\')" class="action-btn like-btn ' + (userLiked ? 'active' : '') + '" title="Bəyən">' +
        '      <i class="' + (userLiked ? 'fas' : 'far') + ' fa-thumbs-up"></i>' +
        '      <span>' + likes.length + '</span>' +
        '    </button>' +
        '    <button onclick="dislikeQuestion(\'' + q.id + '\')" class="action-btn dislike-btn ' + (userDisliked ? 'active' : '') + '" title="Bəyənmə">' +
        '      <i class="' + (userDisliked ? 'fas' : 'far') + ' fa-thumbs-down"></i>' +
        '      <span>' + dislikes.length + '</span>' +
        '    </button>' +
        '  </div>' +
        '  <button onclick="showDiscussion(\'' + q.id + '\')" class="btn-outline">' +
        '    <i class="fas fa-comments"></i> Müzakirə Et' +
        '  </button>' +
        '  <button onclick="openReportModal(\'' + q.id + '\', \'public\', \'' + q.text.substring(0, 50).replace(/'/g, '\\\'') + '...\')" class="btn-report">' +
        '    <i class="fas fa-flag"></i> Bildir' +
        '  </button>' +
        '</div>';
      list.appendChild(div);
    });
  }
  window.loadMorePublicQuestions = function() {
    if (!window.__publicQuestionsState || window.__publicQuestionsState.loading === true) return;
    window.__publicQuestionsState.loading = true;
    loadPublicQuestions(false).finally(function(){
      window.__publicQuestionsState.loading = false;
    });
  };
  function renderPublicQuestions(questions) {
    var list = document.getElementById('public-questions-list');
    if (questions.length === 0) {
      list.innerHTML = '<p class="text-center text-muted p-10">Hələ heç kim sual əlavə etməyib. İlk sualı siz əlavə edin!</p>';
      return;
    }
    list.innerHTML = '';
    questions.forEach(function(q){
      var likes = q.likes || [];
      var dislikes = q.dislikes || [];
      var userLiked = currentUser && likes.includes(currentUser.id);
      var userDisliked = currentUser && dislikes.includes(currentUser.id);
      var div = document.createElement('div');
      div.className = 'public-q-card';
      var isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
      div.innerHTML = '' +
        '<div class="public-q-header">' +
        '  <span><i class="fas fa-user"></i> ' + (q.authorName || 'Anonim') + '</span>' +
        '  <div class="flex items-center gap-3">' +
        '    <span>' + (q.createdAt ? (db ? new Date(q.createdAt.toDate()).toLocaleDateString() : new Date(q.createdAt).toLocaleDateString()) : '') + '</span>' +
        (isAdmin ? '    <button onclick="deletePublicQuestion(\'' + q.id + '\')" class="bg-none border-none text-danger cursor-pointer text-sm" title="Sualı sil"><i class="fas fa-trash"></i></button>' : '') +
        '  </div>' +
        '</div>' +
        '<div class="public-q-text">' + q.text + '</div>' +
        '<div class="public-q-options" id="pub-options-' + q.id + '">' +
        q.options.map(function(opt, idx){
          return '' +
            '<div class="pub-opt-item" onclick="checkPublicAnswer(\'' + q.id + '\',' + idx + ',' + q.correctIndex + ')">' +
            String.fromCharCode(65 + idx) + ') ' + opt +
            '</div>';
        }).join('') +
        '</div>' +
        '<div class="public-q-actions">' +
        '  <div class="like-dislike-group">' +
        '    <button onclick="likeQuestion(\'' + q.id + '\')" class="action-btn like-btn ' + (userLiked ? 'active' : '') + '" title="Bəyən">' +
        '      <i class="' + (userLiked ? 'fas' : 'far') + ' fa-thumbs-up"></i>' +
        '      <span>' + likes.length + '</span>' +
        '    </button>' +
        '    <button onclick="dislikeQuestion(\'' + q.id + '\')" class="action-btn dislike-btn ' + (userDisliked ? 'active' : '') + '" title="Bəyənmə">' +
        '      <i class="' + (userDisliked ? 'fas' : 'far') + ' fa-thumbs-down"></i>' +
        '      <span>' + dislikes.length + '</span>' +
        '    </button>' +
        '  </div>' +
        '  <button onclick="showDiscussion(\'' + q.id + '\')" class="btn-outline">' +
        '    <i class="fas fa-comments"></i> Müzakirə Et' +
        '  </button>' +
        '  <button onclick="openReportModal(\'' + q.id + '\', \'public\', \'' + q.text.substring(0, 50).replace(/'/g, '\\\'') + '...\')" class="btn-report">' +
        '    <i class="fas fa-flag"></i> Bildir' +
        '  </button>' +
        '</div>';
      list.appendChild(div);
    });
  }
  window.likeQuestion = async function(qId) {
    if (!currentUser) return showNotification('Bəyənmək üçün giriş etməlisiniz', 'error');
    try {
      if (db) {
        var docRef = db.collection('public_questions').doc(qId);
        var doc = await docRef.get();
        var data = doc.data();
        var likes = data.likes || [];
        var dislikes = data.dislikes || [];
        if (likes.includes(currentUser.id)) {
          likes = likes.filter(function(id){ return id !== currentUser.id; });
        } else {
          likes.push(currentUser.id);
          dislikes = dislikes.filter(function(id){ return id !== currentUser.id; });
        }
        await docRef.update({ likes: likes, dislikes: dislikes });
      } else {
        var localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
        var idx = localPQ.findIndex(function(q){ return q.id == qId; });
        if (idx !== -1) {
          var q = localPQ[idx];
          q.likes = q.likes || [];
          q.dislikes = q.dislikes || [];
          if (q.likes.includes(currentUser.id)) {
            q.likes = q.likes.filter(function(id){ return id !== currentUser.id; });
          } else {
            q.likes.push(currentUser.id);
            q.dislikes = q.dislikes.filter(function(id){ return id !== currentUser.id; });
          }
          localStorage.setItem('public_questions', JSON.stringify(localPQ));
        }
      }
      loadPublicQuestions();
    } catch (e) {
      console.error(e);
    }
  };
  window.dislikeQuestion = async function(qId) {
    if (!currentUser) return showNotification('Bəyənməmək üçün giriş etməlisiniz', 'error');
    try {
      if (db) {
        var docRef = db.collection('public_questions').doc(qId);
        var doc = await docRef.get();
        var data = doc.data();
        var likes = data.likes || [];
        var dislikes = data.dislikes || [];
        if (dislikes.includes(currentUser.id)) {
          dislikes = dislikes.filter(function(id){ return id !== currentUser.id; });
        } else {
          dislikes.push(currentUser.id);
          likes = likes.filter(function(id){ return id !== currentUser.id; });
        }
        await docRef.update({ likes: likes, dislikes: dislikes });
      } else {
        var localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
        var idx = localPQ.findIndex(function(q){ return q.id == qId; });
        if (idx !== -1) {
          var q = localPQ[idx];
          q.likes = q.likes || [];
          q.dislikes = q.dislikes || [];
          if (q.dislikes.includes(currentUser.id)) {
            q.dislikes = q.dislikes.filter(function(id){ return id !== currentUser.id; });
          } else {
            q.dislikes.push(currentUser.id);
            q.likes = q.likes.filter(function(id){ return id !== currentUser.id; });
          }
          localStorage.setItem('public_questions', JSON.stringify(localPQ));
        }
      }
      loadPublicQuestions();
    } catch (e) {
      console.error(e);
    }
  };
  window.checkPublicAnswer = function(questionId, selectedIdx, correctIdx) {
    var optionsContainer = document.getElementById('pub-options-' + questionId);
    if (optionsContainer.classList.contains('answered')) return;
    trackEvent('public_question_answer', {
      'question_id': questionId,
      'is_correct': selectedIdx === correctIdx
    });
    var items = optionsContainer.querySelectorAll('.pub-opt-item');
    items.forEach(function(item, idx){
      if (idx === correctIdx) {
        item.classList.add('correct');
      } else if (idx === selectedIdx) {
        item.classList.add('wrong');
      }
    });
    optionsContainer.classList.add('answered');
  };
  window.deletePublicQuestion = async function(qId) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
      return showNotification('Bu hərəkət üçün səlahiyyətiniz yoxdur.', 'error');
    }
    showCustomConfirm('Sualı sil', 'Bu ümumi sualı silmək istədiyinizə əminsiniz?', async function(){
      try {
        if (db) {
          await db.collection('public_questions').doc(qId).delete();
        } else {
          var localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
          localPQ = localPQ.filter(function(q){ return q.id != qId; });
          localStorage.setItem('public_questions', JSON.stringify(localPQ));
        }
        showNotification('Sual silindi', 'success');
        loadPublicQuestions();
      } catch (e) {
        console.error(e);
        showNotification('Sual silinərkən xəta baş verdi', 'error');
      }
    });
  };
  window.discussionUnsubscribe = null;
  window.showDiscussion = async function(questionId) {
    window.currentDiscussionQuestionId = questionId;
    var modal = document.getElementById('discussion-modal');
    modal.classList.remove('hidden');
    if (db) {
      var doc = await db.collection('public_questions').doc(questionId).get();
      if (doc.exists) {
        var data = doc.data();
        document.getElementById('discussion-question-text').textContent = data.text;
      }
    } else {
      var localPQ = JSON.parse(localStorage.getItem('public_questions') || '[]');
      var q = localPQ.find(function(x){ return x.id == questionId; });
      if (q) document.getElementById('discussion-question-text').textContent = q.text;
    }
    startDiscussionListener();
  };
  function startDiscussionListener() {
    if (window.discussionUnsubscribe) window.discussionUnsubscribe();
    var list = document.getElementById('comments-list');
    list.innerHTML = '<div class="text-center p-2"><i class="fas fa-spinner fa-spin text-primary"></i></div>';
    if (db) {
      window.discussionUnsubscribe = db.collection('discussions')
        .where('questionId', '==', window.currentDiscussionQuestionId)
        .orderBy('createdAt', 'asc')
        .onSnapshot(function(snapshot){
          var comments = snapshot.docs.map(function(doc){ return { id: doc.id, data: doc.data(), userName: doc.data().userName, text: doc.data().text, createdAt: doc.data().createdAt, userId: doc.data().userId }; });
          renderComments(comments);
        }, function(error){
          if (error.code === 'failed-precondition') {
            console.warn('Index missing, falling back to client-side sort');
            window.discussionUnsubscribe = db.collection('discussions')
              .where('questionId', '==', window.currentDiscussionQuestionId)
              .onSnapshot(function(snap){
                var comments = snap.docs.map(function(doc){ return { id: doc.id, data: doc.data(), userName: doc.data().userName, text: doc.data().text, createdAt: doc.data().createdAt, userId: doc.data().userId }; });
                comments.sort(function(a,b){
                  var timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                  var timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                  return timeA - timeB;
                });
                renderComments(comments);
              });
          } else {
            console.error('Listener error:', error);
            list.innerHTML = '<p class="text-xs text-danger text-center">Şərhləri yükləmək mümkün olmadı.</p>';
          }
        });
    } else {
      loadComments();
    }
  }
  async function loadComments() {
    var list = document.getElementById('comments-list');
    list.innerHTML = '<div class="text-center p-2"><i class="fas fa-spinner fa-spin text-primary"></i></div>';
    try {
      var comments = [];
      if (db) {
        var snapshot = await db.collection('discussions').where('questionId', '==', window.currentDiscussionQuestionId).get();
        comments = snapshot.docs.map(function(doc){ return { id: doc.id, data: doc.data(), userName: doc.data().userName, text: doc.data().text, createdAt: doc.data().createdAt, userId: doc.data().userId }; });
        comments.sort(function(a,b){
          var timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
          var timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
          return timeA - timeB;
        });
      } else {
        var localC = JSON.parse(localStorage.getItem('discussions') || '[]');
        comments = localC.filter(function(c){ return c.questionId == window.currentDiscussionQuestionId; }).sort(function(a,b){ return new Date(a.createdAt) - new Date(b.createdAt); });
      }
      renderComments(comments);
    } catch (e) {
      console.error(e);
      list.innerHTML = '<p class="text-xs text-danger text-center">Şərhləri yükləmək mümkün olmadı.</p>';
    }
  }
  function renderComments(comments) {
    var list = document.getElementById('comments-list');
    if (comments.length === 0) {
      list.innerHTML = '<p class="text-center text-muted p-4 text-sm">Hələ müzakirə yoxdur. Fikrinizi bildirin!</p>';
      return;
    }
    var currentUserId = currentUser ? currentUser.id : 'anon_' + (localStorage.getItem('anon_id') || '');
    list.innerHTML = '';
    comments.forEach(function(c){
      var isOwn = c.userId == currentUserId;
      var isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
      var div = document.createElement('div');
      div.className = 'comment-item ' + (isOwn ? 'own' : 'other');
      var dateStr = c.createdAt ? (db && c.createdAt.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : new Date(c.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})) : '';
      var safeAuthor = escapeHtml(c.userName || '');
      var safeText = escapeHtml(c.text || '');
      div.innerHTML = '' +
        (isOwn ? '' : '<div class="comment-author">' + safeAuthor + '</div>') +
        '<div class="comment-text">' + safeText + '</div>' +
        '<div class="flex justify-end items-center gap-2">' +
        '  <div class="comment-date m-0">' + dateStr + '</div>' +
        (isOwn || isAdmin ? '  <button onclick="deleteComment(\'' + c.id + '\')" class="bg-none border-none text-inherit opacity-50 cursor-pointer text-xs p-0" title="Mesajı sil"><i class="fas fa-trash"></i></button>' : '') +
        '</div>';
      list.appendChild(div);
    });
    list.scrollTop = list.scrollHeight;
  }
  window.deleteComment = async function(commentId) {
    showCustomConfirm('Mesajı sil', 'Bu mesajı silmək istədiyinizə əminsiniz?', async function(){
      try {
        if (db) {
          await db.collection('discussions').doc(commentId).delete();
        } else {
          var localC = JSON.parse(localStorage.getItem('discussions') || '[]');
          localC = localC.filter(function(c){ return c.id != commentId; });
          localStorage.setItem('discussions', JSON.stringify(localC));
          loadComments();
        }
        showNotification('Mesaj silindi', 'success');
      } catch (e) {
        console.error(e);
        showNotification('Mesaj silinərkən xəta baş verdi', 'error');
      }
    });
  };
  window.sendComment = async function() {
    var text = document.getElementById('new-comment-text').value.trim();
    if (!text) return;
    if (!currentUser) {
      showNotification('Şərh yazmaq üçün zəhmət olmasa qeydiyyatdan keçin və ya daxil olun.', 'warning');
      return;
    }
    var newComment = {
      questionId: window.currentDiscussionQuestionId,
      userId: currentUser.id,
      userName: currentUser.username,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (db) {
        await db.collection('discussions').add(newComment);
      } else {
        var localC = JSON.parse(localStorage.getItem('discussions') || '[]');
        newComment.id = Date.now();
        newComment.createdAt = new Date().toISOString();
        localC.push(newComment);
        localStorage.setItem('discussions', JSON.stringify(localC));
      }
      document.getElementById('new-comment-text').value = '';
      loadComments();
    } catch (e) {
      console.error(e);
      showNotification('Şərh göndərilərkən xəta baş verdi.', 'error');
    }
  };
  window.saveAnonymousName = function() {
    var name = document.getElementById('anon-name-input').value.trim();
    if (!name) return showNotification('Zəhmət olmasa adınızı daxil edin.', 'error');
    localStorage.setItem('anon_display_name', name);
    if (!localStorage.getItem('anon_id')) {
      localStorage.setItem('anon_id', Date.now());
    }
    closeModal('anonymous-name-modal');
    sendComment();
  };
})();
