const socket = io();

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const usernameInput = document.getElementById("username");
const setUsernameButton = document.getElementById("setUsername");
const userListDiv = document.getElementById("userList"); // Div na listę użytkowników

let usernameSet = false;

// Ustawianie nazwy użytkownika
setUsernameButton.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit("setUsername", username);
    } else {
        alert("Podaj poprawną nazwę użytkownika!");
    }
});

// Potwierdzenie ustawienia nazwy użytkownika
socket.on("usernameSet", (username) => {
    usernameSet = true;
    usernameInput.disabled = true;
    setUsernameButton.disabled = true;
});

// Obsługa błędu przy ustawianiu nazwy
socket.on("usernameError", (error) => {
    alert(error);
});

// Wysyłanie wiadomości
sendButton.addEventListener("click", () => {
    const message = messageInput.value.trim();
    const username = usernameInput.value.trim();

    if (!usernameSet) {
        alert("Najpierw ustaw swój nick!");
        return;
    }

    if (message) {
        const data = { username, text: message };

        socket.emit("sendMessage", data);
        displayMessage(data);

        messageInput.value = "";
    } else {
        alert("Podaj wiadomość!");
    }
});

// Odbiór wiadomości
socket.on("receiveMessage", (message) => {
    displayMessage(message);
});

// Odbiór zaktualizowanej listy użytkowników
socket.on("updateUserList", (users) => {
    displayUserList(users);
});

// Odbiór historii czatu
socket.on("loadHistory", (history) => {
    history.forEach(msg => {
        const message = {
            username: msg.split(" - ")[1].split(":")[0], // Prosta parsowanie, zakładając, że wiadomość jest w formacie "YYYY-MM-DD HH:MM:SS - username: text"
            text: msg.split(": ")[1],
            timestamp: msg.split(" - ")[0]
        };
        displayMessage(message);
    });
});

// Funkcja wyświetlania wiadomości na czacie
function displayMessage(message) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.innerHTML = `<strong>${message.username}</strong>: ${message.text}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Funkcja wyświetlania listy użytkowników
function displayUserList(users) {
    userListDiv.innerHTML = ""; // Czyści listę
    users.forEach(user => {
        const li = document.createElement("li");
        li.textContent = user;
        userListDiv.appendChild(li);
    });
}
