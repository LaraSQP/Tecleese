'use strict';

/* -----------------------------------------------------------
   Simple caret-position resume

   - Saves only the current caret position.
   - Saves after worker.js updates the .current character.
   - Restores once after a text has loaded.
   - Does not restore typed text.
   - Does not modify worker.js.
----------------------------------------------------------- */

const RESUME_KEY_PREFIX = 'tecleese-caret:';

const resumeSelector = document.getElementById('textSelector');
const resumeDisplay = document.getElementById('textDisplay');

let restoredTextFile = '';
let restoreTimer = null;
let saveTimer = null;

/* -----------------------------------------------------------
   Initialization
----------------------------------------------------------- */

resumeSelector.addEventListener('change', handleTextChange);

resumeDisplay.addEventListener('click', handleClick);

document.addEventListener('visibilitychange', handleVisibilityChange);

window.addEventListener('pagehide', saveCaretPosition);

/*
   Watch for:
     - text being loaded
     - .current changing during typing
     - .correct/.incorrect changes

   worker.js changes classes after processing input.
*/

const resumeObserver = new MutationObserver(handleDisplayMutations);

resumeObserver.observe(resumeDisplay, {
	childList: true,
	subtree: true,
	attributes: true,
	attributeFilter: ['class'],
});

/* -----------------------------------------------------------
   Text selection
----------------------------------------------------------- */

function handleTextChange() {
	restoredTextFile = '';

	scheduleRestore();
}

/* -----------------------------------------------------------
   Display changes
----------------------------------------------------------- */

function handleDisplayMutations(mutations) {
	let textStructureChanged = false;
	let typingPositionChanged = false;

	for (const mutation of mutations) {
		if (mutation.type === 'childList') {
			textStructureChanged = true;
		}

		if (mutation.type === 'attributes' && mutation.target.classList.contains('char')) {
			typingPositionChanged = true;
		}
	}

	if (textStructureChanged) {
		scheduleRestore();
	}

	if (typingPositionChanged) {
		scheduleSave();
	}
}

/* -----------------------------------------------------------
   User click
----------------------------------------------------------- */

function handleClick() {
	/*
       worker.js processes the click first.
       The MutationObserver then notices the changed .current
       class and schedules the save.
    */

	scheduleSave();
}

/* -----------------------------------------------------------
   Delayed save
----------------------------------------------------------- */

function scheduleSave() {
	if (saveTimer !== null) {
		return;
	}

	saveTimer = setTimeout(() => {
		saveTimer = null;
		saveCaretPosition();
	}, 50);
}

/* -----------------------------------------------------------
   Storage key
----------------------------------------------------------- */

function getStorageKey() {
	const filename = resumeSelector.value;

	if (!filename) {
		return null;
	}

	return RESUME_KEY_PREFIX + filename;
}

/* -----------------------------------------------------------
   Save caret position
----------------------------------------------------------- */

function saveCaretPosition() {
	const key = getStorageKey();

	if (!key) {
		return;
	}

	const currentCharacter = resumeDisplay.querySelector('.char.current');

	let position;

	if (currentCharacter) {
		position = Number(currentCharacter.dataset.index);
	} else {
		/*
           If no current character exists, the text may be
           complete. Save the position after the last char.
        */

		const characters = resumeDisplay.querySelectorAll('.char');

		position = characters.length;
	}

	if (!Number.isInteger(position) || position < 0) {
		return;
	}

	try {
		localStorage.setItem(key, String(position));
	} catch (error) {
		/*
           Storage failure must never affect typing.
        */

		console.warn('Could not save caret position:', error);
	}
}

/* -----------------------------------------------------------
   Save when page is hidden
----------------------------------------------------------- */

function handleVisibilityChange() {
	if (document.visibilityState === 'hidden') {
		saveCaretPosition();
	}
}

/* -----------------------------------------------------------
   Restore once after text has loaded
----------------------------------------------------------- */

function scheduleRestore() {
	if (restoreTimer !== null) {
		return;
	}

	restoreTimer = setTimeout(() => {
		restoreTimer = null;
		restoreCaretPosition();
	}, 50);
}

function restoreCaretPosition() {
	const filename = resumeSelector.value;

	if (!filename) {
		return;
	}

	/*
       Do not restore repeatedly for the same text.
    */

	if (restoredTextFile === filename) {
		return;
	}

	const characters = resumeDisplay.querySelectorAll('.char');

	if (characters.length === 0) {
		return;
	}

	let savedPosition;

	try {
		const savedValue = localStorage.getItem(getStorageKey());

		if (savedValue === null) {
			restoredTextFile = filename;
			return;
		}

		savedPosition = Number(savedValue);
	} catch (error) {
		console.warn('Could not restore caret position:', error);

		restoredTextFile = filename;
		return;
	}

	if (
		!Number.isInteger(savedPosition) ||
		savedPosition < 0 ||
		savedPosition >= characters.length
	) {
		restoredTextFile = filename;
		return;
	}

	const savedCharacter = characters[savedPosition];

	/*
       Mark as restored before dispatching the click.
    */

	restoredTextFile = filename;

	/*
       Use worker.js's normal click handling.
    */

	savedCharacter.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			view: window,
		})
	);

	/*
       Scroll after worker.js has processed the click.
    */

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			savedCharacter.scrollIntoView({
				block: 'center',
				inline: 'nearest',
				behavior: 'auto',
			});
		});
	});
}
