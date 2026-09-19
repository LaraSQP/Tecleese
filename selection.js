'use strict';

const SELECTED_TEXT_KEY = 'tecleese-selected-text';

const selectionSelector = document.getElementById('textSelector');

let savedSelection = null;

/* -----------------------------------------------------------
   Load saved selection
----------------------------------------------------------- */

try {
	savedSelection = localStorage.getItem(SELECTED_TEXT_KEY);
} catch (error) {
	console.warn('Could not restore selected text:', error);
}

/* -----------------------------------------------------------
   Save selection
----------------------------------------------------------- */

selectionSelector.addEventListener('change', () => {
	try {
		localStorage.setItem(SELECTED_TEXT_KEY, selectionSelector.value);
	} catch (error) {
		console.warn('Could not save selected text:', error);
	}
});

/* -----------------------------------------------------------
   Restore selection when options are populated
----------------------------------------------------------- */

const selectionObserver = new MutationObserver(() => {
	if (!savedSelection) {
		return;
	}

	const option = Array.from(selectionSelector.options).find(
		(option) => option.value === savedSelection
	);

	if (!option) {
		return;
	}

	selectionSelector.value = savedSelection;
	savedSelection = null;

	/*
        Tell worker.js to load the restored selection.
    */

	selectionSelector.dispatchEvent(
		new Event('change', {
			bubbles: true,
		})
	);

	selectionObserver.disconnect();
});

selectionObserver.observe(selectionSelector, {
	childList: true,
});
