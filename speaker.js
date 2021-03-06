/*global MozActivity, speechSynthesis, SpeechSynthesisUtterance, URL, PDFJS */
(function () {
"use strict";

function getFile (callback) {
	var pick;
	if (window.MozActivity) {
		pick = new MozActivity({
			name: 'pick',
			data: {
				type: [
					'text/plain',
					'application/pdf'
				]
			}
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

function getAsText (file, callback, prompt) {
	if (file.name && file.name.slice(-4) === '.pdf') {
		return getPdfAsText(file, callback, prompt);
	} else {
		return getTextfileAsText(file, callback);
	}
}

function getTextfileAsText (file, callback) {
	var reader = new FileReader();
	reader.onload = function (e) {
		callback(e.target.result);
	};
	reader.onerror = function () {
		callback();
	};
	reader.readAsText(file);
	return function () {
		reader.abort();
	};
}

function getPdfAsText (file, callback, prompt) {
	var aborted, url = URL.createObjectURL(file);
	PDFJS.getDocument(url).then(function (pdf) {
		var pageNum, pages = [], start, end, range;

		function getTextFromPage (page) {
			return page.getTextContent().then(function (textContent) {
				return textContent.items.map(function (item) {
					return item.str;
				}).join('\n');
			});
		}

		start = 1;
		end = pdf.numPages;
		if (start !== end) {
			range = start + '-' + end;
			range = window.prompt(prompt, range);
			range = /^(\d+)(?:-(\d+))?$/.exec(range || '');
			if (!range) {
				return;
			}
			start = Number(range[1]);
			end = Number(range[2] || start);
		}
		for (pageNum = start; pageNum <= end; pageNum++) {
			pages.push(pdf.getPage(pageNum).then(getTextFromPage));
		}

		return pages.reduce(function (prevPages, thisPage) {
			return prevPages.then(function (prevText) {
				return thisPage.then(function (thisText) {
					return prevText + '\n' + thisText;
				});
			});
		});
	}).then(null, function () {})
	.then(function (text) {
		URL.revokeObjectURL(url);
		if (!aborted) {
			callback(text);
		}
	});
	return function () {
		aborted = true;
		callback();
	};
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
	this.prompt = '';
}

FileSpeaker.prototype = new AbstractSpeaker();

FileSpeaker.prototype.playFile = function (file) {
	this.file = file;
	this.play();
};

FileSpeaker.prototype.getText = function (callback) {
	this.reader = false;
	if (this.file) {
		this.doAbort = getAsText(this.file, callback, this.prompt);
		this.file = false;
		return;
	}
	getFile(function (file) {
		if (this.isAborted) {
			this.isAborted = false;
			return;
		}
		if (!file) {
			callback();
		}
		this.doAbort = getAsText(file, callback, this.prompt);
	}.bind(this));
};

FileSpeaker.prototype.abortGetText = function () {
	if (this.doAbort) {
		this.doAbort();
	} else {
		this.isAborted = true;
	}
};

FileSpeaker.prototype.setPrompt = function (prompt) {
	this.prompt = prompt;
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