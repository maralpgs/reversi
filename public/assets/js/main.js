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
if ((typeof username == 'undefined') || (username === null) || (username === 'null')) {
    username = "Anonymous_" + Math.floor(Math.random() * 1000);
}

// Prints name of user in webpage
$('#messages').prepend('<b>' + username + ':</b>');

let chatRoom = decodeURI(getIRIParameterValue('game_id'));
if ((typeof chatRoom == 'undefined') || (chatRoom === null) || (chatRoom === 'null')) {
    chatRoom = 'Lobby';
}


// Create buttons
function makeInviteButton() {
    let newHTML = "<button type='button' class='btn btn-outline-primary'>Invite</button>";
    let newNode = $(newHTML);
    return newNode;
}




/* Set up the socket.io connection to the server */
let socket = io();
socket.on('log', function (array) {
    console.log.apply(console, array);
});

socket.on('join_room_response', (payload) => {
    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not sent a payload');
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
    let buttonC = makeInviteButton();
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

    $("#lobbyTitle").html(username + "'s Lobby");

    $('#chatMessage').keypress(function (e) {
        let key = e.which;
        if (key == 13) {
            $('button[id = chatButton]').click();
            return false;
        }
    });
});