const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const historyFolder = path.join(__dirname, "historia");
const messages = [];
const users = {}; // Przechowuje nazwy użytkowników powiązane z socketami

// Tworzenie folderu "historia" jeśli nie istnieje
if (!fs.existsSync(historyFolder)) {
    fs.mkdirSync(historyFolder);
}

app.use(express.static("public")); // Obsługa plików statycznych

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Funkcja generująca nazwę pliku historii czatu (np. chat_2025-02-15.txt)
const generateHistoryFileName = () => {
    const today = new Date().toISOString().split("T")[0];
    return `chat_${today}.txt`;
};

// Funkcja formatująca datę i godzinę
const formatDateTime = () => {
    const now = new Date();
    return now.toISOString().replace("T", " ").split(".")[0]; // YYYY-MM-DD HH:MM:SS
};

// Funkcja ładowania historii czatu z pliku
const loadChatHistory = () => {
    const filePath = path.join(historyFolder, generateHistoryFileName());
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    }
    return [];
};

// Obsługa połączeń WebSocket
io.on("connection", (socket) => {
    console.log(`✅ Nowe połączenie: ${socket.id}`);

    // Wysyłanie historii czatu do nowego użytkownika
    const history = loadChatHistory();
    socket.emit("loadHistory", history);

    // Wysyłanie aktualnej listy użytkowników do wszystkich
    io.emit("updateUserList", Object.values(users));

    // Ustawianie nazwy użytkownika
    socket.on("setUsername", (username) => {
        if (!username || username.trim() === "") {
            socket.emit("usernameError", "Nazwa użytkownika nie może być pusta.");
            return;
        }

        users[socket.id] = username.trim();
        console.log(`👤 Użytkownik ${socket.id} ustawił nick: ${users[socket.id]}`);
        
        // Wysyłanie aktualizacji listy użytkowników
        io.emit("updateUserList", Object.values(users));
        
        socket.emit("usernameSet", users[socket.id]);
    });

    // Obsługa otrzymania wiadomości
    socket.on("sendMessage", (data) => {
        if (!users[socket.id]) {
            socket.emit("usernameError", "Musisz ustawić nick przed wysłaniem wiadomości.");
            return;
        }

        if (!data || typeof data.text !== "string" || data.text.trim() === "") {
            socket.emit("messageError", "Wiadomość nie może być pusta.");
            return;
        }

        const message = {
            username: users[socket.id],
            text: data.text.trim(),
            timestamp: formatDateTime(),
        };

        messages.push(message);

        // Zapis do pliku
        const filePath = path.join(historyFolder, generateHistoryFileName());
        const newMessage = `${message.timestamp} - ${message.username}: ${message.text}\n`;

        fs.appendFile(filePath, newMessage, (err) => {
            if (err) console.log("❌ Błąd zapisywania historii:", err);
        });

        console.log(`📩 Nowa wiadomość: ${message.username}: ${message.text}`);

        // Wysyłanie wiadomości do wszystkich
        io.emit("receiveMessage", message);
    });

    // Obsługa rozłączenia użytkownika
    socket.on("disconnect", () => {
        console.log(`❌ Rozłączono: ${socket.id}`);
        delete users[socket.id];
        
        // Wysyłanie aktualnej listy użytkowników po rozłączeniu
        io.emit("updateUserList", Object.values(users));
    });
});

// Uruchomienie serwera
server.listen(PORT, () => {
    console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
});
