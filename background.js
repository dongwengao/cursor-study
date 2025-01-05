// 打开待办事项页面的通用函数
async function openTodoPage() {
  try {
    // 使用更精确的查询条件
    const tabs = await chrome.tabs.query({});
    
    // 查找待办页面
    const todoTab = tabs.find(tab => 
      tab.url && tab.url.includes(chrome.runtime.getURL('todo.html'))
    );

    if (todoTab) {
      // 如果已存在，则激活该标签页
      await chrome.tabs.update(todoTab.id, { active: true });
      // 如果该标签页不在当前窗口，则聚焦其所在窗口
      await chrome.windows.update(todoTab.windowId, { focused: true });
    } else {
      // 如果不存在，则创建新标签页
      await chrome.tabs.create({
        url: chrome.runtime.getURL('todo.html'),
        active: true
      });
    }
  } catch (error) {
    console.error('Error handling todo page:', error);
  }
}

// 监听浏览器启动
chrome.runtime.onStartup.addListener(openTodoPage);

// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    openTodoPage();
  }
});

// 监听扩展图标点击
chrome.action.onClicked.addListener(openTodoPage);

// 处理快捷键
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle_todo') {
    openTodoPage();
  }
});

// 创建通知的函数
async function createNotification(notificationId, options) {
  try {
    await chrome.notifications.create(notificationId, {
      ...options,
      requireInteraction: false,  // 改为不需要用户交互
      silent: false  // 保持声音提醒
    });

    // 3秒后自动关闭通知
    setTimeout(async () => {
      try {
        await chrome.notifications.clear(notificationId);
      } catch (error) {
        console.error('Error clearing notification:', error);
      }
    }, 3000);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

// 检查任务截止时间
async function checkDeadlines() {
  try {
    const { todos = [], lastNotified = {} } = await chrome.storage.local.get(['todos', 'lastNotified']);
    const now = Date.now();

    for (const todo of todos) {
      // 跳过已完成的任务
      if (todo.isCompleted) {
        // 如果任务已完成，清除其通知记录
        if (lastNotified[todo.id]) {
          delete lastNotified[todo.id];
        }
        if (lastNotified[`expired-${todo.id}`]) {
          delete lastNotified[`expired-${todo.id}`];
        }
        continue;
      }

      const timeToDeadline = todo.deadline - now;
      const reminderTime = todo.reminderMinutes * 60 * 1000;
      
      // 检查是否需要发送通知
      if (timeToDeadline > 0 && timeToDeadline <= reminderTime) {
        const lastNotifyTime = lastNotified[todo.id] || 0;
        const timeSinceLastNotify = now - lastNotifyTime;
        
        // 根据剩余时间调整通知频率
        let notifyInterval;
        if (timeToDeadline <= 5 * 60 * 1000) { // 剩余5分钟内
          notifyInterval = 60 * 1000; // 每1分钟提醒一次
        } else if (timeToDeadline <= 30 * 60 * 1000) { // 剩余30分钟内
          notifyInterval = 5 * 60 * 1000; // 每5分钟提醒一次
        } else if (timeToDeadline <= 60 * 60 * 1000) { // 剩余1小时内
          notifyInterval = 10 * 60 * 1000; // 每10分钟提醒一次
        } else {
          notifyInterval = 30 * 60 * 1000; // 其他情况每30分钟提醒一次
        }

        // 只有超过通知间隔才发送通知
        if (!lastNotifyTime || timeSinceLastNotify >= notifyInterval) {
          const notificationId = `todo-${todo.id}`;
          await createNotification(notificationId, {
            type: 'basic',
            title: `待办事项提醒`,
            message: `任务"${todo.title}"${formatRemainingTime(timeToDeadline)}`,
            iconUrl: 'images/icon128.png',
            priority: 2,
            buttons: [
              { title: '完成任务' },
              { title: '稍后提醒' }
            ]
          });

          lastNotified[todo.id] = now;
          await chrome.storage.local.set({ lastNotified });
        }
      }

      // 检查是否已过期但未通知
      if (timeToDeadline < 0 && !lastNotified[`expired-${todo.id}`]) {
        const notificationId = `expired-${todo.id}`;
        await createNotification(notificationId, {
          type: 'basic',
          title: `任务过期提醒`,
          message: `任务"${todo.title}"已过期`,
          iconUrl: 'images/icon128.png',
          priority: 2
        });

        lastNotified[`expired-${todo.id}`] = now;
        await chrome.storage.local.set({ lastNotified });
      }
    }
  } catch (error) {
    console.error('Error checking deadlines:', error);
  }
}

// 设置定时检查，使用合理的间隔
chrome.alarms.create('checkDeadlines', {
  periodInMinutes: 1  // 每分钟检查一次
});

// 监听定时器
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkDeadlines') {
    checkDeadlines();
  }
});

// 初始化时检查一次
checkDeadlines(); 