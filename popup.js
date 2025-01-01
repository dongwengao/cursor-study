function openOrFocusTab(url) {
  // 首先查找是否存在相同 URL 的标签页
  chrome.tabs.query({}, function(tabs) {
    const existingTab = tabs.find(tab => tab.url === url);
    
    if (existingTab) {
      // 如果找到已存在的标签页，则激活它
      chrome.tabs.update(existingTab.id, {
        active: true
      });
      chrome.windows.update(existingTab.windowId, {
        focused: true
      });
    } else {
      // 如果没有找到，则创建新标签页
      chrome.tabs.create({
        url: url
      });
    }
  });
}

document.getElementById('actionButton').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'toggleModal' });
}); 