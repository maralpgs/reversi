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

    /* Client disconnected */
    socket.on('disconnect', () => {
        serverLog('a page disconnected from the server: ' + socket.id);
    });


    /**********************************/
    /* join_room command handler      */
    /* expected payload:
            room: the room to be joined
            username: the name of the user joining the room
        join_room_response:
            if sucessful
                result: 'sucess'
                room: room that was joined
                username: the user that joined the room
                count: the number of users in the chat room
            if fail
                result: 'fail'
                message: the reason for failure
    */
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
            serverLog('join_room command failed', JSON.stringify(response));
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
            serverLog('join_room command failed', JSON.stringify(response));
            return;
        }
        // Check if username is valid
        if ((typeof username == 'undefined') || (username === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a valid username to joing the chat room';
            socket.emit('join_room_response', response);
            serverLog('join_room command failed', JSON.stringify(response));
            return;
        }

        /***********************************/
        /* Handle the command to join room */
        /***********************************/
        socket.join(room);

        /* Make sure the client was put in the room */
        io.in(room).fetchSockets().then((socket) => {
            serverLog('There are ' + socket.length + ' clients in the room, ' + room);
            /* Socket didn't join the room */
            if ((typeof socket == 'undefined') || (socket === null) || (socket.includes(socket))) {
                response = {};
                response.result = 'fail';
                response.message = 'Server internal error joining chat room';
                socket.emit('join_room_response', response);
                serverLog('join_room command failed', JSON.stringify(response));
            }
            /* If socket did join room*/
            else {
                response = {};
                response.result = 'success';
                response.room = room;
                response.username = username;
                response.count = socket.length;
                /* Tell everyone that a new user has joined the chat room */
                io.of('/').to(room).emit('join_room_response', response);
                serverLog('join_room_succeeded ', JSON.stringify(response));

            }
        })
    });




    /**********************************/
    /* send_chat_message command handler      */
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
    */

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
            serverLog('send_chat_message command failed', JSON.stringify(response));
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
            serverLog('send_chat_message command failed', JSON.stringify(response));
            return;
        }
        // Check if username is valid
        if ((typeof username == 'undefined') || (username === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a valid username as a message source';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed', JSON.stringify(response));
            return;
        }
        // Check if message is valid
        if ((typeof message == 'undefined') || (message === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'client did not send a valid message';
            socket.emit('send_chat_message_response', response);
            serverLog('send_chat_message command failed', JSON.stringify(response));
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
});

