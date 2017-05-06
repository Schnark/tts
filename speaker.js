/*global MozActivity, speechSynthesis, SpeechSynthesisUtterance */
(function () {
"use strict";

function getFile (callback) {
	var pick;
	if (window.MozActivity) {
		pick = new MozActivity({
			name: 'pick'
		});

		pick.onsuccess = function () {
			callback(this.result.blob);
		};

		pick.onerror = function () {
			callback();
		};
	} else {
		pick = document.createElement('input');
		pick.type = 'file';
		pick.style.display = 'none';
		document.getElementsByTagName('body')[0].appendChild(pick);
		pick.addEventListener('change', function () {
			var file = pick.files[0];
			if (file) {
				callback(file);
			} else {
				callback();
			}
			document.getElementsByTagName('body')[0].removeChild(pick);
		}, false);
		pick.click();
	}
}

function AbstractSpeaker () {
}

AbstractSpeaker.prototype = {
	setLang: function (lang) {
		this.lang = lang;
	},
	setState: function (state) {
		this.state = state === 'error' ? '' : state;
		this.onChange(state || 'end');
	},
	onChange: function (/*status*/) {
	},
	getText: function (/*callback*/) {
		throw 'abstract';
	},
	abortGetText: function () {
		throw 'abstract';
	},
	initWithText: function (text) {
		if (!text) {
			this.setState('error');
			return;
		}
		this.hasText = true;
		this.utterance = new SpeechSynthesisUtterance(text);
		this.utterance.lang = this.lang;
		this.utterance.onend = function () {
			this.setState('');
		}.bind(this);
		speechSynthesis.speak(this.utterance);
	},
	play: function () {
		if (this.state === 'playing') {
			return;
		}
		if (!this.state) {
			this.hasText = false;
			this.getText(this.initWithText.bind(this));
		}
		this.setState('playing');
		speechSynthesis.resume();
	},
	pause: function () {
		if (this.state === 'playing') {
			this.setState('pausing');
			speechSynthesis.pause();
		}
	},
	abort: function () {
		if (!this.state) {
			return;
		}
		if (this.hasText) {
			speechSynthesis.cancel();
		} else {
			this.abortGetText();
		}
		this.setState('');
	}
};

function TextboxSpeaker (textbox) {
	this.textbox = textbox;
}

TextboxSpeaker.prototype = new AbstractSpeaker();

TextboxSpeaker.prototype.getText = function (callback) {
	var text = this.textbox.value;
	this.getTextId = setTimeout(function () {
		callback(text);
	}, 0);
};

TextboxSpeaker.prototype.abortGetText = function () {
	this.clearTimeout(this.getTextId);
};

function FileSpeaker () {
}

FileSpeaker.prototype = new AbstractSpeaker();

FileSpeaker.prototype.getText = function (callback) {
	this.reader = false;
	getFile(function (file) {
		if (this.isAborted) {
			this.isAborted = false;
			return;
		}
		if (!file) {
			callback();
		}
		this.reader = new FileReader();
		this.reader.onload = function (e) {
			callback(e.target.result);
		};
		this.reader.onerror = function () {
			callback();
		};
		this.reader.readAsText(file);
	}.bind(this));
};

FileSpeaker.prototype.abortGetText = function () {
	if (this.reader) {
		this.reader.abort();
	} else {
		this.isAborted = true;
	}
};

function WikipediaSpeaker (title) {
	this.title = title;
}

WikipediaSpeaker.prototype = new AbstractSpeaker();

WikipediaSpeaker.prototype.getText = function (callback) {
	var title = this.title.value, url;

	if (!title || title.indexOf('|') > -1) {
		setTimeout(function () {
			callback();
		}, 0);
		return;
	}
	url = 'https://' + this.lang + '.wikipedia.org/w/api.php?' + [
		['origin', '*'], //for CORS
		['action', 'query'],
		['titles', title],
		['redirects', '1'], //follow redirects
		['prop', 'extracts'], //get extract
		['exintro', '1'], //only from introduction
		['explaintext', '1'], //as plaintext
		['format', 'json'],
		['formatversion', '2']
	].map(function (param) {
		return param[0] + '=' + encodeURIComponent(param[1]);
	}).join('&');

	this.xhr = new XMLHttpRequest();
	this.xhr.open('GET', url);
	this.xhr.responseType = 'json';
	this.xhr.onload = function (e) {
		try {
			callback(e.target.response.query.pages[0].extract);
		} catch (e) {
			callback();
		}
	};
	this.xhr.onerror = function () {
		callback();
	};
	this.xhr.send();
};

WikipediaSpeaker.prototype.abortGetText = function () {
	this.xhr.abort();
};

window.TextboxSpeaker = TextboxSpeaker;
window.FileSpeaker = FileSpeaker;
window.WikipediaSpeaker = WikipediaSpeaker;

})();