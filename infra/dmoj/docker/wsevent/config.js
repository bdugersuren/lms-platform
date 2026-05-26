// DMOJ WebSocket event daemon configuration
module.exports = {
    // browser → nginx → wsevent (GET WebSocket)
    get_host: '0.0.0.0',
    get_port: 9996,

    // Django → wsevent (POST events)
    post_host: '0.0.0.0',
    post_port: 9997,

    max_queue: 50,
    long_poll_timeout: 60000,
};
