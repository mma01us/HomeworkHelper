var socket = io.connect( 'https://user.tjhsst.edu/', {path: '/2019mma/socket.io'});

function finish(id){
    console.log(id.substring(id.indexOf('-')+1));
    socket.emit('finish_todo', id.substring(id.indexOf('-')+1));
}

function trash(id){
    console.log(id.substring(id.indexOf('-')+1));
    socket.emit('delete_todo', id.substring(id.indexOf('-')+1));
}