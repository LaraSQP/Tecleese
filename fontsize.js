'use strict';

const FONT_SIZE_KEY = 'tecleese-font-size';

const savedFontSize = localStorage.getItem(FONT_SIZE_KEY);

if (savedFontSize !== null) {
	const fontSize = Number(savedFontSize);

	if (Number.isFinite(fontSize)) {
		textDisplay.style.fontSize = `${fontSize}rem`;
		typingInput.style.fontSize = `${fontSize}rem`;
	}
}

increaseFontButton.addEventListener('click', saveFontSize);
decreaseFontButton.addEventListener('click', saveFontSize);

function saveFontSize() {
	const fontSize = parseFloat(textDisplay.style.fontSize);

	if (!Number.isFinite(fontSize)) {
		return;
	}

	localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
}
