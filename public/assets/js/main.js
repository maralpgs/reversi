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
        ' joined the chatroom. (There are ' + payload.count + ' users in this room)</p>';
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
        payload.username + ' left the chatroom. (There are ' + payload.count + ' users in this room)</p>';
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
    //$('#messages').prepend(newNode);
    $('#messages').append(newNode);
    newNode.show("fade",500);
})



// Create game board
// Initial status is unknown (?)
let old_board = [
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
 ];

let my_color = "";
let interval_timer;


/* Handles game update messages from server */
socket.on('game_update', (payload) => {
    console.log('received game_update from server' + JSON.stringify(payload));


    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not sent a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        return;
    }

    // Client needs to keep track of the game board too
    let board = payload.game.board;
    if ((typeof board == 'undefined') || (board === null)) {
        console.log('Server did not sent a valid board to display');
        return;
    }
    else {
        // Debugging
        console.log(board);
    }

    let white_username = payload.game.player_white.username;
    let black_username = payload.game.player_black.username;
    const t = Date.now();

    // Update my color
    if (socket.id === payload.game.player_white.socket) {
        my_color = 'white';
    }
    else if (socket.id === payload.game.player_black.socket) {
        my_color = 'black';
    }
    else {
        window.location.href = 'lobby.html?username=' + username;
    }

   
    if (my_color === 'white') {
        $("#my_token").replaceWith('<img id="my_token" width="32" height="32" src="assets/images/white.gif?time=' + t + '" alt="white Token" />');
        $('#my_color').html('<p class="lead" id="my_color">' +white_username+', your tokens are white</p>');
    }
    else if (my_color === 'black') {
        $("#my_token").replaceWith('<img id="my_token" width="32" height="32" src="assets/images/black.gif?time=' + t + '" alt="Black Token" />');
        $('#my_color').html('<p class="lead" id="my_color">' +black_username+', your tokens are black</p>');
    }
    else {
        $('#my_color').replaceWith('<p class="lead" id="my_color">My token color: not known</p>');
    }


    let whose_turn = payload.game.whose_turn;
    // Update message about whose turn it is
    if (my_color === whose_turn) {
        $('#whose_turn').html('<p class="lead" id="whose_turn">It\'s your turn</p >');
    }
    else if (whose_turn === 'white') {
        $('#whose_turn').html('<p class="lead" id="whose_turn">It\'s ' + white_username + '\'s turn</p >');
    }
    else if (whose_turn === 'black') {
        $('#whose_turn').html('<p class="lead" id="whose_turn">It\'s ' + black_username + '\'s turn</p >');
    }
    else {
        $('#whose_turn').html('<p class="lead" id="whose_turn">Nobody\'s turn</p >');
    }


    let whiteSum = 0;
    let blackSum = 0;

    // Animate all the changes to the board
    for (row = 0; row < 8; row++) {
        for (column = 0; column < 8; column++) {
            // Updating score
            if (board[row][column] === 'w') {
                whiteSum++;
            }
            else if (board[row][column] === 'b') {
                blackSum++;
            }


            /*Check to see if the server changed any spaces on the board */
            if (old_board[row][column] !== board[row][column]) {
                let graphic = "";
                let altTag = "";

                if ((old_board[row][column] === '?') && (board[row][column] === ' ')) {
                    graphic = "empty.gif";
                    altTag = "empty space";
                }

                else if ((old_board[row][column] === '?') && (board[row][column] === 'w')) {
                    graphic = "empty_to_white.gif";
                    altTag = "white token";
                }
                else if ((old_board[row][column] === '?') && (board[row][column] === 'b')) {
                    graphic = "empty_to_black.gif";
                    altTag = "black token";
                }

                else if ((old_board[row][column] === ' ') && (board[row][column] === 'w')) {
                    graphic = "empty_to_white.gif";
                    altTag = "white token";
                }
                else if ((old_board[row][column] === ' ') && (board[row][column] === 'b')) {
                    graphic = "empty_to_black.gif";
                    altTag = "black token";
                }

                else if ((old_board[row][column] === 'w') && (board[row][column] === ' ')) {
                    graphic = "empty.gif";
                    altTag = "empty space";
                }
                else if ((old_board[row][column] === 'b') && (board[row][column] === ' ')) {
                    graphic = "empty.gif";
                    altTag = "empty space";
                }

                else if ((old_board[row][column] === 'b') && (board[row][column] === 'w')) {
                    graphic = "black_to_white.gif";
                    altTag = "white token";
                }
                else if ((old_board[row][column] === 'w') && (board[row][column] === 'b')) {
                    graphic = "white_to_black.gif";
                    altTag = "black token";
                }

                else {
                    graphic = "error.gif";
                    altTag = "error";
                }


                // Update graphic on this cell of the board in html page
                $('#' + row + '_' + column).html('<img class="img-fluid" src="assets/images/' + graphic + '?time=' + t + '"alt="' + altTag + '" />');

            }

            // Reset interactivity on the cell
            $('#' + row + '_' + column).off('click');
            $('#' + row + '_' + column).removeClass('hovered_over');

            // If it is this player's turn, then add interactivity to empty cells
            if (payload.game.whose_turn === my_color) {
                if (payload.game.legal_moves[row][column] === my_color.substr(0, 1)) {
                    $('#' + row + '_' + column).addClass('hovered_over');
                    $('#' + row + '_' + column).click(function (r, c) {
                        return function () {
                            var payload = {};
                            payload.row = r;
                            payload.column = c;
                            payload.color = my_color;

                            console.log('*** Client Log Message: sending \'play_token\' command: ' + JSON.stringify(payload));
                            socket.emit('play_token', payload);
                        };
                    }(row, column));
                }
            }

        }
    }

    // Update timer
    // 1 minute timer
    const time_limit = 60;
    clearInterval(interval_timer)
    interval_timer = setInterval(((last_time) => {
        return (() => {
            let d = new Date();
            let elapsed_m = d.getTime() - last_time;
            let minutes = Math.floor(elapsed_m / (1000 * 60));
            let seconds = Math.floor((elapsed_m % (60 * 1000)) / 1000);
            //let total = minutes * 60 + seconds;
            total = ((minutes*60)+(seconds / time_limit)) * 100;
            if (total > 100) {
                total = 100;

            }
            $("#elapsed").css("width", total + "%").attr("aria-valuenow", total);

            let text_color = '';
            if (total < 50) {
                $("#elapsed").removeClass("bg-success");
                $("#elapsed").removeClass("bg-warning");
                $("#elapsed").removeClass("bg-danger");
                $("#elapsed").addClass("bg-success");
                text_color = 'white';
            }
            else if (total < 75){
                $("#elapsed").removeClass("bg-success");
                $("#elapsed").removeClass("bg-warning");
                $("#elapsed").removeClass("bg-danger");
                $("#elapsed").addClass("bg-warning");
                text_color = 'black';
            }   
            else if (total > 75) {
                $("#elapsed").removeClass("bg-success");
                $("#elapsed").removeClass("bg-warning");
                $("#elapsed").removeClass("bg-danger");
                $("#elapsed").addClass("bg-danger");
                text_color = 'white'; 
            }

            $("#elapsed").css("color", text_color);


            let timestring = "" + seconds;
            timestring = timestring.padStart(2, '0');
            timestring = minutes + ":" + timestring;
            if (total >= 100) 
                $("#elapsed").html("Times up!");
            else {
                $("#elapsed").html(timestring);
            }
            
        })
    })(payload.game.last_move_time)
        , 1000);



    // Update score
    $("#whitePlayer").html(white_username);
    $("#whitesum").html(whiteSum);
    $("#blacksum").html(blackSum);
    $("#blackPlayer").html(black_username);

    old_board = board;

})



/* Handles play_token responses from server */
socket.on('play_token_response', (payload) => {
    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not sent a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        alert(payload.message);
        return;
    }
})




/* Handles game_over messages from server */
socket.on('game_over', (payload) => {
    if ((typeof payload == 'undefined') || (payload === null)) {
        console.log('Server did not sent a payload');
        return;
    }
    if (payload.result === 'fail') {
        console.log(payload.message);
        return;
    }

    
    let winner = payload.who_won;
    if ( winner === 'white') {
        winner = payload.game.player_white.username + ' won the game!';
    }
    else if (winner === 'black') {
        winner = payload.game.player_black.username + ' won the game!';
    }
    console.log("Who won: " + payload.who_won);
    console.log('player_white username : ' + payload.game.player_white.username);
    console.log('player_black username : ' + payload.game.player_black.username);
    console.log("Winner: " + winner);

    // Announce that game is over, and add a button to go to lobby
    let nodeA = $("<div id='game_over'></div>");
    let nodeB = $("<h1>Game Over</h1>");
    let nodeC = $("<h2>"+ winner+"</h2>");
    let nodeD = $("<a href='lobby.html?username=" + username + "' class='btn btn-lg btn-success' role='button' >Return to lobby</a>");
    nodeA.append(nodeB);
    nodeA.append(nodeC);
    nodeA.append(nodeD);
    nodeA.hide();
    $('#game_over').replaceWith(nodeA);
    nodeA.show("face", 1000);
})


/* Request to join the chat room */
$(() => {
    let request = {};
    request.room = chatRoom;
    request.username = username;
    console.log("**** Client log message, sending \'join room\' command: " + JSON.stringify(request));
    socket.emit('join_room', request);

    $("#lobbyTitle").html(username + "'s Lobby ");

    //Creating quit button
    $("#quit").html("<a href='lobby.html?username=" + username + "' class='btn btn-danger' role='button' >Quit</a>");

    $('#chatMessage').keypress(function (e) {
        let key = e.which;
        if (key == 13) {
            $('button[id = chatButton]').click();
            return false;
        }
    });
});



