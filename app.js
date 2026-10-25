(() => {
  const data = window.TIMETABLE_DATA;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const times = ['08:30', '10:15', '12:00', '14:30', '16:15', '18:00'];
  const dayLabels = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
  const palette = ['#8199e7', '#a98adb', '#57a8b2', '#d39a5c', '#829f78', '#d17794', '#6e9fda', '#b58968', '#8d88cf', '#65a78c'];
  const colors = new Map(data.courses.map((course, index) => [course.id, palette[index % palette.length]]));
  const coursesById = new Map(data.courses.map((course) => [course.id, course]));
  const sectionsByCourse = new Map();
  for (const event of data.events) {
    const sections = sectionsByCourse.get(event.courseId) || new Set();
    sections.add(event.section || 'A');
    sectionsByCourse.set(event.courseId, sections);
  }
  const offerings = data.courses.flatMap((course) => {
    const sections = [...(sectionsByCourse.get(course.id) || ['TBA'])].sort();
    return sections.map((section) => ({ key: `${course.id}::${section}`, courseId: course.id, section }));
  });

  const state = {
    selected: new Set(readSaved().filter((key) => offerings.some((offering) => offering.key === key))),
    days: new Set(days),
    times: new Set(times),
    credits: new Set([1.5, 3]),
    query: '',
    showAll: true,
    fullNames: true,
  };

  const $ = (id) => document.getElementById(id);
  const courseList = $('course-list');
  const selectedList = $('selected-list');
  const dayFilters = $('day-filters');
  const timeFilters = $('time-filters');
  const creditFilters = $('credit-filters');
  const calendarGrid = $('calendar-grid');

  function readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem('term-vi-course-plan') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function savePlan() {
    try { localStorage.setItem('term-vi-course-plan', JSON.stringify([...state.selected])); } catch { /* file URLs may disable storage */ }
  }

  function offeringEvents(offering) {
    return data.events.filter((event) => event.courseId === offering.courseId && (event.section || 'A') === offering.section);
  }

  function matchesFilters(offering) {
    const course = coursesById.get(offering.courseId);
    if (!state.credits.has(course.credits)) return false;
    const events = offeringEvents(offering);
    if (!events.length) return true;
    return events.some((event) => state.days.has(event.day) && state.times.has(event.time));
  }

  function visibleOfferings() {
    const q = state.query.trim().toLocaleLowerCase();
    return offerings.filter((offering) => {
      const course = coursesById.get(offering.courseId);
      if (!matchesFilters(offering)) return false;
      if (!q) return true;
      const haystack = `${course.name} ${course.code} ${course.department} ${course.instructor} ${offering.section}`.toLocaleLowerCase();
      return haystack.includes(q);
    });
  }

  function getConflictState() {
    const bySlot = new Map();
    for (const event of data.events) {
      const offeringKey = `${event.courseId}::${event.section || 'A'}`;
      if (!state.selected.has(offeringKey)) continue;
      const slotKey = `${event.day}::${event.time}`;
      const keys = bySlot.get(slotKey) || new Set();
      keys.add(offeringKey);
      bySlot.set(slotKey, keys);
    }
    const clashSlots = new Set();
    const clashOfferings = new Set();
    for (const [slotKey, keys] of bySlot) {
      const courseIds = new Set([...keys].map((key) => key.split('::')[0]));
      if (courseIds.size > 1) {
        clashSlots.add(slotKey);
        keys.forEach((key) => clashOfferings.add(key));
      }
    }
    return { bySlot, clashSlots, clashOfferings, count: clashSlots.size };
  }

  function setOffering(offering, on) {
    if (on) {
      for (const key of [...state.selected]) {
        if (key.split('::')[0] === offering.courseId && key !== offering.key) state.selected.delete(key);
      }
      state.selected.add(offering.key);
    } else {
      state.selected.delete(offering.key);
    }
    savePlan();
    render();
  }

  function toggleOffering(offering) {
    setOffering(offering, !state.selected.has(offering.key));
  }

  function offeringFor(key) {
    return offerings.find((offering) => offering.key === key);
  }

  function colorStyle(courseId) {
    return `--course-color:${colors.get(courseId) || '#8990a5'}`;
  }

  function renderCourseList(conflicts) {
    const list = visibleOfferings();
    $('available-count').textContent = list.length;
    $('filter-summary').textContent = `${list.length} ${list.length === 1 ? 'option' : 'options'} · ${state.days.size} days selected`;
    courseList.innerHTML = '';
    if (!list.length) {
      courseList.innerHTML = '<div class="empty-list">No subjects match these filters.</div>';
      return;
    }
    for (const offering of list) {
      const course = coursesById.get(offering.courseId);
      const selected = state.selected.has(offering.key);
      const hasClash = conflicts.clashOfferings.has(offering.key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `course-option${selected ? ' is-selected' : ''}${hasClash ? ' has-clash' : ''}`;
      button.setAttribute('aria-pressed', String(selected));
      button.title = `${course.name} · ${course.credits} credits · ${course.instructor || 'Instructor TBA'}`;
      button.innerHTML = `
        <span class="course-check" aria-hidden="true">${selected ? '✓' : ''}</span>
        <span class="course-option-copy">
          <span class="course-name">${escapeHtml(course.name)}</span>
          <span class="course-meta"><span>${escapeHtml(course.instructor || 'Instructor TBA')}</span><span class="credit-tag">${course.credits} credits</span></span>
        </span>
        ${offering.section === 'TBA' ? '<span class="course-section">TBA</span>' : `<span class="course-section">${escapeHtml(offering.section)}</span>`}
        ${hasClash ? '<span class="course-warning" aria-label="Timetable clash" title="Clashes with another selected course">⚠</span>' : ''}`;
      button.addEventListener('click', () => toggleOffering(offering));
      courseList.append(button);
    }
  }

  function renderSelected(conflicts) {
    const selected = [...state.selected].map(offeringFor).filter(Boolean).sort((a, b) => {
      const ca = coursesById.get(a.courseId).name;
      const cb = coursesById.get(b.courseId).name;
      return ca.localeCompare(cb);
    });
    const uniqueCourses = new Set(selected.map((offering) => offering.courseId));
    const totalCredits = [...uniqueCourses].reduce((sum, id) => sum + coursesById.get(id).credits, 0);
    $('credit-total').textContent = Number.isInteger(totalCredits) ? totalCredits : totalCredits.toFixed(1);
    $('selected-total').textContent = uniqueCourses.size;
    $('selected-caption').textContent = `${selected.length} selected`;
    $('conflict-stat').hidden = conflicts.count === 0;
    $('conflict-total').textContent = conflicts.count;
    selectedList.innerHTML = '';
    if (!selected.length) {
      selectedList.innerHTML = '<div class="empty-plan">Choose a subject above or tap a class in the timetable to start building your week.</div>';
      return;
    }
    for (const offering of selected) {
      const course = coursesById.get(offering.courseId);
      const hasClash = conflicts.clashOfferings.has(offering.key);
      const card = document.createElement('article');
      card.className = `selected-card${hasClash ? ' has-clash' : ''}`;
      card.style.cssText = colorStyle(course.id);
      card.innerHTML = `
        <i class="selected-swatch" aria-hidden="true"></i>
        <div class="selected-card-copy">
          <p class="selected-card-title">${escapeHtml(course.name)}</p>
          <div class="selected-card-meta">${course.credits} credits · ${offering.section === 'TBA' ? 'Schedule pending' : `Section ${escapeHtml(offering.section)}`}${hasClash ? ' · <span class="warning-label">Clash detected</span>' : ''}</div>
        </div>
        <button type="button" class="remove-button" aria-label="Remove ${escapeHtml(course.name)}" title="Remove subject">×</button>`;
      card.querySelector('.remove-button').addEventListener('click', () => setOffering(offering, false));
      selectedList.append(card);
    }
  }

  function renderFilters() {
    dayFilters.innerHTML = '';
    for (const day of days) dayFilters.append(makeFilterChip(dayLabels[day], state.days.has(day), () => toggleSet(state.days, day)));
    timeFilters.innerHTML = '';
    for (const time of times) timeFilters.append(makeFilterChip(time, state.times.has(time), () => toggleSet(state.times, time)));
    creditFilters.innerHTML = '';
    for (const credit of [1.5, 3]) creditFilters.append(makeFilterChip(String(credit), state.credits.has(credit), () => toggleSet(state.credits, credit)));
  }

  function makeFilterChip(label, active, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter-chip${active ? ' active' : ''}`;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', action);
    return button;
  }

  function toggleSet(set, key) {
    if (set.has(key)) set.delete(key); else set.add(key);
    render();
  }

  function renderCalendar(conflicts) {
    const activeDays = days.filter((day) => state.days.has(day));
    calendarGrid.style.gridTemplateColumns = `62px repeat(${Math.max(activeDays.length, 1)}, minmax(144px, 1fr))`;
    calendarGrid.innerHTML = '';
    const corner = document.createElement('div');
    corner.className = 'calendar-head';
    corner.textContent = 'TIME';
    calendarGrid.append(corner);
    for (const day of activeDays) {
      const head = document.createElement('div');
      head.className = 'calendar-head';
      head.textContent = day.toUpperCase();
      calendarGrid.append(head);
    }
    if (!activeDays.length) {
      const blank = document.createElement('div');
      blank.className = 'empty-day';
      blank.textContent = 'Select a day to see the weekly schedule.';
      calendarGrid.append(blank);
      return;
    }
    for (const time of times.filter((slot) => state.times.has(slot))) {
      const timeLabel = document.createElement('div');
      timeLabel.className = 'time-cell';
      timeLabel.textContent = time;
      calendarGrid.append(timeLabel);
      for (const day of activeDays) {
        const cell = document.createElement('div');
        cell.className = 'slot-cell';
        const slotEvents = data.events.filter((event) => event.day === day && event.time === time && state.credits.has(coursesById.get(event.courseId).credits));
        const visible = slotEvents.filter((event) => {
          const offeringKey = `${event.courseId}::${event.section || 'A'}`;
          return state.showAll || state.selected.has(offeringKey);
        });
        for (const event of visible) {
          const course = coursesById.get(event.courseId);
          const key = `${event.courseId}::${event.section || 'A'}`;
          const isSelected = state.selected.has(key);
          const hasClash = conflicts.clashOfferings.has(key) && conflicts.clashSlots.has(`${event.day}::${event.time}`);
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `class-card${isSelected ? ' is-selected' : ''}${hasClash ? ' has-clash' : ''}`;
          button.style.cssText = colorStyle(course.id);
          const displayName = state.fullNames || course.name.length < 31 ? course.name : `${course.name.slice(0, 28).trimEnd()}…`;
          button.title = `${course.name} · ${day} ${time} · Section ${event.section} · ${course.credits} credits`;
          button.setAttribute('aria-label', `${isSelected ? 'Remove' : 'Add'} ${course.name}, ${day} at ${time}, section ${event.section}, ${course.credits} credits`);
          button.innerHTML = `<span class="class-card-title">${escapeHtml(displayName)}</span><span class="class-card-meta"><span>${course.credits} credits</span><span class="class-badge">${isSelected ? 'Added' : `Section ${escapeHtml(event.section)}`}${hasClash ? ' · Clash' : ''}</span></span>`;
          button.addEventListener('click', () => toggleOffering(offeringFor(key)));
          cell.append(button);
        }
        calendarGrid.append(cell);
      }
    }
    const visibleClassCount = [...calendarGrid.querySelectorAll('.class-card')].length;
    $('filter-summary').textContent = `${visibleOfferings().length} options · ${visibleClassCount} classes in view`;
  }

  function render() {
    const conflicts = getConflictState();
    $('show-all').checked = state.showAll;
    $('full-names').checked = state.fullNames;
    renderFilters();
    renderCourseList(conflicts);
    renderSelected(conflicts);
    renderCalendar(conflicts);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  $('search').addEventListener('input', (event) => { state.query = event.target.value; render(); });
  $('show-all').addEventListener('change', (event) => { state.showAll = event.target.checked; render(); });
  $('full-names').addEventListener('change', (event) => { state.fullNames = event.target.checked; render(); });
  $('reset-all').addEventListener('click', () => {
    state.selected.clear();
    state.days = new Set(days);
    state.times = new Set(times);
    state.credits = new Set([1.5, 3]);
    state.query = '';
    $('search').value = '';
    savePlan();
    render();
  });
  $('print-plan').addEventListener('click', () => window.print());
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== $('search')) {
      event.preventDefault();
      $('search').focus();
    }
    if (event.key === 'Escape' && document.activeElement === $('search')) {
      $('search').value = '';
      state.query = '';
      render();
      $('search').blur();
    }
  });

  render();
})();
