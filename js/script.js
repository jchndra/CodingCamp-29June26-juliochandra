// ===================================
// AI LifeOS Dashboard - Main JavaScript
// Vanilla JavaScript Implementation
// ===================================

(function() {
    'use strict';

    // ===================================
    // STATE MANAGEMENT
    // ===================================

    const AppState = {
        tasks: [],
        quickLinks: [],
        settings: {
            userName: 'Champion',
            focusDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            darkMode: false
        },
        pomodoro: {
            timeRemaining: 25 * 60,
            isRunning: false,
            currentMode: 'focus',
            sessionCount: 0,
            totalFocusTime: 0
        },
        stats: {
            completedTasks: 0,
            pendingTasks: 0,
            currentStreak: 0,
            productivityScore: 0,
            weeklyProgress: 0
        }
    };

    // ===================================
    // LOCAL STORAGE MANAGER
    // ===================================

    const Storage = {
        save(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (error) {
                console.error('Storage save error:', error);
            }
        },

        load(key, defaultValue = null) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (error) {
                console.error('Storage load error:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('Storage remove error:', error);
            }
        }
    };

    // ===================================
    // TIME & GREETING MODULE
    // ===================================

    const TimeGreeting = {
        init() {
            this.updateClock();
            this.updateGreeting();
            setInterval(() => this.updateClock(), 1000);
            setInterval(() => this.updateGreeting(), 60000); // Update greeting every minute
        },

        updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            const clockElement = document.getElementById('clock');
            if (clockElement) {
                clockElement.textContent = `${hours}:${minutes}:${seconds}`;
            }

            // Update date
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dateString = now.toLocaleDateString('en-US', dateOptions);
            const dateElement = document.getElementById('date');
            if (dateElement) {
                dateElement.textContent = dateString;
            }
        },

        updateGreeting() {
            const hour = new Date().getHours();
            let greeting;

            if (hour >= 5 && hour < 12) {
                greeting = 'Good Morning';
            } else if (hour >= 12 && hour < 17) {
                greeting = 'Good Afternoon';
            } else if (hour >= 17 && hour < 21) {
                greeting = 'Good Evening';
            } else {
                greeting = 'Good Night';
            }

            const greetingElement = document.getElementById('greeting');
            if (greetingElement) {
                greetingElement.textContent = greeting;
            }

            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = AppState.settings.userName;
            }
        }
    };

    // ===================================
    // POMODORO TIMER MODULE
    // ===================================

    const PomodoroTimer = {
        interval: null,
        circumference: 2 * Math.PI * 90, // radius = 90

        init() {
            this.loadState();
            this.updateDisplay();
            this.attachEvents();
            this.updateProgressRing();
        },

        loadState() {
            const savedPomodoro = Storage.load('pomodoro');
            if (savedPomodoro) {
                AppState.pomodoro = { ...AppState.pomodoro, ...savedPomodoro };
            }
            // Reset to current mode duration if not running
            if (!AppState.pomodoro.isRunning) {
                this.resetTimer();
            }
        },

        saveState() {
            Storage.save('pomodoro', AppState.pomodoro);
        },

        attachEvents() {
            document.getElementById('startTimer').addEventListener('click', () => this.start());
            document.getElementById('pauseTimer').addEventListener('click', () => this.pause());
            document.getElementById('resetTimer').addEventListener('click', () => this.reset());

            // Mode buttons
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    const mode = e.target.dataset.mode;
                    this.changeMode(mode);
                });
            });

            // Settings button
            document.getElementById('pomodoroSettings').addEventListener('click', () => {
                Modal.open();
            });
        },

        changeMode(mode) {
            this.pause();
            AppState.pomodoro.currentMode = mode;
            this.resetTimer();
        },

        getDuration() {
            const settings = AppState.settings;
            switch (AppState.pomodoro.currentMode) {
                case 'focus':
                    return settings.focusDuration * 60;
                case 'shortBreak':
                    return settings.shortBreakDuration * 60;
                case 'longBreak':
                    return settings.longBreakDuration * 60;
                default:
                    return 25 * 60;
            }
        },

        start() {
            if (!AppState.pomodoro.isRunning) {
                AppState.pomodoro.isRunning = true;
                this.interval = setInterval(() => this.tick(), 1000);
                this.saveState();
            }
        },

        pause() {
            AppState.pomodoro.isRunning = false;
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
            this.saveState();
        },

        reset() {
            this.pause();
            this.resetTimer();
        },

        resetTimer() {
            AppState.pomodoro.timeRemaining = this.getDuration();
            this.updateDisplay();
            this.updateProgressRing();
            this.saveState();
        },

        tick() {
            if (AppState.pomodoro.timeRemaining > 0) {
                AppState.pomodoro.timeRemaining--;
                this.updateDisplay();
                this.updateProgressRing();

                // Save every 10 seconds to reduce storage calls
                if (AppState.pomodoro.timeRemaining % 10 === 0) {
                    this.saveState();
                }
            } else {
                this.complete();
            }
        },

        complete() {
            this.pause();

            // Increment session count if it was a focus session
            if (AppState.pomodoro.currentMode === 'focus') {
                AppState.pomodoro.sessionCount++;
                AppState.pomodoro.totalFocusTime += AppState.settings.focusDuration;
                this.updateSessionInfo();
                Statistics.update();
            }

            // Play notification (if browser supports)
            this.notify();

            // Reset to mode duration
            this.resetTimer();
            this.saveState();
        },

        notify() {
            // Simple alert for completion
            if (document.hidden) {
                alert(`${AppState.pomodoro.currentMode} session complete!`);
            }
        },

        updateDisplay() {
            const minutes = Math.floor(AppState.pomodoro.timeRemaining / 60);
            const seconds = AppState.pomodoro.timeRemaining % 60;
            const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            const timerDisplay = document.getElementById('timerDisplay');
            if (timerDisplay) {
                timerDisplay.textContent = display;
            }
        },

        updateProgressRing() {
            const totalDuration = this.getDuration();
            const progress = AppState.pomodoro.timeRemaining / totalDuration;
            const offset = this.circumference * (1 - progress);

            const circle = document.getElementById('progressCircle');
            if (circle) {
                circle.style.strokeDashoffset = offset;
            }
        },

        updateSessionInfo() {
            const sessionCountEl = document.getElementById('sessionCount');
            if (sessionCountEl) {
                sessionCountEl.textContent = AppState.pomodoro.sessionCount;
            }

            const hours = Math.floor(AppState.pomodoro.totalFocusTime / 60);
            const minutes = AppState.pomodoro.totalFocusTime % 60;
            const focusTimeEl = document.getElementById('focusTime');
            if (focusTimeEl) {
                focusTimeEl.textContent = `${hours}h ${minutes}m`;
            }
        }
    };

    // ===================================
    // TASK MANAGER MODULE
    // ===================================

    const TaskManager = {
        currentFilter: 'all',
        currentSearchTerm: '',
        sortBy: 'dateAdded',
        editingTaskId: null,

        init() {
            this.loadTasks();
            this.render();
            this.attachEvents();
        },

        loadTasks() {
            AppState.tasks = Storage.load('tasks', []);
        },

        saveTasks() {
            Storage.save('tasks', AppState.tasks);
        },

        attachEvents() {
            // Add task
            document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
            document.getElementById('taskInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addTask();
            });

            // Search and filter
            document.getElementById('taskSearch').addEventListener('input', (e) => {
                this.currentSearchTerm = e.target.value.toLowerCase();
                this.render();
            });

            document.getElementById('taskFilter').addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.render();
            });

            // Sort button
            document.getElementById('taskSort').addEventListener('click', () => this.toggleSort());
        },

        addTask() {
            const input = document.getElementById('taskInput');
            const taskText = input.value.trim();

            if (!taskText) {
                alert('Please enter a task');
                return;
            }

            // Check for duplicates
            const isDuplicate = AppState.tasks.some(task =>
                task.text.toLowerCase() === taskText.toLowerCase() && !task.completed
            );

            if (isDuplicate) {
                alert('This task already exists!');
                return;
            }

            const task = {
                id: Date.now(),
                text: taskText,
                completed: false,
                priority: document.getElementById('taskPriority').value,
                category: document.getElementById('taskCategory').value,
                createdAt: new Date().toISOString()
            };

            AppState.tasks.unshift(task);
            this.saveTasks();
            this.render();
            Statistics.update();

            // Clear input
            input.value = '';
            input.focus();
        },

        deleteTask(id) {
            if (confirm('Are you sure you want to delete this task?')) {
                AppState.tasks = AppState.tasks.filter(task => task.id !== id);
                this.saveTasks();
                this.render();
                Statistics.update();
            }
        },

        toggleTask(id) {
            const task = AppState.tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                task.completedAt = task.completed ? new Date().toISOString() : null;
                this.saveTasks();
                this.render();
                Statistics.update();
            }
        },

        editTask(id) {
            const task = AppState.tasks.find(t => t.id === id);
            if (task) {
                this.editingTaskId = id;
                this.render();
            }
        },

        saveEdit(id, newText) {
            const task = AppState.tasks.find(t => t.id === id);
            if (task && newText.trim()) {
                task.text = newText.trim();
                this.saveTasks();
            }
            this.editingTaskId = null;
            this.render();
        },

        cancelEdit() {
            this.editingTaskId = null;
            this.render();
        },

        toggleSort() {
            const sortOptions = ['dateAdded', 'priority', 'status'];
            const currentIndex = sortOptions.indexOf(this.sortBy);
            this.sortBy = sortOptions[(currentIndex + 1) % sortOptions.length];
            this.render();
        },

        getFilteredTasks() {
            let filtered = [...AppState.tasks];

            // Apply search filter
            if (this.currentSearchTerm) {
                filtered = filtered.filter(task =>
                    task.text.toLowerCase().includes(this.currentSearchTerm) ||
                    task.category.toLowerCase().includes(this.currentSearchTerm) ||
                    task.priority.toLowerCase().includes(this.currentSearchTerm)
                );
            }

            // Apply status filter
            if (this.currentFilter === 'active') {
                filtered = filtered.filter(task => !task.completed);
            } else if (this.currentFilter === 'completed') {
                filtered = filtered.filter(task => task.completed);
            }

            // Apply sorting
            filtered.sort((a, b) => {
                if (this.sortBy === 'dateAdded') {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                } else if (this.sortBy === 'priority') {
                    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                } else if (this.sortBy === 'status') {
                    return a.completed - b.completed;
                }
                return 0;
            });

            return filtered;
        },

        render() {
            const taskList = document.getElementById('taskList');
            if (!taskList) return;

            const tasks = this.getFilteredTasks();

            if (tasks.length === 0) {
                taskList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-tertiary);">No tasks found</div>';
                return;
            }

            taskList.innerHTML = tasks.map(task => {
                if (this.editingTaskId === task.id) {
                    return `
                        <div class="task-item priority-${task.priority}">
                            <input
                                type="text"
                                class="task-edit-input"
                                value="${this.escapeHtml(task.text)}"
                                id="editInput-${task.id}"
                                autofocus
                            >
                            <div class="task-actions">
                                <button class="btn-edit" onclick="TaskManager.saveEdit(${task.id}, document.getElementById('editInput-${task.id}').value)">Save</button>
                                <button class="btn-delete" onclick="TaskManager.cancelEdit()">Cancel</button>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''}">
                        <input
                            type="checkbox"
                            class="task-checkbox"
                            ${task.completed ? 'checked' : ''}
                            onchange="TaskManager.toggleTask(${task.id})"
                        >
                        <div class="task-content">
                            <div class="task-text">${this.escapeHtml(task.text)}</div>
                            <div class="task-meta">
                                <span class="task-priority">${this.capitalize(task.priority)}</span>
                                <span class="task-category">${this.capitalize(task.category)}</span>
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="btn-edit" onclick="TaskManager.editTask(${task.id})">Edit</button>
                            <button class="btn-delete" onclick="TaskManager.deleteTask(${task.id})">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        },

        escapeHtml(text) {
            if (!text) return '';
            return text.toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }, // <-- Perhatikan ada koma di sini karena di bawahnya masih ada fungsi capitalize()

        capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
    };

    // ===================================
    // QUICK LINKS MODULE
    // ===================================

    const QuickLinks = {
        init() {
            this.loadLinks();
            this.render();
            this.attachEvents();
        },

        loadLinks() {
            AppState.quickLinks = Storage.load('quickLinks', []);
        },

        saveLinks() {
            Storage.save('quickLinks', AppState.quickLinks);
        },

        attachEvents() {
            document.getElementById('addLinkBtn').addEventListener('click', () => this.showInput());
            document.getElementById('saveLinkBtn').addEventListener('click', () => this.addLink());
            document.getElementById('cancelLinkBtn').addEventListener('click', () => this.hideInput());
        },

        showInput() {
            document.getElementById('quicklinksInput').style.display = 'block';
            document.getElementById('linkTitle').focus();
        },

        hideInput() {
            document.getElementById('quicklinksInput').style.display = 'none';
            document.getElementById('linkTitle').value = '';
            document.getElementById('linkUrl').value = '';
        },

        addLink() {
            const title = document.getElementById('linkTitle').value.trim();
            let url = document.getElementById('linkUrl').value.trim();

            if (!title || !url) {
                alert('Please enter both title and URL');
                return;
            }

            // Perbaikan Logika: Auto-tambah 'https://' jika user lupa mengetiknya
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            const link = {
                id: Date.now(),
                title,
                url,
                icon: this.getIcon(url)
            };

            AppState.quickLinks.push(link);
            this.saveLinks();
            this.render();
            this.hideInput();
        },

        deleteLink(id) {
            if (confirm('Delete this quick link?')) {
                AppState.quickLinks = AppState.quickLinks.filter(link => link.id !== id);
                this.saveLinks();
                this.render();
            }
        },

        getIcon(url) {
            // Simple icon mapping based on domain
            if (url.includes('github.com')) return '💻';
            if (url.includes('gmail.com') || url.includes('mail')) return '📧';
            if (url.includes('youtube.com')) return '▶️';
            if (url.includes('spotify.com')) return '🎵';
            if (url.includes('linkedin.com')) return '💼';
            if (url.includes('twitter.com')) return '🐦';
            if (url.includes('facebook.com')) return '👥';
            if (url.includes('instagram.com')) return '📷';
            return '🔗';
        },

        openLink(url) {
            window.open(url, '_blank');
        },

        render() {
            const linksList = document.getElementById('quicklinksList');
            if (!linksList) return;

            if (AppState.quickLinks.length === 0) {
                linksList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-tertiary); grid-column: 1 / -1;">No quick links yet</div>';
                return;
            }

            linksList.innerHTML = AppState.quickLinks.map(link => `
                <div class="quicklink-item" onclick="QuickLinks.openLink('${link.url}')">
                    <button class="quicklink-delete" onclick="event.stopPropagation(); QuickLinks.deleteLink(${link.id})">✕</button>
                    <div class="quicklink-icon">${link.icon}</div>
                    <div class="quicklink-title">${this.escapeHtml(link.title)}</div>
                </div>
            `).join('');
        },

        render() {
            const linksList = document.getElementById('quicklinksList');
            if (!linksList) return;

            if (AppState.quickLinks.length === 0) {
                linksList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-tertiary); grid-column: 1 / -1;">No quick links yet</div>';
                return;
            }

            linksList.innerHTML = AppState.quickLinks.map(link => `
                <div class="quicklink-item" onclick="QuickLinks.openLink('${link.url}')">
                    <button class="quicklink-delete" onclick="event.stopPropagation(); QuickLinks.deleteLink(${link.id})">✕</button>
                    <div class="quicklink-icon">${link.icon}</div>
                    <div class="quicklink-title">${this.escapeHtml(link.title)}</div>
                </div>
            `).join('');
        },

        escapeHtml(text) {
            if (!text) return '';
            return text.toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    };

    // ===================================
    // STATISTICS MODULE
    // ===================================

    const Statistics = {
        init() {
            this.update();
        },

        update() {
            this.calculateStats();
            this.render();
        },

        calculateStats() {
            const tasks = AppState.tasks;
            const completed = tasks.filter(t => t.completed).length;
            const pending = tasks.filter(t => !t.completed).length;
            const total = tasks.length;

            AppState.stats.completedTasks = completed;
            AppState.stats.pendingTasks = pending;
            AppState.stats.productivityScore = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Calculate streak (simplified - based on consecutive completed tasks)
            this.calculateStreak();

            // Calculate weekly progress (last 7 days)
            this.calculateWeeklyProgress();
        },

        calculateStreak() {
    const completedTasks = AppState.tasks
        .filter(t => t.completed && t.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    if (completedTasks.length === 0) {
        AppState.stats.currentStreak = 0;
        return;
    }

    // Ekstrak tanggal penyelesaian yang unik (tanpa jam)
    const uniqueDates = [...new Set(completedTasks.map(t => {
        const d = new Date(t.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }))];

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    for (let timestamp of uniqueDates) {
        const daysDiff = Math.floor((todayTime - timestamp) / (1000 * 60 * 60 * 24));

        if (daysDiff === streak) {
            streak++;
        } else if (daysDiff > streak) {
            break;
        }
    }

    AppState.stats.currentStreak = streak;
},

        calculateWeeklyProgress() {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const weekTasks = AppState.tasks.filter(task => {
                const createdDate = new Date(task.createdAt);
                return createdDate >= weekAgo;
            });

            const weekCompleted = weekTasks.filter(t => t.completed).length;
            const weekTotal = weekTasks.length;

            AppState.stats.weeklyProgress = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
        },

        render() {
            // Update stat values
            this.updateElement('completedTasks', AppState.stats.completedTasks);
            this.updateElement('pendingTasks', AppState.stats.pendingTasks);
            this.updateElement('currentStreak', AppState.stats.currentStreak);
            this.updateElement('productivityScore', AppState.stats.productivityScore + '%');
            this.updateElement('weeklyProgress', AppState.stats.weeklyProgress + '%');

            // Update progress bar
            const progressBar = document.getElementById('weeklyProgressBar');
            if (progressBar) {
                progressBar.style.width = AppState.stats.weeklyProgress + '%';
            }
        },

        updateElement(id, value) {
            const element = document.getElementById(id);
            if (element) {
                // Animate number change
                const currentValue = parseInt(element.textContent) || 0;
                this.animateValue(element, currentValue, value);
            }
        },

        animateValue(element, start, end) {
            const duration = 500;
            const startTime = performance.now();
            const endValue = typeof end === 'string' ? parseInt(end) : end;
            const suffix = typeof end === 'string' && end.includes('%') ? '%' : '';

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const current = Math.floor(start + (endValue - start) * progress);
                element.textContent = current + suffix;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }
    };

    // ===================================
    // THEME MODULE
    // ===================================

    const Theme = {
        init() {
            this.loadTheme();
            this.attachEvents();
        },

        loadTheme() {
            const darkMode = Storage.load('darkMode', false);
            AppState.settings.darkMode = darkMode;
            if (darkMode) {
                document.body.classList.add('dark-mode');
            }
        },

        toggle() {
            AppState.settings.darkMode = !AppState.settings.darkMode;
            document.body.classList.toggle('dark-mode');
            Storage.save('darkMode', AppState.settings.darkMode);
        },

        attachEvents() {
            document.getElementById('themeToggle').addEventListener('click', () => this.toggle());
        }
    };

    // ===================================
    // MODAL / SETTINGS MODULE
    // ===================================

    const Modal = {
        init() {
            this.attachEvents();
        },

        attachEvents() {
            document.getElementById('settingsBtn').addEventListener('click', () => this.open());
            document.getElementById('closeSettings').addEventListener('click', () => this.close());
            document.getElementById('saveSettings').addEventListener('click', () => this.save());

            // Close on outside click
            document.getElementById('settingsModal').addEventListener('click', (e) => {
                if (e.target.id === 'settingsModal') {
                    this.close();
                }
            });
        },

        open() {
            // Load current settings
            document.getElementById('userNameInput').value = AppState.settings.userName;
            document.getElementById('focusDuration').value = AppState.settings.focusDuration;
            document.getElementById('shortBreakDuration').value = AppState.settings.shortBreakDuration;
            document.getElementById('longBreakDuration').value = AppState.settings.longBreakDuration;

            document.getElementById('settingsModal').style.display = 'flex';
        },

        close() {
            document.getElementById('settingsModal').style.display = 'none';
        },

        save() {
            AppState.settings.userName = document.getElementById('userNameInput').value.trim() || 'Champion';
            AppState.settings.focusDuration = parseInt(document.getElementById('focusDuration').value) || 25;
            AppState.settings.shortBreakDuration = parseInt(document.getElementById('shortBreakDuration').value) || 5;
            AppState.settings.longBreakDuration = parseInt(document.getElementById('longBreakDuration').value) || 15;

            Storage.save('settings', AppState.settings);
            TimeGreeting.updateGreeting();
            PomodoroTimer.resetTimer();
            this.close();
        }
    };

    // ===================================
    // INITIALIZE APP
    // ===================================

    function initApp() {
        // Load settings first
        const savedSettings = Storage.load('settings');
        if (savedSettings) {
            AppState.settings = { ...AppState.settings, ...savedSettings };
        }

        // Initialize all modules
        TimeGreeting.init();
        Theme.init();
        PomodoroTimer.init();
        TaskManager.init();
        QuickLinks.init();
        Statistics.init();
        Modal.init();

        // Update session info from saved state
        PomodoroTimer.updateSessionInfo();

        // Initialize progress ring
        const progressCircle = document.getElementById('progressCircle');
        if (progressCircle) {
            progressCircle.style.strokeDasharray = `${PomodoroTimer.circumference} ${PomodoroTimer.circumference}`;
        }

        console.log('AI LifeOS Dashboard initialized successfully');
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // Expose modules to window for onclick handlers
    window.TaskManager = TaskManager;
    window.QuickLinks = QuickLinks;

})();
