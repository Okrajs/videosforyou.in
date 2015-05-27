;(function () {
    'use strict';
    /* global Okra, document */
    
    var video = document.getElementById('video');
    
    Okra.provide('set', 'isHighQuality', function (isHighQuality) {
        if (isHighQuality) {
            video.style.webkitFilter = "";
        } else {
            var filter = "contrast(3) grayscale(0.1) sepia(0.2)";
            video.style.webkitFilter = filter;
        }
    }).allowReferrer();
    
    Okra.provide('call', 'play', function () {
        video.src = video.dataset.animated;
    }).allowReferrer();
    
    Okra.provide('call', 'stop', function () {
        video.src = video.dataset.still;
    }).allowReferrer();
}());

