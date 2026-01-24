const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractFunctionSource(code, functionName) {
  let start = code.indexOf('async function ' + functionName);
  if (start === -1) start = code.indexOf('function ' + functionName);
  let isAssigned = false;
  if (start === -1) {
    start = code.indexOf('window.' + functionName);
    isAssigned = start !== -1;
  }
  if (start === -1) throw new Error('Function not found: ' + functionName);

  const braceStart = code.indexOf('{', start);
  if (braceStart === -1) throw new Error('Function brace not found: ' + functionName);

  let i = braceStart;
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLine = false;
  let inBlock = false;
  let escaped = false;

  for (; i < code.length; i++) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : '';

    if (inLine) {
      if (ch === '\n') inLine = false;
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '/' && next === '/') {
        inLine = true;
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlock = true;
        i++;
        continue;
      }
    }

    if (inSingle) {
      if (!escaped && ch === "'") inSingle = false;
      escaped = !escaped && ch === '\\';
      continue;
    }
    if (inDouble) {
      if (!escaped && ch === '"') inDouble = false;
      escaped = !escaped && ch === '\\';
      continue;
    }
    if (inTemplate) {
      if (!escaped && ch === '`') inTemplate = false;
      escaped = !escaped && ch === '\\';
      continue;
    }

    escaped = false;
    if (ch === "'") inSingle = true;
    else if (ch === '"') inDouble = true;
    else if (ch === '`') inTemplate = true;

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        if (isAssigned) {
          while (end < code.length && /\s/.test(code[end])) end++;
          if (code[end] === ';') end++;
        }
        return code.slice(start, end);
      }
    }
  }

  throw new Error('Unclosed function: ' + functionName);
}

function extractMethodSource(code, methodName) {
  let start = code.indexOf('async ' + methodName + '(');
  if (start === -1) start = code.indexOf(methodName + '(');
  if (start === -1) throw new Error('Method not found: ' + methodName);

  const braceStart = code.indexOf('{', start);
  if (braceStart === -1) throw new Error('Method brace not found: ' + methodName);

  let i = braceStart;
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLine = false;
  let inBlock = false;
  let escaped = false;

  for (; i < code.length; i++) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : '';

    if (inLine) {
      if (ch === '\n') inLine = false;
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '/' && next === '/') {
        inLine = true;
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlock = true;
        i++;
        continue;
      }
    }

    if (inSingle) {
      if (!escaped && ch === "'") inSingle = false;
      escaped = !escaped && ch === '\\';
      continue;
    }
    if (inDouble) {
      if (!escaped && ch === '"') inDouble = false;
      escaped = !escaped && ch === '\\';
      continue;
    }
    if (inTemplate) {
      if (!escaped && ch === '`') inTemplate = false;
      escaped = !escaped && ch === '\\';
      continue;
    }

    escaped = false;
    if (ch === "'") inSingle = true;
    else if (ch === '"') inDouble = true;
    else if (ch === '`') inTemplate = true;

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return code.slice(start, i + 1);
      }
    }
  }

  throw new Error('Unclosed method: ' + methodName);
}

function loadCategoryHelpers(appJsText, categoriesList) {
  const ctx = { categories: categoriesList, window: {}, console: console };
  vm.createContext(ctx);
  ['__isSpecialRoot', '__isQuestionsDisabled', '__hasChildren', '__isUnderRoot'].forEach((fn) => {
    vm.runInContext(extractFunctionSource(appJsText, fn), ctx);
  });
  return ctx;
}

test('category helper logic works', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const categoriesList = [
    { id: 'special_prokurorluq', examType: 'special', parentId: null, questionsMode: 'none' },
    { id: 'a', parentId: 'special_prokurorluq', examType: 'special' },
    { id: 'b', parentId: 'a' },
    { id: 'x', parentId: null, name: 'X' }
  ];

  const ctx = loadCategoryHelpers(appJs, categoriesList);

  expect(ctx.__isQuestionsDisabled({ questionsMode: 'none' })).toBe(true);
  expect(ctx.__isQuestionsDisabled({ questionsMode: 'NoNe' })).toBe(true);
  expect(ctx.__isQuestionsDisabled({ questionsMode: 'questions' })).toBe(false);
  expect(ctx.__isQuestionsDisabled(null)).toBe(false);

  expect(ctx.__isSpecialRoot({ id: 'special_prokurorluq', examType: 'special', parentId: null })).toBe(true);
  expect(ctx.__isSpecialRoot({ id: 'special_x', parentId: null })).toBe(true);
  expect(ctx.__isSpecialRoot({ id: 'child', examType: 'special', parentId: 'special_prokurorluq' })).toBe(false);

  expect(ctx.__hasChildren('special_prokurorluq')).toBe(true);
  expect(ctx.__hasChildren('a')).toBe(true);
  expect(ctx.__hasChildren('b')).toBe(false);

  expect(ctx.__isUnderRoot('b', 'special_prokurorluq')).toBe(true);
  expect(ctx.__isUnderRoot('b', 'x')).toBe(false);
});

test('__isSpecialRoot predicate is examId-agnostic', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const categoriesList = [
    { id: 'random_root', examType: 'special', parentId: null, questionsMode: 'all' },
    { id: 'child', examType: 'special', parentId: 'random_root', questionsMode: 'all' }
  ];
  const ctx = loadCategoryHelpers(appJs, categoriesList);
  expect(ctx.__isSpecialRoot({ id: 'random_root', examType: 'special', parentId: null })).toBe(true);
  expect(ctx.__isSpecialRoot({ id: 'random_root', examType: 'special', parentId: 'x' })).toBe(false);
  expect(ctx.__isSpecialRoot({ id: 'random_root', examType: 'general', parentId: null })).toBe(false);
});

test('validator flags "yalnız" prefix mismatch', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const ctx = { window: {}, console: console };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, 'getFlaggedQuestions'), ctx);

  const drafts = [
    {
      id: 'q1',
      text: 'Test sual',
      options: ['Düzgün cavab', '  YALNIZ   A  ', 'Ancaq B', 'Heç   bir  halda C'],
      correctIndex: 0
    }
  ];

  const flagged = ctx.window.getFlaggedQuestions(drafts);
  expect(Array.isArray(flagged)).toBe(true);
  expect(flagged.length).toBe(1);
  expect(flagged[0].id).toBe('q1');
  expect(flagged[0].reasons).toContain('only_prefix_mismatch');
  expect(flagged[0].meta.only_prefix_mismatch).toEqual({ countWrongPrefix: 3, correctHasPrefix: false });
});

test('validator flags answer length outlier', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const ctx = { window: {}, console: console };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, 'getFlaggedQuestions'), ctx);

  const drafts = [
    {
      id: 'q2',
      text: 'Test sual',
      options: [
        'Bu düzgün cavabdır və digər variantlardan xeyli daha uzundur. Bu düzgün cavabdır və digər variantlardan xeyli daha uzundur.',
        'Bu variant kifayət qədər uzundur və normal görünür.',
        'Bu variant kifayət qədər uzundur və normal görünür.',
        'Bu variant kifayət qədər uzundur və normal görünür.'
      ],
      correctIndex: 0
    }
  ];

  const flagged = ctx.window.getFlaggedQuestions(drafts);
  expect(flagged.length).toBe(1);
  expect(flagged[0].id).toBe('q2');
  expect(flagged[0].reasons).toContain('answer_length_outlier');
  expect(flagged[0].meta.answer_length_outlier.avgOtherLen).toBeGreaterThanOrEqual(20);
  expect(flagged[0].meta.answer_length_outlier.ratio).toBeGreaterThanOrEqual(1.8);
});

test('admin draft collector keeps 5 options (no truncation)', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const optionEls = ['A', 'B', 'C', 'D', 'E'].map((v) => ({ value: v }));
  const item = {
    dataset: { qid: 'seed', questionId: 'q1' },
    querySelector: (sel) => {
      if (sel === '.manual-q-text') return { value: 'Sual mətni' };
      if (sel === '.manual-q-img-data') return { value: '' };
      if (sel === '.manual-q-explanation') return { value: '' };
      if (sel === 'input[type="radio"]:checked') return { value: '2' };
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.manual-opt') return optionEls;
      return [];
    }
  };

  const ctx = {
    window: {},
    console: console,
    document: {
      querySelectorAll: (sel) => {
        if (sel === '#admin-questions-list .manual-question-item') return [item];
        return [];
      }
    },
    activeCategoryId: 'cat1',
    currentUser: { id: 'admin1', role: 'admin' }
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, '__makeAdminQuestionId'), ctx);
  vm.runInContext(extractFunctionSource(appJs, '__collectAdminDraftQuestions'), ctx);

  const drafts = ctx.__collectAdminDraftQuestions();
  expect(drafts.length).toBe(1);
  expect(drafts[0].options).toHaveLength(5);
  expect(drafts[0].options).toEqual(['A', 'B', 'C', 'D', 'E']);
  expect(drafts[0]._rawCorrectIndex).toBe(2);
});

test('edit save preserves 5 options before syncCategory writes', async () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const optionEls = ['A', 'B', 'C', 'D', 'E'].map((v) => ({ value: v }));
  const item = {
    dataset: { qid: 'seed', questionId: 'q1' },
    querySelector: (sel) => {
      if (sel === '.manual-q-text') return { value: 'Sual mətni' };
      if (sel === '.manual-q-img-data') return { value: '' };
      if (sel === '.manual-q-explanation') return { value: '' };
      if (sel === 'input[type="radio"]:checked') return { value: '2' };
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.manual-opt') return optionEls;
      return [];
    },
    scrollIntoView: () => {}
  };

  const syncCalls = [];
  const ctx = {
    window: {},
    console: console,
    __openFlaggedQuestionModal: async () => ({ action: 'cancel' }),
    document: {
      querySelectorAll: (sel) => {
        if (sel === '#admin-questions-list .manual-question-item') return [item];
        return [];
      }
    },
    categories: [
      { id: 'cat1', name: 'CAT', time: 45, questionsMode: 'all', questions: [{ id: 'q1', text: 'Old', options: ['x'], correctIndex: 0 }] }
    ],
    activeCategoryId: 'cat1',
    editingQuestionId: 'q1',
    currentUser: { id: 'admin1', role: 'admin' },
    showNotification: () => {},
    saveCategories: () => {},
    hideAdminQuestionPage: () => {},
    resetEditingState: () => {},
    syncCategory: async (catId) => {
      const cat = ctx.categories.find((c) => String(c.id) === String(catId));
      syncCalls.push({ catId, optionsLen: cat && cat.questions && cat.questions[0] && cat.questions[0].options ? cat.questions[0].options.length : null });
    }
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, '__isSpecialRoot'), ctx);
  vm.runInContext(extractFunctionSource(appJs, '__isQuestionsDisabled'), ctx);
  vm.runInContext(extractFunctionSource(appJs, '__makeAdminQuestionId'), ctx);
  vm.runInContext(extractFunctionSource(appJs, '__ensureAdminQuestionIds'), ctx);
  vm.runInContext(extractFunctionSource(appJs, '__collectAdminDraftQuestions'), ctx);
  vm.runInContext(extractFunctionSource(appJs, '__runFlaggedReviewFlow'), ctx);
  vm.runInContext(extractFunctionSource(appJs, 'saveAdminQuestions'), ctx);

  ctx.window.getFlaggedQuestions = () => [];
  await ctx.window.saveAdminQuestions();

  const cat = ctx.categories.find((c) => String(c.id) === 'cat1');
  expect(cat.questions[0].options).toHaveLength(5);
  expect(syncCalls.length).toBe(1);
  expect(syncCalls[0]).toEqual({ catId: 'cat1', optionsLen: 5 });
});

test('prokurorluq root migration is safe without db', async () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const categoriesList = [
    {
      id: 'special_prokurorluq',
      examType: 'special',
      parentId: null,
      questionsMode: 'all',
      questions: [{ text: 'Q1', options: ['a', 'b'], correctIndex: 0 }]
    }
  ];

  const ctx = { categories: categoriesList, window: {}, console: console, db: null };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, 'migrateProkurorluqRootCategory'), ctx);

  const res = await ctx.window.migrateProkurorluqRootCategory({ persist: false });
  expect(res && res.ok).toBe(true);
  expect(res.persisted).toBe(false);
  expect(res.totalQuestions).toBe(1);
  expect(res.mutatedQuestions).toBe(1);
  expect(typeof res.runId).toBe('string');
  expect(res.runId.length).toBeGreaterThan(6);
  expect(String(ctx.categories[0].questionsMode).toLowerCase()).toBe('none');
  expect(Array.isArray(ctx.categories[0].questions)).toBe(true);
  expect(ctx.categories[0].questions.length).toBe(0);
  expect(ctx.categories[0].questionsSoftDeleted).toBe(true);
  expect(ctx.categories[0].rootLegacyQuestionsCount).toBe(1);
 });

test('migration persists root sanitization and legacy docs payload', async () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const calls = { categorySet: [], weeklySet: [], qSets: [] };
  function makeDocRef(collectionName, docId) {
    return {
      id: docId,
      collectionName,
      set: async (data, options) => {
        if (collectionName === 'categories') calls.categorySet.push({ docId, data, options });
        if (collectionName === 'weekly_exams') calls.weeklySet.push({ docId, data, options });
      }
    };
  }
  const dbStub = {
    collection: (name) => ({ doc: (id) => makeDocRef(name, id) }),
    batch: () => {
      const ops = [];
      return {
        set: (ref, data, options) => ops.push({ ref, data, options }),
        commit: async () => {
          ops.forEach((op) => calls.qSets.push(op));
          ops.length = 0;
        }
      };
    }
  };
  const firebaseStub = { firestore: { FieldValue: { serverTimestamp: () => 'ts' } } };

  const categoriesList = [
    {
      id: 'special_prokurorluq',
      examType: 'special',
      parentId: null,
      questionsMode: 'all',
      questions: [
        { id: 'q1', text: 'Q1', options: ['a', 'b'], correctIndex: 0 },
        { text: 'Q2', options: ['a', 'b'], correctIndex: 1 }
      ]
    }
  ];

  const ctx = { categories: categoriesList, window: {}, console: console, db: dbStub, firebase: firebaseStub };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, 'migrateProkurorluqRootCategory'), ctx);

  const res = await ctx.window.migrateProkurorluqRootCategory({ persist: true, limit: 450, logDoc: true });
  expect(res && res.ok).toBe(true);
  expect(res.persisted).toBe(true);
  expect(res.totalQuestions).toBe(2);
  expect(res.legacyDocsWritten).toBe(2);
  expect(res.commitCount).toBeGreaterThanOrEqual(1);
  expect(typeof res.runId).toBe('string');

  expect(calls.categorySet.length).toBe(1);
  expect(calls.categorySet[0].docId).toBe('special_prokurorluq');
  expect(String(calls.categorySet[0].data.questionsMode).toLowerCase()).toBe('none');
  expect(Array.isArray(calls.categorySet[0].data.questions)).toBe(true);
  expect(calls.categorySet[0].data.questions.length).toBe(0);
  expect(calls.categorySet[0].data.questionsSoftDeleted).toBe(true);
  expect(calls.categorySet[0].data.rootLegacyMigrationRunId).toBe(res.runId);

  expect(calls.qSets.length).toBe(2);
  calls.qSets.forEach((op) => {
    expect(op.ref.collectionName).toBe('legacy_category_questions');
    expect(op.data.categoryId).toBe('special_prokurorluq');
    expect(op.data.legacy).toBe(true);
    expect(op.data.deleted).toBe(true);
    expect(op.data.legacyReason).toBe('root_category_contamination');
    expect(op.data.migrationRunId).toBe(res.runId);
    expect(op.data.migrationVersion).toBe(1);
  });
});

function loadWeeklyLeafHelper(weeklyJsText, categoriesList) {
  const ctx = { categories: categoriesList, console: console, window: {} };
  vm.createContext(ctx);
  ['__isQuestionsDisabled', '__isSpecialRoot', '__getQuestionsMode', '__collectSubtreeIds', '__leafCategoriesUnder', 'weeklyDebugLeafStats'].forEach((fn) => {
    vm.runInContext(extractFunctionSource(weeklyJsText, fn), ctx);
  });
  return ctx;
}

test('weekly debug shows non-zero total for CM=186, CPM=100 (stub fetcher)', async () => {
  const weeklyJs = fs.readFileSync(path.join(__dirname, '..', 'weekly-exam.js'), 'utf8');
  const cats = [
    { id: 'special_root_any', examType: 'special', parentId: null, questionsMode: 'all', name: 'ROOT' },
    { id: 'cm', examType: 'special', parentId: 'special_root_any', questionsMode: 'subcollection', name: 'CM' },
    { id: 'cpm', examType: 'special', parentId: 'special_root_any', questionsMode: 'subcollection', name: 'CPM' }
  ];
  const ctx = loadWeeklyLeafHelper(weeklyJs, cats);
  const fetcher = async (catId) => {
    const n = (String(catId) === 'cm') ? 186 : (String(catId) === 'cpm') ? 100 : 0;
    return Array.from({ length: n }).map((_, i) => ({ id: String(catId) + '_' + i, deleted: false, legacy: false }));
  };
  const rows = await ctx.window.weeklyDebugLeafStats('special_root_any', { fetcher });
  const byId = new Map(rows.map((r) => [String(r.id), r]));
  expect(byId.get('cm').totalCount).toBe(186);
  expect(byId.get('cpm').totalCount).toBe(100);
  expect(rows.reduce((acc, r) => acc + r.totalCount, 0)).toBe(286);
});

test('root ignored even if it has questions', () => {
  const weeklyJs = fs.readFileSync(path.join(__dirname, '..', 'weekly-exam.js'), 'utf8');
  const cats = [
    { id: 'special_prokurorluq', examType: 'special', parentId: null, questionsMode: 'all', questions: [{ id: 'rq1' }] },
    { id: 'sub1', examType: 'special', parentId: 'special_prokurorluq', questionsMode: 'all', questions: [{ id: 'q1' }] },
    { id: 'sub2', examType: 'special', parentId: 'special_prokurorluq', questionsMode: 'all', questions: [{ id: 'q2' }] }
  ];
  const ctx = loadWeeklyLeafHelper(weeklyJs, cats);
  const leaves = ctx.__leafCategoriesUnder('special_prokurorluq').map((c) => String(c.id));
  expect(leaves.includes('special_prokurorluq')).toBe(false);
  expect(leaves.sort()).toEqual(['sub1', 'sub2'].sort());
});

test('leaf-only selection', () => {
  const weeklyJs = fs.readFileSync(path.join(__dirname, '..', 'weekly-exam.js'), 'utf8');
  const cats = [
    { id: 'special_prokurorluq', examType: 'special', parentId: null, questionsMode: 'all' },
    { id: 'mid', examType: 'special', parentId: 'special_prokurorluq', questionsMode: 'all' },
    { id: 'leaf', examType: 'special', parentId: 'mid', questionsMode: 'all' },
    { id: 'leaf2', examType: 'special', parentId: 'special_prokurorluq', questionsMode: 'all' }
  ];
  const ctx = loadWeeklyLeafHelper(weeklyJs, cats);
  const leaves = ctx.__leafCategoriesUnder('special_prokurorluq').map((c) => String(c.id));
  expect(leaves.includes('mid')).toBe(false);
  expect(leaves.sort()).toEqual(['leaf', 'leaf2'].sort());
});

test('weekly generator does not read prokurorluq root questions', () => {
  const weeklyJs = fs.readFileSync(path.join(__dirname, '..', 'weekly-exam.js'), 'utf8');
  expect(/db\.collection\(['"]categories['"]\)\.doc\(['"]special_prokurorluq['"]\)/.test(weeklyJs)).toBe(false);
  expect(/__WEEKLY_POOL_QUESTIONS/.test(weeklyJs)).toBe(false);
});

test('transaction writes for audit attempts', async () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const calls = { ops: [] };
  const store = new Map();
  let autoId = 0;
  function makeDocRef(collectionName, docId) {
    const key = collectionName + '/' + docId;
    return {
      collectionName,
      id: docId,
      get: async () => ({ exists: store.has(key) })
    };
  }
  const dbStub = {
    collection: (name) => ({
      doc: (id) => {
        if (id) return makeDocRef(name, String(id));
        autoId += 1;
        return makeDocRef(name, 'auto_' + autoId);
      }
    }),
    runTransaction: async (fn) => {
      const pending = [];
      const tx = {
        get: async (ref) => {
          calls.ops.push({ kind: 'get', ref });
          return { exists: store.has(ref.collectionName + '/' + ref.id) };
        },
        set: (ref, data, options) => {
          calls.ops.push({ kind: 'set', ref, data, options });
          pending.push({ ref, data });
        }
      };
      const res = await fn(tx);
      pending.forEach((op) => {
        const k = op.ref.collectionName + '/' + op.ref.id;
        store.set(k, op.data);
      });
      return res;
    }
  };
  const firebaseStub = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => 'ts',
        arrayUnion: (v) => ({ __op: 'arrayUnion', v })
      }
    }
  };

  const ctx = { window: {}, console: console, db: dbStub, firebase: firebaseStub, currentUser: { id: 'user1', role: 'admin' } };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, 'writeAttemptAudit'), ctx);

  const res = await ctx.window.writeAttemptAudit({
    examType: 'weekly',
    rootId: 'special_prokurorluq',
    examId: 'active_prokurorluq',
    weeklyExamType: 'prokurorluq',
    weeklyKey: '2026-W4',
    questionIds: ['q1', 'q2'],
    answers: [0, 1, null],
    score: 2,
    correctCount: 2,
    wrongCount: 0,
    blankCount: 1,
    startedAt: 100,
    finishedAt: 200
  });

  expect(res && res.ok).toBe(true);
  expect(typeof res.attemptId).toBe('string');

  const attemptSet = calls.ops.find((op) => op.kind === 'set' && op.ref && op.ref.collectionName === 'attempts');
  expect(attemptSet).toBeTruthy();
  expect(attemptSet.data).toEqual(expect.objectContaining({ status: 'finished', examType: 'weekly', weeklyKey: '2026-W4' }));

  const weeklySet = calls.ops.find((op) => op.kind === 'set' && op.ref && op.ref.collectionName === 'weekly_exams' && op.ref.id === 'history_prokurorluq');
  expect(weeklySet).toBeTruthy();
  expect(weeklySet.options).toEqual({ merge: true });
  expect(Object.keys(weeklySet.data).some((k) => k === 'attempts.2026-W4')).toBe(true);

  const userSet = calls.ops.find((op) => op.kind === 'set' && op.ref && op.ref.collectionName === 'exam_history' && op.ref.id === 'user1');
  expect(userSet).toBeTruthy();
  expect(userSet.options).toEqual({ merge: true });
  expect(userSet.data).toEqual(expect.objectContaining({ userId: 'user1' }));
  expect(userSet.data.attemptIds).toEqual({ __op: 'arrayUnion', v: res.attemptId });
});

test('weekly publish blocks when flagged review is canceled', async () => {
  const weeklyJs = fs.readFileSync(path.join(__dirname, '..', 'weekly-exam.js'), 'utf8');
  const methodSrc = extractMethodSource(weeklyJs, 'publishExam');
  const fnSrc = methodSrc.replace(/^async\s+publishExam/, 'async function publishExam');

  const calls = { update: [], set: [], get: [] };
  const draftData = { questions: [{ id: 'q1', text: 'Q1', options: ['a', 'b'], correctIndex: 0 }] };
  function makeDocRef(collectionName, docId) {
    return {
      id: docId,
      collectionName,
      get: async () => {
        calls.get.push({ collectionName, docId });
        if (collectionName === 'weekly_exams' && String(docId).startsWith('draft_')) return { exists: true, data: () => ({ ...draftData }) };
        return { exists: false, data: () => ({}) };
      },
      update: async (data) => calls.update.push({ collectionName, docId, data }),
      set: async (data) => calls.set.push({ collectionName, docId, data })
    };
  }
  const dbStub = {
    collection: (name) => ({ doc: (id) => makeDocRef(name, String(id)) })
  };
  const firebaseStub = { firestore: { FieldValue: { serverTimestamp: () => 'ts' } } };

  const ctx = {
    console: console,
    db: dbStub,
    firebase: firebaseStub,
    currentUser: { id: 'admin1', role: 'admin' },
    confirm: () => true,
    document: { getElementById: () => null },
    showNotification: () => {},
    __weeklyFlagReviewFlow: async () => ({ status: 'cancel' })
  };
  vm.createContext(ctx);
  vm.runInContext(fnSrc, ctx);

  const sys = { getCurrentWeekId: () => '2026-W4', openFullEditor: () => {} };
  await ctx.publishExam.call(sys, 'prokurorluq');

  expect(calls.update.length).toBe(0);
  expect(calls.set.length).toBe(0);
});

test('weekly publish persists _flagReview via draft update after keep', async () => {
  const weeklyJs = fs.readFileSync(path.join(__dirname, '..', 'weekly-exam.js'), 'utf8');
  const methodSrc = extractMethodSource(weeklyJs, 'publishExam');
  const fnSrc = methodSrc.replace(/^async\s+publishExam/, 'async function publishExam');

  const calls = { update: [], set: [], get: [], txSet: [] };
  const draftData = { status: 'draft', publishNonce: 'prok_nonce_1', questions: [{ id: 'q1', text: 'Q1', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }] };
  function makeDocRef(collectionName, docId) {
    return {
      id: docId,
      collectionName,
      get: async () => {
        calls.get.push({ collectionName, docId });
        if (collectionName === 'weekly_exams' && String(docId).startsWith('draft_')) return { exists: true, data: () => ({ ...draftData }) };
        if (collectionName === 'weekly_exams' && String(docId).startsWith('active_')) return { exists: false, data: () => ({}) };
        return { exists: false, data: () => ({}) };
      },
      update: async (data) => calls.update.push({ collectionName, docId, data }),
      set: async (data) => calls.set.push({ collectionName, docId, data })
    };
  }
  const dbStub = {
    collection: (name) => ({ doc: (id) => makeDocRef(name, String(id)) }),
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => {
          const cn = ref && ref.collectionName ? String(ref.collectionName) : '';
          const id = ref && ref.id != null ? String(ref.id) : '';
          if (cn === 'weekly_exams' && id === 'draft_prokurorluq') return { exists: true, data: () => ({ ...draftData }) };
          return { exists: false, data: () => ({}) };
        },
        set: (ref, data, options) => calls.txSet.push({ ref, data, options })
      };
      return await fn(tx);
    }
  };
  const firebaseStub = { firestore: { FieldValue: { serverTimestamp: () => 'ts', increment: (n) => ({ __op: 'increment', n }) } } };

  const reviewedQuestions = [
    {
      id: 'q1',
      text: 'Q1',
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 0,
      _flagReasons: ['only_prefix_mismatch'],
      _flagReview: { status: 'kept', reasons: ['only_prefix_mismatch'], reviewedAt: 123, by: 'admin1' }
    }
  ];

  const ctx = {
    console: console,
    db: dbStub,
    firebase: firebaseStub,
    currentUser: { id: 'admin1', role: 'admin' },
    confirm: () => true,
    document: { getElementById: () => null },
    showNotification: () => {},
    __weeklyFlagReviewFlow: async () => ({ status: 'ok', changed: true, questions: reviewedQuestions })
  };
  vm.createContext(ctx);
  vm.runInContext(fnSrc, ctx);

  const sys = { getCurrentWeekId: () => '2026-W4', openFullEditor: () => {} };
  await ctx.publishExam.call(sys, 'prokurorluq');

  expect(calls.update.length).toBe(1);
  expect(calls.update[0].collectionName).toBe('weekly_exams');
  expect(calls.update[0].docId).toBe('draft_prokurorluq');
  expect(calls.update[0].data.questions).toEqual(reviewedQuestions);
  expect(calls.txSet.some((c) => c.ref && c.ref.collectionName === 'weekly_exams' && c.ref.id === 'active_prokurorluq')).toBe(true);
  expect(calls.txSet.some((c) => c.ref && c.ref.collectionName === 'weekly_exams' && String(c.ref.id).startsWith('weekly_prokurorluq_'))).toBe(true);
});

test('weekly flag review does not re-prompt for already kept question', async () => {
  const weeklyJs = fs.readFileSync(path.join(__dirname, '..', 'weekly-exam.js'), 'utf8');
  const openerSrc = extractFunctionSource(weeklyJs, '__getFlaggedModalOpener');
  const flowSrc = extractFunctionSource(weeklyJs, '__weeklyFlagReviewFlow');

  const openerCalls = [];
  const ctx = {
    console: console,
    window: {
      __isDebugFlagsEnabled: () => false,
      getFlaggedQuestions: () => [{ id: 'q1', reasons: ['r1'], meta: { r1: true } }],
      __openFlaggedQuestionModal: async (payload) => {
        openerCalls.push(payload);
        return { action: 'keep' };
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(openerSrc, ctx);
  vm.runInContext(flowSrc, ctx);

  const res = await ctx.__weeklyFlagReviewFlow({
    questions: [{ id: 'q1', text: 'Q1', _flagReview: { status: 'kept', action: 'keep' }, _flagReasons: ['r1'] }]
  });

  expect(res && res.status).toBe('ok');
  expect(openerCalls.length).toBe(0);
});

test('special flag review does not re-prompt for already kept question', async () => {
  const specialJs = fs.readFileSync(path.join(__dirname, '..', 'special-exams.js'), 'utf8');
  const openerSrc = extractFunctionSource(specialJs, '__getFlaggedModalOpener');
  const flowSrc = extractFunctionSource(specialJs, '__specialFlagReviewFlow');

  const openerCalls = [];
  const ctx = {
    console: console,
    window: {
      __isDebugFlagsEnabled: () => false,
      getFlaggedQuestions: () => [{ id: 'q1', reasons: ['r1'], meta: { r1: true } }],
      __openFlaggedQuestionModal: async (payload) => {
        openerCalls.push(payload);
        return { action: 'keep' };
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(openerSrc, ctx);
  vm.runInContext(flowSrc, ctx);

  const res = await ctx.__specialFlagReviewFlow([{ id: 'q1', text: 'Q1', _flagReview: { status: 'kept', action: 'keep' }, _flagReasons: ['r1'] }]);
  expect(res && res.status).toBe('ok');
  expect(openerCalls.length).toBe(0);
});

test('audit attempt is idempotent for same deterministic attemptId', async () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const calls = { ops: [] };
  const store = new Map();
  function makeDocRef(collectionName, docId) {
    const key = collectionName + '/' + docId;
    return {
      collectionName,
      id: docId,
      get: async () => ({ exists: store.has(key) })
    };
  }
  const dbStub = {
    collection: (name) => ({
      doc: (id) => makeDocRef(name, String(id))
    }),
    runTransaction: async (fn) => {
      const pending = [];
      const tx = {
        get: async (ref) => {
          calls.ops.push({ kind: 'get', ref });
          return { exists: store.has(ref.collectionName + '/' + ref.id) };
        },
        set: (ref, data, options) => {
          calls.ops.push({ kind: 'set', ref, data, options });
          pending.push({ ref, data });
        }
      };
      const res = await fn(tx);
      pending.forEach((op) => {
        const k = op.ref.collectionName + '/' + op.ref.id;
        store.set(k, op.data);
      });
      return res;
    }
  };
  const firebaseStub = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => 'ts',
        arrayUnion: (v) => ({ __op: 'arrayUnion', v })
      }
    }
  };

  const ctx = { window: {}, console: console, db: dbStub, firebase: firebaseStub, currentUser: { id: 'user1' } };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, 'writeAttemptAudit'), ctx);

  const attemptId = 'user1_weekly_2026-W4_session-123';
  const first = await ctx.window.writeAttemptAudit({
    attemptId,
    examType: 'weekly',
    rootId: 'special_prokurorluq',
    examId: 'active_prokurorluq',
    weeklyExamType: 'prokurorluq',
    weeklyKey: '2026-W4',
    questionIds: ['q1', 'q2'],
    answers: [0, 1],
    score: 2,
    correctCount: 2,
    wrongCount: 0,
    blankCount: 0,
    startedAt: 100,
    finishedAt: 200
  });
  const second = await ctx.window.writeAttemptAudit({
    attemptId,
    examType: 'weekly',
    rootId: 'special_prokurorluq',
    examId: 'active_prokurorluq',
    weeklyExamType: 'prokurorluq',
    weeklyKey: '2026-W4',
    questionIds: ['q1', 'q2'],
    answers: [0, 1],
    score: 2,
    correctCount: 2,
    wrongCount: 0,
    blankCount: 0,
    startedAt: 100,
    finishedAt: 200
  });

  expect(first && first.ok).toBe(true);
  expect(first.deduped).toBe(false);
  expect(first.wroteAttemptDoc).toBe(true);

  expect(second && second.ok).toBe(true);
  expect(second.deduped).toBe(true);
  expect(second.wroteAttemptDoc).toBe(false);

  const attemptWrites = calls.ops.filter((op) => op.kind === 'set' && op.ref && op.ref.collectionName === 'attempts');
  expect(attemptWrites.length).toBe(1);
});

test('audit attempt is race-proof for same attemptId under Promise.all', async () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  const calls = { ops: [] };
  const store = new Map();
  let lock = Promise.resolve();
  const dbStub = {
    collection: (name) => ({
      doc: (id) => ({
        collectionName: name,
        id: String(id)
      })
    }),
    runTransaction: async (fn) => {
      const prev = lock;
      let release = null;
      lock = new Promise((r) => (release = r));
      await prev;
      try {
        const pending = [];
        const tx = {
          get: async (ref) => {
            calls.ops.push({ kind: 'get', ref });
            return { exists: store.has(ref.collectionName + '/' + ref.id) };
          },
          set: (ref, data, options) => {
            calls.ops.push({ kind: 'set', ref, data, options });
            pending.push({ ref, data });
          }
        };
        const res = await fn(tx);
        pending.forEach((op) => store.set(op.ref.collectionName + '/' + op.ref.id, op.data));
        return res;
      } finally {
        if (release) release();
      }
    }
  };
  const firebaseStub = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => 'ts',
        arrayUnion: (v) => ({ __op: 'arrayUnion', v })
      }
    }
  };

  const ctx = { window: {}, console: console, db: dbStub, firebase: firebaseStub, currentUser: { id: 'user1' } };
  vm.createContext(ctx);
  vm.runInContext(extractFunctionSource(appJs, 'writeAttemptAudit'), ctx);

  const attemptId = 'user1_weekly_2026-W4_session-123';
  const input = {
    attemptId,
    examType: 'weekly',
    rootId: 'special_prokurorluq',
    examId: 'active_prokurorluq',
    weeklyExamType: 'prokurorluq',
    weeklyKey: '2026-W4',
    questionIds: ['q1', 'q2'],
    answers: [0, 1],
    score: 2,
    correctCount: 2,
    wrongCount: 0,
    blankCount: 0,
    startedAt: 100,
    finishedAt: 200
  };

  const [a, b] = await Promise.all([ctx.window.writeAttemptAudit(input), ctx.window.writeAttemptAudit(input)]);
  expect(a && a.ok).toBe(true);
  expect(b && b.ok).toBe(true);

  const attemptGets = calls.ops.filter((op) => op.kind === 'get' && op.ref && op.ref.collectionName === 'attempts' && op.ref.id === attemptId);
  expect(attemptGets.length).toBe(2);

  const attemptWrites = calls.ops.filter((op) => op.kind === 'set' && op.ref && op.ref.collectionName === 'attempts');
  expect(attemptWrites.length).toBe(1);
});
