# Real-Time Dice Game

A multiplayer Dice Roulette game where a Game Master controls the game flow for all connected players. This project uses a real-time, event-driven architecture.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: This project was built using Node.js. You can download it from [nodejs.org](https://nodejs.org/). Installing Node.js will also install npm.
- **npm (Node Package Manager)**: Used for managing project dependencies.

You can verify your installation by running:
```bash
node -v
npm -v
```

## Installation & Setup

Follow these steps to get your local development environment running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repository-name.git
    ```
    *(Replace the URL with your actual repository URL)*

2.  **Navigate to the project directory:**
    ```bash
    cd Dice-game
    ```

3.  **Install dependencies:**
    This command reads the `package.json` file and downloads the necessary libraries into the `node_modules` directory.
    ```bash
    npm install
    ```

## Project Dependencies

This project relies on the following core dependencies:

- **Express (`express`):** A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. Here, it's used to serve the frontend files.
- **Socket.IO (`socket.io`):** A library that enables real-time, bidirectional and event-based communication between the browser and the server. It's the key to keeping all players' games in sync.

## Running the Game

1.  **Start the server:**
    This command executes the `start` script defined in `package.json`.
    ```bash
    npm start
    ```
    You should see a confirmation message in your terminal: `Server is running on port 3000`.

2.  **Access the application:**
    Open your web browser and navigate to `http://localhost:3000`.

## How to Play

The game has two roles: a Game Master and Players.

-   **Game Master (GM):** The first person to navigate to the site can choose to create a game. The GM controls the game flow (starting rounds, rolling dice, etc.) from their dashboard.
-   **Players:** Other users can join the game using the unique Game ID provided by the GM. They participate in the game and see updates in real-time as the GM progresses the game.

## Project Structure

```
.
├── public/
│   ├── app.js          # Frontend logic (React, Socket.IO client)
│   ├── index.html      # Main HTML file
│   └── style.css       # Styling
├── .gitignore          # Specifies files for Git to ignore
├── node_modules/       # Contains all installed dependencies
├── package-lock.json   # Records exact dependency versions
├── package.json        # Project metadata and dependency list
├── README.md           # This file
└── server.js           # Backend server (Express, Socket.IO logic)
```

## Architecture Overview

The application is built on a classic client-server model.

-   **Server (Backend):** A single Node.js script (`server.js`) acts as the central authority. It manages the game state, enforces rules, and communicates with all players using Socket.IO for real-time updates.
-   **Client (Frontend):** A web-based interface (`public/` directory) that players use to interact with the game. It is a "thin client" that renders the UI based on state received from the server and sends user actions back to the server as events.
