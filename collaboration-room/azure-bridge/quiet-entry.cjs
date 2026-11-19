'use strict';

// Older graphics installers verify room.js byte for byte. Adapt only the two known
// entry calls when serving that version to the chamber. Leave explicit Help and audio actions intact.
function quietEntry(source) {
    return source.replace(";say('Welcome to Towerflow. Can I assist you? Pun intended.',true)", '')
        .replace('window.tfRockyGreeting?.onEnter();', '');
}
module.exports = {quietEntry};
