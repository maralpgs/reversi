/*********************************/
/* Set up the static file server */
/*********************************/
let static = require('node-static');

/* Set up the http server library */
let http = require('http');

/* Assume that we are running on Heroku */
let port = process.env.PORT;
let directory = __dirname + '/public';

/* If we aren't on Heroku then we need to adjust our port and directory */
if ((typeof port == 'undefined') || (port == null)) {
    port = 8080;
    directory = './public';
}

/* Set up our static file web server to deliver files from the filesystem */
let file = new static.Server(directory);

let app = http.createServer(
    function (request, response) {
        request.addListener('end',
            function () {
                file.serve(request, response);
            }
        ).resume();
    }
).listen(port);

console.log('The server is running');



/*********************************/
/* Set up the web socket server  */
/*********************************/

/* Set up a registry of player information and their socket ids */
let players = [];

const { Server } = require("socket.io");
const io = new Server(app);

io.on('connection', (socket) => {

    /* Output a log message on the server and send it to the clients */
    function serverLog(...messages) {
        io.emit('log', ['**** Message from the server:\n']);
        messages.forEach((item) => {
            io.emit('log', ['****\t' + item]);
            console.log(item);
        })
    }

    serverLog('a page connected to the server: ' + socket.id);

   


    /**********************************/
    /* join_room command handler      */
    /**********************************/
    /* expected payload:
            room: the room to be joined
            username: the name of the user joining the room
        join_room_response:
            if sucessful
                result: 'sucess'
                socket_id: the socket of the user that just joined the room
                room: room that was joined
                username: the user that joined the room
                count: the number of users in the chat room
            if fail
                result: 'fail'
                message: the reason for failure
    **********************************/
    socket.on('join_room', (payload) => {
        serverLog('Server received a command', '\'join_room\'', JSON.stringify(payload));

        /*****************************************/
        /* Payload data validation (join room)*/
        /*****************************************/

        // Check if payload has data in it
        if ((typeof payload == 'undefined') || (payload === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('join_room_response', response);
            serverLog('join_room command failed. Error #1', JSON.stringify(response));
            return;
        }
        let room = payload.room;
        let username = payload.username;
        // Check if room is valid
        if ((typeof room == 'undefined') || (room === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a valid room to join';
            socket.emit('join_room_response', response);
            serverLog('join_room command failed. Error #2', JSON.stringify(response));
            return;
        }
        // Check if username is valid
        if ((typeof username == 'undefined') || (username === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a valid username to joing the chat room';
            socket.emit('join_room_response', response);
            serverLog('join_room command failed. Error #3', JSON.stringify(response));
            return;
        }

        /***********************************/
        /* Handle the command to join room */
        /***********************************/
        socket.join(room);

        /* Make sure the client was put in the room */
        io.in(room).fetchSockets().then((sockets) => {

            // Debugging log
            console.log(" ");
            console.log("server.js = fetchSockets ")

            serverLog('There are ' + sockets.length + ' clients in the room, ' + room);


            /* Socket didn't join the room */
            if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.includes(socket)) {
                response = {};
                response.result = 'fail';
                response.message = 'Server internal error joining chat room';
                socket.emit('join_room_response', response);
                serverLog('join_room command failed. Error #4', JSON.stringify(response));
            }
            /* If socket did join room*/
            else {

 
                ///* BREAKING THE CODE #!
                players[socket.id] = {
                    username: username,
                    room: room
                }

                // Broadcast to room what are the players in that room
                for (const member of sockets) {
                    response = {
                        result: 'success',
                        socket_id: member.id,
                        room: players[member.id].room,
                        username: players[member.id].username,
                        count: sockets.length
                    }
                
                    // Tell everyone that a new user has joined the chat room
                    io.of('/').to(room).emit('join_room_response', response);
                    serverLog('join_room_succeeded ', JSON.stringify(response));

                    // Check if room is Lobby or a game room
                    // If it is a game room, then it needs to send "game update"
                    if (room !== "Lobby") {
                        send_game_update(socket, room, 'initial update');
                    }
                
                }
            }
        })
    });



    /**************************/
    /* Invite message handler */
    /**************************/


    socket.on('invite', (payload) => {
        serverLog('Server received a command', '\'invite\'', JSON.stringify(payload));

        /*****************************************/
        /* Payload data validation (join room)*/
        /*****************************************/

        // Check if payload has data in it
        if ((typeof payload == 'undefined') || (payload === null)) {

            response = {};
            response.result = 'fail';
            response.message = 'client did not send a payload';

            socket.emit('invite_response', response);
            serverLog('invite command failed. Error #1', JSON.stringify(response));
            return;
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room;
        let username = players[socket.id].username;

        // Check if requested_user is valid
        if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'client did not request a valid user to invite to play';

            socket.emit('invite_response', response);
            serverLog('invite command failed. Error #2', JSON.stringify(response));
            return;
        }

        // Check if room is valid
        if ((typeof room == 'undefined') || (room === null) || (room === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'the user that was invited is not in a room';

            socket.emit('invite_response', response);
            serverLog('invite command failed. Error #2', JSON.stringify(response));
            return;
        }

        // Check if username is valid
        if ((typeof username == 'undefined') || (username === null) || (username === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'user that was invited does not have a name registered';

            socket.emit('invite_response', response);
            serverLog('invite command failed. Error #3', JSON.stringify(response));
            return;
        }

        /***********************************/
        /* Handle the command to join room */
        /***********************************/
        //socket.join(room);

        /* Make sure that the invited player is present */
        io.in(room).allSockets().then((sockets) => {
            serverLog('There are ' + sockets.length + ' clients in the room, ' + room);


            /* Invitee isn't in the room */
            if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.has(requested_user)) {

                response = {};
                response.result = 'fail';
                response.message = 'The user that was invited was not longer in the room';

                socket.emit('invite_response', response);
                serverLog('invite command failed. Error #4', JSON.stringify(response));
            }

            /* Invitee is in the room*/
            else {
                // Response #1: it was a success
                response = {};
                response.result = 'success';
                response.socket_id = requested_user;
                socket.emit("invite_response", response);   // sent to all

                // Response #2: person who was invited needs to be notified that it was invited
                response = {};
                response.result = 'success';
                response.socket_id = socket.id;             // who invited them
                socket.to(requested_user).emit("invited", response);

                serverLog('invite command succeeded', JSON.stringify(response));
            }
        })
    });




    /***********************************************************/
    /* Uninvite message handler                                */
    /* Server will reply with uninvited message to all clients */
    /***********************************************************/

    socket.on('uninvite', (payload) => {
        serverLog('Server received a command', '\'uninvite\'', JSON.stringify(payload));

        /*****************************************/
        /* Payload data validation (join room)*/
        /*****************************************/

        // Check if payload has data in it
        if ((typeof payload == 'undefined') || (payload === null)) {

            response = {};
            response.result = 'fail';
            response.message = 'client did not send a payload';

            socket.emit('uninvited', response);
            serverLog('uninvite command failed. Error #1', JSON.stringify(response));
            return;
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room;
        let username = players[socket.id].username;

        // Check if requested_user is valid
        if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'client did not request a valid user to uninvite to play';

            socket.emit('uninvited', response);
            serverLog('uninvite command failed. Error #2', JSON.stringify(response));
            return;
        }

        // Check if room is valid
        if ((typeof room == 'undefined') || (room === null) || (room === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'the user that was uninvited is not in a room';

            socket.emit('uninvited', response);
            serverLog('uninvite command failed. Error #2', JSON.stringify(response));
            return;
        }

        // Check if username is valid
        if ((typeof username == 'undefined') || (username === null) || (username === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'user that was uninvited does not have a name registered';

            socket.emit('uninvited', response);
            serverLog('uninvite command failed. Error #3', JSON.stringify(response));
            return;
        }

        /* Make sure that the uninvited player is present */
        io.in(room).allSockets().then((sockets) => {
            

            /* Unnvitee isn't in the room */
            if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.has(requested_user)) {

                response = {};
                response.result = 'fail';
                response.message = 'The user that was uninvited was not longer in the room';

                socket.emit('uninvited', response);
                serverLog('uninvite command failed. Error #4', JSON.stringify(response));
            }

            /* Uninvitee is in the room*/
            else {
                // Response #1: it was a success
                response = {};
                response.result = 'success';
                response.socket_id = requested_user;        

                socket.emit("uninvited", response);         // sent to client that did the uninviting (which is current socket?)
                serverLog('uninvite message #1 sent', JSON.stringify(response));

                // Response #2: person who was uninvited needs to be notified that it was uninvited
                response = {};
                response.result = 'success';
                response.socket_id = socket.id;             // sent to client who was uninvited

                socket.to(requested_user).emit("uninvited", response);               //// I THINK THIS IS WHERE PROF HAD BUG.....
                serverLog('uninvite message #2 sent', JSON.stringify(response));

                serverLog('uninvite command succeeded', JSON.stringify(response));
            }
        })
    });




    /***********************************************************/
    /* Game Start message handler                              */
    /***********************************************************/

    socket.on('game_start', (payload) => {
        serverLog('Server received a command', '\'game_start\'', JSON.stringify(payload));

        /*****************************************/
        /* Payload data validation (join room)*/
        /*****************************************/

        // Check if payload has data in it
        if ((typeof payload == 'undefined') || (payload === null)) {

            response = {};
            response.result = 'fail';
            response.message = 'client did not send a payload';

            socket.emit('game_start_response', response);
            serverLog('game_start command failed. Error #1', JSON.stringify(response));
            return;
        }
        let requested_user = payload.requested_user;
        let room = players[socket.id].room;
        let username = players[socket.id].username;

        // Check if requested_user is valid
        if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'client did not request a valid user to engage in play';

            socket.emit('game_start_response', response);
            serverLog('game_start command failed. Error #2', JSON.stringify(response));
            return;
        }

        // Check if room is valid
        if ((typeof room == 'undefined') || (room === null) || (room === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'the user that was engaged to play is not in a room';

            socket.emit('game_start_response', response);
            serverLog('game_start command failed. Error #2', JSON.stringify(response));
            return;
        }

        // Check if username is valid
        if ((typeof username == 'undefined') || (username === null) || (username === "")) {

            response = {};
            response.result = 'fail';
            response.message = 'user that was engaged to play does not have a name registered';

            socket.emit('game_start_response', response);
            serverLog('game_start command failed. Error #3', JSON.stringify(response));
            return;
        }

        /* Make sure that the player to engage is present */
        io.in(room).allSockets().then((sockets) => {


            /* Player engaged to play isn't in the room */
            if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.has(requested_user)) {

                response = {};
                response.result = 'fail';
                response.message = 'The user that was engaged to play was not longer in the room';

                socket.emit('game_start_response', response);
                serverLog('game_start command failed. Error #4', JSON.stringify(response));
            }

            /* Player to engage in play is in the room*/
            else {

                // Create random game room ID
                let game_id = Math.floor(1 + Math.random() * 0x100000).toString(16);

                // Response #1: it was a success
                response = {};
                response.result = 'success';
                response.game_id = game_id;
                response.socket_id = requested_user;

                socket.emit("game_start_response", response);               // Send message to user that clicked "Play"    
                socket.to(requested_user).emit("game_start_response", response);      // Send message to user that invited

                serverLog('game start message #1 sent', JSON.stringify(response));
                serverLog('game_start command succeeded', JSON.stringify(response));
            }
        })
    });



    /**********************************/
    /* Client disconnected            */
    /**********************************/
    socket.on('disconnect', () => {
        serverLog('a page disconnected from the server: ' + socket.id);
        if ((typeof players[socket.id] != 'undefined') && (players[socket.id] != null)) {
            let payload = {
                username: players[socket.id].username,
                room: players[socket.id].room,
                count: Object.keys(players).length - 1,
                socket_id: socket.id
            };
            let room = players[socket.id].room;
            delete players[socket.id];

            /* Tell everyone who left the room*/
            //io.of("/").room.emit('player_disconnected'.payload);
            io.of('/').to(room).emit('player_disconnected', payload);
            serverLog('player_disconnected succeeded ', JSON.stringify(payload));
        }
    });



    /***********************************************************/
    /* send_chat_message command handler                       */
    /***********************************************************/
    /* expected payload:
            room: the room to which the message should be sent
            username: the name of the sender
            message: the message to broadcast
        send_chat_message_response:
            if sucessful
                result: 'sucess'
                username: the user that sent the message
                message: the message that was sent
            if fail
                result: 'fail'
                message: the reason for failure
    **********************************/

    socket.on('send_chat_message', (payload) => {
        serverLog('Server received a command', '\'send_chat_message\'', JSON.stringify(payload));

        /*****************************************/
        /* Payload data validation (chat message)*/
        /*****************************************/

        // Check if payload has data in it
        if ((typeof payload == 'undefined') || (payload === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed. Error #5', JSON.stringify(response));
            return;
        }
        let room = payload.room;
        let username = payload.username;
        let message = payload.message;
        // Check if room is valid
        if ((typeof room == 'undefined') || (room === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a valid room to message';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed. Error #6', JSON.stringify(response));
            return;
        }
        // Check if username is valid
        if ((typeof username == 'undefined') || (username === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a valid username as a message source';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed. Error #7', JSON.stringify(response));
            return;
        }
        // Check if message is valid
        if ((typeof message == 'undefined') || (message === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a valid message';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed. Error #8', JSON.stringify(response));
            return;
        }


        /***************************************/
        /* Handle the command for broadcasting */
        /***************************************/

        let response = {};
        response.result = username;
        response.username = username;
        response.room = room;
        response.message = message;

        /* Tell everyone in the room what the message is*/
        io.of('/').to(room).emit('send_chat_message_response', response);
        serverLog('send_chat_message command succeeded', JSON.stringify(response));
    });



    /***********************************************************/
    /* play_token command handler                       */
    /***********************************************************/

    socket.on('play_token', (payload) => {
        serverLog('Server received a command', '\'play_token\'', JSON.stringify(payload));

        /*****************************************/
        /* Payload data validation (chat message)*/
        /*****************************************/

        // Check if payload has data in it
        if ((typeof payload == 'undefined') || (payload === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'client did not send a payload';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #5', JSON.stringify(response));
            return;
        }

        // Check if player is valid
        let player = players[socket.id];   
        if ((typeof player == 'undefined') || (player === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'play token came from an unregistered player';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #6', JSON.stringify(response));
            return;
        }

        // Check if username is valid
        let username = player.username;
        if ((typeof username == 'undefined') || (username === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'play_token command did not come from a registered username';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #7', JSON.stringify(response));
            return;
        }

        // Check if game_id is valid
        let game_id = player.room;
        if ((typeof game_id == 'undefined') || (game_id === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'there was not valid game associated with the play token command';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #8', JSON.stringify(response));
            return;
        }

        // Check if row is valid
        let row = payload.row;
        if ((typeof row == 'undefined') || (row === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'there was not valid row associated with the play token command';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #9', JSON.stringify(response));
            return;
        }

        // Check if column is valid
        let column = payload.column;
        if ((typeof column == 'undefined') || (column === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'there was not valid column associated with the play token command';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #10', JSON.stringify(response));
            return;
        }


        // Check if color is valid
        let color = payload.color;
        if ((typeof color == 'undefined') || (color === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'there was not valid color associated with the play token command';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #11', JSON.stringify(response));
            return;
        }


        // Check if game is valid
        let game = games[game_id];
        if ((typeof game == 'undefined') || (game === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'there was not valid game associated with the play token command';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #12', JSON.stringify(response));
            return;
        }


        // Make sure the current attempt is by the correct color
        if (color !== game.whose_turn) {
            let response = {};
            response.result = 'fail';
            response.message = 'play_token played the wrong color. It is '+game.whose_turn+' turn';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #13', JSON.stringify(response));
            return;
        }



        // Make sure the current play is coming from the expected player
        if (((game.whose_turn === 'white') && (game.player_white.socket != socket.id)) ||
            ((game.whose_turn === 'black') && (game.player_black.socket != socket.id)))
        {
            let response = {};
            response.result = 'fail';
            response.message = 'play_token played the right color, but by the wrong player(socket)';
            socket.emit('play_token_response', response);
            serverLog('play_token command failed. Error #14', JSON.stringify(response));
            return;
        }

        // Send success play_token_response to client that sent play_token
        let response = {};
        response.result = 'success';
        socket.emit('play_token_response', response);
        serverLog('play_token command success', JSON.stringify(response));

        /********************/
        /* Execute the move */
        /********************/

        if (color === 'white') {
            game.board[row][column] = 'w';
            // Flip tokens that need to be flipped
            flip_tokens('w',row,column,game.board);
            game.whose_turn = 'black';
            game.legal_moves = calculate_legal_moves('b', game.board);
        }
        else if (color === 'black') {
            game.board[row][column] = 'b';
            // Flip tokens that need to be flipped
            flip_tokens('b', row, column, game.board);
            game.whose_turn = 'white';
            game.legal_moves = calculate_legal_moves('w', game.board);
        }


        let d = new Date();
        game.last_move_time = d.getTime();

        send_game_update(socket, game_id, 'played a token');
    });

});



/***********************************************************/
/* Code related to game state                              */
/***********************************************************/


// Structure to keep track of games
let games = [];


// Function that creates new game
function create_new_game() {

    // Create data structure for the new game
    let new_game = {};

    new_game.player_white = {};
    new_game.player_white.socket = "";
    new_game.player_white.username = "";

    new_game.player_black = {};
    new_game.player_black.socket = "";
    new_game.player_black.username = "";


    // Keep track of time
    var d = new Date();
    new_game.last_move_time = d.getTime();

    // Whose turn is it
    new_game.whose_turn = 'black';              // Black plays first


    // Create game board
    new_game.board = [
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', 'w', 'b', ' ', ' ', ' '],
        [' ', ' ', ' ', 'b', 'w', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ];

    new_game.legal_moves = calculate_legal_moves('b', new_game.board);

    return new_game;
}


function check_line_match(color, delta_r, delta_c, r, c, board) {

    if (board[r][c] === color) {
        return true;
    }
    if (board[r][c] === ' ') {
        return false;
    }
    // Check to make sure we aren't going to walk off the board
    if ((r + delta_r < 0) || (r + delta_r > 7)) {
        return false;
    }
    if ((c + delta_c < 0) || (c + delta_c > 7)) {
        return false;
    }

    return (check_line_match(color, delta_r, delta_c, r + delta_r, c + delta_c, board));


}



// Return true if r + dr support supports playing at r
// and c+dc supports playing at c
function adjacent_support(who, delta_r, delta_c, r, c, board) {
    let other;
    if (who === 'b') {
        other = 'w';
    }
    else if (who === 'w') {
        other = 'b';
    }
    else {
        console.log("Houston we have a problem:" + who);
        return false;
    }


    // Check to see if adjacent support is on the board
    if ((r + delta_r < 0) || (r + delta_r > 7)) {
        return false;
    }
    if ((c + delta_c < 0) || (c + delta_c > 7)) {
        return false;
    }

    // check that the opposite color is present next to us
    if (board[r + delta_r][c + delta_c] !== other) {
        return false;
    }

    // Check to make sure that there is space for a matching color to capture tokens
    // (checking if 2 positions away is off the board)
    if ((r + delta_r + delta_r < 0) || (r + delta_r + delta_r > 7)) {
        return false;
    }
    if ((c + delta_c + delta_c < 0) || (c + delta_c + delta_c > 7)) {
        return false;
    }

    return check_line_match(who, delta_r, delta_c, r + delta_r + delta_r, c + delta_c + delta_c, board);
}



// Calculate legal moves
function calculate_legal_moves(who, board) {
    let legal_moves = [
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ];

    for (let row = 0; row < 8; row++) {
        for (let column = 0; column < 8; column++) {
            if (board[row][column] === ' ') {
                // check if adjacent positions are legal moves
                let nn = adjacent_support(who, -1, 0, row, column, board); // check north: going up one row (-1) and keeping same column (0)
                let ss = adjacent_support(who, 1, 0, row, column, board);  // check south: going down one row (1) and keeping same column (0)
                let ww = adjacent_support(who, 0, -1, row, column, board); // check west: keep in the same row (0) and going to the left column (-1)
                let ee = adjacent_support(who, 0, 1, row, column, board);  // check east: keep in the same row (0) and going to the right column (1)

                let nw = adjacent_support(who, -1, -1, row, column, board); // check nw: going up one row (-1) and keeping same column (0)
                let ne = adjacent_support(who, -1, 1, row, column, board);  // check ne: going down one row (1) and keeping same column (0)
                let sw = adjacent_support(who, 1, -1, row, column, board); // check sw: keep in the same row (0) and going to the left column (-1)
                let se = adjacent_support(who, 1, 1, row, column, board);  // check se: keep in the same row (0) and going to the right column (1)

                if (nw || nn || ne || ww || ee || sw || ss || se) {
                    legal_moves[row][column] = who;
                }

                /*****************
                 * I THINK THIS CODE IS MORE EFFICIENT. NEED TO TEST ANOTHER TIME.
                 * 
                // check if adjacent positions are legal moves

                // check north: going up one row (-1) and keeping same column (0)
                if (adjacent_support(who, -1, 0, row, column, board)) { legal_moves[row][column] = who; }

                // check south: going down one row (1) and keeping same column (0)
                else if (adjacent_support(who, 1, 0, row, column, board)) { legal_moves[row][column] = who; }

                // check west: keep in the same row (0) and going to the left column (-1)
                else if (adjacent_support(who, 0, -1, row, column, board)) { legal_moves[row][column] = who; }

                // check east: keep in the same row (0) and going to the right column (1)
                else if (adjacent_support(who, 0, 1, row, column, board)) { legal_moves[row][column] = who; }

                // check nw: going up one row (-1) and keeping same column (0)
                else if (adjacent_support(who, -1, -1, row, column, board)) { legal_moves[row][column] = who; }

                // check ne: going down one row (1) and keeping same column (0)
                else if (adjacent_support(who, -1, 1, row, column, board)) { legal_moves[row][column] = who; }

                // check sw: keep in the same row (0) and going to the left column (-1)
                else if (adjacent_support(who, 1, -1, row, column, board)) { legal_moves[row][column] = who; }

                    // check se: keep in the same row (0) and going to the right column (1)
                else if (adjacent_support(who, 1, 1, row, column, board)) { legal_moves[row][column] = who; }
                
                END OF EFFICIENT CODE*/
            }
        }

    }
    return legal_moves;

}

// Flip one line of tokens
function flip_line(who, delta_r, delta_c, r, c, board) {

    // Check to see if position to be flipped is on the board
    if ((r + delta_r < 0) || (r + delta_r > 7)) {
        return false;
    }
    if ((c + delta_c < 0) || (c + delta_c > 7)) {
        return false;
    }

    // if we encounter a space, then we are not going to flip it
    if (board[r + delta_r][c + delta_c] === ' ') {
        return false;
    }

    // if we encounter our color, then it is the last one to be checked on the row
    if (board[r + delta_r][c + delta_c] === who) {
        return true;
    }
    // we must have encountered a token of opposite color. We will keep moving along the line.
    else {
        if (flip_line(who, delta_r, delta_c, r + delta_r, c + delta_c, board)) {
            board[r + delta_r][c + delta_c] = who;      // Set the color
            return true;
        }
        else {
            // if we walked of the board, or never encountered a token of our color, then we will return false
            return false;
        }
    }
}



// Flip tokens that need to be flipped as result of a new token placed on the board
function flip_tokens(who, row, column, board) {
    flip_line(who, -1, 0, row, column, board);  // check north: going up one row (-1) and keeping same column (0)
    flip_line(who, 1, 0, row, column, board);   // check south: going down one row (1) and keeping same column (0)
    flip_line(who, 0, -1, row, column, board);  // check west: keep in the same row (0) and going to the left column (-1)
    flip_line(who, 0, 1, row, column, board);   // check east: keep in the same row (0) and going to the right column (1)

    flip_line(who, -1, -1, row, column, board); // check nw: going up one row (-1) and keeping same column (0)
    flip_line(who, -1, 1, row, column, board);  // check ne: going down one row (1) and keeping same column (0)
    flip_line(who, 1, -1, row, column, board);  // check sw: keep in the same row (0) and going to the left column (-1)
    flip_line(who, 1, 1, row, column, board);   // check se: keep in the same row (0) and going to the right column (1)


}






// Send game update to client
function send_game_update(socket, game_id, message) {
    // First time this message is sent is different from subsequent times
    // Step 1 - Start by checking if a game with game_id exists
    // Step 2 - If game_id does not exist we need to make it
    // Step 3 - Make sure only 2 people are in the room
    // Step 4 - Assign this socket a color
    // Step 5 - Send game update message
    // Step 6 - Check if the game is over
    // Step 7 - If game over, send appropriate message


    // Step 1 - Start by checking if a game with game_id exists
    if ((typeof games[game_id] == 'undefined') || (games[game_id] === null)) {

        // Step 2 - If game_id does not exist we need to make it
        // Games does not exist yet, so create new game
        console.log("No game exists with game_id:" + game_id + ". Making a new game for " + socket.id);
        games[game_id] = create_new_game();

    }

    // (step 3 and 4 done at same time)
    // Step 3 - Make sure only 2 people are in the room
    // Step 4 - Assign this socket a color
    io.of("/").to(game_id).allSockets().then((sockets) => {       // Get all sockets in the room and look at them

        const iterator = sockets[Symbol.iterator]();
        if (sockets.size >= 1) {
            // Iterator for the sockets in the room
            let first = iterator.next().value;

            if ((games[game_id].player_white.socket != first) &&
                (games[game_id].player_black.socket != first)) {

                // Player does not have a color
                if (games[game_id].player_white.socket === "") {

                    // If no one assigned to white, this player should be white
                    console.log("White is assigned to: " + first);
                    games[game_id].player_white.socket = first;
                    games[game_id].player_white.username = players[first].username;
                }
                else if (games[game_id].player_black.socket === "") {

                    // If white is taken but no one assigned to black, this player should be black
                    console.log("Black is assigned to: " + first);
                    games[game_id].player_black.socket = first;
                    games[game_id].player_black.username = players[first].username;
                }
                else {
                    // This is the third player in the room
                    // This player should be kicked out of the room
                    console.log("Three players in the room. Kicking " + first + " out of the game: " + game_id);
                    io.in(first).socketsLeave([game_id]);
                }
            }
        }
 
        if (sockets.size >= 2) {
            // Iterator for the sockets in the room
            let second = iterator.next().value;

            if ((games[game_id].player_white.socket != second) &&
                (games[game_id].player_black.socket != second)) {

                // Player does not have a color
                if (games[game_id].player_white.socket === "") {

                    // If no one assigned to white, this player should be white
                    console.log("White is assigned to: " + second);
                    games[game_id].player_white.socket = second;
                    games[game_id].player_white.username = players[second].username;
                }
                else if (games[game_id].player_black.socket === "") {

                    // If white is taken but no one assigned to black, this player should be black
                    console.log("Black is assigned to: " + second);
                    games[game_id].player_black.socket = second;
                    games[game_id].player_black.username = players[second].username;
                }
                else {
                    // This is the third player in the room
                    // This player should be kicked out of the room
                    console.log("Three players in the room. Kicking " + second + " out of the game: " + game_id);
                    io.in(second).socketsLeave([game_id]);
                }
            }
        }



        // Step 5 - Send game update message
        let payload = {}
        payload.result = 'success';
        payload.game_id = game_id;
        payload.game = games[game_id];
        payload.message = message;

        io.of("/").to(game_id).emit('game_update', payload);          // Sent to everyone in the namespace "/", and in the room "game_id"
        console.log('game_update sent', JSON.stringify(response));
    });

    // Step 6 - Check if the game is over
    // Count number of tokens to see if board is full
    let legal_moves = 0;
    let whitesum = 0;
    let blacksum = 0;

    for (let row = 0; row < 8; row++) {
        for (let column = 0; column < 8; column++) {
            if (games[game_id].legal_moves[row][column] != ' ') {
                legal_moves++;
            }
            if (games[game_id].board[row][column] == 'w') {
                whitesum++;
            }
            if (games[game_id].board[row][column] == 'b') {
                blacksum++;
            }
        }
    }

    // Step 7 - If game over, send appropriate message
    // Check if there is no legal moves left
    if (legal_moves === 0) {

        console.log("whitesum: " + whitesum);
        console.log("blacksum: " + blacksum);

        // if no more legal moves, check to see who won
        let winner = "Tie Game";
        if (whitesum > blacksum) {
            winner = 'white';
        }
        else if (blacksum > whitesum) {
            winner = 'black';
        }


        console.log("winner: " + winner);
        

        let payload = {}
        payload.result = 'success';
        payload.game_id = game_id;
        payload.game = games[game_id];
        payload.who_won = winner;

        console.log("payload.who_won: " + payload.who_won);

        io.in(game_id).emit('game_over', payload);

        // Delete old games after one hour
        setTimeout(
            function (id) {
                return function () {
                    delete games[id];
                }
            }(game_id), 60 * 60 * 1000
        );
    }

}
