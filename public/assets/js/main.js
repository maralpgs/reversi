function getIRIParameterValue(requestedKey) {
    let pageIRI = window.location.search.substring(1);
    let pageIRIVariables = pageIRI.split('&');
    for (let i = 0; i < pageIRIVariables.length; i++) {
        let data = pageIRIVariables[i].split('=');
        let key = data[0];
        let value = data[1];
        if (key === requestedKey) {
            return value;
        }
    }
    return null;
}

let username = decodeURI(getIRIParameterValue('username'));
if ((typeof username == 'undefined') || (username === null) || (username === 'null') || (username === '')) {
    username = "Anonymous_" + Math.floor(Math.random() * 1000);
}

// Prints name of user in webpage
$('#messages').prepend('<b>' + username + ':</b>');

let chatRoom = decodeURI(getIRIParameterValue('game_id'));
if ((typeof chatRoom == 'undefined') || (chatRoom === null) || (chatRoom === 'null')) {
    chatRoom = 'Lobby';
}


// Create Invite button
function makeInviteButton(socket_id) {
    let newHTML = "<button type='button' class='btn btn-outline-primary'>Invite</button>";
    let newNode = $(newHTML);

    // Add interactivity to Invite Button
    // This is the code for the function called when button is Invite button clicked
    newNode.click(() => {
        let payload = {
            requested_user: socket_id
        }
        console.log("**** Client log message, sending \'invite\' command: " + JSON.stringify(payload));
        socket.emit('invite',payload);
    });
    return newNode;
}



// Create Invited button
//function makeInvitedButton(socket_id) {
function makeInvitedButton(socket_id) {

    //Debugging log
    console.log(" ");
    console.log("main.js MakeInvidedButton");


    let newHTML = "<button type='button' class='btn btn-primary'>Invited</button>";
    let newNode = $(newHTML);

    // Add interactivity to Invited Button
    newNode.click(() => {
        let payload = {
            requested_user: socket_id
        }
        console.log("**** Client log message, sending \'uninvite\' command: " + JSON.stringify(payload));
        socket.emit('uninvite', payload);
    });
    return newNode;
}



// Create Play button

function makePlayButton(socket_id) {
    let newHTML = "<button type='button' class='btn btn-success'>Play</button>";
    let newNode = $(newHTML);

    // Add interactivity to Play Button
    newNode.click(() => {
        let payload = {
             requested_user: socket_id
        }
        console.log("**** Client log message, sending \'game_start\' command: " + JSON.stringify(payload));
        socket.emit('game_start', payload);
       });
    return newNode;
}


// Create Game Start button. No interactivity needed

function makeStartGameButton() {
    let newHTML = "<button type='button' class='btn btn-danger'>Starting Game</button>";
    let newNode = $(newHTML);
    return newNode;
}


/* Set up the socket.io connection to the server */
let socket = io();


/* Received 'invite' response from server                   */
/* This is broadcasted to player that originated invitation */
/* Client should change button: Invite->Invited             */

socket.on('invite_response', (payload) => {
    //Debugging log
    console.log("");
    console.log('main.js - socket.on invite_reponse');

    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('invite_response: Server did not send a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        return;
    }
    // This will replace Invite button with Invited button
    let newNode = makeInvitedButton(payload.socket_id);
    $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);

    // Debugging log
    console.log('main.js - socket.on invite_reponse - Replaced previous button with Invited Button button');
})




/* Server sends this message when another player sent an invitation to another player */
/* This message is broadcasted to all players in the room (I think)                   */
/* Received an envitation ('invited' response)                                        */
/* Client should change current button to Play                                        */

socket.on('invited', (payload) => {
    //Debugging log
    console.log("");
    console.log('main.js - socket.on invited');

    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('invite_response: Server did not send a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        return;
    }
    // This will replace Invite button with Invited button
    let newNode = makePlayButton(payload.socket_id);
    $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);

    // Debugging log
    console.log('main.js - socket.on invited - Replaced current button with Play button');
})



/* Received uninvite response*/

socket.on('uninvited', (payload) => {
    // Debugging log
    console.log("");
    console.log('main.js - socket.on uninvited');

    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('uninvite_response: Server did not send a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        return;
    }
    // This will replace Invited button with Invite button
    let newNode = makeInviteButton(payload.socket_id);
    $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);

    // Debugging log
    console.log('main.js - socket.on uninvited - Replaced Invited with Invite button');
})




/* Received game_start response*/

socket.on('game_start_response', (payload) => {
    // Debugging log
    console.log("");
    console.log('main.js - socket.on game_start_response');

    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('uninvite_response: Server did not send a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        return;
    }

    // This will replace button with StartGame button
    // This button is just to show that Game will start.
    // Player does not need to click on the button.
    let newNode = makeStartGameButton();
    $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);

    // Debugging log
    console.log('main.js - socket.on game_start_response - Replaced button with StartGame button');

    // Jump to the game page
    console.log('main.js - socket.on game_start_response - game page is going to be game.html?username=' + username + '&game_id=' + payload.game_id);
    window.location.href = 'game.html?username=' + username + '&game_id=' + payload.game_id;

})




socket.on('log', function (array) {
    console.log.apply(console, array);
});

socket.on('join_room_response', (payload) => {
    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('join_room_response: Server did not sent a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        return;
    }

    /* If notification is about ourselves, then ignore and return */
    if (payload.socket_id === socket.id) {
        return;
    }

    let domElements = $('.socket_' + payload.socket_id);
    if (domElements.length !== 0) {
        return;
    }

    // Add buttons
    let nodeA = $("<div></div>");
    nodeA.addClass("row");
    nodeA.addClass("align-items-center");
    nodeA.addClass("socket_" + payload.socket_id);
    nodeA.hide();

    let nodeB = $("<div></div>");
    nodeB.addClass("col");
    nodeB.addClass("text-end");
    nodeB.addClass("socket_" + payload.socket_id);
    nodeB.append('<h2>' + payload.username +'</h2 >');

    let nodeC = $("<div></div>");
    nodeC.addClass("col");
    nodeC.addClass("text-start");
    nodeC.addClass("socket_" + payload.socket_id);
    let buttonC = makeInviteButton(payload.socket_id);
    nodeC.append(buttonC);

    nodeA.append(nodeB);
    nodeA.append(nodeC);

    $("#players").append(nodeA);
    nodeA.show("fade", 1000);

    // Announcing in the chat that someone has arrived
    let newHTML = '<p class=\'join_room_response\'>' + payload.username +
        ' joined the ' + payload.room +
        '. (There are ' + payload.count + ' users in this room)</p>';
    let newNode = $(newHTML);
    newNode.hide;
    $('#messages').prepend(newNode);
    newNode.show("fade", 500);

})


socket.on('player_disconnected', (payload) => {
    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not sent a payload');
        return;
    }

    if (payload.socket_id === socket.id) {
        return;
    }

    let domElements = $('.socket_' + payload.socket_id);
    if (domElements.length !== 0) {
        domElements.hide("fade", 500);
    }


    let newHTML = '<p class=\'left_room_response\'>' +
        payload.username + ' left the ' + payload.room +
        '. (There are ' + payload.count + ' users in this room)</p>';
    let newNode = $(newHTML);
    newNode.hide;
    $('#messages').prepend(newNode);
    newNode.show("fade", 500);



})

/* Send chat message */
function sendChatMessage() {
    let request = {};
    request.room = chatRoom;
    request.username = username;
    request.message = $('#chatMessage').val();
    console.log("**** Client log message, sending \'send_chat_message\' command: " + JSON.stringify(request));
    socket.emit('send_chat_message', request);
    $('#chatMessage').val("");
}


/* Send chat message response*/

socket.on('send_chat_message_response', (payload) => {
    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not sent a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        return;
    }
    let newHTML = '<p class=\'chat_message\'><b>' + payload.username + '</b>: ' + payload.message + '</p>';
    let newNode = $(newHTML);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show("fade",500);
})


/* Request to join the chat room */
$(() => {
    let request = {};
    request.room = chatRoom;
    request.username = username;
    console.log("**** Client log message, sending \'join room\' command: " + JSON.stringify(request));
    socket.emit('join_room', request);

    $("#lobbyTitle").html(username + "'s Lobby " + socket.id);

    $('#chatMessage').keypress(function (e) {
        let key = e.which;
        if (key == 13) {
            $('button[id = chatButton]').click();
            return false;
        }
    });
});