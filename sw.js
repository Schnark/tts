/*global caches, fetch, Promise */
(function (worker) {
"use strict";

var PREFIX = 'tts',
	VERSION = '1.3',
	FILES = [
		'app.css',
		'app.js',
		'index.html',
		'speaker.js',
		'img/icon512.png',
		'img/pause.svg',
		'img/play.svg',
		'img/stop.svg',
		'pdf/pdf.js',
		'pdf/pdf.worker.js'
	];

worker.addEventListener('install', function (e) {
	e.waitUntil(
		caches.open(PREFIX + ':' + VERSION).then(function (cache) {
			return cache.addAll(FILES);
		})
	);
});

worker.addEventListener('activate', function (e) {
	e.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(keys.map(function (key) {
				if (key.indexOf(PREFIX + ':') === 0 && key !== PREFIX + ':' + VERSION) {
					return caches.delete(key);
				}
			}));
		})
	);
});

worker.addEventListener('fetch', function (e) {
	e.respondWith(caches.match(e.request, {ignoreSearch: true})
		.then(function (response) {
			return response || fetch(e.request);
		})
	);
});

})(this);