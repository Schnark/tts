/*global speechSynthesis */
/*global TextboxSpeaker, FileSpeaker, WikipediaSpeaker */
(function () {
"use strict";

var dom = {}, speakers = {}, needsInit = true, l10n;

l10n = {
	en: {
		native: 'English',
		title: 'Text to Speech',
		language: 'Language:',
		textboxButton: 'Simple text',
		textboxLabel: 'Text to speak:',
		fileButton: 'File',
		fileLabel: 'Press the play button to select a text or PDF file to speak.',
		wikipediaButton: 'Wikipedia',
		wikipediaLabel: 'Article title:',
		error: 'An error occured!',
		pdfPrompt: 'Which pages should be read?',
		noSpeech: 'Speech synthesis is not supported in your browser!',
		noVoices: 'Can’t find any voices for speech synthesis!'
	},
	de: {
		native: 'Deutsch',
		title: 'Vorleser',
		language: 'Sprache:',
		textboxButton: 'Text',
		textboxLabel: 'Text, der gesprochen werden soll:',
		fileButton: 'Datei',
		fileLabel: 'Drücke die Abspiel-Schaltfläche um eine Text- oder PDF-Datei auszuwählen, die gesprochen werden soll.',
		wikipediaButton: 'Wikipedia',
		wikipediaLabel: 'Artikeltitel:',
		error: 'Es ist ein Fehler aufgetreten!',
		pdfPrompt: 'Welche Seiten sollen vorgelesen werden?',
		noSpeech: 'Dein Browser unterstützt keine Sprachsynthese!',
		noVoices: 'Keine Stimmen für die Sprachsynthese vorhanden!'
	},
	fr: {
		native: 'Français'
	},
	es: {
		native: 'Español'
	},
	it: {
		native: 'Italiano'
	}
};

function getStoredLanguage () {
	var lang;
	try {
		lang = localStorage.getItem('tts-stored-language');
	} catch (e) {
	}
	return (lang || navigator.language || 'en').replace(/-.*/, '');
}

function setStoredLanguage (lang) {
	try {
		localStorage.setItem('tts-stored-language', lang);
	} catch (e) {
	}
}

function translate (lang, key) {
	var msg = l10n[lang] || {};
	return msg[key] || (key === 'native' ? lang : l10n.en[key]);
}

function getLanguages () {
	var langs = [], voices = speechSynthesis.getVoices(), i, lang;
	for (i = 0; i < voices.length; i++) {
		lang = voices[i].lang.replace(/-.*/, '');
		if (langs.indexOf(lang) === -1) {
			langs.push(lang);
		}
	}
	return langs;
}

function initDom () {
	dom.loading = document.getElementById('loading');
	dom.main = document.getElementById('main');
	dom.languagesLabel = document.getElementById('languages-label');
	dom.languagesInput = document.getElementById('languages-input');
	dom.textboxButton = document.getElementById('textbox-button');
	dom.textboxPanel = document.getElementById('textbox-panel');
	dom.textboxLabel = document.getElementById('textbox-label');
	dom.textboxInput = document.getElementById('textbox-input');
	dom.fileButton = document.getElementById('file-button');
	dom.filePanel = document.getElementById('file-panel');
	dom.fileLabel = document.getElementById('file-label');
	dom.wikipediaButton = document.getElementById('wikipedia-button');
	dom.wikipediaPanel = document.getElementById('wikipedia-panel');
	dom.wikipediaLabel = document.getElementById('wikipedia-label');
	dom.wikipediaInput = document.getElementById('wikipedia-input');
	dom.buttonPlayPause = document.getElementById('button-play-pause');
	dom.buttonAbort = document.getElementById('button-abort');
	dom.error = document.getElementById('error');

	dom.languagesInput.onchange = onLanguage;
	dom.textboxButton.classList.add('selected');
	dom.textboxButton.onclick = onTextbox;
	dom.fileButton.onclick = onFile;
	dom.wikipediaButton.onclick = onWikipedia;
	dom.filePanel.hidden = true;
	dom.wikipediaPanel.hidden = true;
	dom.buttonPlayPause.className = 'play';
	dom.buttonAbort.disabled = true;
	dom.buttonPlayPause.onclick = onPlay;
	dom.buttonAbort.onclick = onAbort;
	dom.error.style.display = 'none';
}

function initSpeakers () {
	speakers.textbox = new TextboxSpeaker(dom.textboxInput);
	speakers.textbox.onChange = updateButtons;
	speakers.file = new FileSpeaker();
	speakers.file.onChange = updateButtons;
	speakers.wikipedia = new WikipediaSpeaker(dom.wikipediaInput);
	speakers.wikipedia.onChange = updateButtons;
	speakers.current = speakers.textbox;
}

function initInterface () {
	changeLang(getStoredLanguage());
	dom.loading.hidden = true;
	dom.main.hidden = false;
}

function updateTranslations (lang) {
	document.title = translate(lang, 'title');
	dom.languagesLabel.textContent = translate(lang, 'language');
	dom.textboxButton.textContent = translate(lang, 'textboxButton');
	dom.textboxInput.placeholder = translate(lang, 'textboxButton');
	dom.textboxLabel.textContent = translate(lang, 'textboxLabel');
	dom.fileButton.textContent = translate(lang, 'fileButton');
	dom.fileLabel.textContent = translate(lang, 'fileLabel');
	dom.wikipediaButton.textContent = translate(lang, 'wikipediaButton');
	dom.wikipediaInput.placeholder = translate(lang, 'wikipediaButton');
	dom.wikipediaLabel.textContent = translate(lang, 'wikipediaLabel');
	dom.error.textContent = translate(lang, 'error');
	speakers.file.setPrompt(translate(lang, 'pdfPrompt'));
}

function updateLanguageInput (langs) {
	var selected = getStoredLanguage();
	if (langs.indexOf(selected) === -1) {
		selected = langs[0];
		changeLang(selected);
	}
	dom.languagesInput.innerHTML = langs.map(function (lang) {
		return '<option value="' + lang + '"' + (lang === selected ? ' selected' : '') + '>' +
			translate(lang, 'native') + '</option>';
	}).join('');
}

function updateButtons (status) {
	switch (status) {
	case 'playing':
		dom.buttonPlayPause.className = 'pause';
		dom.buttonAbort.disabled = false;
		dom.buttonPlayPause.onclick = onPause;
		dom.error.style.display = 'none';
		break;
	case 'pausing':
		dom.buttonPlayPause.className = 'play';
		dom.buttonAbort.disabled = false;
		dom.buttonPlayPause.onclick = onPlay;
		dom.error.style.display = 'none';
		break;
	case 'error':
		dom.buttonPlayPause.className = 'play';
		dom.buttonAbort.disabled = true;
		dom.buttonPlayPause.onclick = onPlay;
		dom.error.style.display = '';
		break;
	case 'end':
		dom.buttonPlayPause.className = 'play';
		dom.buttonAbort.disabled = true;
		dom.buttonPlayPause.onclick = onPlay;
		dom.error.style.display = 'none';
		break;
	}
}

function changeLang (lang) {
	updateTranslations(lang);
	speakers.textbox.setLang(lang);
	speakers.file.setLang(lang);
	speakers.wikipedia.setLang(lang);
	setStoredLanguage(lang);
}

function onVoices () {
	var langs = getLanguages();
	if (!langs.length) {
		return;
	}
	updateLanguageInput(langs);
	if (needsInit) {
		needsInit = false;
		initInterface();
	}
}

function onLanguage () {
	changeLang(dom.languagesInput.options[dom.languagesInput.selectedIndex].value);
}

function onTextbox () {
	dom.textboxButton.classList.add('selected');
	dom.fileButton.classList.remove('selected');
	dom.wikipediaButton.classList.remove('selected');
	dom.textboxPanel.hidden = false;
	dom.filePanel.hidden = true;
	dom.wikipediaPanel.hidden = true;
	speakers.current = speakers.textbox;
	dom.textboxInput.select();
	dom.textboxInput.focus();
}

function onFile () {
	dom.textboxButton.classList.remove('selected');
	dom.fileButton.classList.add('selected');
	dom.wikipediaButton.classList.remove('selected');
	dom.textboxPanel.hidden = true;
	dom.filePanel.hidden = false;
	dom.wikipediaPanel.hidden = true;
	speakers.current = speakers.file;
}

function onWikipedia () {
	dom.textboxButton.classList.remove('selected');
	dom.fileButton.classList.remove('selected');
	dom.wikipediaButton.classList.add('selected');
	dom.textboxPanel.hidden = true;
	dom.filePanel.hidden = true;
	dom.wikipediaPanel.hidden = false;
	speakers.current = speakers.wikipedia;
	dom.wikipediaInput.select();
	dom.wikipediaInput.focus();
}

function onPlay () {
	speakers.current.play();
}

function onPause () {
	speakers.current.pause();
}

function onAbort () {
	speakers.current.abort();
}

function setup () {
	if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
		document.getElementById('loading').textContent = translate(getStoredLanguage(), 'noSpeech');
		return;
	}
	initDom();
	initSpeakers();
	onVoices();
	speechSynthesis.onvoiceschanged = onVoices;
	setTimeout(function () {
		if (needsInit) {
			document.getElementById('loading').textContent = translate(getStoredLanguage(), 'noVoices');
		}
	}, 5000);
}

window.onload = setup;
})();