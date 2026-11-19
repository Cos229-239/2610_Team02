'use strict';

// Older graphics installers verify room.js byte for byte. Adapt only the two known
// entry calls when serving that version to the chamber. Leave explicit Help and audio actions intact.
function quietEntry(source) {
    return source.replace(";say('Welcome to Towerflow. Can I assist you? Pun intended.',true)", '')
        .replace('window.tfRockyGreeting?.onEnter();', '');
}
// When the account desk is installed, use it before the legacy IDE can read the host checkout.
function memberEntry(source) {
    const open = 'if(window.tfOpenMemberDesk?.()) return;';
    for (const marker of ['async function idePanel(){', 'function openFrontierIDE(){', "if (id.startsWith('dev-ide-')) {"]) {
        source = source.replace(marker, marker + open);
    }
    return source.replace('function addContributionEntry(panel) {', 'function addContributionEntry(panel) {if(panel?.querySelector("[data-teammate-workspace]"))return;');
}
module.exports = {quietEntry, memberEntry};
