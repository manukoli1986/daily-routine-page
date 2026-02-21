// ===== Daily Routine Planner - Client-Side Logic =====
// Multi-user, multi-day storage with date navigation

(() => {
  'use strict';

  // ===== Authentication Check =====
  const currentUser = window.AuthAPI?.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // ===== Storage Keys (User-Specific) =====
  const STORAGE_KEY = window.AuthAPI.getUserRoutinesKey(currentUser.username);
  const SAVED_TEMPLATES_KEY = window.AuthAPI.getUserTemplatesKey(currentUser.username);
  const TEMPLATE_KEY = 'dailyRoutineTemplate';  // default routine template (shared)
  const NOTIFICATIONS_KEY_USER = 'notificationsEnabled_' + currentUser.username;

  // ===== Default Routines Template =====
  const DEFAULT_TEMPLATE = [
    { id: '1', title: 'Morning Meditation', time: '06:00', duration: 15, category: 'personal', notes: 'Focus on breathing' },
    { id: '2', title: 'Breakfast', time: '06:30', duration: 30, category: 'meals', notes: '' },
    { id: '3', title: 'Workout Session', time: '07:00', duration: 60, category: 'health', notes: 'Cardio + Strength' },
    { id: '4', title: 'Deep Work Block', time: '09:00', duration: 120, category: 'work', notes: 'Focus on top priority tasks' },
    { id: '5', title: 'Lunch Break', time: '12:00', duration: 45, category: 'meals', notes: '' },
    { id: '6', title: 'Team Standup', time: '13:00', duration: 30, category: 'work', notes: 'Daily sync with the team' },
    { id: '7', title: 'Afternoon Focus', time: '14:00', duration: 120, category: 'work', notes: 'Code review and development' },
    { id: '8', title: 'Evening Walk', time: '17:30', duration: 30, category: 'health', notes: '30 min brisk walk' },
    { id: '9', title: 'Dinner', time: '19:00', duration: 45, category: 'meals', notes: '' },
    { id: '10', title: 'Reading Time', time: '20:30', duration: 45, category: 'leisure', notes: 'Current book or articles' },
    { id: '11', title: 'Wind Down & Sleep', time: '22:00', duration: 30, category: 'personal', notes: 'No screens, light stretching' },
  ];

  // ===== Category Emoji Map =====
  const CATEGORY_EMOJIS = {
    work: '💼',
    health: '🏃',
    personal: '🧘',
    meals: '🍽️',
    leisure: '🎮',
  };

  // ===== State =====
  let routines = [];
  let currentDate = new Date();
  let activeFilter = 'all';
  let editingId = null;
  let deletingId = null;
  let notificationsEnabled = false;
  let notificationCheckInterval = null;

  // ===== DOM Elements =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    currentDate: $('#currentDate'),
    currentTime: $('#currentTime'),
    greeting: $('#greeting'),
    progressValue: $('#progressValue'),
    progressBar: $('#progressBar'),
    completedCount: $('#completedCount'),
    pendingCount: $('#pendingCount'),
    totalCount: $('#totalCount'),
    routineList: $('#routineList'),
    addBtn: $('#addBtn'),
    // Date nav
    dateLabel: $('#dateLabel'),
    prevDayBtn: $('#prevDayBtn'),
    nextDayBtn: $('#nextDayBtn'),
    todayBtn: $('#todayBtn'),
    // Modal
    modalOverlay: $('#modalOverlay'),
    routineModal: $('#routineModal'),
    modalTitle: $('#modalTitle'),
    modalClose: $('#modalClose'),
    routineForm: $('#routineForm'),
    routineTitle: $('#routineTitle'),
    routineTime: $('#routineTime'),
    routineDuration: $('#routineDuration'),
    routineNotes: $('#routineNotes'),
    routineId: $('#routineId'),
    cancelBtn: $('#cancelBtn'),
    saveBtn: $('#saveBtn'),
    categoryPicker: $('#categoryPicker'),
    // Delete
    deleteOverlay: $('#deleteOverlay'),
    cancelDeleteBtn: $('#cancelDeleteBtn'),
    confirmDeleteBtn: $('#confirmDeleteBtn'),
    // Recurrence & Notifications
    recurrencePicker: $('#recurrencePicker'),
    // Notifications
    notificationBtn: $('#notificationBtn'),
    // Templates
    templateBtn: $('#templateBtn'),
    templatesOverlay: $('#templatesOverlay'),
    templatesClose: $('#templatesClose'),
    templatesModal: $('#templatesModal'),
    templatesContainer: $('#templatesContainer'),
    saveAsTemplateBtn: $('#saveAsTemplateBtn'),
    templateNameInput: $('#templateNameInput'),
  };

  // ===== Date Helpers =====
  function dateToKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function isToday(d) {
    const now = new Date();
    return dateToKey(d) === dateToKey(now);
  }

  function formatDateLabel(d) {
    if (isToday(d)) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateToKey(d) === dateToKey(yesterday)) return 'Yesterday';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateToKey(d) === dateToKey(tomorrow)) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // ===== Storage (Multi-day) =====
  function getAllData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return {};
  }

  function saveAllData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function migrateOldData() {
    // Migrate from old single-array format
    const oldData = localStorage.getItem('dailyRoutinePlanner');
    if (oldData && !localStorage.getItem(STORAGE_KEY)) {
      try {
        const oldRoutines = JSON.parse(oldData);
        if (Array.isArray(oldRoutines)) {
          const data = {};
          data[dateToKey(new Date())] = oldRoutines;
          saveAllData(data);
          localStorage.removeItem('dailyRoutinePlanner');
        }
      } catch { /* ignore */ }
    }
  }

  function getTemplate() {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { return DEFAULT_TEMPLATE; }
    }
    return DEFAULT_TEMPLATE;
  }

  function loadRoutinesForDate(d) {
    const data = getAllData();
    const key = dateToKey(d);
    if (data[key]) {
      routines = data[key];
    } else {
      // Clone template with fresh IDs and reset completion
      const template = getTemplate();
      routines = template.map(r => ({
        ...r,
        id: r.id + '_' + key,
        completed: false,
        recurrence: r.recurrence || 'none',
        recurringDays: r.recurringDays,
        monthlyDay: r.monthlyDay,
      }));
      // Auto-save so it persists
      data[key] = routines;
      saveAllData(data);
    }

    // Add recurring routines from saved templates
    const recurringRoutines = getRecurringRoutinesForDate(d);
    recurringRoutines.forEach(rr => {
      if (!routines.find(r => r.id === rr.id)) {
        routines.push(rr);
      }
    });
  }

  function saveRoutines() {
    const data = getAllData();
    data[dateToKey(currentDate)] = routines;
    saveAllData(data);
  }

  // ===== Date, Time & Greeting =====
  function updateDateTime() {
    const now = new Date();

    // Header date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    els.currentDate.textContent = now.toLocaleDateString('en-US', options);

    // Time
    els.currentTime.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Greeting
    const h = now.getHours();
    let greet = 'Good Evening ✨';
    if (h < 12) greet = 'Good Morning ☀️';
    else if (h < 17) greet = 'Good Afternoon 🌤️';
    els.greeting.textContent = greet;
  }

  function updateDateNav() {
    els.dateLabel.textContent = formatDateLabel(currentDate);
    els.todayBtn.style.display = isToday(currentDate) ? 'none' : 'inline-flex';
  }

  // ===== Progress =====
  function updateProgress() {
    const total = routines.length;
    const completed = routines.filter(r => r.completed).length;
    const pending = total - completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    els.progressValue.textContent = pct + '%';
    els.progressBar.style.width = pct + '%';
    els.completedCount.textContent = completed;
    els.pendingCount.textContent = pending;
    els.totalCount.textContent = total;
  }

  // ===== Utility =====
  function formatDuration(mins) {
    if (mins < 60) return mins + ' min';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function formatTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ===== Notifications =====
  function initNotifications() {
    notificationsEnabled = localStorage.getItem(NOTIFICATIONS_KEY_USER) === 'true';
    updateNotificationButton();
    if (notificationsEnabled && Notification.permission === 'granted') {
      startNotificationCheck();
    }
  }

  function updateNotificationButton() {
    if (!els.notificationBtn) return;
    if (notificationsEnabled) {
      els.notificationBtn.textContent = '🔔 Notifications On';
      els.notificationBtn.classList.add('active');
    } else {
      els.notificationBtn.textContent = '🔕 Notifications Off';
      els.notificationBtn.classList.remove('active');
    }
  }

  function toggleNotifications() {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications.');
      return;
    }

    if (notificationsEnabled) {
      // Turn off
      notificationsEnabled = false;
      localStorage.setItem(NOTIFICATIONS_KEY_USER, 'false');
      stopNotificationCheck();
      updateNotificationButton();
    } else {
      // Request permission and turn on
      if (Notification.permission === 'granted') {
        notificationsEnabled = true;
        localStorage.setItem(NOTIFICATIONS_KEY_USER, 'true');
        startNotificationCheck();
        updateNotificationButton();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            notificationsEnabled = true;
            localStorage.setItem(NOTIFICATIONS_KEY_USER, 'true');
            startNotificationCheck();
            updateNotificationButton();
          }
        });
      } else {
        alert('Please enable notifications in your browser settings.');
      }
    }
  }

  function startNotificationCheck() {
    if (notificationCheckInterval) return;
    notificationCheckInterval = setInterval(checkUpcomingRoutines, 60000); // Check every minute
    checkUpcomingRoutines(); // Check immediately
  }

  function stopNotificationCheck() {
    if (notificationCheckInterval) {
      clearInterval(notificationCheckInterval);
      notificationCheckInterval = null;
    }
  }

  function checkUpcomingRoutines() {
    if (!notificationsEnabled || !isToday(currentDate)) return;

    const now = new Date();
    const currentTimeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const notifiedKey = 'notified_' + dateToKey(currentDate);
    const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

    routines.forEach(r => {
      if (notified.includes(r.id)) return; // Already notified

      const [rH, rM] = r.time.split(':').map(Number);
      const routineTime = String(rH).padStart(2, '0') + ':' + String(rM).padStart(2, '0');

      // 5 minutes before routine starts
      const routineDate = new Date();
      routineDate.setHours(rH, rM, 0);
      const notifTime = new Date(routineDate.getTime() - 5 * 60000);
      const notifTimeStr = String(notifTime.getHours()).padStart(2, '0') + ':' + String(notifTime.getMinutes()).padStart(2, '0');

      if (currentTimeStr === notifTimeStr) {
        new Notification('Routine Reminder 🔔', {
          body: `"${r.title}" starts in 5 minutes at ${formatTime(r.time)}`,
          icon: '🗓️',
          tag: r.id,
        });
        notified.push(r.id);
        localStorage.setItem(notifiedKey, JSON.stringify(notified));
      }
    });
  }

  // ===== Recurring Routines =====
  function shouldIncludeRecurringRoutine(routine, date) {
    if (!routine.recurrence || routine.recurrence === 'none') return false;

    if (routine.recurrence === 'daily') return true;

    if (routine.recurrence === 'weekly') {
      const dayOfWeek = date.getDay();
      const recurringDays = routine.recurringDays || [0, 1, 2, 3, 4, 5, 6];
      return recurringDays.includes(dayOfWeek);
    }

    if (routine.recurrence === 'monthly') {
      return date.getDate() === routine.monthlyDay;
    }

    return false;
  }

  function getRecurringRoutinesForDate(d) {
    const template = getTemplate();
    const key = dateToKey(d);
    const recurringRoutines = [];

    template.forEach(r => {
      if (shouldIncludeRecurringRoutine(r, d)) {
        recurringRoutines.push({
          ...r,
          id: r.id + '_' + key,
          completed: false,
          isRecurring: true,
        });
      }
    });

    return recurringRoutines;
  }

  // ===== Routine Templates =====
  function getSavedTemplates() {
    const raw = localStorage.getItem(SAVED_TEMPLATES_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  }

  function saveSavedTemplates(templates) {
    localStorage.setItem(SAVED_TEMPLATES_KEY, JSON.stringify(templates));
  }

  function saveCurrentAsTemplate(name) {
    if (!name || !name.trim()) {
      alert('Please enter a template name');
      return;
    }

    const templates = getSavedTemplates();
    const template = routines.map(r => ({
      id: r.id.split('_')[0],
      title: r.title,
      time: r.time,
      duration: r.duration,
      category: r.category,
      notes: r.notes,
      recurrence: r.recurrence || 'none',
      recurringDays: r.recurringDays,
      monthlyDay: r.monthlyDay,
    }));

    templates.push({
      id: generateId(),
      name: name.trim(),
      routines: template,
      createdAt: new Date().toISOString(),
    });

    saveSavedTemplates(templates);
    alert(`Template "${name}" saved successfully!`);
  }

  function applyTemplate(templateId) {
    const templates = getSavedTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    routines = template.routines.map(r => ({
      ...r,
      id: r.id + '_' + dateToKey(currentDate),
      completed: false,
    }));

    saveRoutines();
    renderRoutines();
    updateProgress();
  }

  function deleteTemplate(templateId) {
    if (!confirm('Delete this template?')) return;
    let templates = getSavedTemplates();
    templates = templates.filter(t => t.id !== templateId);
    saveSavedTemplates(templates);
    showTemplatesModal();
  }

  function showTemplatesModal() {
    const templates = getSavedTemplates();
    if (templates.length === 0) {
      els.templatesContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-muted);">No saved templates yet</p>';
    } else {
      els.templatesContainer.innerHTML = templates.map(t => `
        <div class="template-item">
          <div class="template-info">
            <div class="template-name">${escapeHtml(t.name)}</div>
            <div class="template-meta">${t.routines.length} routines</div>
          </div>
          <div class="template-actions">
            <button class="template-apply-btn" data-id="${t.id}">Load</button>
            <button class="template-delete-btn" data-id="${t.id}">Delete</button>
          </div>
        </div>
      `).join('');

      els.templatesContainer.querySelectorAll('.template-apply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          applyTemplate(btn.dataset.id);
          closeTemplatesModal();
        });
      });

      els.templatesContainer.querySelectorAll('.template-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          deleteTemplate(btn.dataset.id);
        });
      });
    }

    els.templatesOverlay.classList.add('active');
  }

  function closeTemplatesModal() {
    els.templatesOverlay.classList.remove('active');
  }

  // ===== Render Routines =====
  function renderRoutines() {
    const filtered = activeFilter === 'all'
      ? routines
      : routines.filter(r => r.category === activeFilter);

    filtered.sort((a, b) => a.time.localeCompare(b.time));

    if (filtered.length === 0) {
      els.routineList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>${activeFilter === 'all' ? 'No routines yet' : 'No ' + activeFilter + ' routines'}</h3>
          <p>Tap the + button to add your first routine</p>
        </div>
      `;
      return;
    }

    els.routineList.innerHTML = filtered.map(r => `
      <div class="routine-card ${r.completed ? 'completed' : ''}" data-id="${r.id}">
        <div class="routine-stripe routine-stripe-${r.category}"></div>
        <div class="routine-check" data-action="toggle" data-id="${r.id}">
          <div class="check-circle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
        <div class="routine-content">
          <div class="routine-title">${escapeHtml(r.title)}</div>
          <div class="routine-meta">
            <span class="routine-time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${formatTime(r.time)}
            </span>
            <span class="routine-duration">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
              ${formatDuration(r.duration)}
            </span>
            <span class="routine-category-badge badge-${r.category}">${CATEGORY_EMOJIS[r.category] || ''} ${r.category}</span>
          </div>
          ${r.notes ? `<div class="routine-notes">${escapeHtml(r.notes)}</div>` : ''}
        </div>
        <div class="routine-actions">
          <button class="action-btn edit" data-action="edit" data-id="${r.id}" title="Edit" aria-label="Edit routine">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn delete" data-action="delete" data-id="${r.id}" title="Delete" aria-label="Delete routine">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  // ===== Modal Management =====
  function openModal(mode, routine = null) {
    editingId = null;
    els.routineForm.reset();
    setActiveCategory('work');
    setActiveRecurrence('none');

    if (mode === 'edit' && routine) {
      editingId = routine.id;
      els.modalTitle.textContent = 'Edit Routine';
      els.saveBtn.textContent = 'Save Changes';
      els.routineTitle.value = routine.title;
      els.routineTime.value = routine.time;
      els.routineDuration.value = routine.duration;
      els.routineNotes.value = routine.notes || '';
      els.routineId.value = routine.id;
      setActiveCategory(routine.category);
      setActiveRecurrence(routine.recurrence || 'none');
    } else {
      els.modalTitle.textContent = 'Add Routine';
      els.saveBtn.textContent = 'Add Routine';
      els.routineId.value = '';
    }

    els.modalOverlay.classList.add('active');
    setTimeout(() => els.routineTitle.focus(), 300);
  }

  function closeModal() {
    els.modalOverlay.classList.remove('active');
    editingId = null;
  }

  function openDeleteConfirm(id) {
    deletingId = id;
    els.deleteOverlay.classList.add('active');
  }

  function closeDeleteConfirm() {
    els.deleteOverlay.classList.remove('active');
    deletingId = null;
  }

  // ===== Category Picker =====
  function getActiveCategory() {
    const active = els.categoryPicker.querySelector('.cat-btn.active');
    return active ? active.dataset.category : 'work';
  }

  function setActiveCategory(cat) {
    els.categoryPicker.querySelectorAll('.cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === cat);
    });
  }

  // ===== Recurrence Picker =====
  function getActiveRecurrence() {
    if (!els.recurrencePicker) return 'none';
    const active = els.recurrencePicker.querySelector('.recurrence-btn.active');
    return active ? active.dataset.recurrence : 'none';
  }

  function setActiveRecurrence(rec) {
    if (!els.recurrencePicker) return;
    els.recurrencePicker.querySelectorAll('.recurrence-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.recurrence === rec);
    });
  }

  // ===== Event Handlers =====
  function handleFormSubmit(e) {
    e.preventDefault();

    const title = els.routineTitle.value.trim();
    const time = els.routineTime.value;
    const duration = parseInt(els.routineDuration.value, 10);
    const category = getActiveCategory();
    const recurrence = getActiveRecurrence();
    const notes = els.routineNotes.value.trim();

    if (!title || !time || !duration) return;

    if (editingId) {
      const idx = routines.findIndex(r => r.id === editingId);
      if (idx !== -1) {
        routines[idx] = { ...routines[idx], title, time, duration, category, recurrence, notes };
      }
    } else {
      routines.push({
        id: generateId(),
        title,
        time,
        duration,
        category,
        recurrence,
        notes,
        completed: false,
      });
    }

    saveRoutines();
    renderRoutines();
    updateProgress();
    closeModal();
  }

  function handleToggle(id) {
    const routine = routines.find(r => r.id === id);
    if (routine) {
      routine.completed = !routine.completed;
      saveRoutines();
      renderRoutines();
      updateProgress();
    }
  }

  function handleEdit(id) {
    const routine = routines.find(r => r.id === id);
    if (routine) {
      openModal('edit', routine);
    }
  }

  function handleDelete() {
    if (!deletingId) return;
    routines = routines.filter(r => r.id !== deletingId);
    saveRoutines();
    renderRoutines();
    updateProgress();
    closeDeleteConfirm();
  }

  function handleFilterClick(e) {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    $$('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderRoutines();
  }

  function handleRoutineListClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;
    switch (action) {
      case 'toggle': handleToggle(id); break;
      case 'edit': handleEdit(id); break;
      case 'delete': openDeleteConfirm(id); break;
    }
  }

  // ===== Date Navigation =====
  function navigateDate(offset) {
    currentDate.setDate(currentDate.getDate() + offset);
    loadRoutinesForDate(currentDate);
    updateDateNav();
    renderRoutines();
    updateProgress();
  }

  function goToToday() {
    currentDate = new Date();
    loadRoutinesForDate(currentDate);
    updateDateNav();
    renderRoutines();
    updateProgress();
  }

  // ===== Initialize =====
  function init() {
    // Display username in header
    const usernameEl = document.getElementById('username');
    if (usernameEl) {
      usernameEl.textContent = currentUser.username;
    }

    migrateOldData();
    initNotifications();
    loadRoutinesForDate(currentDate);
    updateDateTime();
    updateDateNav();
    renderRoutines();
    updateProgress();

    // Update time every second
    setInterval(updateDateTime, 1000);

    // Date navigation
    els.prevDayBtn.addEventListener('click', () => navigateDate(-1));
    els.nextDayBtn.addEventListener('click', () => navigateDate(1));
    els.todayBtn.addEventListener('click', goToToday);

    // Event listeners
    els.addBtn.addEventListener('click', () => openModal('add'));
    els.modalClose.addEventListener('click', closeModal);
    els.cancelBtn.addEventListener('click', closeModal);
    els.routineForm.addEventListener('submit', handleFormSubmit);
    els.routineList.addEventListener('click', handleRoutineListClick);

    els.modalOverlay.addEventListener('click', (e) => {
      if (e.target === els.modalOverlay) closeModal();
    });

    els.cancelDeleteBtn.addEventListener('click', closeDeleteConfirm);
    els.confirmDeleteBtn.addEventListener('click', handleDelete);
    els.deleteOverlay.addEventListener('click', (e) => {
      if (e.target === els.deleteOverlay) closeDeleteConfirm();
    });

    els.categoryPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      setActiveCategory(btn.dataset.category);
    });

    // Recurrence picker
    if (els.recurrencePicker) {
      els.recurrencePicker.addEventListener('click', (e) => {
        const btn = e.target.closest('.recurrence-btn');
        if (!btn) return;
        setActiveRecurrence(btn.dataset.recurrence);
      });
    }

    // Notifications button
    if (els.notificationBtn) {
      els.notificationBtn.addEventListener('click', toggleNotifications);
    }

    // Templates button
    if (els.templateBtn) {
      els.templateBtn.addEventListener('click', () => showTemplatesModal());
    }

    if (els.saveAsTemplateBtn) {
      els.saveAsTemplateBtn.addEventListener('click', () => {
        const name = els.templateNameInput ? els.templateNameInput.value : prompt('Template name:');
        if (name) {
          saveCurrentAsTemplate(name);
          if (els.templateNameInput) els.templateNameInput.value = '';
        }
      });
    }

    // Templates modal close
    if (els.templatesOverlay) {
      els.templatesOverlay.addEventListener('click', (e) => {
        if (e.target === els.templatesOverlay) closeTemplatesModal();
      });
    }

    if (els.templatesClose) {
      els.templatesClose.addEventListener('click', closeTemplatesModal);
    }

    $$('.filter-btn').forEach(btn => {
      btn.addEventListener('click', handleFilterClick);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (els.deleteOverlay && els.deleteOverlay.classList.contains('active')) {
          closeDeleteConfirm();
        } else if (els.templatesOverlay && els.templatesOverlay.classList.contains('active')) {
          closeTemplatesModal();
        } else if (els.modalOverlay.classList.contains('active')) {
          closeModal();
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
