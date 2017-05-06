/*global console */
(function () {
"use strict";

var speechSynthesis = {
	getVoices: function () {
		return [{
			lang: 'en'
		}, {
			lang: 'de'
		}];
	},
	resume: console.log.bind(console, 'resume'),
	pause: console.log.bind(console, 'pause'),
	speak: console.log.bind(console)
};

function SpeechSynthesisUtterance (text) {
	this.text = text;
	setTimeout(function () {
		this.onend();
	}.bind(this), 1000);
}

SpeechSynthesisUtterance.prototype = {
	toString: function () {
		return this.lang + ' - ' + this.text;
	}
};

window.speechSynthesis = speechSynthesis;
window.SpeechSynthesisUtterance = SpeechSynthesisUtterance;

})();