chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addText",
    title: "Ajouter ce texte à Socrate",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addText") {
    chrome.storage.local.get({texts: []}, (result) => {
      const texts = result.texts;
      texts.push(info.selectionText);
      chrome.storage.local.set({texts: texts});
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('QCM_Reminder_')) {
    const textId = alarm.name.split('_')[2];
    chrome.storage.local.get({ texts: [], reminders: {} }, (result) => {
      const text = result.texts[textId];
      const reminders = result.reminders;
      if (text) {
        chrome.notifications.create(`QCM_Reminder_${textId}`, {
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'Rappel de QCM',
          message: `Il est temps de réviser le texte : "${text}" avec des QCM.`,
          priority: 2
        });
        reminders[textId] = (reminders[textId] || 0) + 1;
        chrome.storage.local.set({ reminders: reminders });
      }
    });
  }
});

function scheduleReminders(textId) {
  const reminderTimes = [1, 2, 4, 7, 14, 30]; // days
  const now = Date.now();
  reminderTimes.forEach((days) => {
    const alarmTime = now + days * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    chrome.alarms.create(`QCM_Reminder_${textId}_${days}`, { when: alarmTime });
  });
}