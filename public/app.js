class OrganizationApp {
    constructor() {
        this.goals = [];
        this.timeBlocks = [];
        this.analytics = {};
        this.categories = [];
        this.currentEditingGoal = null;
        this.currentEditingCategoryId = null;

        this.initializeApp();
    }

    async initializeApp() {
        await this.loadData();
        this.setupEventListeners();
        this.renderCategoriesGrid();
        this.updateCategorySelect();
        this.updateTodoCategorySelect();
        this.renderGoals();
        this.renderTodoList();
        this.setupTodoEventListeners(); // Set up listeners during initialization
        this.initializeCalendar();
    }

    async loadData() {
        try {
            console.log('Loading data from server...');
            const response = await fetch('/api/goals');
            this.goals = await response.json();
            console.log('Loaded goals:', this.goals);

            const timeBlocksResponse = await fetch('/api/timeblocks');
            this.timeBlocks = await timeBlocksResponse.json();

            const analyticsResponse = await fetch('/api/analytics');
            this.analytics = await analyticsResponse.json();

            const categoriesResponse = await fetch('/api/categories');
            this.categories = await categoriesResponse.json();
            console.log('Loaded categories:', this.categories);

            // Clean up inconsistent data
            await this.cleanupInconsistentData();
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    async cleanupInconsistentData() {
        let needsUpdate = false;

        for (const goal of this.goals) {
            let goalUpdated = false;

            // Fix goals with progress=1 but status='active'
            if (goal.progress === 1 && goal.status !== 'completed') {
                goal.status = 'completed';
                goal.completedAt = goal.completedAt || new Date().toISOString();
                goalUpdated = true;
            }

            // Fix goals with progress<1 but status='completed'
            if (goal.progress < 1 && goal.status === 'completed') {
                goal.status = 'active';
                goal.completedAt = null;
                goalUpdated = true;
            }

            if (goalUpdated) {
                needsUpdate = true;
                console.log(`Fixing inconsistent goal: ${goal.title}`);
                try {
                    await fetch(`/api/goals/${goal.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(goal)
                    });
                } catch (error) {
                    console.error(`Failed to fix goal ${goal.id}:`, error);
                }
            }
        }

        if (needsUpdate) {
            console.log('Data cleanup complete, reloading...');
            const response = await fetch('/api/goals');
            this.goals = await response.json();
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.id.replace('-tab', '')));
        });

        document.getElementById('add-goal-btn').addEventListener('click', () => this.openGoalModal());
        document.getElementById('add-category-btn').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('goal-form').addEventListener('submit', (e) => this.handleGoalSubmit(e));
        document.getElementById('category-form').addEventListener('submit', (e) => this.handleCategorySubmit(e));
        document.getElementById('edit-category-form').addEventListener('submit', (e) => this.handleEditCategorySubmit(e));
        document.querySelector('.close').addEventListener('click', () => this.closeGoalModal());
        document.getElementById('add-subtask-btn').addEventListener('click', () => this.addSubtaskInput());
        
        // Todo form listener will be set up when tab is accessed
        
        // Progress slider update
        document.getElementById('goal-progress').addEventListener('input', (e) => {
            document.getElementById('progress-display').textContent = e.target.value + '%';
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('goal-modal')) {
                this.closeGoalModal();
            }
            if (e.target === document.getElementById('category-modal')) {
                this.closeCategoryModal();
            }
            if (e.target === document.getElementById('edit-category-modal')) {
                this.closeEditCategoryModal();
            }
        });
    }

    openEditCategoryModal(categoryId) {
        this.currentEditingCategoryId = categoryId;
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;

        document.getElementById('edit-category-name').value = category.name;
        document.getElementById('edit-category-color').value = category.color;
        document.getElementById('edit-category-modal').style.display = 'block';
    }

    closeEditCategoryModal() {
        document.getElementById('edit-category-modal').style.display = 'none';
        this.currentEditingCategoryId = null;
    }

    async handleEditCategorySubmit(e) {
        e.preventDefault();

        if (!this.currentEditingCategoryId) return;

        const updatedCategory = {
            id: this.currentEditingCategoryId,
            name: document.getElementById('edit-category-name').value,
            color: document.getElementById('edit-category-color').value
        };

        try {
            const response = await fetch(`/api/categories/${this.currentEditingCategoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCategory)
            });

            if (response.ok) {
                await this.loadData();
                this.renderCategoriesGrid();
                this.updateCategorySelect();
                this.renderGoals();
                this.closeEditCategoryModal();
                document.getElementById('edit-category-form').reset();
            }
        } catch (error) {
            console.error('Failed to update category:', error);
        }
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        document.getElementById(`${tab}-tab`).classList.add('active');
        document.getElementById(`${tab}-section`).classList.add('active');

        if (tab === 'calendar') {
            setTimeout(() => this.calendar?.render(), 100);
        } else if (tab === 'analytics') {
            this.renderAnalytics();
        } else if (tab === 'weekly') {
            this.renderWeeklyPlan();
        } else if (tab === 'todo') {
            this.renderTodoList();
            this.setupTodoEventListeners();
        } else if (tab === 'completed') {
            this.renderCompletedGoals();
        }
    }

    openGoalModal(goal = null) {
        this.currentEditingGoal = goal;
        const modal = document.getElementById('goal-modal');
        const form = document.getElementById('goal-form');

        if (goal) {
            document.getElementById('modal-title').textContent = 'Edit Goal';
            document.getElementById('goal-title').value = goal.title;
            document.getElementById('goal-category').value = goal.category;
            document.getElementById('goal-description').value = goal.description || '';
            document.getElementById('goal-due-date').value = goal.dueDate || '';
            document.getElementById('goal-progress').value = (goal?.progress || 0) * 100;
            document.getElementById('progress-display').textContent = Math.round((goal?.progress || 0) * 100);
            this.renderSubtasksInModal(goal.subtasks || []);
        } else {
            document.getElementById('modal-title').textContent = 'Add Goal';
            form.reset();
            this.clearSubtasks();
        }

        modal.style.display = 'block';
    }

    openGoalModalForCategory(categoryId) {
        this.currentEditingGoal = null;
        const modal = document.getElementById('goal-modal');
        const form = document.getElementById('goal-form');

        document.getElementById('modal-title').textContent = 'Add Goal';
        form.reset();
        this.clearSubtasks();

        // Pre-select the category
        document.getElementById('goal-category').value = categoryId;

        modal.style.display = 'block';
    }

    closeGoalModal() {
        document.getElementById('goal-modal').style.display = 'none';
        this.currentEditingGoal = null;
    }

    openCategoryModal() {
        document.getElementById('category-modal').style.display = 'block';
    }

    closeCategoryModal() {
        document.getElementById('category-modal').style.display = 'none';
    }

    async handleCategorySubmit(e) {
        e.preventDefault();

        const categoryData = {
            name: document.getElementById('category-name').value,
            color: document.getElementById('category-color').value
        };

        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            });

            if (response.ok) {
                await this.loadData();
                this.renderCategoriesGrid();
                this.updateCategorySelect();
                this.renderGoals();
                this.closeCategoryModal();
                document.getElementById('category-form').reset();
            }
        } catch (error) {
            console.error('Failed to save category:', error);
        }
    }

    addSubtaskInput(subtask = null) {
        const container = document.getElementById('subtasks-list');
        const subtaskDiv = document.createElement('div');
        subtaskDiv.className = 'subtask-form';
        subtaskDiv.innerHTML = `
            <input type="text" placeholder="Subtask title" value="${subtask?.title || ''}" required>
            <input type="date" value="${subtask?.dueDate || ''}">
            <button type="button" onclick="this.parentElement.remove()">Remove</button>
        `;
        container.appendChild(subtaskDiv);
    }

    clearSubtasks() {
        document.getElementById('subtasks-list').innerHTML = '';
    }

    renderSubtasksInModal(subtasks) {
        this.clearSubtasks();
        subtasks.forEach(subtask => this.addSubtaskInput(subtask));
    }

    async handleGoalSubmit(e) {
        e.preventDefault();
        
        
        const formData = new FormData(e.target);
        const subtasks = Array.from(document.querySelectorAll('.subtask-form')).map(div => {
            const inputs = div.querySelectorAll('input');
            return {
                id: Date.now().toString() + Math.random(),
                title: inputs[0].value,
                dueDate: inputs[1].value || null,
                completed: false,
                notes: ''
            };
        }).filter(subtask => subtask.title.trim());

        const goalData = {
            title: document.getElementById('goal-title').value,
            category: document.getElementById('goal-category').value,
            description: document.getElementById('goal-description').value,
            priority: 'medium',
            dueDate: document.getElementById('goal-due-date').value || null,
            progress: document.getElementById('goal-progress').value / 100,
            subtasks: subtasks,
            status: 'active'
        };

        try {
            let response;
            if (this.currentEditingGoal) {
                response = await fetch(`/api/goals/${this.currentEditingGoal.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(goalData)
                });
            } else {
                response = await fetch('/api/goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(goalData)
                });
            }
            
            if (response.ok) {
                await this.loadData();
                this.renderGoals();
                this.updateCategorySelect();
                this.closeGoalModal();
            }
        } catch (error) {
            console.error('Failed to save goal:', error);
        }
    }

    calculateProgress(goal) {
        // If goal has subtasks, calculate from completion
        if (goal.subtasks && goal.subtasks.length > 0) {
            const completed = goal.subtasks.filter(subtask => subtask.completed).length;
            return completed / goal.subtasks.length;
        }
        // Otherwise use manual progress
        return goal.progress || 0;
    }

    async updateGoalProgress(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        goal.progress = this.calculateProgress(goal);

        if (goal.progress === 1 && goal.status !== 'completed') {
            goal.status = 'completed';
            goal.completedAt = new Date().toISOString();
        } else if (goal.progress < 1 && goal.status === 'completed') {
            goal.status = 'active';
            goal.completedAt = null;
        }

        try {
            await fetch(`/api/goals/${goalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });
            await this.loadData();
            this.renderGoals();
            this.renderCompletedGoals();
            this.renderTodoList();
        } catch (error) {
            console.error('Failed to update goal:', error);
        }
    }

    async updateProgress(goalId, newPercent) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        // Don't allow manual progress updates if goal has subtasks
        if (goal.subtasks && goal.subtasks.length > 0) {
            alert('Progress is automatically calculated from subtasks. Complete subtasks to update progress.');
            this.renderGoals();
            return;
        }

        goal.progress = newPercent / 100;

        // Mark as completed if 100%
        if (goal.progress === 1 && goal.status !== 'completed') {
            goal.status = 'completed';
            goal.completedAt = new Date().toISOString();
        } else if (goal.progress < 1 && goal.status === 'completed') {
            goal.status = 'active';
            goal.completedAt = null;
        }

        try {
            await fetch(`/api/goals/${goalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });
            await this.loadData();
            this.renderGoals();
            this.renderCompletedGoals();
            this.renderTodoList();
        } catch (error) {
            console.error('Failed to update progress:', error);
        }
    }

    async toggleSubtask(goalId, subtaskId) {
        const goal = this.goals.find(g => g.id === goalId);
        const subtask = goal.subtasks.find(s => s.id === subtaskId);
        subtask.completed = !subtask.completed;
        
        await this.updateGoalProgress(goalId);
    }

    renderCategoriesGrid() {
        const categoriesGrid = document.querySelector('.categories-grid');
        categoriesGrid.innerHTML = this.categories.map(category => `
            <div class="category" data-category="${category.id}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin-bottom: 0;">${category.name}</h3>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-secondary" onclick="app.openEditCategoryModal('${category.id}')" style="font-size: 0.85em; padding: 6px 12px;">Edit</button>
                        <button class="btn-secondary" onclick="app.openGoalModalForCategory('${category.id}')" style="font-size: 0.85em; padding: 6px 12px;">+ Add Goal</button>
                    </div>
                </div>
                <div class="goals-list" id="${category.id}-goals"></div>
            </div>
        `).join('');
    }

    updateCategorySelect() {
        const categorySelect = document.getElementById('goal-category');
        const currentValue = categorySelect.value;
        categorySelect.innerHTML = `
            <option value="">Select category</option>
            ${this.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
        `;
        if (currentValue) categorySelect.value = currentValue;
    }

    renderGoals() {
        this.categories.forEach(category => {
            const container = document.getElementById(`${category.id}-goals`);
            if (container) {
                const categoryGoals = this.goals.filter(goal => goal.category === category.id && goal.status === 'active');
                container.innerHTML = categoryGoals.map(goal => this.renderGoalItem(goal)).join('');
                this.setupDragAndDrop(container);
            }
        });
    }

    setupDragAndDrop(container) {
        const goalItems = container.querySelectorAll('.goal-item');

        goalItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.innerHTML);
                e.dataTransfer.setData('goalId', e.target.getAttribute('data-goal-id'));
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', (e) => {
            if (e.target === container) {
                container.classList.remove('drag-over');
            }
        });

        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');

            const goalId = e.dataTransfer.getData('goalId');
            const newCategoryId = container.id.replace('-goals', '');

            await this.moveGoalToCategory(goalId, newCategoryId);
        });
    }

    async moveGoalToCategory(goalId, newCategoryId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal || goal.category === newCategoryId) return;

        goal.category = newCategoryId;

        try {
            await fetch(`/api/goals/${goalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });
            await this.loadData();
            this.renderGoals();
            this.renderTodoList();
        } catch (error) {
            console.error('Failed to move goal:', error);
        }
    }

    renderCompletedGoals() {
        const completedContainer = document.getElementById('completed-goals-list');
        const completedGoals = this.goals.filter(goal => goal.status === 'completed');
        completedContainer.innerHTML = completedGoals.map(goal => this.renderGoalItem(goal, true)).join('');
    }

    renderGoalItem(goal, isCompleted = false) {
        const progress = goal.progress || this.calculateProgress(goal);
        const progressPercent = Math.round(progress * 100);

        return `
            <div class="goal-item ${isCompleted ? 'completed' : ''} priority-${goal.priority}" data-goal-id="${goal.id}" draggable="true">
                <div class="goal-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" ${isCompleted ? 'checked' : ''}
                               onchange="app.completeGoal('${goal.id}')"
                               style="width: 18px; height: 18px; cursor: pointer;">
                        <div class="goal-title">${goal.title}</div>
                    </div>
                    <div class="goal-meta">
                        ${goal.dueDate ? `<span>Due: ${new Date(goal.dueDate).toLocaleDateString()}</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px;">
                        <button class="btn-secondary" onclick="app.openGoalModal(app.goals.find(g => g.id === '${goal.id}'))" style="font-size: 0.8em; padding: 4px 10px;">Edit</button>
                        <button class="btn-secondary" onclick="app.deleteGoal('${goal.id}')" style="font-size: 0.8em; padding: 4px 10px;">Delete</button>
                    </div>
                </div>
                
                <div class="progress-controls">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                     </div>
                    <input type="number" min="0" max="100" value="${progressPercent}" 
                        onchange="app.updateProgress('${goal.id}', this.value)">
                    <span>${progressPercent}% complete</span>
                </div>
                
                ${goal.description ? `<p style="margin-bottom: 12px; color: #666;">${goal.description}</p>` : ''}
                
                ${goal.subtasks && goal.subtasks.length > 0 ? `
                    <div class="subtasks">
                        ${goal.subtasks.map(subtask => `
                            <div class="subtask">
                                <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                       onchange="app.toggleSubtask('${goal.id}', '${subtask.id}')">
                                <span style="${subtask.completed ? 'text-decoration: line-through; color: #666;' : ''}">${subtask.title}</span>
                                ${subtask.dueDate ? `<span style="font-size: 0.8em; color: #999;">Due: ${new Date(subtask.dueDate).toLocaleDateString()}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${goal.notes ? `<div style="margin-top: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 0.9em;">${goal.notes}</div>` : ''}
            </div>
        `;
    }

    async initializeCalendar() {
        const calendarEl = document.getElementById('calendar');

        // Combine time blocks and synced calendar events
        const allEvents = this.timeBlocks.map(block => ({
            id: block.id,
            title: block.title,
            start: block.startTime,
            end: block.endTime,
            backgroundColor: this.getCategoryColor(block.category),
            extendedProps: { source: 'manual', editable: true }
        }));

        // Load synced Google Calendar events
        try {
            const response = await fetch('/api/calendar/events');
            const { events } = await response.json();

            const syncedEvents = events.map(event => ({
                id: event.id,
                title: event.title,
                start: event.startTime,
                end: event.endTime,
                allDay: event.allDay,
                backgroundColor: this.getCategoryColor(event.category),
                borderColor: '#666',
                extendedProps: { source: 'google_calendar', editable: false }
            }));

            allEvents.push(...syncedEvents);
        } catch (error) {
            console.error('Failed to load synced calendar events:', error);
        }

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: allEvents,
            editable: true,
            selectable: true,
            select: (info) => this.handleTimeBlockCreate(info),
            eventClick: (info) => this.handleTimeBlockClick(info),
            eventAllow: (dropInfo, draggedEvent) => {
                // Only allow manual events to be dragged, not synced events
                return draggedEvent.extendedProps.source === 'manual';
            }
        });

        this.calendar.render();
    }

    getCategoryColor(category) {
        const categoryObj = this.categories.find(cat => cat.id === category);
        return categoryObj?.color || '#007AFF';
    }

    handleTimeBlockCreate(info) {
        const goalId = prompt('Enter goal ID for this time block (or leave empty):');
        const title = prompt('Enter title for this time block:');
        
        if (title) {
            const timeBlock = {
                goalId: goalId || null,
                title: title,
                startTime: info.startStr,
                endTime: info.endStr,
                planned: true,
                category: goalId ? this.goals.find(g => g.id === goalId)?.category : 'general'
            };
            
            this.createTimeBlock(timeBlock);
        }
    }

    async createTimeBlock(timeBlock) {
        try {
            const response = await fetch('/api/timeblocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(timeBlock)
            });

            if (response.ok) {
                const savedBlock = await response.json();
                this.timeBlocks.push(savedBlock);

                // Add event to calendar
                this.calendar.addEvent({
                    id: savedBlock.id,
                    title: savedBlock.title,
                    start: savedBlock.startTime,
                    end: savedBlock.endTime,
                    backgroundColor: this.getCategoryColor(savedBlock.category)
                });
            }
        } catch (error) {
            console.error('Failed to create time block:', error);
        }
    }

    handleTimeBlockClick(info) {
        const accomplishment = prompt('What did you accomplish in this time block?');
        const rating = prompt('Rate your productivity (1-10):');
        
        if (accomplishment && rating) {
            // Update time block with accomplishment notes and rating
            console.log('Time block completed:', { accomplishment, rating });
        }
    }

    renderWeeklyPlan() {
        const weeklyContainer = document.getElementById('weekly-plan');
        const activeGoals = this.goals.filter(goal => goal.status === 'active');
        
        weeklyContainer.innerHTML = `
            <h3>This Week's Focus</h3>
            <div class="week-overview">
                ${activeGoals.map(goal => `
                    <div class="week-goal">
                        <h4>${goal.title}</h4>
                        <div class="hours-display">Planned: 0h | Actual: 0h</div>
                        <div>Progress: ${Math.round((goal.progress || 0) * 100)}%</div>
                    </div>
                `).join('')}
            </div>
            <button class="btn-primary">Generate Weekly Plan</button>
        `;
    }

    async renderAnalytics() {
        // Check calendar connection status
        await this.updateCalendarStatus();

        // Load and display time analytics
        await this.loadTimeAnalytics();

        // Initialize weekly breakdown
        this.initWeeklyBreakdown();

        // Render general analytics
        const analyticsContainer = document.getElementById('analytics-content');
        analyticsContainer.innerHTML = `
            <div class="productivity-chart">
                <h3>Productivity Patterns</h3>
                <p>Analytics will be generated based on your completed time blocks.</p>
                <div style="margin-top: 20px;">
                    <h4>Quick Stats</h4>
                    <p>Active Goals: ${this.goals.filter(g => g.status === 'active').length}</p>
                    <p>Completed Goals: ${this.goals.filter(g => g.status === 'completed').length}</p>
                    <p>Total Time Blocks: ${this.timeBlocks.length}</p>
                </div>
            </div>
        `;
    }

    async updateCalendarStatus() {
        try {
            const response = await fetch('/api/auth/google/status');
            const { connected } = await response.json();

            const statusDiv = document.getElementById('calendar-status');
            const controlsDiv = document.getElementById('calendar-controls');

            if (connected) {
                statusDiv.innerHTML = '<p class="status-connected">✓ Connected to Google Calendar</p>';
                controlsDiv.innerHTML = `
                    <button id="sync-calendar-btn" class="btn-primary">Sync Calendar</button>
                    <button id="disconnect-calendar-btn" class="btn-secondary">Disconnect</button>
                `;

                document.getElementById('sync-calendar-btn').addEventListener('click', () => this.syncCalendar());
                document.getElementById('disconnect-calendar-btn').addEventListener('click', () => this.disconnectCalendar());
            } else {
                statusDiv.innerHTML = '<p class="status-disconnected">Not connected to Google Calendar</p>';
                controlsDiv.innerHTML = `
                    <button id="connect-calendar-btn" class="btn-primary">Connect Google Calendar</button>
                    <p class="calendar-help">Connect your Google Calendar to automatically track time spent on activities.</p>
                `;

                document.getElementById('connect-calendar-btn').addEventListener('click', () => this.connectCalendar());
            }
        } catch (error) {
            console.error('Failed to check calendar status:', error);
        }
    }

    async connectCalendar() {
        try {
            const response = await fetch('/api/auth/google');
            const { authUrl } = await response.json();
            window.location.href = authUrl;
        } catch (error) {
            console.error('Failed to initiate calendar connection:', error);
            alert('Failed to connect to Google Calendar. Please try again.');
        }
    }

    async disconnectCalendar() {
        if (!confirm('Are you sure you want to disconnect your Google Calendar?')) {
            return;
        }

        try {
            await fetch('/api/auth/google/disconnect', { method: 'POST' });
            await this.updateCalendarStatus();
            await this.loadTimeAnalytics();
            alert('Google Calendar disconnected successfully.');
        } catch (error) {
            console.error('Failed to disconnect calendar:', error);
            alert('Failed to disconnect calendar. Please try again.');
        }
    }

    async syncCalendar() {
        const syncBtn = document.getElementById('sync-calendar-btn');
        const originalText = syncBtn.textContent;
        syncBtn.textContent = 'Syncing...';
        syncBtn.disabled = true;

        try {
            const response = await fetch('/api/calendar/sync', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                const lastSyncDiv = document.getElementById('last-sync-info');
                lastSyncDiv.innerHTML = `
                    <p class="sync-success">✓ Synced ${result.eventCount} events at ${new Date(result.lastSync).toLocaleString()}</p>
                `;
                await this.loadTimeAnalytics();
                await this.loadCalendarEvents(); // Refresh calendar view if on that tab
            } else {
                throw new Error(result.error || 'Sync failed');
            }
        } catch (error) {
            console.error('Calendar sync failed:', error);
            alert('Failed to sync calendar: ' + error.message);
        } finally {
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
        }
    }

    async loadTimeAnalytics() {
        try {
            const response = await fetch('/api/analytics/time-by-category');
            const { timeByCategory, lastSync } = await response.json();

            const timeAnalyticsDiv = document.getElementById('time-analytics');

            if (!timeByCategory || Object.keys(timeByCategory).length === 0) {
                timeAnalyticsDiv.innerHTML = '<p style="margin-top: 20px;">No time tracking data available. Connect your calendar and sync to see analytics.</p>';
                return;
            }

            let html = '<div class="time-by-category"><h3>Time Spent by Category</h3>';

            // Sort categories by hours (descending)
            const sortedCategories = Object.entries(timeByCategory).sort((a, b) => b[1].hours - a[1].hours);

            sortedCategories.forEach(([categoryId, data]) => {
                const category = this.categories.find(c => c.id === categoryId);
                const categoryName = category ? category.name : 'Uncategorized';
                const categoryColor = category ? category.color : '#999';
                const hours = data.hours.toFixed(1);

                html += `
                    <div class="category-time-bar">
                        <div class="category-time-label">
                            <span style="color: ${categoryColor};">●</span>
                            <strong>${categoryName}</strong>
                        </div>
                        <div class="category-time-info">
                            <span>${hours} hours</span>
                            <span class="event-count">(${data.eventCount} events)</span>
                        </div>
                    </div>
                `;
            });

            html += '</div>';

            if (lastSync) {
                html += `<p class="last-sync-time">Last synced: ${new Date(lastSync).toLocaleString()}</p>`;
            }

            timeAnalyticsDiv.innerHTML = html;
        } catch (error) {
            console.error('Failed to load time analytics:', error);
        }
    }

    async loadCalendarEvents() {
        // This will be used to refresh the calendar view
        if (this.calendar) {
            try {
                const response = await fetch('/api/calendar/events');
                const { events } = await response.json();

                // Remove all events and re-add them
                this.calendar.removeAllEvents();

                // Add manual time blocks
                this.timeBlocks.forEach(block => {
                    this.calendar.addEvent({
                        id: block.id,
                        title: block.title,
                        start: block.startTime,
                        end: block.endTime,
                        backgroundColor: this.getCategoryColor(block.category),
                        extendedProps: { source: 'manual', editable: true }
                    });
                });

                // Add synced Google Calendar events
                events.forEach(event => {
                    this.calendar.addEvent({
                        id: event.id,
                        title: event.title,
                        start: event.startTime,
                        end: event.endTime,
                        allDay: event.allDay,
                        backgroundColor: this.getCategoryColor(event.category),
                        borderColor: '#666',
                        extendedProps: { source: 'google_calendar', editable: false }
                    });
                });
            } catch (error) {
                console.error('Failed to load calendar events:', error);
            }
        }
    }

    getCategoryColor(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.color : '#999';
    }

    async saveGoal(goalData) {
        try {
            console.log('Saving goal to server:', goalData);
            const response = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goalData)
            });
            
            console.log('Server response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const savedGoal = await response.json();
            console.log('Server returned saved goal:', savedGoal);
            return savedGoal;
        } catch (error) {
            console.error('Failed to save goal:', error);
            throw error;
        }
    }

    // Todo List Methods
    setupTodoEventListeners() {
        console.log('setupTodoEventListeners called');
        
        // Wait a bit to ensure DOM is ready
        setTimeout(() => {
            const todoForm = document.getElementById('quick-todo-form');
            const todoButton = document.querySelector('#quick-todo-form button[type="submit"]');
            
            console.log('Setting up todo event listeners');
            console.log('Form found:', !!todoForm);
            console.log('Button found:', !!todoButton);
            
            if (todoButton) {
                console.log('Adding click listener to button');
                todoButton.addEventListener('click', (e) => {
                    console.log('Button clicked!');
                    e.preventDefault();
                    this.handleQuickTodoSubmit(e);
                });
            }
            
            if (todoForm) {
                console.log('Adding submit listener to form');
                todoForm.addEventListener('submit', (e) => {
                    console.log('Form submitted!');
                    e.preventDefault();
                    this.handleQuickTodoSubmit(e);
                });
            }
        }, 100);
    }
    
    updateTodoCategorySelect() {
        const select = document.getElementById('quick-todo-category');
        if (!select) return; // Element might not exist yet
        
        select.innerHTML = '<option value="">Select category (optional)</option>';
        this.categories.forEach(category => {
            select.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    }

    async handleQuickTodoSubmit(e) {
        try {
            e.preventDefault();
            
            const todoInput = document.getElementById('quick-todo-input');
            const categorySelect = document.getElementById('quick-todo-category');
            
            if (!todoInput) {
                console.error('Todo input not found!');
                return;
            }
            
            const title = todoInput.value.trim();
            const categoryId = categorySelect ? categorySelect.value : '';
            
            if (!title) return;

            // Create as standalone goal with selected category
            const selectedCategory = categoryId || 'chores';
            
            const newGoal = {
                id: Date.now().toString(),
                title: title,
                category: selectedCategory,
                description: '',
                priority: 'medium',
                dueDate: null,
                subtasks: [],
                status: 'active',
                createdAt: new Date().toISOString(),
                completedAt: null,
                progress: 0
            };
            
            this.goals.push(newGoal);
            
            try {
                console.log('About to save goal:', newGoal);
                const savedGoal = await this.saveGoal(newGoal);
                console.log('Goal saved successfully:', savedGoal);
                
                // Update the local goal with the server response (in case server adds ID, etc.)
                const goalIndex = this.goals.length - 1;
                this.goals[goalIndex] = savedGoal;
                
            } catch (saveError) {
                console.error('Error saving goal:', saveError);
                // Remove from local array if save failed
                this.goals.pop();
                alert('Failed to save task. Please try again.');
            }
            
            // Clear form
            todoInput.value = '';
            if (categorySelect) categorySelect.value = '';
            
            // Re-render
            this.renderGoals();
            this.renderTodoList();
            
        } catch (error) {
            console.error('Error in handleQuickTodoSubmit:', error);
        }
    }

    getAllTodos() {
        const todos = [];
        
        // Add standalone goals as todos
        this.goals.filter(goal => goal.status === 'active').forEach(goal => {
            if (!goal.subtasks || goal.subtasks.length === 0) {
                const categoryInfo = this.categories.find(c => c.id === goal.category) || 
                                  this.categories.find(c => c.name === goal.category) ||
                                  { name: goal.category, color: '#007AFF' };
                
                todos.push({
                    id: goal.id,
                    text: goal.title,
                    completed: goal.status === 'completed',
                    goalId: goal.id,
                    goalTitle: goal.title,
                    categoryName: categoryInfo.name,
                    categoryColor: categoryInfo.color,
                    dueDate: goal.dueDate,
                    isSubtask: false
                });
            }
            
            // Add subtasks
            if (goal.subtasks) {
                goal.subtasks.forEach(subtask => {
                    const categoryInfo = this.categories.find(c => c.id === goal.category) || 
                                      this.categories.find(c => c.name === goal.category) ||
                                      { name: goal.category, color: '#007AFF' };
                    
                    todos.push({
                        id: subtask.id,
                        text: subtask.title,
                        completed: subtask.completed,
                        goalId: goal.id,
                        goalTitle: goal.title,
                        categoryName: categoryInfo.name,
                        categoryColor: categoryInfo.color,
                        dueDate: subtask.dueDate,
                        isSubtask: true
                    });
                });
            }
        });
        
        return todos;
    }

    renderTodoList() {
        console.log('Rendering todo list...');
        const todos = this.getAllTodos();
        console.log('All todos:', todos);
        const activeTodos = todos.filter(todo => !todo.completed);
        const completedTodos = todos.filter(todo => todo.completed);
        console.log('Active todos:', activeTodos);
        console.log('Completed todos:', completedTodos);
        
        this.renderTodoSection('active-todos-list', activeTodos);
        this.renderTodoSection('completed-todos-list', completedTodos);
    }

    renderTodoSection(containerId, todos) {
        const container = document.getElementById(containerId);
        console.log(`Rendering section ${containerId}, container found:`, !!container);
        console.log(`Todos to render in ${containerId}:`, todos);
        
        if (todos.length === 0) {
            console.log(`No todos for ${containerId}, showing empty state`);
            container.innerHTML = '<div class="empty-state">No items</div>';
            return;
        }
        
        const html = todos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" style="border-left-color: ${todo.categoryColor}">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                       onchange="app.toggleTodo('${todo.goalId}', '${todo.id}', ${todo.isSubtask})">
                <div class="todo-content">
                    <div class="todo-text">${todo.text}</div>
                    <div class="todo-goal-tag" style="background-color: ${todo.categoryColor}">
                        ${todo.categoryName}
                    </div>
                    ${todo.dueDate ? `<div class="todo-due-date">Due: ${new Date(todo.dueDate).toLocaleDateString()}</div>` : ''}
                </div>
            </div>
        `).join('');
        
        console.log(`Generated HTML for ${containerId}:`, html);
        container.innerHTML = html;
        console.log(`Updated container ${containerId}, innerHTML length:`, container.innerHTML.length);
    }

    async toggleTodo(goalId, todoId, isSubtask) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        if (isSubtask) {
            const subtask = goal.subtasks.find(s => s.id === todoId);
            if (subtask) {
                subtask.completed = !subtask.completed;
            }
            // Recalculate progress and update status if needed
            goal.progress = this.calculateProgress(goal);
            if (goal.progress === 1 && goal.status !== 'completed') {
                goal.status = 'completed';
                goal.completedAt = new Date().toISOString();
            } else if (goal.progress < 1 && goal.status === 'completed') {
                goal.status = 'active';
                goal.completedAt = null;
            }
        } else {
            goal.status = goal.status === 'completed' ? 'active' : 'completed';
            goal.completedAt = goal.status === 'completed' ? new Date().toISOString() : null;
            // Update progress to match status
            if (goal.status === 'completed') {
                goal.progress = 1;
            }
        }

        try {
            await fetch(`/api/goals/${goalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });
            await this.loadData();
            this.renderGoals();
            this.renderCompletedGoals();
            this.renderTodoList();
        } catch (error) {
            console.error('Failed to toggle todo:', error);
        }
    }

    async deleteGoal(goalId) {
        if (!confirm('Are you sure you want to delete this goal?')) {
            return;
        }

        try {
            const response = await fetch(`/api/goals/${goalId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadData();
                this.renderGoals();
                this.renderCompletedGoals();
                this.renderTodoList();
            }
        } catch (error) {
            console.error('Failed to delete goal:', error);
            alert('Failed to delete goal. Please try again.');
        }
    }

    async completeGoal(goalId) {
        console.log('completeGoal called with ID:', goalId);
        const goal = this.goals.find(g => g.id === goalId);
        console.log('Found goal:', goal);

        if (!goal) {
            console.error('Goal not found with ID:', goalId);
            return;
        }

        // Mark as completed
        goal.status = 'completed';
        goal.progress = 1;
        goal.completedAt = new Date().toISOString();

        try {
            console.log('Sending update to server...');
            const response = await fetch(`/api/goals/${goalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });

            console.log('Server response:', response.status);
            if (response.ok) {
                console.log('Goal completed successfully, reloading data...');
                await this.loadData();
                this.renderGoals();
                this.renderCompletedGoals();
                this.renderTodoList();
            }
        } catch (error) {
            console.error('Failed to complete goal:', error);
        }
    }

    // Weekly Breakdown Methods
    initWeeklyBreakdown() {
        // Initialize with current week
        const today = new Date();
        const dayOfWeek = today.getDay();
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - dayOfWeek);
        sunday.setHours(0, 0, 0, 0);

        this.currentWeekStart = sunday;
        this.weeklyChart = null;

        // Set up event listeners
        document.getElementById('prev-week-btn').addEventListener('click', () => this.changeWeek(-1));
        document.getElementById('next-week-btn').addEventListener('click', () => this.changeWeek(1));

        // Load current week data
        this.loadWeeklyData();
    }

    changeWeek(direction) {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (direction * 7));
        this.loadWeeklyData();
    }

    formatWeekDisplay(weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const options = { month: 'short', day: 'numeric' };
        const startStr = weekStart.toLocaleDateString('en-US', options);
        const endStr = weekEnd.toLocaleDateString('en-US', options);
        const year = weekStart.getFullYear();

        return `${startStr} - ${endStr}, ${year}`;
    }

    categorizeEvent(title) {
        const lower = title.toLowerCase().trim();

        // Play (check early because "play:" is specific)
        if (lower.includes('play:') || lower.includes('marten') ||
            lower.includes('susan') || lower.includes('coaching session') ||
            lower.includes('character voice')) {
            return 'play';
        }

        // Work (must check before other categories that might contain "work")
        if (lower === 'work' || lower === 'Work' ||
            (lower.includes('work') && !lower.includes('walk') && !lower.includes('workout') && !lower.includes('network')) ||
            (lower.includes('meeting') && !lower.includes('play')) ||
            lower.includes('touchpoint') || lower.includes('sync') ||
            lower.includes('workshop') || lower.includes('prep for 1:1')) {
            return 'work';
        }

        // Exercise (including specific exercise types)
        if (lower.includes('workout') || lower.includes('saturday stairs') ||
            lower.includes('november project') || lower.includes('hike') ||
            lower.includes('yoga') || lower.includes('sculpt') || lower.includes('vinyasa') ||
            lower.includes('run club') || lower === 'run' ||
            lower.includes('walk to') || lower.includes('walk from') ||
            lower.includes('weflowhard') || lower.includes('fitness:') ||
            lower.includes('stretching')) {
            return 'exercise';
        }

        // Stand-up production (including writing)
        if (lower.includes('coffee with david lee') ||
            lower.includes('stand up') || lower.includes('standup') ||
            lower.includes('hoopla') || lower.includes('open mic') ||
            lower.includes('hype mic') || lower.includes('comedy')) {
            return 'stand-up production';
        }

        // UCLA
        if (lower.includes('ucla') || lower.includes('watch tms') ||
            lower.includes('watch veep') || lower.includes('abbott elementary') ||
            lower.includes('tv')) {
            return 'UCLA';
        }

        // Social
        if (lower.includes('joel') || lower.includes('date') ||
            lower.includes('dinner with kendall') || lower.includes('hang with') ||
            lower.includes('church') || lower.includes('hannah') ||
            lower.includes('alison') || lower.includes('philharmonic') ||
            lower.includes('wicked') || lower.includes('harry potter') ||
            lower.includes('funny games')) {
            return 'social';
        }

        // WiS production
        if (lower.includes('meet simone') || lower.includes('business plan') ||
            lower.includes('wis') || lower.includes('post on linkedin') ||
            lower.includes('women in stem')) {
            return 'WiS production';
        }

        // Family
        if (lower.includes('travel') || lower.includes('flight') ||
            lower.includes('thanksgiving') || lower.includes('family time') ||
            lower.includes('get nails done') || lower.includes('mm weekly') ||
            lower.includes('fort lauderdale') || lower.includes('fll') ||
            lower.includes('pool/sauna') || lower.includes('black friday') ||
            lower.includes('drive rachel') || lower.includes('drive allie') ||
            lower.includes('talk to mom') || lower.includes('book flight')) {
            return 'family';
        }

        // Job search
        if (lower.includes('update linkedin') || lower.includes('job app') ||
            lower.includes('resume') || lower === 'job search' ||
            lower.includes('kustomer') || (lower.includes('pro dev') && lower.includes('tyler'))) {
            return 'job search';
        }

        // Personal writing
        if (lower.includes('blog writing') || lower.includes('write: blog') ||
            lower.includes('blog post')) {
            return 'personal writing';
        }

        // Personal development
        if (lower.includes('journal')) {
            return 'personal development';
        }

        // Decision stress
        if (lower.includes('gift shopping') || lower.includes('plane ticket') ||
            lower.includes('buy plane') || lower.includes('re-think')) {
            return 'decision stress';
        }

        // Errands/chores
        if (lower.includes('grocery') || lower.includes('trader joe') ||
            lower.includes('food pantry') || (lower.includes('shopping') && !lower.includes('gift')) ||
            lower.includes('laundry') || lower.includes('clean room') ||
            lower.includes('bargain basket') || lower.includes('lunch') ||
            lower.includes('breakfast') || (lower.includes('dinner') && !lower.includes('kendall')) ||
            lower.includes('cook') || lower.includes('meal') || lower.includes('make/eat') ||
            lower.includes('doctor') || lower.includes('tia ') || lower.includes('shower') ||
            lower.includes('appt') || lower.includes('nap')) {
            return 'errands/chores';
        }

        // Additional social events
        if (lower.includes('hang with') || lower.includes('stephen') ||
            lower.includes('roommates') || lower.includes('date')) {
            return 'social';
        }

        // Additional exercise
        if (lower.includes('walk') && !lower.includes('walk to') && !lower.includes('walk from')) {
            return 'exercise';
        }

        // Additional family/travel
        if (lower.includes('drive') && (lower.includes('airport') || lower.includes('allie') || lower.includes('rachel'))) {
            return 'family';
        }

        // Additional WiS
        if (lower.includes('women in stem') || lower.includes('simone')) {
            return 'WiS production';
        }

        // Additional writing
        if (lower === 'write' || (lower.includes('write') && !lower.includes('stand up'))) {
            return 'personal writing';
        }

        // Additional social/entertainment
        if (lower.includes('essay club') || lower.includes('meeting (')) {
            return 'social';
        }

        // Professional development
        if (lower.includes('pro dev') || lower.includes('prep for 1:1') || lower.includes('draft passes')) {
            return 'work';
        }

        return 'miscellaneous';
    }

    async loadWeeklyData() {
        try {
            const weekStartStr = this.currentWeekStart.toISOString().split('T')[0];
            const response = await fetch(`/api/analytics/weekly?weekStart=${weekStartStr}`);
            const data = await response.json();

            // Update week display
            document.getElementById('current-week-display').textContent = this.formatWeekDisplay(this.currentWeekStart);

            // Categorize events and calculate time
            const timeByCategory = {};
            let totalHours = 0;

            data.events.forEach(event => {
                const category = this.categorizeEvent(event.title);
                const start = new Date(event.startTime);
                const end = new Date(event.endTime);
                const hours = (end - start) / (1000 * 60 * 60);

                if (!timeByCategory[category]) {
                    timeByCategory[category] = 0;
                }
                timeByCategory[category] += hours;
                totalHours += hours;
            });

            // Render chart
            this.renderWeeklyChart(timeByCategory, totalHours);

            // Update stats
            this.renderWeeklyStats(timeByCategory, totalHours, data.events.length);
        } catch (error) {
            console.error('Failed to load weekly data:', error);
            document.getElementById('current-week-display').textContent = 'Error loading week data';
        }
    }

    renderWeeklyChart(timeByCategory, totalHours) {
        const ctx = document.getElementById('weekly-pie-chart');

        // Category colors
        const colors = {
            'work': '#4169E1',
            'exercise': '#32CD32',
            'social': '#FF69B4',
            'UCLA': '#9370DB',
            'play': '#FFD700',
            'stand-up production': '#FF6347',
            'WiS production': '#20B2AA',
            'family': '#FF8C00',
            'personal writing': '#BA55D3',
            'personal development': '#7FFF00',
            'job search': '#4682B4',
            'errands/chores': '#DDA0DD',
            'decision stress': '#DC143C',
            'miscellaneous': '#A9A9A9'
        };

        // Prepare data
        const categories = Object.keys(timeByCategory).sort((a, b) => timeByCategory[b] - timeByCategory[a]);
        const data = categories.map(cat => timeByCategory[cat]);
        const backgroundColors = categories.map(cat => colors[cat] || '#A9A9A9');
        const labels = categories.map(cat => {
            const hours = timeByCategory[cat];
            const percentage = ((hours / totalHours) * 100).toFixed(1);
            return `${cat} (${hours.toFixed(1)}h, ${percentage}%)`;
        });

        // Destroy existing chart if it exists
        if (this.weeklyChart) {
            this.weeklyChart.destroy();
        }

        // Create new chart
        this.weeklyChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label;
                            }
                        }
                    }
                }
            }
        });
    }

    renderWeeklyStats(timeByCategory, totalHours, eventCount) {
        const statsDiv = document.getElementById('weekly-stats');

        if (totalHours === 0) {
            statsDiv.innerHTML = '<p style="text-align: center; color: #666; margin-top: 20px;">No events for this week</p>';
            return;
        }

        // Calculate top categories
        const sortedCategories = Object.entries(timeByCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        statsDiv.innerHTML = `
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <h4 style="margin-top: 0;">Week Summary</h4>
                <p><strong>Total tracked time:</strong> ${totalHours.toFixed(1)} hours</p>
                <p><strong>Number of events:</strong> ${eventCount}</p>
                <p><strong>Top 5 categories:</strong></p>
                <ol style="margin: 10px 0;">
                    ${sortedCategories.map(([cat, hours]) => {
                        const percentage = ((hours / totalHours) * 100).toFixed(1);
                        return `<li>${cat}: ${hours.toFixed(1)}h (${percentage}%)</li>`;
                    }).join('')}
                </ol>
            </div>
        `;
    }
}

const app = new OrganizationApp();