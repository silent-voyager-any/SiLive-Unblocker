function scriptIdFor(origin) {
  let hash = 0;

  for (const character of origin) {
    hash = Math.imul(31, hash) + character.charCodeAt(0) | 0;
  }

  return `unblur_${(hash >>> 0).toString(36)}`;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) {
    return;
  }

  try {
    const url = new URL(tab.url);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return;
    }

    const originPattern = `${url.origin}/*`;
    const permissionGranted = await chrome.permissions.request({
      origins: [originPattern]
    });

    if (!permissionGranted) {
      return;
    }

    const scriptId = scriptIdFor(url.origin);
    const registeredScripts = await chrome.scripting.getRegisteredContentScripts({
      ids: [scriptId]
    });

    if (registeredScripts.length === 0) {
      await chrome.scripting.registerContentScripts([{
        id: scriptId,
        matches: [originPattern],
        css: ["unblur.css"],
        js: ["unblur.js"],
        runAt: "document_idle",
        allFrames: true,
        persistAcrossSessions: true
      }]);
    }

    const matchingTabs = await chrome.tabs.query({ url: originPattern });

    await Promise.all(matchingTabs.map(async (matchingTab) => {
      if (!matchingTab.id) {
        return;
      }

      try {
        await chrome.scripting.insertCSS({
          target: { tabId: matchingTab.id, allFrames: true },
          files: ["unblur.css"]
        });

        await chrome.scripting.executeScript({
          target: { tabId: matchingTab.id, allFrames: true },
          files: ["unblur.js"]
        });
      } catch (error) {
        console.warn("A matching tab could not be unblurred:", error);
      }
    }));
  } catch (error) {
    // Chrome blocks extensions from internal pages such as chrome://settings.
    console.warn("This website cannot be unblurred:", error);
  }
});
