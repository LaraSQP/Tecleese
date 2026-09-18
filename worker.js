'use strict';

/* -----------------------------------------------------------
   Configuration
----------------------------------------------------------- */

const TEXT_FOLDER = 'texts/';
const JSON_FILE = '!files.json';

/* -----------------------------------------------------------
   DOM elements
----------------------------------------------------------- */

const textSelector = document.getElementById('textSelector');

const textDisplay = document.getElementById('textDisplay');

const typingInput = document.getElementById('typingInput');

const resetTypingButton = document.getElementById('resetTypingButton');

const showKeyboardButton = document.getElementById('showKeyboardButton');

const decreaseFontButton = document.getElementById('decreaseFontButton');

const increaseFontButton = document.getElementById('increaseFontButton');

/* -----------------------------------------------------------
   State
----------------------------------------------------------- */

let textFiles = [];

let currentText = '';
let currentFile = '';

let characterSpans = [];

let startPosition = 0;

let typingState = [];

let loadVersion = 0;

let fontSize = 1.35;

/* -----------------------------------------------------------
   Initialization
----------------------------------------------------------- */

initialize();

function initialize() {
	textSelector.addEventListener('change', loadSelectedText);

	textDisplay.addEventListener('click', handleTextClick);

	typingInput.addEventListener('input', handleTyping);

	typingInput.addEventListener('keydown', handleKeyDown);

	resetTypingButton.addEventListener('click', resetTyping);

	showKeyboardButton.addEventListener('click', focusKeyboard);

	decreaseFontButton.addEventListener('click', decreaseFontSize);

	increaseFontButton.addEventListener('click', increaseFontSize);

	applyFontSize();

	loadTextFileList();
}

/* -----------------------------------------------------------
   Text selection
----------------------------------------------------------- */

function populateTextSelector() {
	textSelector.replaceChildren();

	for (const filename of textFiles) {
		const option = document.createElement('option');

		option.value = filename;

		option.textContent = filename.replace(/\.txt$/i, '');

		textSelector.appendChild(option);
	}
}

/* -----------------------------------------------------------
   Load text file list
----------------------------------------------------------- */

async function loadTextFileList() {
	try {
		const response = await fetch(TEXT_FOLDER + JSON_FILE);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const files = await response.json();

		if (!Array.isArray(files)) {
			throw new Error(`${JSON_FILE} must contain an array of filenames`);
		}

		textFiles = files.filter(
			(filename) =>
				typeof filename === 'string' &&
				filename.trim().length > 0 &&
				filename.toLowerCase().endsWith('.txt')
		);

		if (textFiles.length === 0) {
			throw new Error(`No .txt files were found in ${JSON_FILE}`);
		}

		populateTextSelector();

		await loadSelectedText();
	} catch (error) {
		console.error('Could not load text file list:', error);

		textSelector.replaceChildren();

		const option = document.createElement('option');

		option.textContent = 'No text files found';

		option.disabled = true;

		option.selected = true;

		textSelector.appendChild(option);

		textDisplay.replaceChildren();

		currentText = '';

		characterSpans = [];

		typingState = [];

		typingInput.value = '';
	}
}

/* -----------------------------------------------------------
   Load text file
----------------------------------------------------------- */

async function loadSelectedText() {
	const selectedFile = textSelector.value;

	if (!selectedFile) {
		return;
	}

	const thisLoadVersion = ++loadVersion;

	currentFile = selectedFile;

	try {
		const response = await fetch(TEXT_FOLDER + selectedFile);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const loadedText = await response.text();

		if (thisLoadVersion !== loadVersion) {
			return;
		}

		currentText = loadedText.replace(/\r\n/g, '\n');

		createTextDisplay();

		resetTyping();
	} catch (error) {
		console.error('Could not load text file:', error);

		textDisplay.replaceChildren();

		currentText = '';

		characterSpans = [];

		typingState = [];

		typingInput.value = '';
	}
}

/* -----------------------------------------------------------
   Create character spans
----------------------------------------------------------- */

function createTextDisplay() {
	textDisplay.replaceChildren();

	characterSpans = [];

	const fragment = document.createDocumentFragment();

	for (let index = 0; index < currentText.length; index++) {
		const span = document.createElement('span');

		span.className = 'char';

		span.dataset.index = String(index);

		span.textContent = currentText[index];

		fragment.appendChild(span);

		characterSpans.push(span);
	}

	textDisplay.appendChild(fragment);
}

/* -----------------------------------------------------------
   Reset typing
----------------------------------------------------------- */

function resetTyping() {
	startPosition = 0;

	typingInput.value = '';

	typingState = new Array(currentText.length).fill(null);

	for (let index = 0; index < characterSpans.length; index++) {
		updateCharacter(index);
	}

	updateCurrentCharacter();

	focusKeyboard();
}

/* -----------------------------------------------------------
   Handle click on text
----------------------------------------------------------- */

function handleTextClick(event) {
	const char = event.target.closest('.char');

	if (!char) {
		return;
	}

	const index = Number(char.dataset.index);

	if (!Number.isInteger(index)) {
		return;
	}

	if (index < 0 || index >= currentText.length) {
		return;
	}

	/*
         Start typing at the character that was clicked.
      */

	startPosition = index;

	typingInput.value = '';

	/*
         Remove the old typing result from the clicked
         position onward, but preserve earlier characters.
      */

	for (let position = startPosition; position < typingState.length; position++) {
		typingState[position] = null;

		updateCharacter(position);
	}

	updateCurrentCharacter();

	focusKeyboard();
}

/* -----------------------------------------------------------
   Handle typing
----------------------------------------------------------- */

function handleTyping() {
	const typedText = typingInput.value;

	for (let offset = 0; offset < typedText.length; offset++) {
		const textIndex = startPosition + offset;

		if (textIndex < 0 || textIndex >= currentText.length) {
			break;
		}

		const expectedCharacter = currentText[textIndex];

		const typedCharacter = typedText[offset];

		typingState[textIndex] = typedCharacter === expectedCharacter;

		updateCharacter(textIndex);
	}

	/*
         Clear characters that were deleted from the input.
      */

	for (let offset = typedText.length; startPosition + offset < currentText.length; offset++) {
		const textIndex = startPosition + offset;

		if (typingState[textIndex] === null || typingState[textIndex] === undefined) {
			break;
		}

		typingState[textIndex] = null;

		updateCharacter(textIndex);
	}

	updateCurrentCharacter();
}

/* -----------------------------------------------------------
   Update one character
----------------------------------------------------------- */

function updateCharacter(index) {
	const span = characterSpans[index];

	if (!span) {
		return;
	}

	span.classList.remove('correct', 'incorrect', 'incorrect-space', 'current');

	const state = typingState[index];

	if (state === true) {
		span.classList.add('correct');
	} else if (state === false) {
		if (currentText[index] === ' ') {
			span.classList.add('incorrect-space');
		} else {
			span.classList.add('incorrect');
		}
	}
}

/* -----------------------------------------------------------
   Current character underline
----------------------------------------------------------- */

function updateCurrentCharacter() {
	for (let index = 0; index < characterSpans.length; index++) {
		characterSpans[index].classList.remove('current');
	}

	const currentIndex = getCurrentPosition();

	if (currentIndex < 0 || currentIndex >= characterSpans.length) {
		return;
	}

	const currentSpan = characterSpans[currentIndex];

	currentSpan.classList.add('current');

	currentSpan.scrollIntoView({
		block: 'nearest',
		inline: 'nearest',
		behavior: 'auto',
	});
}

/* -----------------------------------------------------------
   Current typing position
----------------------------------------------------------- */

function getCurrentPosition() {
	return startPosition + typingInput.value.length;
}

/* -----------------------------------------------------------
   Keyboard handling
----------------------------------------------------------- */

function handleKeyDown(event) {
	/*
         Enter is treated exactly like typing a newline.

         This is important because the existing Backspace
         behavior operates on typingInput.value. By putting
         the newline into typingInput.value, Backspace can
         remove it normally and handleTyping() moves the
         current position back to that newline.
      */

	if (event.key === 'Enter') {
		event.preventDefault();

		const currentPosition = getCurrentPosition();

		if (
			currentPosition >= 0 &&
			currentPosition < currentText.length &&
			currentText[currentPosition] === '\n'
		) {
			typingInput.value = typingInput.value + '\n';

			handleTyping();
		}

		return;
	}

	/*
         Prevent arrow keys from moving the textarea caret.
         Clicking the text is used to select a starting point.
      */

	if (
		event.key === 'ArrowLeft' ||
		event.key === 'ArrowRight' ||
		event.key === 'ArrowUp' ||
		event.key === 'ArrowDown' ||
		event.key === 'Home' ||
		event.key === 'End'
	) {
		event.preventDefault();
	}
}

/* -----------------------------------------------------------
   Focus keyboard input
----------------------------------------------------------- */

function focusKeyboard() {
	typingInput.focus({
		preventScroll: true,
	});
}

/* -----------------------------------------------------------
   Font-size controls
----------------------------------------------------------- */

function increaseFontSize() {
	fontSize = Math.min(fontSize + 0.1, 3.0);

	applyFontSize();
}

function decreaseFontSize() {
	fontSize = Math.max(fontSize - 0.1, 0.8);

	applyFontSize();
}

function applyFontSize() {
	const size = `${fontSize}rem`;

	textDisplay.style.fontSize = size;

	typingInput.style.fontSize = size;
}
