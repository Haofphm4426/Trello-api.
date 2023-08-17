export const inviteUserToBoardSocket = (socket) => {
    socket.on('c_user_invited_to_board', (invitation) => {
        socket.broadcast.emit('s_user_invited_to_board', invitation);
    });
};
