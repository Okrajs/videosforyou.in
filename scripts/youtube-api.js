;(function () {
    'use strict';
    /* global Okra, document */
    var video = document.getElementById('flashplayer');
    var image = document.getElementById('cover-image');
    
    var currentTimeEvent = Okra.provide('event', 'currentTimeChanged')
                               .allowReferrer();

    var currentTimeInterval = null;


    Okra.provide('call', 'play', function () {
        video.playVideo();
        image.style.display = "none";
        
        var currentTimeInterval = setInterval(function () {
            currentTimeEvent.emit({
                currentTime: player.getCurrentTime()
            });
        }, 500);
    }).allowReferrer();
    
    Okra.provide('call', 'stop', function () {
        video.stopVideo();
        image.style.display = "block";
        clearInterval(currentTimeInterval);
    }).allowReferrer();
    
    Okra.provide('get', 'duration', function () {
        return video.getDuration() || 0;
    }).allowReferrer();
    
    Okra.useManualLoadEvent();
    window.onYouTubePlayerReady = function () {
        video.pauseVideo();
        Okra.emitLoadEvent();
    };
}());

