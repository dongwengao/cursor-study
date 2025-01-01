// 初始化全局变量
let modal = null;
let notePanel = null;

// 添加恢复锚点的函数（移到全局作用域）
function restoreAnchors(noteText) {
  // 先清除现有锚点
  document.querySelectorAll('.note-anchor').forEach(anchor => {
    const text = anchor.textContent;
    const parent = anchor.parentNode;
    parent.replaceChild(document.createTextNode(text), anchor);
  });

  // 查找所有链接
  const linkRegex = /\[([^\]]+)\]\(#(note-anchor-\d+)\)/g;
  let match;
  let anchorsCreated = false;
  
  while ((match = linkRegex.exec(noteText)) !== null) {
    const [, text, anchorId] = match;
    
    // 在页面中查找文本并添加锚点
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    let found = false;
    while (node = walker.nextNode()) {
      const nodeText = node.textContent;
      const index = nodeText.indexOf(text);
      
      if (index !== -1) {
        try {
          // 找到匹配的文本，创建锚点
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + text.length);
          
          const anchor = document.createElement('span');
          anchor.id = anchorId;
          anchor.className = 'note-anchor';
          
          range.surroundContents(anchor);
          found = true;
          anchorsCreated = true;
          break; // 找到并添加锚点后退出
        } catch (error) {
          console.log('无法为文本创建锚点:', text, error);
        }
      }
    }
    
    if (!found) {
      console.log('未找到文本:', text);
    }
  }

  // 如果没有成功创建任何锚点，可能需要稍后重试
  if (!anchorsCreated) {
    console.log('没有创建任何锚点，将在 1 秒后重试');
    setTimeout(() => restoreAnchors(noteText), 1000);
  }
}

// 在页面加载完成后恢复锚点
async function initializeAnchors() {
  const currentUrl = window.location.href;
  const { notes = {} } = await chrome.storage.local.get('notes');
  const noteText = notes[currentUrl] || '';
  if (noteText) {
    // 使用 MutationObserver 监听页面内容变化
    const observer = new MutationObserver((mutations, obs) => {
      // 检查页面是否已经加载完成
      if (document.body) {
        restoreAnchors(noteText);
        // 如果需要继续监听页面变化，注释掉下面这行
        // obs.disconnect();
      }
    });

    // 开始监听
    observer.observe(document, {
      childList: true,
      subtree: true
    });

    // 立即尝试一次恢复锚点
    if (document.body) {
      restoreAnchors(noteText);
    }
  }
}

// 修改恢复锚点函数，添加重试机制
function restoreAnchors(noteText) {
  // 先清除现有锚点
  document.querySelectorAll('.note-anchor').forEach(anchor => {
    const text = anchor.textContent;
    const parent = anchor.parentNode;
    parent.replaceChild(document.createTextNode(text), anchor);
  });

  // 查找所有链接
  const linkRegex = /\[([^\]]+)\]\(#(note-anchor-\d+)\)/g;
  let match;
  let anchorsCreated = false;
  
  while ((match = linkRegex.exec(noteText)) !== null) {
    const [, text, anchorId] = match;
    
    // 在页面中查找文本并添加锚点
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    let found = false;
    while (node = walker.nextNode()) {
      const nodeText = node.textContent;
      const index = nodeText.indexOf(text);
      
      if (index !== -1) {
        try {
          // 找到匹配的文本，创建锚点
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + text.length);
          
          const anchor = document.createElement('span');
          anchor.id = anchorId;
          anchor.className = 'note-anchor';
          
          range.surroundContents(anchor);
          found = true;
          anchorsCreated = true;
          break; // 找到并添加锚点后退出
        } catch (error) {
          console.log('无法为文本创建锚点:', text, error);
        }
      }
    }
    
    if (!found) {
      console.log('未找到文本:', text);
    }
  }

  // 如果没有成功创建任何锚点，可能需要稍后重试
  if (!anchorsCreated) {
    console.log('没有创建任何锚点，将在 1 秒后重试');
    setTimeout(() => restoreAnchors(noteText), 1000);
  }
}

// 移除之前的 DOMContentLoaded 监听器，改用 load 事件
window.addEventListener('load', initializeAnchors);

// 创建模态框HTML
function createModal() {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="bookmark-modal-overlay">
      <div class="bookmark-modal">
        <div class="bookmark-header">
          <h2>书签管理</h2>
          <span class="bookmark-close">&times;</span>
        </div>
        <div class="bookmark-section">
          <h3>当前页面</h3>
          <div class="bookmark-input-group">
            <input type="text" id="bookmarkTitle" class="bookmark-input" placeholder="可以输入自定义名称（可选）">
          </div>
          <button id="toggleBookmark" class="bookmark-button">收藏此页面</button>
        </div>
        <div class="bookmark-section">
          <h3>已收藏页面</h3>
          <div class="bookmark-grid" id="bookmarkList">
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 添加事件监听器
  const overlay = modal.querySelector('.bookmark-modal-overlay');
  const closeBtn = modal.querySelector('.bookmark-close');
  const toggleBtn = modal.querySelector('#toggleBookmark');
  const titleInput = modal.querySelector('#bookmarkTitle');
  const inputGroup = modal.querySelector('.bookmark-input-group');

  // 设置输入框宽度为100%
  titleInput.style.width = '100%';

  // 关闭模态框
  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    titleInput.value = ''; // 清空输入
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      titleInput.value = ''; // 清空输入
    }
  });

  // 切换收藏状态
  toggleBtn.addEventListener('click', async () => {
    const currentUrl = window.location.href;
    const currentTitle = document.title;
    
    // 获取现有书签
    const { bookmarks = [] } = await chrome.storage.local.get('bookmarks');
    
    const exists = bookmarks.some(b => b.url === currentUrl);
    if (exists) {
      // 移除书签
      const newBookmarks = bookmarks.filter(b => b.url !== currentUrl);
      await chrome.storage.local.set({ bookmarks: newBookmarks });
      toggleBtn.textContent = '收藏此页面';
      titleInput.value = ''; // 清空输入
    } else {
      // 直接添加书签，使用用户输入的标题（如果有）或原标题
      const customTitle = titleInput.value.trim();
      bookmarks.push({ 
        url: currentUrl, 
        title: customTitle || currentTitle, 
        originalTitle: currentTitle,
        date: new Date().toISOString() 
      });
      await chrome.storage.local.set({ bookmarks });
      toggleBtn.textContent = '取消收藏';
      titleInput.value = ''; // 清空输入
    }
    
    // 刷新书签列表
    updateBookmarkList();
  });

  return overlay;
}

// 更新书签列表
async function updateBookmarkList() {
  const { bookmarks = [] } = await chrome.storage.local.get('bookmarks');
  const listElement = document.getElementById('bookmarkList');
  const currentUrl = window.location.href;
  
  // 更新收藏按钮状态和输入框显示
  const toggleBtn = document.getElementById('toggleBookmark');
  const inputGroup = document.querySelector('.bookmark-input-group');
  const isBookmarked = bookmarks.some(b => b.url === currentUrl);
  
  toggleBtn.textContent = isBookmarked ? '取消收藏' : '收藏此页面';
  inputGroup.style.display = isBookmarked ? 'none' : 'block';
  
  // 更新列表
  listElement.innerHTML = bookmarks.map(bookmark => `
    <div class="bookmark-item" draggable="true" data-url="${bookmark.url}">
      <div class="bookmark-title">${bookmark.title}</div>
      <div class="bookmark-url">${bookmark.url}</div>
      <div class="bookmark-original-title">${bookmark.originalTitle !== bookmark.title ? `原标题: ${bookmark.originalTitle}` : ''}</div>
      <div class="bookmark-drag-hint">单击拖动排序 / 双击访问</div>
    </div>
  `).join('');

  // 添加拖拽和点击事件
  listElement.querySelectorAll('.bookmark-item').forEach(item => {
    // 双击跳转
    item.addEventListener('dblclick', () => {
      window.location.href = item.dataset.url;
    });

    // 拖拽开始
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      e.dataTransfer.setData('text/plain', item.dataset.url);
    });

    // 拖拽结束
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.bookmark-item').forEach(item => {
        item.classList.remove('drag-over');
      });
    });

    // 拖拽经过其他元素
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!item.classList.contains('dragging')) {
        item.classList.add('drag-over');
      }
    });

    // 离开其他元素
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    // 放置
    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      const draggedUrl = e.dataTransfer.getData('text/plain');
      const dropUrl = item.dataset.url;
      
      if (draggedUrl !== dropUrl) {
        // 获取当前书签列表
        const { bookmarks = [] } = await chrome.storage.local.get('bookmarks');
        
        // 找到被拖拽和目标位置的索引
        const draggedIndex = bookmarks.findIndex(b => b.url === draggedUrl);
        const dropIndex = bookmarks.findIndex(b => b.url === dropUrl);
        
        // 重新排序
        const [draggedItem] = bookmarks.splice(draggedIndex, 1);
        bookmarks.splice(dropIndex, 0, draggedItem);
        
        // 保存新顺序
        await chrome.storage.local.set({ bookmarks });
        
        // 更新显示
        updateBookmarkList();
      }
    });
  });
}

// 切换模态框显示状态
function toggleModal() {
  if (!modal) {
    modal = createModal();
  }
  
  if (modal.style.display === 'block') {
    modal.style.display = 'none';
  } else {
    modal.style.display = 'block';
    updateBookmarkList();
  }
}

// 创建笔记面板
function createNotePanel() {
  const panel = document.createElement('div');
  panel.className = 'note-panel';
  panel.innerHTML = `
    <div class="note-header">
      <h3>页面笔记</h3>
      <span class="note-close">&times;</span>
    </div>
    <div class="note-content">
      <div class="note-toolbar">
        <button class="note-link-btn" title="插入选中文本的链接">插入链接</button>
      </div>
      <textarea class="note-textarea" placeholder="在这里记录你的笔记...
提示：
1. 选中页面文本后点击"插入链接"
2. 点击笔记中的链接可定位到原文"></textarea>
      <button class="note-save">保存笔记</button>
    </div>
  `;
  document.body.appendChild(panel);

  // 获取所有需要的元素
  const header = panel.querySelector('.note-header');
  const closeBtn = panel.querySelector('.note-close');
  const textarea = panel.querySelector('.note-textarea');
  const saveBtn = panel.querySelector('.note-save');
  const linkBtn = panel.querySelector('.note-link-btn');
  const currentUrl = window.location.href;

  // 加载已有笔记
  chrome.storage.local.get('notes', ({ notes = {} }) => {
    textarea.value = notes[currentUrl] || '';
  });

  // 保存笔记时更新锚点
  const saveNote = async () => {
    const { notes = {} } = await chrome.storage.local.get('notes');
    notes[currentUrl] = textarea.value;
    await chrome.storage.local.set({ notes });
    
    // 重新创建锚点
    restoreAnchors(textarea.value);
    
    saveBtn.textContent = '已保存';
    saveBtn.style.background = '#45a049';
    setTimeout(() => {
      saveBtn.textContent = '保存笔记';
      saveBtn.style.background = '#4CAF50';
    }, 1000);
  };

  // 插入链接按钮点击事件
  linkBtn.addEventListener('click', () => {
    const selection = window.getSelection();
    if (!selection.isCollapsed) {
      const selectedText = selection.toString().trim();
      if (selectedText) {
        // 创建一个唯一的锚点ID
        const anchorId = 'note-anchor-' + Date.now();
        
        try {
          // 尝试获取选区的范围
          const range = selection.getRangeAt(0);
          
          // 创建锚点元素
          const anchor = document.createElement('span');
          anchor.id = anchorId;
          anchor.className = 'note-anchor';
          
          // 检查是否跨越多个元素
          if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
            // 如果只是文本节点，使用 surroundContents
            range.surroundContents(anchor);
          } else {
            // 如果跨越多个元素，使用替代方案
            anchor.textContent = selectedText;
            range.deleteContents();
            range.insertNode(anchor);
          }
          
          // 在光标位置插入链接文本
          const cursorPos = textarea.selectionStart;
          const textBefore = textarea.value.substring(0, cursorPos);
          const textAfter = textarea.value.substring(textarea.selectionEnd);
          const linkText = `[${selectedText}](#${anchorId})`;
          textarea.value = textBefore + linkText + textAfter;
          
          // 更新光标位置
          const newCursorPos = cursorPos + linkText.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        } catch (error) {
          // 如果出错，使用简单的方式插入链接
          const cursorPos = textarea.selectionStart;
          const textBefore = textarea.value.substring(0, cursorPos);
          const textAfter = textarea.value.substring(textarea.selectionEnd);
          const linkText = `[${selectedText}]`;
          textarea.value = textBefore + linkText + textAfter;
          
          // 更新光标位置
          const newCursorPos = cursorPos + linkText.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }
      }
    }
  });

  // 处理笔记中链接的点击事件
  textarea.addEventListener('mouseup', (e) => {
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    // 查找光标位置是否在链接内
    const linkRegex = /\[([^\]]+)\]\(#(note-anchor-\d+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      const linkStart = match.index;
      const linkEnd = linkStart + match[0].length;
      
      if (cursorPos >= linkStart && cursorPos <= linkEnd) {
        const anchorId = match[2];
        const element = document.getElementById(anchorId);
        if (element) {
          // 确保元素可见
          element.style.display = 'inline';
          // 滚动到元素位置
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          });
          // 高亮显示
          element.classList.add('note-anchor-highlight');
          setTimeout(() => {
            element.classList.remove('note-anchor-highlight');
          }, 2000);
          
          // 添加调试信息
          console.log('找到锚点:', anchorId);
          console.log('元素位置:', element.getBoundingClientRect());
        } else {
          console.log('未找到锚点元素:', anchorId);
        }
        break;
      }
    }
  });

  // 监听 Ctrl + S
  textarea.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault(); // 阻止浏览器默认的保存页面行为
      await saveNote();
    }
  });

  // 保存按钮点击事件
  saveBtn.addEventListener('click', saveNote);

  // 添加拖动功能
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  function dragStart(e) {
    if (e.type === "mousedown") {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }
    
    if (e.target === header || e.target.parentNode === header) {
      isDragging = true;
      header.style.cursor = 'grabbing';
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    header.style.cursor = 'move';
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      xOffset = currentX;
      yOffset = currentY;

      setTranslate(currentX, currentY, panel);
    }
  }

  // 添加拖动事件监听器
  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  // 防止文本选择
  header.addEventListener('selectstart', (e) => e.preventDefault());

  // 修改显示/隐藏逻辑
  panel.style.display = 'flex'; // 默认显示
  panel.style.transform = 'translate3d(0, 0, 0)'; // 初始位置

  // 修改关闭按钮行为
  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  return panel;
}

// 切换笔记面板
function toggleNotePanel() {
  if (!notePanel) {
    notePanel = createNotePanel();
  }
  if (notePanel.style.display === 'none') {
    notePanel.style.display = 'flex';
  } else {
    notePanel.style.display = 'none';
  }
}

// 监听键盘事件（只保留一个）
document.addEventListener('keydown', function(event) {
  if (event.altKey) {
    if (event.key.toLowerCase() === 'q') {
      event.preventDefault();
      toggleModal();
    } else if (event.key.toLowerCase() === 'w') {
      event.preventDefault();
      toggleNotePanel();
    }
  }
});

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleModal') {
    toggleModal();
  }
}); 