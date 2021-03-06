

chrome.runtime.getBackgroundPage(function(bgWindow) {
	
	function querySelector(selector) {
		return document.querySelector(selector);
	}
	
	function querySelectorAll(selector) {
		return document.querySelectorAll(selector);
	}
	
	function getTextSelection(callback) {
		app.sendMessageToSelectedTab({type: 'getSelection'}, function(sel) {
			callback(sel || '');
		});
	}
	
	
	function onTabMousedown(e) {
		setActiveTab(e.target.getAttribute('tab-id'));
	}
	
	function onExternalLinkClick(e) {
		app.event('External link', e.target.href);
		window.open(e.target.href);
	}
	
	function onSwitchBtnClick(e) {
		var viewName = e.target.getAttribute('switch-to');
		switchToView(viewName);
		app.event('Popup', 'Switch to', viewName);
	}
	
	
	function onCheckbox(value, $checkbox, api) {
		app.setSettings($checkbox.name, value);
	}
	
	function onRange(value, $input, api) {
		app.setSettings($input.name, value);
	}
	
	
	function onStartReadingClick() {
		app.event('Reader', 'Open', 'Popup');
		startReading();
	}
	
	function onStartSelectorClick() {
		app.event('Content selector', 'Start', 'Popup');
		startSelector();
	}
	
	function onCloseReaderClick() {
		app.event('Reader', 'Close', 'Popup');
		closeReader();
	}
	
	function onOfflineBtnClick() {
		app.event('Offline', 'Open');
		window.open(app.offlineUrl);
	}
	
	
	function onShortcutInputKeydown(e) {
		app.stopEvent(e);
		newShortcut = app.eventToShortcutData(e);
		$iShortcut.value = app.shortcutDataToString(newShortcut, true);
	}
	
	function onSaveShortcutBtn() {
		if (newShortcut) {
			if (app.checkShortcut(newShortcut)) {
				runShortcut = newShortcut;
				app.setSettings('runShortcut', newShortcut);
				updateShortcutElems(newShortcut);
				app.event('Run shortcut', 'Set', app.shortcutDataToString(newShortcut));
			}
			else {
				alert(app.t('wrongShortcut'));
				$iShortcut.focus();
				app.event('Run shortcut', 'Set wrong', app.shortcutDataToString(newShortcut));
				return;
			}
		}
		
		switchToView('main');
	}
	
	function onCancelShortcutBtn() {
		$iShortcut.value = app.shortcutDataToString(runShortcut, true);
		switchToView('main');
	}
	
	function updateShortcutElems(data) {
		app.each(querySelectorAll('.j-shortcut'), function($elem) {
			$elem.innerHTML = app.shortcutDataToString(data);
		});
	}
	
	
	function onKeyDown(e) {
		if (runShortcut && app.checkEventForShortcut(e, runShortcut)) {
			app.stopEvent(e);
			getTextSelection(function(text) {
				if (text.length) {
					app.event('Reader', 'Open', 'Shortcut in popup ');
					startReading();
				}
				else {
					app.event('Content selector', 'Start', 'Shortcut in popup');
					startSelector();
				}
			});
		}
	}
	
	
	function startReading() {
		app.sendMessageToSelectedTab({type: 'startReading'});
		window.close();
	}
	
	function startSelector() {
		app.isSystemTab(function(isSystem) {
			if (isSystem) {
				alert(app.t('cantLaunchOnSystemPages'));
			}
			else {
				app.sendMessageToSelectedTab({type: 'startSelector'});
				window.close();
			}
		});
	}
	
	function closeReader() {
		app.sendMessageToSelectedTab({type: 'closeReader'});
		window.close();
	}
	
	function setActiveTab(id) {
		$tabsWrap.setAttribute('active-tab', id);
		
		app.each($tabs, function($tab) {
			$tab.setAttribute('active', $tab.getAttribute('tab-id') === id);
		});
		app.each($content, function($elem) {
			$elem.setAttribute('active', $elem.getAttribute('tab-id') === id);
		});
		
		localStorage["tabId"] = id;
	}
	
	function switchToView(name) {
		app.each($views, function($view) {
			$view.setAttribute('active', $view.getAttribute('view-name') === name);
		});
		$body.setAttribute('active-view', name);
		
		if (name === 'shortcut')
			$iShortcut.focus();
	}
	
	function initControls(settings) {
		app.each(querySelectorAll('.j-checkbox'), function($elem) {
			$elem.checked = settings[$elem.name];
			new app.Checkbox($elem, onCheckbox);
		});
		
		app.each(querySelectorAll('.j-range'), function($elem) {
			$elem.value = settings[$elem.name];
			new app.Range($elem, +$elem.getAttribute('min-value'), +$elem.getAttribute('max-value'), onRange);
		});
		
		runShortcut = settings.runShortcut;
		$iShortcut.value = app.shortcutDataToString(runShortcut, true);
		updateShortcutElems(runShortcut);
	}
	
	
	
	var app = bgWindow.reedy,
		runShortcut, newShortcut,
		
		$body = querySelector('body'),
		$startReadingBtn = querySelector('.j-startReadingBtn'),
		$startSelectorBtn = querySelector('.j-startContentSelectorBtn'),
		$closeReaderBtn = querySelector('.j-closeReaderBtn'),
		$views = querySelectorAll('[view-name]'),
		$tabsWrap = querySelector('.j-tabs'),
		$tabs = querySelectorAll('.j-tab'),
		$content = querySelectorAll('.j-content'),
		$iShortcut = querySelector('.j-iShortcut'),
		$saveShotrcutBtn = querySelector('.j-saveShortcutBtn'),
		$cancelShotrcutBtn = querySelector('.j-cancelShotrcutBtn');
	
	
	chrome.runtime.connect({name: "Popup"});
	
	app.localizeElements(document);
	
	/**
	 * Preparing buttons
	 * `getTextSelection` - is a pretty diffcult method, so we check for the reader state at first
	 */
	app.sendMessageToSelectedTab({type: 'isReaderStarted'}, function(isReaderStarted) {
		if (isReaderStarted) {
			$startSelectorBtn.setAttribute('hidden', true);
			$closeReaderBtn.setAttribute('hidden', false);
		}
		else {
			app.sendMessageToSelectedTab({type: 'isOfflinePage'}, function(isOfflinePage) {
				if (isOfflinePage)
					$startSelectorBtn.setAttribute('hidden', true);
				else
					getTextSelection(function(text) {
						$startReadingBtn.setAttribute('hidden', !text.length);
						$startSelectorBtn.setAttribute('hidden', !!text.length);
					});
			});
		}
	});
	
	app.getSettings(null, initControls);
	
	localStorage["tabId"] && setActiveTab(localStorage["tabId"]);
	
	
	app.on(document, "keydown", onKeyDown);
	
	app.on($startReadingBtn, "click", onStartReadingClick);
	app.on($startSelectorBtn, "click", onStartSelectorClick);
	app.on($closeReaderBtn, "click", onCloseReaderClick);
	
	app.on(querySelector('.j-offlineBtn'), "click", onOfflineBtnClick);
	
	app.each(querySelectorAll('a[href^=http]'), function($elem) {
		app.on($elem, 'click', onExternalLinkClick);
	});
	app.each(querySelectorAll('[switch-to]'), function($elem) {
		app.on($elem, 'click', onSwitchBtnClick);
	});
	
	app.each($tabs, function($elem) {
		app.on($elem, "click", onTabMousedown);
	});
	
	app.on($iShortcut, "keydown", onShortcutInputKeydown);
	app.on($saveShotrcutBtn, "click", onSaveShortcutBtn);
	app.on($cancelShotrcutBtn, "click", onCancelShortcutBtn);
	
	
});
