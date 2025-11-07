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

    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: this.timeBlocks.map(block => ({
                id: block.id,
                title: block.title,
                start: block.startTime,
                end: block.endTime,
                backgroundColor: this.getCategoryColor(block.category)
            })),
            editable: true,
            selectable: true,
            select: (info) => this.handleTimeBlockCreate(info),
            eventClick: (info) => this.handleTimeBlockClick(info)
        });
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

    renderAnalytics() {
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
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        // Mark as completed
        goal.status = 'completed';
        goal.progress = 1;
        goal.completedAt = new Date().toISOString();

        try {
            const response = await fetch(`/api/goals/${goalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });

            if (response.ok) {
                await this.loadData();
                this.renderGoals();
                this.renderCompletedGoals();
                this.renderTodoList();
            }
        } catch (error) {
            console.error('Failed to complete goal:', error);
        }
    }
}

const app = new OrganizationApp();