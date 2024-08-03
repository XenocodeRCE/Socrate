chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    sendResponse(window.getSelection().toString());
  }
});