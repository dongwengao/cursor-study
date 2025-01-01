// 监听标签页即将导航到新URL时的事件
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  // 只处理主框架的导航（忽略iframe等）
  if (details.frameId !== 0) return;
  
  // 获取目标URL
  const targetUrl = details.url;
  
  // 查询所有标签页
  chrome.tabs.query({}, function(tabs) {
    // 查找是否存在相同URL的标签页（排除当前标签）
    const existingTab = tabs.find(tab => 
      tab.url === targetUrl && tab.id !== details.tabId
    );
    
    if (existingTab) {
      // 如果找到已存在的标签页
      // 激活已存在的标签页
      chrome.tabs.update(existingTab.id, {
        active: true
      });
      
      // 激活包含该标签页的窗口
      chrome.windows.update(existingTab.windowId, {
        focused: true
      });
      
      // 关闭新打开的标签页
      chrome.tabs.remove(details.tabId);
    }
  });
}); 