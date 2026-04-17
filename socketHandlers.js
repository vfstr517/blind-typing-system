// Store active user state
const activeUsers = new Map();

function registerSocketHandlers(io, socket, db) {
    console.log(`User connected: ${socket.id}`);

    // ===== USER EVENTS =====

    // User joins with a name
    socket.on('user:join', (userData) => {
        activeUsers.set(socket.id, {
            id: socket.id,
            name: userData.name,
            regNumber: userData.regNumber,
            wpm: 0,
            accuracy: 100,
            progress: 0,
            status: 'waiting' // waiting, typing, completed
        });
        
        // Notify admin panel that users list changed
        io.emit('admin:update-users', Array.from(activeUsers.values()));
        console.log(`User registered: ${userData.name} (${socket.id})`);
    });

    // Receive live updates from user typing
    socket.on('user:progress', (data) => {
        const user = activeUsers.get(socket.id);
        if (user) {
            user.wpm = data.wpm;
            user.accuracy = data.accuracy;
            user.progress = data.progress;
            user.status = 'typing';
            // Send updated stats to admin
            io.emit('admin:update-users', Array.from(activeUsers.values()));
        }
    });

    // User explicitly completes the test or time runs out
    socket.on('user:submit', async (result) => {
        const user = activeUsers.get(socket.id);
        if (user) {
            user.status = 'completed';
            user.wpm = result.wpm;
            user.accuracy = result.accuracy;
            user.progress = 100;
            
            // Save to DB
            try {
                await db.addResult(user.name, user.regNumber, result.wpm, result.accuracy, result.errors, result.timeTaken);
                io.emit('admin:leaderboard-update');
            } catch (err) {
                console.error("Failed to save result", err);
            }
            io.emit('admin:update-users', Array.from(activeUsers.values()));
        }
    });

    // ===== ADMIN EVENTS =====

    // Admin commands a start to all users
    socket.on('admin:start-test', async () => {
        try {
            const passage = await db.getActivePassage();
            if(!passage) {
                socket.emit('admin:error', "No active passage found!");
                return;
            }
            
            // Change status for all and notify admin again
            for (let [key, user] of activeUsers.entries()) {
                user.status = 'typing';
                user.wpm = 0;
                user.accuracy = 100;
                user.progress = 0;
            }
            
            io.emit('admin:update-users', Array.from(activeUsers.values()));
            // Broadcast the passage to all connected clients
            io.emit('test:start', { text: passage.text });
            console.log("Admin started test");
        } catch (error) {
            console.error(error);
        }
    });

    // Admin forcefully stops test
    socket.on('admin:stop-test', () => {
        io.emit('test:stop');
        console.log("Admin stopped test");
    });
    
    // Admin resets the session (purges all active states and DB results)
    socket.on('admin:reset', async () => {
        activeUsers.clear(); // Empty users map
        try {
            await db.resetResults();
            io.emit('test:reset');
            io.emit('admin:update-users', Array.from(activeUsers.values()));
            io.emit('admin:leaderboard-update');
            console.log("Admin reset test session");
        } catch(e) {
            console.error(e);
        }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        if (activeUsers.has(socket.id)) {
            activeUsers.delete(socket.id);
            // Notify Admin of disconnected user
            io.emit('admin:update-users', Array.from(activeUsers.values()));
            console.log(`User disconnected: ${socket.id}`);
        }
    });
}

module.exports = registerSocketHandlers;
