// ===== Dashboard Analytics - Client-Side Logic =====

(() => {
  'use strict';

  // ===== Authentication Check =====
  const currentUser = window.AuthAPI?.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const STORAGE_KEY = window.AuthAPI.getUserRoutinesKey(currentUser.username);

  const CATEGORIES = ['work', 'health', 'personal', 'meals', 'leisure'];
  const CAT_COLORS = {
    work: '#7c5cfc',
    health: '#00d4aa',
    personal: '#ff6b9d',
    meals: '#ffa23e',
    leisure: '#38bdf8',
  };
  const CAT_EMOJIS = {
    work: '💼',
    health: '🏃',
    personal: '🧘',
    meals: '🍽️',
    leisure: '🎮',
  };

  let selectedRange = 7;
  let charts = {};

  // ===== DOM =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===== Storage =====
  function getAllData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return {};
  }

  // ===== Date Helpers =====
  function dateToKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getDateRange(days) {
    const dates = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(dateToKey(d));
    }
    return dates;
  }

  function formatShortDate(key) {
    const [y, m, d] = key.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ===== Analytics Computation =====
  function computeAnalytics(data, range) {
    const dates = getDateRange(range);
    const dailyStats = [];
    let totalDone = 0;
    let totalTasks = 0;
    const categoryDone = {};
    const categoryTotal = {};
    CATEGORIES.forEach(c => { categoryDone[c] = 0; categoryTotal[c] = 0; });

    dates.forEach(dateKey => {
      const routines = data[dateKey] || [];
      const done = routines.filter(r => r.completed).length;
      const total = routines.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      dailyStats.push({ date: dateKey, done, total, pct });
      totalDone += done;
      totalTasks += total;

      routines.forEach(r => {
        if (CATEGORIES.includes(r.category)) {
          categoryTotal[r.category]++;
          if (r.completed) categoryDone[r.category]++;
        }
      });
    });

    // Average completion
    const daysWithData = dailyStats.filter(d => d.total > 0);
    const avgPct = daysWithData.length > 0
      ? Math.round(daysWithData.reduce((s, d) => s + d.pct, 0) / daysWithData.length)
      : 0;

    // Streaks (based on >= 80% threshold)
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Walk through last 90 days for streak calculation
    const allDates = getDateRange(90);
    for (let i = allDates.length - 1; i >= 0; i--) {
      const routines = data[allDates[i]] || [];
      const done = routines.filter(r => r.completed).length;
      const total = routines.length;
      const pct = total > 0 ? (done / total) * 100 : 0;
      if (total > 0 && pct >= 80) {
        tempStreak++;
      } else {
        if (currentStreak === 0) currentStreak = tempStreak;
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    if (currentStreak === 0) currentStreak = tempStreak;
    bestStreak = Math.max(bestStreak, tempStreak);

    return { dailyStats, totalDone, totalTasks, avgPct, currentStreak, bestStreak, categoryDone, categoryTotal, dates };
  }

  // ===== KPI Update =====
  function updateKPIs(analytics) {
    $('#kpiAvg').textContent = analytics.avgPct + '%';
    $('#kpiDone').textContent = analytics.totalDone;
    $('#kpiStreak').textContent = analytics.currentStreak;
    $('#kpiBest').textContent = analytics.bestStreak;
  }

  // ===== Chart.js Defaults =====
  function setChartDefaults() {
    Chart.defaults.color = '#a0a0c0';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.animation.duration = 800;
    Chart.defaults.animation.easing = 'easeOutQuart';
  }

  // ===== Trend Chart (Line/Area) =====
  function renderTrendChart(analytics) {
    const ctx = $('#trendChart').getContext('2d');
    if (charts.trend) charts.trend.destroy();

    const labels = analytics.dailyStats.map(d => formatShortDate(d.date));
    const values = analytics.dailyStats.map(d => d.pct);

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(124, 92, 252, 0.3)');
    gradient.addColorStop(1, 'rgba(124, 92, 252, 0.01)');

    charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#7c5cfc',
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#7c5cfc',
          pointBorderColor: '#1a1a2e',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { callback: v => v + '%', stepSize: 25 },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, maxTicksLimit: 8 },
          },
        },
        plugins: {
          tooltip: {
            backgroundColor: '#1a1a2e',
            borderColor: 'rgba(124,92,252,0.3)',
            borderWidth: 1,
            titleColor: '#f0f0f5',
            bodyColor: '#a0a0c0',
            padding: 10,
            cornerRadius: 8,
            callbacks: { label: ctx => ctx.parsed.y + '% completed' },
          },
        },
      },
    });
  }

  // ===== Donut Chart =====
  function renderDonutChart(analytics) {
    const ctx = $('#donutChart').getContext('2d');
    if (charts.donut) charts.donut.destroy();

    const catData = CATEGORIES.map(c => analytics.categoryDone[c]);
    const catColors = CATEGORIES.map(c => CAT_COLORS[c]);
    const catLabels = CATEGORIES.map(c => c.charAt(0).toUpperCase() + c.slice(1));

    charts.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: catColors,
          borderColor: '#1a1a2e',
          borderWidth: 3,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '62%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 14,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { size: 11, weight: '600' },
            },
          },
          tooltip: {
            backgroundColor: '#1a1a2e',
            borderColor: 'rgba(124,92,252,0.3)',
            borderWidth: 1,
            titleColor: '#f0f0f5',
            bodyColor: '#a0a0c0',
            padding: 10,
            cornerRadius: 8,
            callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} tasks` },
          },
        },
      },
    });
  }

  // ===== Bar Chart =====
  function renderBarChart(analytics) {
    const ctx = $('#barChart').getContext('2d');
    if (charts.bar) charts.bar.destroy();

    const labels = analytics.dailyStats.map(d => formatShortDate(d.date));
    const doneVals = analytics.dailyStats.map(d => d.done);
    const remainVals = analytics.dailyStats.map(d => d.total - d.done);

    charts.bar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Completed',
            data: doneVals,
            backgroundColor: 'rgba(0, 212, 170, 0.7)',
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: 'Remaining',
            data: remainVals,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { stepSize: 2 },
          },
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { maxRotation: 0, maxTicksLimit: 8 },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              padding: 14,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { size: 11, weight: '600' },
            },
          },
          tooltip: {
            backgroundColor: '#1a1a2e',
            borderColor: 'rgba(124,92,252,0.3)',
            borderWidth: 1,
            titleColor: '#f0f0f5',
            bodyColor: '#a0a0c0',
            padding: 10,
            cornerRadius: 8,
          },
        },
      },
    });
  }

  // ===== Progress Rings =====
  function renderRings(analytics) {
    const grid = $('#ringGrid');
    const circumference = 2 * Math.PI * 28; // radius=28

    grid.innerHTML = CATEGORIES.map(cat => {
      const done = analytics.categoryDone[cat];
      const total = analytics.categoryTotal[cat];
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const offset = circumference - (circumference * pct / 100);

      return `
        <div class="ring-item">
          <svg class="ring-svg" viewBox="0 0 64 64">
            <circle class="ring-bg" cx="32" cy="32" r="28"/>
            <circle class="ring-fill" cx="32" cy="32" r="28"
              stroke="${CAT_COLORS[cat]}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"/>
          </svg>
          <div class="ring-label">${CAT_EMOJIS[cat]} ${cat}</div>
          <div class="ring-pct">${pct}%</div>
        </div>
      `;
    }).join('');
  }

  // ===== Heatmap =====
  function renderHeatmap(data) {
    const heatmap = $('#heatmap');
    const dates = getDateRange(30);

    heatmap.innerHTML = dates.map(dateKey => {
      const routines = data[dateKey] || [];
      const done = routines.filter(r => r.completed).length;
      const total = routines.length;
      const pct = total > 0 ? done / total : 0;

      let bg;
      if (total === 0) bg = 'rgba(124,92,252,0.04)';
      else if (pct <= 0.2) bg = 'rgba(124,92,252,0.12)';
      else if (pct <= 0.4) bg = 'rgba(124,92,252,0.25)';
      else if (pct <= 0.6) bg = 'rgba(124,92,252,0.4)';
      else if (pct <= 0.8) bg = 'rgba(124,92,252,0.65)';
      else bg = 'rgba(124,92,252,0.9)';

      const label = formatShortDate(dateKey);
      const pctLabel = total > 0 ? Math.round(pct * 100) + '%' : 'No data';

      return `<div class="heatmap-cell" style="background:${bg}"><div class="tooltip">${label}: ${pctLabel}</div></div>`;
    }).join('');
  }

  // ===== Seed Demo Data =====
  function seedDemoData() {
    const data = getAllData();
    const hasSufficientData = Object.keys(data).length >= 5;
    if (hasSufficientData) return;

    const template = [
      { title: 'Morning Meditation', time: '06:00', duration: 15, category: 'personal', notes: '' },
      { title: 'Breakfast', time: '06:30', duration: 30, category: 'meals', notes: '' },
      { title: 'Workout Session', time: '07:00', duration: 60, category: 'health', notes: '' },
      { title: 'Deep Work Block', time: '09:00', duration: 120, category: 'work', notes: '' },
      { title: 'Lunch Break', time: '12:00', duration: 45, category: 'meals', notes: '' },
      { title: 'Team Standup', time: '13:00', duration: 30, category: 'work', notes: '' },
      { title: 'Afternoon Focus', time: '14:00', duration: 120, category: 'work', notes: '' },
      { title: 'Evening Walk', time: '17:30', duration: 30, category: 'health', notes: '' },
      { title: 'Dinner', time: '19:00', duration: 45, category: 'meals', notes: '' },
      { title: 'Reading Time', time: '20:30', duration: 45, category: 'leisure', notes: '' },
      { title: 'Wind Down & Sleep', time: '22:00', duration: 30, category: 'personal', notes: '' },
    ];

    // Seed past 14 days with varied completion
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateToKey(d);
      if (!data[key]) {
        const completionRate = 0.3 + Math.random() * 0.6; // 30-90%
        data[key] = template.map((r, idx) => ({
          ...r,
          id: (idx + 1) + '_' + key,
          completed: Math.random() < completionRate,
        }));
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ===== Render All =====
  function renderDashboard() {
    const data = getAllData();
    const analytics = computeAnalytics(data, selectedRange);

    updateKPIs(analytics);
    renderTrendChart(analytics);
    renderDonutChart(analytics);
    renderBarChart(analytics);
    renderRings(analytics);
    renderHeatmap(data);
  }

  // ===== Init =====
  function init() {
    setChartDefaults();
    seedDemoData();
    renderDashboard();

    // Range selector
    $$('.range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRange = parseInt(btn.dataset.range, 10);
        renderDashboard();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
