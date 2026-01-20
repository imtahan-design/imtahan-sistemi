(function(){
  window.switchQuestionTab = function(method) {
    if (method === 'ai') {
      if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) {
        showNotification('Süni İntellekt bölməsindən yalnız müəllimlər istifadə edə bilər.', 'error');
        return;
      }
    }
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.method-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-${method}`).classList.add('active');
    document.getElementById(`method-${method}`).classList.remove('hidden');
  };

  window.addManualQuestionForm = function() {
    const list = document.getElementById('manual-questions-list');
    const uniqueId = Date.now() + '_' + Math.floor(Math.random() * 1000);
    const timeTypeEl = document.getElementById('private-quiz-time-type');
    const timeType = timeTypeEl ? timeTypeEl.value : 'none';
    const isTimeHidden = (timeType === 'total' || timeType === 'none');
    const div = document.createElement('div');
    div.className = 'manual-question-item animate-up';
    div.setAttribute('data-id', uniqueId);
    const currentCount = document.querySelectorAll('.manual-question-item').length;
    div.innerHTML = `
        <div class="manual-q-header">
            <div class="manual-q-title">
                <i class="fas fa-plus-circle"></i>
                <span>Sual ${currentCount + 1}</span>
            </div>
            <div class="manual-q-actions">
                <div class="time-input-group ${isTimeHidden ? 'hidden' : ''}">
                    <i class="far fa-clock"></i>
                    <input type="number" class="manual-q-time" placeholder="Def">
                    <span>san</span>
                </div>
                <button onclick="this.closest('.manual-question-item').remove(); updateQuestionCount();" class="delete-q-btn" title="Sualı sil">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <div class="manual-q-content">
            <div class="manual-q-media-row">
                <div class="manual-q-image-container">
                    <div class="image-preview hidden" id="preview_${uniqueId}">
                        <img src="" alt="Sual şəkli">
                        <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <label class="image-upload-label" id="label_${uniqueId}">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Şəkil Əlavə Et və ya Sürüklə</span>
                        <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" class="hidden">
                    </label>
                    <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
                </div>
                <div class="manual-q-video-box" id="video_box_${uniqueId}">
                    <div class="video-upload-label" onclick="toggleVideoOptions('${uniqueId}', event)">
                        <i class="fas fa-video"></i>
                        <span>Video İzah</span>
                    </div>
                    <div id="video_options_${uniqueId}" class="video-options-menu hidden">
                        <button type="button" class="video-option-item" onclick="showYoutubeInput('${uniqueId}')">
                            <i class="fab fa-youtube"></i> Youtube-dan əlavə et
                        </button>
                        <button type="button" class="video-option-item" onclick="triggerVideoUpload('${uniqueId}')">
                            <i class="fas fa-upload"></i> Video yüklə
                        </button>
                    </div>
                    <input type="file" id="video_file_${uniqueId}" accept="video/*" class="hidden" onchange="handleVideoUpload(this, '${uniqueId}')">
                    <div class="video-progress hidden" id="video_progress_${uniqueId}">
                        <div class="video-bar" id="video_bar_${uniqueId}"></div>
                    </div>
                    <div class="video-status hidden" id="video_status_${uniqueId}"></div>
                    <div class="video-preview-container hidden" id="video_preview_${uniqueId}">
                        <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <input type="hidden" class="manual-q-video-id" id="video_id_${uniqueId}" value="">
                    <input type="hidden" class="manual-q-video-type" id="video_type_${uniqueId}" value="">
                </div>
            </div>
            <div class="manual-q-text-container">
                <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin..."></textarea>
            </div>
        </div>
        <div class="manual-q-explanation-row">
            <label><i class="fas fa-comment-alt"></i> Sualın İzahı (Opsional)</label>
            <textarea class="manual-q-explanation" placeholder="Sualın izahını daxil edin..."></textarea>
        </div>
        <div class="manual-options-grid" id="options_grid_${uniqueId}">
            <div class="grid-cols-full bg-warning-light border-warning border-dashed p-3 rounded-md mb-3 text-warning-dark font-bold flex items-center gap-3">
                <i class="fas fa-exclamation-triangle text-xl"></i>
                <span>DİQQƏT: Düzgün cavabın yanındakı dairəni mütləq işarələyin!</span>
            </div>
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="0" checked id="opt_${uniqueId}_0">
                    <label for="opt_${uniqueId}_0"></label>
                </div>
                <input type="text" class="manual-opt" placeholder="A variantı">
            </div>
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="1" id="opt_${uniqueId}_1">
                    <label for="opt_${uniqueId}_1"></label>
                </div>
                <input type="text" class="manual-opt" placeholder="B variantı">
            </div>
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="2" id="opt_${uniqueId}_2">
                    <label for="opt_${uniqueId}_2"></label>
                </div>
                <input type="text" class="manual-opt" placeholder="C variantı">
            </div>
            <div class="manual-option-input">
                <div class="option-radio-wrapper">
                    <input type="radio" name="correct_${uniqueId}" value="3" id="opt_${uniqueId}_3">
                    <label for="opt_${uniqueId}_3"></label>
                </div>
                <input type="text" class="manual-opt" placeholder="D variantı">
            </div>
        </div>
        <button onclick="addManualOption('${uniqueId}')" class="btn-add-option">
            <i class="fas fa-plus"></i> Variant Əlavə Et
        </button>
    `;
    list.appendChild(div);
    initDragAndDrop(uniqueId);
    updateQuestionCount();
  };

  window.handleQuestionImage = function(input, index, droppedFile = null) {
    const file = droppedFile || (input ? input.files[0] : null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Zəhmət olmasa yalnız şəkil faylı seçin.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        let preview = document.getElementById(`preview_${index}`);
        if (compressedBase64.length > 30 * 1024) {
          const ultraCompressed = canvas.toDataURL('image/jpeg', 0.3);
          document.getElementById(`data_${index}`).value = ultraCompressed;
          preview.querySelector('img').src = ultraCompressed;
        } else {
          document.getElementById(`data_${index}`).value = compressedBase64;
          preview.querySelector('img').src = compressedBase64;
        }
        preview.classList.remove('hidden');
        document.getElementById(`label_${index}`).classList.add('hidden');
        if (input) input.value = '';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.addManualOption = function(uniqueId) {
    const grid = document.getElementById(`options_grid_${uniqueId}`);
    const optionCount = grid.querySelectorAll('.manual-option-input').length;
    if (optionCount >= 10) return showNotification('Maksimum 10 variant əlavə edə bilərsiniz.', 'error');
    const div = document.createElement('div');
    div.className = 'manual-option-input';
    const char = String.fromCharCode(65 + optionCount);
    div.innerHTML = `
        <div class="option-radio-wrapper">
            <input type="radio" name="correct_${uniqueId}" value="${optionCount}" id="opt_${uniqueId}_${optionCount}">
            <label for="opt_${uniqueId}_${optionCount}"></label>
        </div>
        <input type="text" class="manual-opt" placeholder="${char} variantı">
        <button onclick="this.parentElement.remove(); updateOptionValues('${uniqueId}');" class="remove-option-btn" title="Variantı sil">
            <i class="fas fa-times"></i>
        </button>
    `;
    grid.appendChild(div);
  };

  window.updateOptionValues = function(uniqueId) {
    const grid = document.getElementById(`options_grid_${uniqueId}`);
    const options = grid.querySelectorAll('.manual-option-input');
    options.forEach((opt, idx) => {
      const radio = opt.querySelector('input[type="radio"]');
      const input = opt.querySelector('.manual-opt');
      const char = String.fromCharCode(65 + idx);
      radio.value = idx;
      radio.id = `opt_${uniqueId}_${idx}`;
      opt.querySelector('label').setAttribute('for', radio.id);
      input.placeholder = `${char} variantı`;
    });
  };

  if (!window.dndInitialized) {
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);
    window.dndInitialized = true;
  }

  window.initDragAndDrop = function(uniqueId) {
    const dropZone = document.getElementById(`label_${uniqueId}`);
    if (!dropZone) return;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-active');
      }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-active');
      }, false);
    });
    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        window.handleQuestionImage(null, uniqueId, files[0]);
      }
    }, false);
  };

  window.removeQuestionImage = function(index) {
    document.getElementById(`data_${index}`).value = '';
    document.getElementById(`preview_${index}`).classList.add('hidden');
    document.getElementById(`label_${index}`).classList.remove('hidden');
  };

  window.updateQuestionCount = function() {
    const questions = document.querySelectorAll('.manual-question-item');
    document.getElementById('ready-question-count').textContent = questions.length;
    questions.forEach((q, idx) => {
      const titleSpan = q.querySelector('.manual-q-title span');
      if (titleSpan) {
        titleSpan.textContent = `Sual ${idx + 1}`;
      }
    });
  };

  window.addEToAllQuestions = function() {
    const questionItems = document.querySelectorAll('.manual-question-item');
    if (questionItems.length === 0) return showNotification('Hələ heç bir sual yoxdur.', 'info');
    let addedCount = 0;
    questionItems.forEach(item => {
      const optionsGrid = item.querySelector('.manual-options-grid');
      const currentOptions = optionsGrid.querySelectorAll('.manual-option-input');
      if (currentOptions.length === 4) {
        const uniqueId = item.getAttribute('data-id');
        if (uniqueId) {
          addManualOption(uniqueId);
          addedCount++;
        }
      }
    });
    if (addedCount > 0) {
      showNotification(`${addedCount} suala E variantı əlavə edildi.`, 'success');
    } else {
      showNotification('Heç bir uyğun sual tapılmadı (artıq E variantı ola bilər və ya variant sayı 4-dən fərqlidir).', 'info');
    }
  };

  window.addMultipleQuestions = function(count) {
    for (let i = 0; i < count; i++) {
      addManualQuestionForm();
    }
    showNotification(`${count} yeni sual sahəsi əlavə edildi.`, 'success');
  };

  window.parseBulkQuestions = function() {
    const text = document.getElementById('bulk-questions-text').value;
    if (!text.trim()) return showNotification('Zəhmət olmasa mətni daxil edin.', 'error');
    const questions = [];
    const rawBlocks = text.split(/(?=^\s*(?:Sual\s*(?:[:\d])|\d+[\s.)]))/mi);
    rawBlocks.forEach(block => {
      if (!block.trim()) return;
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) return;
      let questionText = "";
      let options = [];
      let correctIndex = 0;
      let explanation = "";
      let collectingOptions = false;
      let collectingExplanation = false;
      lines.forEach((line) => {
        const mAns = line.match(/^\s*(?:düzgün\s+)?(?:cavab|correct|answer|doğru\s+cavab|izahlı\s+cavab)\s*[:\-]?\s*(.+)$/i);
        const mExp = line.match(/^\s*(?:izah|izahı|izahlı\s+cavab|şərh|açıqlama|explanation|[iİ]zah|[iİ]zahı|[iİ]zahlı\s+cavab)\s*[:\-]?\s*(.*)$/i);
        const variantMatch = line.match(/^[A-J][\s.)\-:]{1,3}/i);
        if (line.startsWith('---') || line.startsWith('===')) return;
        if (mAns) {
          collectingOptions = false;
          collectingExplanation = false;
          const val = mAns[1].trim();
          const lm = val.match(/^([A-J])[\)\.]*\s*(.*)$/i);
          if (lm) {
            correctIndex = lm[1].toUpperCase().charCodeAt(0) - 65;
            const rest = lm[2].trim();
            if (rest) {
              const expInRest = rest.match(/(?:izah|izahı|izahlı\s+cavab|şərh|açıqlama|explanation|[iİ]zah|[iİ]zahı|[iİ]zahlı\s+cavab)\s*[:\-]?\s*(.*)$/i);
              if (expInRest) {
                explanation = expInRest[1].trim();
                collectingExplanation = true;
              }
            }
          } else {
            const idx = options.findIndex(o => o.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(o.toLowerCase()));
            if (idx >= 0) correctIndex = idx;
          }
        } else if (mExp) {
          collectingOptions = false;
          collectingExplanation = true;
          explanation = mExp[1].trim();
        } else if (variantMatch && !collectingExplanation) {
          collectingOptions = true;
          options.push(line.substring(variantMatch[0].length).trim());
        } else if (collectingExplanation) {
          explanation += (explanation ? "\n" : "") + line;
        } else if (!collectingOptions) {
          questionText += (questionText ? "\n" : "") + line;
        }
      });
      if (questionText && (options.length > 0 || explanation)) {
        questions.push({
          text: questionText.trim(),
          options: options,
          correctIndex: correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0,
          explanation: explanation.trim()
        });
      }
    });
    if (questions.length > 0) {
      const list = document.getElementById('manual-questions-list');
      const currentCount = document.querySelectorAll('.manual-question-item').length;
      const timeTypeEl = document.getElementById('private-quiz-time-type');
      const timeType = timeTypeEl ? timeTypeEl.value : 'none';
      const isTimeHidden = (timeType === 'total' || timeType === 'none');
      questions.forEach((q, idx) => {
        const uniqueId = Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000);
        const div = document.createElement('div');
        div.className = 'manual-question-item animate-up';
        div.setAttribute('data-id', uniqueId);
        div.innerHTML = `
                <div class="manual-q-header">
                    <div class="manual-q-title">
                        <i class="fas fa-plus-circle"></i>
                        <span>Sual ${currentCount + idx + 1}</span>
                    </div>
                    <div class="manual-q-actions">
                        <div class="time-input-group ${isTimeHidden ? 'hidden' : ''}">
                            <i class="far fa-clock"></i>
                            <input type="number" class="manual-q-time" placeholder="Def">
                            <span>san</span>
                        </div>
                        <button onclick="this.closest('.manual-question-item').remove(); updateQuestionCount();" class="delete-q-btn" title="Sualı sil">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="manual-q-content">
                    <div class="manual-q-media-row">
                        <div class="manual-q-image-container">
                            <div class="image-preview hidden" id="preview_${uniqueId}">
                                <img src="" alt="Sual şəkli">
                                <button onclick="removeQuestionImage('${uniqueId}')" class="remove-img-btn"><i class="fas fa-times"></i></button>
                            </div>
                            <label class="image-upload-label" id="label_${uniqueId}">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <span>Şəkil Əlavə Et</span>
                                <input type="file" accept="image/*" onchange="handleQuestionImage(this, '${uniqueId}')" class="hidden">
                            </label>
                            <input type="hidden" class="manual-q-img-data" id="data_${uniqueId}">
                        </div>
                        <div class="manual-q-video-box" id="video_box_${uniqueId}">
                            <div class="video-upload-label" onclick="toggleVideoOptions('${uniqueId}', event)">
                                <i class="fas fa-video"></i>
                                <span>Video İzah</span>
                            </div>
                            <div id="video_options_${uniqueId}" class="video-options-menu hidden">
                                <button type="button" class="video-option-item" onclick="showYoutubeInput('${uniqueId}')">
                                    <i class="fab fa-youtube"></i> Youtube-dan əlavə et
                                </button>
                                <button type="button" class="video-option-item" onclick="triggerVideoUpload('${uniqueId}')">
                                    <i class="fas fa-upload"></i> Video yüklə
                                </button>
                            </div>
                            <input type="file" id="video_file_${uniqueId}" accept="video/*" class="hidden" onchange="handleVideoUpload(this, '${uniqueId}')">
                            <div class="video-progress hidden" id="video_progress_${uniqueId}">
                                <div class="video-bar" id="video_bar_${uniqueId}"></div>
                            </div>
                            <div class="video-status hidden" id="video_status_${uniqueId}"></div>
                            <div class="video-preview-container hidden" id="video_preview_${uniqueId}">
                                <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <input type="hidden" class="manual-q-video-id" id="video_id_${uniqueId}" value="">
                            <input type="hidden" class="manual-q-video-type" id="video_type_${uniqueId}" value="">
                        </div>
                    </div>
                    <div class="manual-q-text-container">
                        <textarea class="manual-q-text" placeholder="Sualın mətnini bura daxil edin...">${q.text}</textarea>
                    </div>
                </div>
                <div class="manual-q-explanation-row">
                    <label><i class="fas fa-comment-alt"></i> Sualın İzahı (Opsional)</label>
                    <textarea class="manual-q-explanation" placeholder="Sualın izahını daxil edin...">${q.explanation || ''}</textarea>
                </div>
                <div class="manual-options-grid" id="options_grid_${uniqueId}">
                    ${q.options.map((opt, i) => `
                        <div class="manual-option-input">
                            <div class="option-radio-wrapper">
                                <input type="radio" name="correct_${uniqueId}" value="${i}" ${i === q.correctIndex ? 'checked' : ''} id="opt_${uniqueId}_${i}">
                                <label for="opt_${uniqueId}_${i}"></label>
                            </div>
                            <input type="text" class="manual-opt" value="${opt}" placeholder="Variant ${i + 1}">
                        </div>
                    `).join('')}
                    ${q.options.length === 0 ? `
                        <div class="manual-option-input">
                            <div class="option-radio-wrapper">
                                <input type="radio" name="correct_${uniqueId}" value="0" checked id="opt_${uniqueId}_0">
                                <label for="opt_${uniqueId}_0"></label>
                            </div>
                            <input type="text" class="manual-opt" placeholder="A variantı">
                        </div>
                        <div class="manual-option-input">
                            <div class="option-radio-wrapper">
                                <input type="radio" name="correct_${uniqueId}" value="1" id="opt_${uniqueId}_1">
                                <label for="opt_${uniqueId}_1"></label>
                            </div>
                            <input type="text" class="manual-opt" placeholder="B variantı">
                        </div>
                    ` : ''}
                </div>
                <button onclick="addManualOption('${uniqueId}')" class="btn-add-option">
                    <i class="fas fa-plus"></i> Variant Əlavə Et
                </button>
            `;
        list.appendChild(div);
        initDragAndDrop(uniqueId);
      });
      document.getElementById('bulk-questions-text').value = '';
      switchQuestionTab('manual');
      updateQuestionCount();
      showNotification(`${questions.length} sual uğurla köçürüldü.`, 'success');
    } else {
      showNotification('Heç bir sual tapılmadı. Zəhmət olmasa formatı yoxlayın.', 'error');
    }
  };

  window.toggleVideoOptions = function(uniqueId, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(`video_options_${uniqueId}`);
    if (menu) {
      const isHidden = menu.classList.contains('hidden');
      document.querySelectorAll('.video-options-menu').forEach(m => {
        m.classList.add('hidden');
      });
      if (isHidden) {
        menu.classList.remove('hidden');
      }
    }
  };

  window.showYoutubeInput = function(uniqueId) {
    const url = prompt("Youtube video linkini daxil edin:");
    if (url) {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        updateVideoPreview(uniqueId, videoId, 'youtube');
      } else {
        showNotification('Düzgün Youtube linki daxil edin!', 'error');
      }
    }
  };

  function updateVideoPreview(uniqueId, videoId, type) {
    const videoIdInput = document.getElementById(`video_id_${uniqueId}`);
    const videoTypeInput = document.getElementById(`video_type_${uniqueId}`);
    const preview = document.getElementById(`video_preview_${uniqueId}`);
    const label = document.querySelector(`#video_box_${uniqueId} .video-upload-label`);
    if (videoIdInput) videoIdInput.value = videoId;
    if (videoTypeInput) videoTypeInput.value = type;
    if (label) label.classList.add('hidden');
    if (preview) {
      preview.classList.remove('hidden');
      if (type === 'youtube') {
        preview.innerHTML = `
                <div class="plyr__video-embed" id="player_${uniqueId}">
                    <iframe src="https://www.youtube.com/embed/${videoId}?origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1" allowfullscreen allowtransparency allow="autoplay"></iframe>
                </div>
                <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
        new Plyr(`#player_${uniqueId}`, {
          youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });
      } else {
        preview.innerHTML = `
                <div class="video-placeholder">
                    <i class="fas fa-check-circle"></i>
                    <span>Video Yüklənib</span>
                </div>
                <button type="button" class="remove-video-btn" onclick="removeQuestionVideo('${uniqueId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
      }
    }
  }

  window.triggerVideoUpload = function(uniqueId) {
    const menu = document.getElementById(`video_options_${uniqueId}`);
    const fileInput = document.getElementById(`video_file_${uniqueId}`);
    if (menu) menu.classList.add('hidden');
    if (fileInput) fileInput.click();
  };

  window.handleVideoUpload = async function(input, uniqueId) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      showNotification('Video ölçüsü çox böyükdür (Maks: 100MB)', 'error');
      input.value = '';
      return;
    }
    const progress = document.getElementById(`video_progress_${uniqueId}`);
    const bar = document.getElementById(`video_bar_${uniqueId}`);
    const status = document.getElementById(`video_status_${uniqueId}`);
    if (progress) progress.classList.remove('hidden');
    if (status) {
      status.classList.remove('hidden');
      status.textContent = 'Video emal olunur...';
    }
    if (bar) bar.style.width = '0%';
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', 'Sual Video İzahı');
    let attempts = 0;
    const maxAttempts = 5;
    const retryDelay = 5000;
    const uploadAction = async () => {
      try {
        attempts++;
        const response = await fetch(`${BACKEND_URL}/api/upload-video`, {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.details || data.error || 'Yükləmə zamanı xəta baş verdi');
        }
        if (data.success && data.videoId) {
          if (bar) bar.style.width = '100%';
          if (status) status.textContent = 'Video hazırlandı';
          showNotification('Video izah uğurla əlavə edildi!', 'success');
          setTimeout(() => {
            if (progress) progress.classList.add('hidden');
            if (status) status.classList.add('hidden');
            updateVideoPreview(uniqueId, data.videoId, 'youtube');
          }, 1000);
        } else {
          throw new Error(data.error || 'Naməlum xəta');
        }
      } catch (error) {
        if (attempts < maxAttempts && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
          if (status) {
            status.textContent = `Server oyanır, yenidən cəhd edilir (${attempts}/${maxAttempts})...`;
          }
          setTimeout(uploadAction, retryDelay);
        } else {
          showNotification('Video yüklənərkən xəta: ' + error.message, 'error');
          if (progress) progress.classList.add('hidden');
          if (status) status.classList.add('hidden');
        }
      }
    };
    uploadAction();
  };

  window.removeQuestionVideo = function(uniqueId) {
    const idInput = document.getElementById(`video_id_${uniqueId}`);
    const typeInput = document.getElementById(`video_type_${uniqueId}`);
    const preview = document.getElementById(`video_preview_${uniqueId}`);
    const label = document.querySelector(`#video_box_${uniqueId} .video-upload-label`);
    if (idInput) idInput.value = '';
    if (typeInput) typeInput.value = '';
    if (label) label.classList.remove('hidden');
    if (preview) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
    }
  };

  function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  window.savePrivateQuizFinal = async function() {
    const editingId = document.getElementById('editing-quiz-id').value;
    const title = document.getElementById('private-quiz-title').value;
    const password = document.getElementById('private-quiz-password').value;
    const timeType = document.getElementById('private-quiz-time-type').value;
    const defaultTime = parseInt(document.getElementById('private-quiz-default-time').value) || 45;
    const autoFillEnabled = document.getElementById('auto-variants-toggle') ? document.getElementById('auto-variants-toggle').checked : false;
    if (!title || !password) return showNotification('Zəhmət olmasa testin adını və şifrəsini daxil edin.', 'error');
    const questionItems = document.querySelectorAll('.manual-question-item');
    const questions = [];
    const variantLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    questionItems.forEach((item) => {
      const textEl = item.querySelector('.manual-q-text');
      const text = textEl ? textEl.value : '';
      const imageEl = item.querySelector('.manual-q-img-data');
      const imageData = imageEl ? imageEl.value : '';
      const videoId = item.querySelector('.manual-q-video-id') ? item.querySelector('.manual-q-video-id').value : null;
      const videoType = item.querySelector('.manual-q-video-type') ? item.querySelector('.manual-q-video-type').value : null;
      const explanation = item.querySelector('.manual-q-explanation') ? item.querySelector('.manual-q-explanation').value : null;
      const customTime = item.querySelector('.manual-q-time') ? item.querySelector('.manual-q-time').value : null;
      const optionInputs = item.querySelectorAll('.manual-opt');
      const correctInput = item.querySelector('input[type="radio"]:checked');
      if ((text || imageData) && optionInputs.length > 0 && correctInput) {
        const options = Array.from(optionInputs).map((input, i) => {
          let val = input.value.trim();
          if (autoFillEnabled && val === "") {
            return variantLetters[i] || `Variant ${i+1}`;
          }
          return val;
        });
        if (!autoFillEnabled && options.some(opt => opt === "")) {
          return;
        }
        questions.push({
          text: text,
          image: imageData || null,
          videoId: videoId || null,
          videoType: videoType || null,
          explanation: explanation || null,
          time: (timeType === 'per-question' && customTime) ? parseInt(customTime) : null,
          options: options,
          correctIndex: parseInt(correctInput.value)
        });
      }
    });
    if (questions.length === 0) return showNotification('Zəhmət olmasa ən azı bir sual əlavə edin.', 'error');
    const quizData = {
      teacherId: currentUser.id,
      authorName: `${currentUser.name || ''} ${currentUser.surname || ''}`.trim() || currentUser.username || 'Naməlum',
      title: title,
      timeType: timeType,
      defaultTime: defaultTime,
      questions: questions,
      password: password,
      questionCount: questions.length,
      updatedAt: new Date().toISOString()
    };
    if (!editingId) {
      quizData.createdAt = new Date().toISOString();
      quizData.isActive = true;
    }
    try {
      if (editingId) {
        if (db) {
          await db.collection('private_quizzes').doc(editingId).update(quizData);
        }
        const index = privateQuizzes.findIndex(q => q.id === editingId);
        if (index !== -1) {
          privateQuizzes[index] = { ...privateQuizzes[index], ...quizData };
        }
        showNotification('Özəl test uğurla yeniləndi!', 'success');
      } else {
        if (db) {
          const docRef = await db.collection('private_quizzes').add(quizData);
          quizData.id = docRef.id;
        } else {
          quizData.id = 'priv_' + Date.now();
        }
        privateQuizzes.push(quizData);
        showNotification('Özəl test uğurla yaradıldı!', 'success');
      }
      localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
      showTeacherDashboard();
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    }
  };

  window.renderPrivateQuizzes = async function(initial = false) {
    const grid = document.getElementById('private-quizzes-grid');
    const loadMoreBtn = document.getElementById('private-quizzes-load-more');
    const PAGE_SIZE = 5;
    const state = window.__privateQuizzesState || (window.__privateQuizzesState = { quizzes: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0 });
    if (initial) {
      grid.innerHTML = '<div class="grid-cols-full text-center p-10"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i><p class="mt-4 text-muted">Yüklənir...</p></div>';
      state.quizzes = [];
      state.lastDoc = null;
      state.hasMore = true;
      state.fallbackAll = null;
      state.pageIndex = 0;
    } else {
      if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
      }
    }
    try {
      let page = [];
      if (db) {
        try {
          let q = db.collection('private_quizzes').where('teacherId', '==', currentUser.id).orderBy('createdAt', 'desc').limit(PAGE_SIZE);
          if (state.lastDoc) q = q.startAfter(state.lastDoc);
          const snapshot = await q.get();
          page = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
          if (page.length < PAGE_SIZE) state.hasMore = false;
        } catch (queryErr) {
          const snapshot = await db.collection('private_quizzes').where('teacherId', '==', currentUser.id).get();
          const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          all.sort((a, b) => {
            const ta = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
            const tb = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
            return tb - ta;
          });
          state.fallbackAll = state.fallbackAll || all;
          const start = state.pageIndex * PAGE_SIZE;
          const end = start + PAGE_SIZE;
          page = state.fallbackAll.slice(start, end);
          state.pageIndex += 1;
          if (end >= state.fallbackAll.length) state.hasMore = false;
        }
      } else {
        const all = (JSON.parse(localStorage.getItem('privateQuizzes') || '[]').filter(q => q.teacherId === currentUser.id))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        state.fallbackAll = state.fallbackAll || all;
        const start = state.pageIndex * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        page = state.fallbackAll.slice(start, end);
        state.pageIndex += 1;
        if (end >= state.fallbackAll.length) state.hasMore = false;
      }
      if (state.quizzes.length === 0 && page.length === 0) {
        grid.innerHTML = '<p class="grid-cols-full text-center p-6 text-muted">Hələ heç bir özəl test yaratmamısınız.</p>';
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        return;
      }
      if (initial) grid.innerHTML = '';
      state.quizzes = state.quizzes.concat(page);
      appendPrivateQuizzes(page);
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
      grid.innerHTML = '<p class="grid-cols-full text-center p-6 text-danger">Testlər yüklənə bilmədi.</p>';
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.innerHTML = 'Daha çox yüklə';
      }
    }
  };

  function appendPrivateQuizzes(quizzes) {
    const grid = document.getElementById('private-quizzes-grid');
    quizzes.forEach(quiz => {
      const card = document.createElement('div');
      card.className = 'category-card';
      if (quiz.isActive === false) card.classList.add('opacity-70');
      const baseUrl = window.location.origin + window.location.pathname;
      const quizLink = `${baseUrl}?quiz=${quiz.id}`;
      const isActive = quiz.isActive !== false;
      card.innerHTML = `
            <div class="cat-card-header">
                <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                    ${isActive ? '<i class="fas fa-check-circle"></i> <span>Aktiv</span>' : '<i class="fas fa-times-circle"></i> <span>Deaktiv</span>'}
                </span>
                <div class="cat-card-tools">
                    <button onclick="togglePrivateQuizStatus('${quiz.id}')" class="status-btn" title="${isActive ? 'Deaktiv et' : 'Aktiv et'}">
                        <i class="fas ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button onclick="editPrivateQuiz('${quiz.id}')" class="edit-cat-btn" title="Düzəliş et"><i class="fas fa-edit"></i></button>
                    <button onclick="deletePrivateQuiz('${quiz.id}')" class="delete-cat-btn" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="icon-box"><i class="fas fa-link"></i></div>
            <h3>${escapeHtml(quiz.title)}</h3>
            <p>${(typeof quiz.questionCount === 'number' ? quiz.questionCount : (Array.isArray(quiz.questions) ? quiz.questions.length : 0))} sual</p>
            ${quiz.password ? `<p class="text-sm text-muted mt-1">Şifrə: <strong>${escapeHtml(quiz.password)}</strong></p>` : ''}
            <div class="category-actions flex flex-col gap-2 mt-3">
                ${isActive ? `<button onclick="copyQuizLink('${quizLink}')" class="btn-primary w-full"><i class="fas fa-copy"></i> Linki Kopyala</button>` : '<button class="btn-primary w-full opacity-50 cursor-not-allowed" disabled><i class="fas fa-lock"></i> Link Deaktivdir</button>'}
                <button onclick="showStudentResults('${quiz.id}', '${quiz.title}')" class="btn-secondary w-full"><i class="fas fa-poll"></i> Nəticələr</button>
            </div>
        `;
      grid.appendChild(card);
    });
  }

  window.loadMorePrivateQuizzes = function() {
    if (!window.__privateQuizzesState || window.__privateQuizzesState.loading === true) return;
    window.__privateQuizzesState.loading = true;
    renderPrivateQuizzes(false).finally(() => {
      window.__privateQuizzesState.loading = false;
    });
  };

  window.togglePrivateQuizStatus = async function(id) {
    const quiz = privateQuizzes.find(q => q.id === id);
    if (!quiz) return;
    const newStatus = quiz.isActive === false ? true : false;
    quiz.isActive = newStatus;
    try {
      if (db) {
        await db.collection('private_quizzes').doc(id).update({ isActive: newStatus });
      }
      localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
      renderPrivateQuizzes();
      showNotification(`Test ${newStatus ? 'aktiv edildi' : 'deaktiv edildi'}.`, 'success');
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    }
  };

  function softValidateQuestions(input) {
    const warnings = [];
    const result = [];
    const arr = Array.isArray(input) ? input : [];
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i] || {};
      const text = typeof q.text === 'string' ? q.text.trim() : '';
      const opts = Array.isArray(q.options) ? q.options.map(o => String(o || '').trim()).filter(o => o) : [];
      let correct = q.correctIndex !== undefined ? q.correctIndex : (q.correct !== undefined ? q.correct : q.answer);
      if (!text || opts.length < 2) {
        warnings.push(i + 1);
        continue;
      }
      if (!Number.isInteger(correct) || correct < 0 || correct >= opts.length) {
        correct = 0;
      }
      result.push({ text, options: opts, correctIndex: correct });
    }
    return { questions: result, warnings };
  }

  window.savePrivateQuiz = function() {
    const title = document.getElementById('private-quiz-title').value;
    const password = document.getElementById('private-quiz-password').value;
    const fileInput = document.getElementById('private-quiz-file');
    if (!title || !password || !fileInput.files[0]) {
      return showNotification('Zəhmət olmasa bütün xanaları doldurun və sual faylını seçin.', 'error');
    }
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const raw = JSON.parse(e.target.result);
        const { questions, warnings } = softValidateQuestions(raw);
        if (!Array.isArray(questions) || questions.length === 0) throw new Error('Düzgün sual formatı deyil.');
        const newQuiz = {
          teacherId: currentUser.id,
          authorName: `${currentUser.name || ''} ${currentUser.surname || ''}`.trim() || currentUser.username || 'Naməlum',
          title: title,
          questions: questions,
          password: password,
          questionCount: questions.length,
          createdAt: new Date().toISOString(),
          isActive: true
        };
        const h = hashPassword(password);
        if (h) newQuiz.passwordHash = h;
        if (db) {
          const docRef = await db.collection('private_quizzes').add(newQuiz);
          newQuiz.id = docRef.id;
        } else {
          newQuiz.id = 'priv_' + Date.now();
        }
        privateQuizzes.push(newQuiz);
        localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
        showNotification('Özəl test uğurla yaradıldı!', 'success');
        if (warnings && warnings.length) {
          showNotification(`Formatı yararsız olan ${warnings.length} sual keçildi.`, 'warning');
        }
        showTeacherDashboard();
        document.getElementById('private-quiz-title').value = '';
        document.getElementById('private-quiz-password').value = '';
        document.getElementById('private-quiz-file').value = '';
      } catch (error) {
        showNotification('Xəta: ' + error.message, 'error');
      }
    };
    reader.readAsText(fileInput.files[0]);
  };

  window.copyQuizLink = function(link) {
    navigator.clipboard.writeText(link).then(() => {
      showNotification('Link kopyalandı! Tələbələrinizə göndərə bilərsiniz.', 'success');
    });
  };

  window.deletePrivateQuiz = async function(id) {
    if (!confirm('Bu testi silmək istədiyinizə əminsiniz?')) return;
    if (db) {
      await db.collection('private_quizzes').doc(id).delete();
    }
    privateQuizzes = privateQuizzes.filter(q => q.id !== id);
    localStorage.setItem('privateQuizzes', JSON.stringify(privateQuizzes));
    renderPrivateQuizzes();
  };

  window.downloadSampleJSON = function() {
    const sampleData = [
      {
        "text": "Sual mətni bura yazılır",
        "options": ["Variant 1", "Variant 2", "Variant 3", "Variant 4"],
        "correctIndex": 0
      },
      {
        "text": "İkinci sual nümunəsi",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 1
      }
    ];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sampleData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "numune_suallar.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  window.showStudentResults = async function(quizId, quizTitle) {
    const modal = document.getElementById('student-results-modal');
    if (!modal) return;
    document.getElementById('results-list-view').classList.remove('hidden');
    document.getElementById('analytics-view').classList.add('hidden');
    document.getElementById('btn-show-analytics').classList.add('hidden');
    document.getElementById('btn-show-results').classList.add('hidden');
    document.getElementById('results-modal-title').textContent = `${quizTitle} - Nəticələr`;
    modal.classList.remove('hidden');
    const tableBody = document.getElementById('student-results-body');
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4"><i class="fas fa-spinner fa-spin mr-2"></i> Yüklənir...</td></tr>';
    if (db) {
      try {
        if (!quizId) throw new Error("Quiz ID tapılmadı.");
        const quizDoc = await db.collection('private_quizzes').doc(quizId).get();
        const quizData = quizDoc.exists ? quizDoc.data() : null;
        if (!quizData) throw new Error("Test məlumatı tapılmadı.");
        window.__studentResultsState = { quizId: quizId, attempts: [], lastDoc: null, hasMore: true, loading: false, fallbackAll: null, pageIndex: 0, quizData: quizData, pageSize: 5 };
        const loadBtn = document.getElementById('student-results-load-more');
        if (loadBtn) {
          loadBtn.classList.remove('hidden');
          loadBtn.disabled = true;
          loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        }
        await window.loadStudentResultsPage(true);
        if (loadBtn && window.__studentResultsState.hasMore) {
          loadBtn.disabled = false;
          loadBtn.innerHTML = 'Daha çox yüklə';
        } else if (loadBtn) {
          loadBtn.classList.add('hidden');
        }
      } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-danger">Xəta: ${e.message}</td></tr>`;
      }
    } else {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">Firebase aktiv deyil.</td></tr>';
    }
  };

  window.loadStudentResultsPage = async function(initial = false) {
    const state = window.__studentResultsState || {};
    const tableBody = document.getElementById('student-results-body');
    const loadBtn = document.getElementById('student-results-load-more');
    if (!db || !state.quizId || !tableBody) return;
    try {
      let page = [];
      let usedFallback = false;
      try {
        let q = db.collection('student_attempts')
          .where('quizId', '==', state.quizId)
          .orderBy('timestamp', 'desc')
          .limit(state.pageSize);
        if (state.lastDoc) {
          q = q.startAfter(state.lastDoc);
        }
        const snapshot = await q.get();
        page = snapshot.docs.map(doc => doc.data());
        state.lastDoc = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : state.lastDoc;
        if (page.length < state.pageSize) {
          state.hasMore = false;
        }
      } catch (queryErr) {
        usedFallback = true;
        const snapshot = await db.collection('student_attempts')
          .where('quizId', '==', state.quizId)
          .get();
        const all = snapshot.docs.map(doc => doc.data());
        all.sort((a, b) => b.timestamp - a.timestamp);
        state.fallbackAll = state.fallbackAll || all;
        const start = state.pageIndex * state.pageSize;
        const end = start + state.pageSize;
        page = state.fallbackAll.slice(start, end);
        state.pageIndex += 1;
        if (end >= (state.fallbackAll ? state.fallbackAll.length : 0)) {
          state.hasMore = false;
        }
      }
      if (initial) {
        tableBody.innerHTML = '';
      }
      state.attempts = state.attempts.concat(page);
      window.__studentResultsState = state;
      appendStudentResultsRows(page);
      if (state.attempts.length > 0 && state.quizData) {
        if (Array.isArray(state.quizData.questions)) {
          currentQuizAnalytics = { quiz: state.quizData, attempts: state.attempts };
          document.getElementById('btn-show-analytics').classList.remove('hidden');
          schedulePrepareAnalytics();
        } else if (state.quizData.questionsCipher) {
          try {
            const savedPwd = localStorage.getItem('quiz_pass_' + state.quizId) || state.quizData.password;
            if (savedPwd) {
              const bytes = CryptoJS.AES.decrypt(state.quizData.questionsCipher, savedPwd);
              const decoded = bytes.toString(CryptoJS.enc.Utf8);
              state.quizData.questions = JSON.parse(decoded);
              currentQuizAnalytics = { quiz: state.quizData, attempts: state.attempts };
              document.getElementById('btn-show-analytics').classList.remove('hidden');
              schedulePrepareAnalytics();
            }
          } catch (_) {}
        }
      }
      if (loadBtn) {
        if (state.hasMore) {
          loadBtn.classList.remove('hidden');
          loadBtn.disabled = false;
          loadBtn.innerHTML = 'Daha çox yüklə';
        } else {
          loadBtn.classList.add('hidden');
        }
      }
    } catch (e) {}
  };

  window.loadMoreStudentResults = function() {
    const state = window.__studentResultsState || {};
    if (state.loading) return;
    state.loading = true;
    window.__studentResultsState = state;
    const loadBtn = document.getElementById('student-results-load-more');
    if (loadBtn) {
      loadBtn.disabled = true;
      loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
    }
    window.loadStudentResultsPage(false).finally(() => {
      const s = window.__studentResultsState || {};
      s.loading = false;
      window.__studentResultsState = s;
    });
  };

  function appendStudentResultsRows(attempts) {
    const tableBody = document.getElementById('student-results-body');
    if (!tableBody) return;
    if (attempts.length === 0 && tableBody.children.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-10 text-muted">Hələ heç bir nəticə yoxdur.</td></tr>';
      return;
    }
    attempts.forEach(attempt => {
      const date = new Date(attempt.timestamp).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const accuracy = Math.round((attempt.score / attempt.total) * 100);
      const badgeClass = accuracy >= 80 ? 'accuracy-high' : (accuracy >= 50 ? 'accuracy-mid' : 'accuracy-low');
      const tr = document.createElement('tr');
      const unanswered = attempt.unanswered !== undefined ? attempt.unanswered : 0;
      const wrong = attempt.wrong !== undefined ? attempt.wrong : (attempt.total - attempt.score - unanswered);
      tr.innerHTML = `
            <td>${escapeHtml(attempt.studentName || '')}</td>
            <td><span class="accuracy-badge ${badgeClass}">${accuracy}%</span></td>
            <td>${date}</td>
            <td>${attempt.score} / ${wrong} / ${unanswered}</td>
        `;
      tableBody.appendChild(tr);
    });
  }

  window.toggleAnalyticsView = function() {
    const listView = document.getElementById('results-list-view');
    const analyticsView = document.getElementById('analytics-view');
    const btnAnalytics = document.getElementById('btn-show-analytics');
    const btnResults = document.getElementById('btn-show-results');
    if (listView.classList.contains('hidden')) {
      listView.classList.remove('hidden');
      analyticsView.classList.add('hidden');
      btnAnalytics.classList.remove('hidden');
      btnResults.classList.add('hidden');
    } else {
      listView.classList.add('hidden');
      analyticsView.classList.remove('hidden');
      btnAnalytics.classList.add('hidden');
      btnResults.classList.remove('hidden');
    }
  };
})();
