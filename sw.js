/*global caches, fetch, Promise */
(function (worker) {
"use strict";

var VERSION = 'v1.1',
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
		caches.open(VERSION).then(function (cache) {
			return cache.addAll(FILES);
		})
	);
});

worker.addEventListener('activate', function (e) {
	e.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(keys.map(function (key) {
				if (key !== VERSION) {
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