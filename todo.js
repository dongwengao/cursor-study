let todoList = null;

// 初始化
async function initialize() {
  const addBtn = document.getElementById('addTodo');
  const titleInput = document.getElementById('todoTitle');
  const detailsInput = document.getElementById('todoDetails');
  const deadlineInput = document.getElementById('todoDeadline');
  const reminderInput = document.getElementById('todoReminder');

  // 设置默认截止时间为明天
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  deadlineInput.value = tomorrow.toISOString().slice(0, 16);

  addBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const details = detailsInput.value.trim();
    const deadline = new Date(deadlineInput.value).getTime();
    const reminderMinutes = parseInt(reminderInput.value) || 60;

    if (!title || !deadline) {
      alert('请填写标题和截止时间');
      return;
    }

    const todo = {
      id: Date.now(),
      title,
      details,
      deadline,
      reminderMinutes,
      created: Date.now(),
      isCompleted: false,
      parallel: false
    };

    const { todos = [] } = await chrome.storage.local.get('todos');
    todos.push(todo);
    await chrome.storage.local.set({ todos });

    // 清空输入
    titleInput.value = '';
    detailsInput.value = '';
    deadlineInput.value = tomorrow.toISOString().slice(0, 16);
    reminderInput.value = '60';

    // 刷新列表
    updateTodoList();
  });

  // 添加测试任务按钮
  const addTestBtn = document.createElement('button');
  addTestBtn.className = 'todo-button test';
  addTestBtn.textContent = '添加示例任务';
  addTestBtn.addEventListener('click', async () => {
    // 创建三个示例任务
    const testTodos = [
      {
        id: Date.now(),
        title: '准备周会报告',
        details: '整理本周工作进展，准备明天的周会汇报材料',
        deadline: Date.now() + (60 * 1000), // 1分钟后
        reminderMinutes: 0.5, // 提前30秒提醒
        created: Date.now(),
        isCompleted: false,
        parallel: false
      },
      {
        id: Date.now() + 1,
        title: '提交项目文档',
        details: '上周五的项目文档还未提交，需要尽快处理',
        deadline: Date.now() - (5 * 60 * 1000), // 5分钟前
        reminderMinutes: 1,
        created: Date.now(),
        isCompleted: false,
        parallel: false
      },
      {
        id: Date.now() + 2,
        title: '准备月度总结',
        details: '整理本月工作内容，准备月底的工作总结报告',
        deadline: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3天后
        reminderMinutes: 60, // 提前1小时提醒
        created: Date.now(),
        isCompleted: false,
        parallel: false
      }
    ];

    console.log('Creating example todos:', testTodos);

    const { todos = [] } = await chrome.storage.local.get('todos');
    todos.push(...testTodos);
    await chrome.storage.local.set({ todos });
    console.log('Example todos saved successfully');

    // 刷新列表
    updateTodoList();
  });

  // 添加测试按钮样式
  addTestBtn.style.cssText = `
    margin-top: 20px;
    background: #9c27b0;
    color: white;
    width: 100%;
  `;

  addTestBtn.addEventListener('mouseover', () => {
    addTestBtn.style.background = '#7b1fa2';
  });

  addTestBtn.addEventListener('mouseout', () => {
    addTestBtn.style.background = '#9c27b0';
  });

  // 将按钮添加到表单中
  document.querySelector('.todo-form').appendChild(addTestBtn);

  // 初始加载待办事项列表
  updateTodoList();
}

// 更新待办事项列表
async function updateTodoList() {
  const { todos = [] } = await chrome.storage.local.get('todos');
  
  // 获取所有列表容器
  const expiredList = document.getElementById('expiredList');
  const urgentList = document.getElementById('urgentList');
  const normalList = document.getElementById('normalList');
  const futureList = document.getElementById('futureList');
  const parallelList = document.getElementById('parallelList');
  const completedList = document.getElementById('completedList');

  // 清空所有列表
  expiredList.innerHTML = '';
  urgentList.innerHTML = '';
  normalList.innerHTML = '';
  futureList.innerHTML = '';
  parallelList.innerHTML = '';
  completedList.innerHTML = '';

  // 时间阈值
  const now = Date.now();
  const twoDays = 2 * 24 * 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  // 按截止时间排序
  todos.sort((a, b) => a.deadline - b.deadline);

  todos.forEach(todo => {
    const timeToDeadline = todo.deadline - now;
    const isExpired = timeToDeadline < 0;
    const isNearDeadline = !isExpired && timeToDeadline < 24 * 60 * 60 * 1000;
    const deadlineDate = new Date(todo.deadline);

    const todoHtml = `
      <div class="todo-item ${isExpired ? 'expired' : ''} ${isNearDeadline ? 'near-deadline' : ''}" data-id="${todo.id}">
        <div class="todo-title">${todo.title}</div>
        <div class="todo-details">${todo.details}</div>
        <div class="todo-deadline">
          截止时间: ${deadlineDate.toLocaleString()}
          <br>
          ${isExpired ? '已过期' : formatTimeLeft(todo.deadline)}
        </div>
        <div class="todo-actions">
          <button class="todo-button primary todo-toggle ${todo.isCompleted ? 'completed' : ''}" data-id="${todo.id}">
            ${todo.isCompleted ? '取消完成' : '完成'}
          </button>
          <button class="todo-button secondary todo-parallel ${todo.parallel ? 'active' : ''}" data-id="${todo.id}">
            ${todo.parallel ? '取消并行' : '设为并行'}
          </button>
          <button class="todo-button danger todo-delete" data-id="${todo.id}">删除</button>
        </div>
      </div>
    `;

    // 根据完成状态和类型分配到不同列表
    if (todo.isCompleted) {
      completedList.insertAdjacentHTML('beforeend', todoHtml);
    } else {
      // 先处理并行任务列表
      if (todo.parallel) {
        parallelList.insertAdjacentHTML('beforeend', todoHtml);
      }
      
      // 然后根据状态分配到其他列表
      if (isExpired) {
        expiredList.insertAdjacentHTML('beforeend', todoHtml);
      } else if (timeToDeadline <= twoDays) {
        urgentList.insertAdjacentHTML('beforeend', todoHtml);
      } else if (timeToDeadline <= sevenDays) {
        normalList.insertAdjacentHTML('beforeend', todoHtml);
      } else {
        futureList.insertAdjacentHTML('beforeend', todoHtml);
      }
    }
  });

  // 更新计数
  updateTodoCount('expiredList');
  updateTodoCount('urgentList');
  updateTodoCount('normalList');
  updateTodoCount('futureList');
  updateTodoCount('parallelList');
  updateTodoCount('completedList');
}

// 更新任务数量
function updateTodoCount(listId) {
  const list = document.getElementById(listId);
  const count = list.querySelectorAll('.todo-item').length;
  const countElement = list.parentElement.querySelector('.todo-count');
  countElement.textContent = count;
}

// 切换任务状态
async function toggleTodoStatus(id) {
  const { todos = [] } = await chrome.storage.local.get('todos');
  const todoIndex = todos.findIndex(todo => todo.id === id);
  
  if (todoIndex !== -1) {
    todos[todoIndex].isCompleted = !todos[todoIndex].isCompleted;
    await chrome.storage.local.set({ todos });
    updateTodoList();
  }
}

// 切换并行任务状态
async function toggleParallelStatus(id) {
  const { todos = [] } = await chrome.storage.local.get('todos');
  const todoIndex = todos.findIndex(todo => todo.id === id);
  
  if (todoIndex !== -1) {
    todos[todoIndex].parallel = !todos[todoIndex].parallel;
    await chrome.storage.local.set({ todos });
    updateTodoList();
  }
}

// 在页面加载时检查是否已存在其他实例
async function checkExistingInstance() {
  try {
    const tabs = await chrome.tabs.query({});
    const currentTab = await chrome.tabs.getCurrent();
    
    // 查找其他的待办页面
    const todoTabs = tabs.filter(tab => 
      tab.url && 
      tab.url.includes(chrome.runtime.getURL('todo.html')) &&
      tab.id !== currentTab.id  // 排除当前标签页
    );

    if (todoTabs.length > 0) {
      // 如果存在其他实例，激活那个标签页并关闭当前页面
      await chrome.tabs.update(todoTabs[0].id, { active: true });
      await chrome.windows.update(todoTabs[0].windowId, { focused: true });
      // 关闭当前页面
      await chrome.tabs.remove(currentTab.id);
    }
  } catch (error) {
    console.error('Error checking existing instance:', error);
  }
}

// 初始化拖拽功能
function initDragAndDrop() {
  const listsContainer = document.querySelector('.todo-lists-container');
  const groups = document.querySelectorAll('.todo-group');

  // 保存列表顺序
  async function saveListOrder() {
    const order = Array.from(document.querySelectorAll('.todo-group')).map(group => 
      group.getAttribute('data-group')
    );
    await chrome.storage.local.set({ listOrder: order });
  }

  // 加载列表顺序
  async function loadListOrder() {
    const { listOrder = ['expired', 'urgent', 'normal', 'future', 'parallel', 'completed'] } = 
      await chrome.storage.local.get('listOrder');
    
    const container = document.querySelector('.todo-lists-container');
    const groups = Array.from(document.querySelectorAll('.todo-group'));
    
    // 根据保存的顺序重新排列
    listOrder.forEach(groupId => {
      const group = groups.find(g => g.getAttribute('data-group') === groupId);
      if (group) {
        container.appendChild(group);
      }
    });
  }

  groups.forEach(group => {
    group.addEventListener('dragstart', (e) => {
      group.classList.add('dragging');
      e.dataTransfer.setData('text/plain', group.getAttribute('data-group'));
    });

    group.addEventListener('dragend', (e) => {
      group.classList.remove('dragging');
      saveListOrder();
    });

    group.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = document.querySelector('.dragging');
      if (dragging && dragging !== group) {
        const rect = group.getBoundingClientRect();
        const afterElement = (e.clientX - rect.left) > (rect.width / 2);
        
        if (afterElement) {
          group.parentNode.insertBefore(dragging, group.nextSibling);
        } else {
          group.parentNode.insertBefore(dragging, group);
        }
      }
    });

    group.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (!group.classList.contains('dragging')) {
        group.classList.add('drag-over');
      }
    });

    group.addEventListener('dragleave', () => {
      group.classList.remove('drag-over');
    });

    group.addEventListener('drop', (e) => {
      e.preventDefault();
      group.classList.remove('drag-over');
    });
  });

  // 页面加载时恢复列表顺序
  loadListOrder();
}

// 在页面加载完成后立即检查
document.addEventListener('DOMContentLoaded', () => {
  checkExistingInstance();
  
  // 使用事件委托处理按钮点击
  document.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const id = parseInt(button.dataset.id);
    if (!id) return;

    if (button.classList.contains('todo-toggle')) {
      await toggleTodoStatus(id);
    } else if (button.classList.contains('todo-delete')) {
      await deleteTodo(id);
    } else if (button.classList.contains('todo-parallel')) {
      await toggleParallelStatus(id);
    }
  });

  initialize();

  // 添加定时刷新功能
  setInterval(async () => {
    console.log('Refreshing todo list...');
    await updateTodoList();
  }, 30 * 1000);  // 每30秒刷新一次

  initDragAndDrop();
});

function formatTimeLeft(deadline) {
  const now = Date.now();
  const timeLeft = deadline - now;
  const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
  const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `剩余 ${days} 天 ${hours} 小时`;
  }
  return `剩余 ${hours} 小时`;
}

// 删除任务
async function deleteTodo(id) {
  const { todos = [] } = await chrome.storage.local.get('todos');
  const newTodos = todos.filter(todo => todo.id !== id);
  await chrome.storage.local.set({ todos: newTodos });
  updateTodoList();
} 