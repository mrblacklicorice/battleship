const queryString = window.location.search;
const URLparams = new URLSearchParams(queryString);

// const { initializeApp, applicationDefault, cert } =  ('firebase-admin/app');
// const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

var gamecode = URLparams.has("g") ? Number(URLparams.get("g")) : makeid();
var host = !URLparams.has("g");
// URLparams.has("g") ? false : true;

var pixel = 45;

var offset = pixel / 5;

let side_bar = Math.floor(pixel / 4);

var rows = 10;

var cols = 10;

var tiles = [];

var ships = [true, true, true, true, true];
var oppoShips = [true, true, true, true, true];
var shipLengths = [5, 4, 3, 3, 2];
var shipOrientation = [1, 1, 1, 1, 0]; // 0 horizontal, 1 vertical
var shipsIndicies = [[-1, -1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1], [-1, -1, -1], [-1, -1]];
var shipNames = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"];
var currentShip = -1;

var gamemode = -2;
// -2 connect with player, -1 place ships, 0 shoot, 1 game over

var board = 0; // 0 player, 1 opponent
var turn = host;

var gameData = { "host": true, "guest": false, "hostWon": null };
var myData = { "coord": -1, "hit": false, "ship": -1, "state": null }; // state = GET, POST. 
var oppoData = { "coord": -1, "hit": false, "ship": -1, "state": null };
// firebase data


var consoleText = "";
var app, db, gameRef, myRef, oppoRef, gameObserver;

document.addEventListener("DOMContentLoaded", async event => {
    app = firebase.app();
    db = firebase.firestore();

    if (host) {
        gameRef = await db.collection('games').doc(String(gamecode));
        await gameRef.set(gameData);
    } else {
        gameRef = await db.collection('games').doc(String(gamecode));
        gameRef.get().then(doc => {
            gameData = doc.data();
            gameData["guest"] = true;
            gameRef.update(gameData);
            console.log(gameData);
        });
    }

    myRef = await db.collection('players').doc(`${gamecode}-${host ? "host" : "guest"}`);
    if (host) await myRef.set(myData);

    oppoRef = await db.collection('players').doc(`${gamecode}-${host ? "guest" : "host"}`);
    if (host) await oppoRef.set(oppoData);

    gameObserver = gameRef.onSnapshot(async docSnapshot => {
        gameData = docSnapshot.data();

        if (gamemode == -2) {
            if (gameData["host"] && gameData["guest"]) {
                if (host) {
                    await gameRef.update({ "host": false, "guest": false });
                }
                gamemode = -1;
            }
        } else if (gamemode == -1) {
            if (gameData["host"] && gameData["guest"]) {
                if (host) {
                    await gameRef.update({ "host": false, "guest": false });
                }
                gamemode = 0;
                ships = [true, true, true, true, true];
            }
        } else if (gamemode == 0) {
            if (gameData["hostWon"] != null) {
                gamemode = 1;
            }
        }
    }, err => {
        console.log(`Encountered error: ${err}`);
    });

    myRef.onSnapshot(async docSnapshot => {
        myData = docSnapshot.data();

        if (gamemode == 0 && myData["state"] == "POST") {
            tiles[myData["coord"] % cols][Math.floor(myData["coord"] / rows)].click(myData["hit"]);
            consoleText = "You " + ((myData["hit"] == true) ? "hit" : "miss");

            if (myData["hit"] && myData["ship"] != -1) {
                ships[myData["ship"]] = false;
                consoleText += " and you sunk the " + shipNames[myData["ship"]];

                if (ships.every(ship => !ship)) {
                    gamemode = 1;
                    gameRef.update({ "hostWon": host });
                }
            }
        }
    }, err => {
        console.log(`Encountered error: ${err}`);
    });

    oppoRef.onSnapshot(async docSnapshot => {
        oppoData = docSnapshot.data();

        if (gamemode == 0 && oppoData["state"] == "GET") {
            tiles[oppoData["coord"] % cols][Math.floor(oppoData["coord"] / rows)].hit = true;
            var s = tiles[oppoData["coord"] % cols][Math.floor(oppoData["coord"] / rows)].s;

            if (s != -1) {
                for (let i = 0; i < shipsIndicies[s].length; i++) {
                    if (shipsIndicies[s][i] == oppoData["coord"]) {
                        shipsIndicies[s][i] = -1;
                        break;
                    }
                }

                if (shipsIndicies[s].every(s => (s == -1))) oppoShips[s] = false;

                await oppoRef.update({ "hit": true, "ship": ((shipsIndicies[s].every(s => (s == -1)) ? s : -1)), "state": "POST" });
                consoleText = "They hit" + ((shipsIndicies[s].every(s => (s == -1)) ? " and they sunk the " + shipNames[s] : ""));
            } else {

                await oppoRef.update({ "hit": false, "ship": -1, "state": "POST" });
                consoleText = "They missed";
            }

            turn = true;
        }
    }, err => {
        console.log(`Encountered error: ${err}`);
    });
});


function setup() {
    canvas = createCanvas(pixel * cols + (offset * 2) + (side_bar * offset * 1.5), pixel * rows + (offset * 2) + (offset * 15));


    canvas.center("horizontal");
    document.body.style.background = '#222222';

    document.getElementById("defaultCanvas0").addEventListener("contextmenu", (e) => e.preventDefault());

    for (let i = 0; i < rows; i++) {
        tiles[i] = [];
        for (let j = 0; j < cols; j++) {
            tiles[i][j] = new Tile(i, j, pixel);
        }
    }
}

function draw() {
    clear();

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            tiles[i][j].show();

            if (gamemode == -1) {
                tiles[i][j].showShips();
            } else if (gamemode == 0) {
                if (board == 0) {
                    tiles[i][j].showMissiles();
                } else if (board == 1) {
                    tiles[i][j].showShips();
                    tiles[i][j].showPhantomMissiles();
                }
            }
        }
    }

    drawShipOutline();
    (gamemode == 0 && board == 1) ? drawShips(oppoShips) : drawShips(ships);


    // fill('white');
    // rect(pixel * cols + (offset * 2), 0, (side_bar * offset * 1.5), pixel * rows);

    if (gamemode == -1) {
        if (currentShip != -1) {
            var index = checkShips(hoverGrid(mouseX, mouseY), currentShip);

            if (index != -1) {
                stroke('#222222');
                strokeWeight(2);
                noFill();
                for (let i = 0; i < shipLengths[currentShip]; i++) {
                    if (shipOrientation[currentShip] == 0) {
                        rect(pixel * (index % cols) + (pixel * i), pixel * Math.floor(index / rows), pixel, pixel);
                    } else {
                        rect(pixel * (index % cols), pixel * Math.floor(index / rows) + (pixel * i), pixel, pixel);
                    }
                }
            }
        }
    } else if (gamemode == 0) {
        var index = hoverGrid(mouseX, mouseY);

        if (index != -1 && turn && board == 0) {
            stroke('#222222');
            strokeWeight(2);
            noFill();
            rect(pixel * (index % cols), pixel * Math.floor(index / rows), pixel, pixel);
        }

    }


    // text
    {
        if (gamemode == -2) {
            textAlign(LEFT, CENTER);
            fill('#ffe9e3');
            noStroke();

            textSize((cols * rows * pixel * pixel) * 0.0001);

            if (host) {
                text(`Send code: ${gamecode} to partner`, offset, pixel * rows + (offset * 3));
            } else {
                text(`Connecting with partner`, offset, pixel * rows + (offset * 3));
            }
        } else if (gamemode == -1) {
            textAlign(LEFT, CENTER);
            fill('#ffe9e3');
            noStroke();

            textSize((cols * rows * pixel * pixel) * 0.0001);

            if (ships.every(ele => ele == false) && currentShip == -1) {
                text(`Click START to start`, offset, pixel * rows + (offset * 3));
            } else {
                text(`Place all the ships to start`, offset, pixel * rows + (offset * 3));
                text(`Left click to select and retract, right click to switch orientation`, offset, pixel * rows + (offset * 6));
            }
            // text(`Time: ${((grid.start == 0) ? timer_parser(0) : timer_parser(Date.now() - grid.start))}`, pixel * cols + (offset * 1), pixel * rows + (offset * 3));
        } else if (gamemode == 0) {
            textAlign(LEFT, CENTER);
            fill('#ffe9e3');
            noStroke();

            textSize((cols * rows * pixel * pixel) * 0.0001);

            if (turn) {
                text(`Your turn`, offset, pixel * rows + (offset * 3));
            } else {
                text(`Opponent's turn`, offset, pixel * rows + (offset * 3));
            }

            text(consoleText, offset, pixel * rows + (offset * 6));
        } else if (gamemode == 1) {
            if (gameData["hostWon"] != null) {
                textAlign(LEFT, CENTER);
                fill('#ffe9e3');
                noStroke();

                textSize((cols * rows * pixel * pixel) * 0.0001);

                if (gameData["hostWon"] == host) {
                    text(`You won!`, offset, pixel * rows + (offset * 3));
                } else {
                    text(`You lost!`, offset, pixel * rows + (offset * 3));
                }
            }
        }
    }

    if (gamemode == -1 && currentShip != -1) {
        // fill("#316879");
        fill(49, 104, 121, 178);
        stroke("#000000");
        strokeWeight(2);

        for (let i = 0; i < shipLengths[currentShip]; i++) {
            if (shipOrientation[currentShip] == 0) {
                // CENTER ON THE MOUSE
                rect(mouseX + (pixel * i * 0.9) - (pixel * shipLengths[currentShip] / 2 * 0.9), mouseY - (pixel * 0.9 / 2), pixel * 0.9, pixel * 0.9);
            } else {
                rect(mouseX - (pixel * 0.9 / 2), mouseY + (pixel * i * 0.9) - (pixel * shipLengths[currentShip] / 2 * 0.9), pixel * 0.9, pixel * 0.9);
            }
        }
    }

    if (ships.every(ele => ele == false) && currentShip == -1 && gamemode == -1 && !gameData[host ? "host" : "guest"]) {
        noFill();
        stroke('#ffe9e3');
        strokeWeight(4);
        rect((canvas.width - pixel * 3) / 2, canvas.height - (offset * 7), pixel * 3, pixel * 1.25);

        textAlign(CENTER, CENTER);
        textSize(offset * 4);
        noStroke();
        fill('#ffe9e3');
        text(`START`, (canvas.width - pixel * 3) / 2 + (pixel * 3 / 2), canvas.height - (offset * 7) + (pixel * 1.25 / 2));
    } else if (gamemode == 0) {
        noFill();
        stroke((board == 0) ? "#316879" : "#f47a60");
        strokeWeight(4);
        rect((canvas.width - pixel * 3) / 2, canvas.height - (offset * 7), pixel * 3, pixel * 1.25);

        textAlign(CENTER, CENTER);
        textSize(offset * 4);
        noStroke();
        fill((board == 0) ? "#316879" : "#f47a60");
        text((board == 0) ? "SELF" : "PL 2", (canvas.width - pixel * 3) / 2 + (pixel * 3 / 2), canvas.height - (offset * 7) + (pixel * 1.25 / 2));
    }
}

function makeid() {
    return Math.floor(Math.random() * (99999 - 10000)) + 10000;
}

function hoverGrid(mouse_X, mouse_Y) {
    if (mouse_X > 0 && mouse_X < pixel * cols && mouse_Y > 0 && mouse_Y < pixel * rows) {
        xindex = Math.floor(mouse_X / pixel);
        yindex = Math.floor(mouse_Y / pixel);

        return xindex + yindex * cols;
    }
    return -1;
}

function hoverShips(mouse_X, mouse_Y) {
    // return index of the ship the mouse is hovering over
    if (mouse_X > pixel * cols + (offset * 2) && mouse_X < pixel * cols + (offset * 2) + (side_bar * offset * 0.75) && mouse_Y > 0 && mouse_Y < pixel * 5)
        return 0;
    else if (mouse_X > pixel * cols + (offset * 2) + (side_bar * offset * 0.75) && mouse_X < pixel * cols + (offset * 2) + (side_bar * offset * 1.5) && mouse_Y > 0 && mouse_Y < pixel * 5)
        return 1;
    else if (mouse_X > pixel * cols + (offset * 2) && mouse_X < pixel * cols + (offset * 2) + (side_bar * offset * 0.75) && mouse_Y > pixel * 5 && mouse_Y < pixel * 8.5)
        return 2;
    else if (mouse_X > pixel * cols + (offset * 2) + (side_bar * offset * 0.75) && mouse_X < pixel * cols + (offset * 2) + (side_bar * offset * 1.5) && mouse_Y > pixel * 5 && mouse_Y < pixel * 8.5)
        return 3;
    else if (
        // pixel * cols + (offset * 2), pixel * 8.5, (side_bar * offset * 1.5), pixel * 1.5
        mouse_X > pixel * cols + (offset * 2) && mouse_X < pixel * cols + (offset * 2) + (side_bar * offset * 1.5) && mouse_Y > pixel * 8.5 && mouse_Y < pixel * 10
    )
        return 4;
    else
        return -1;
}

async function mousePressed() {
    if (mouseButton == "left") {
        if (gamemode == -1) {
            var index = hoverShips(mouseX, mouseY);
            if (currentShip == -1) {
                if (index != -1) {
                    if (ships[index]) {
                        currentShip = index;
                        ships[index] = false;
                    } else {
                        for (let i = 0; i < shipsIndicies[index].length; i++) {
                            tiles[shipsIndicies[index][i] % cols][Math.floor(shipsIndicies[index][i] / rows)].s = -1;
                            shipsIndicies[index][i] = -1;
                        }
                        ships[index] = true;
                        shipOrientation[index] = (index == 4) ? 0 : 1;
                    }
                }

                if (ships.every(ele => ele == false)) {
                    if (mouseX > (canvas.width - pixel * 3) / 2 && mouseX < (canvas.width - pixel * 3) / 2 + pixel * 3 && mouseY > canvas.height - (offset * 7) && mouseY < canvas.height - (offset * 7) + pixel * 1.25) {
                        if (host) await gameRef.update({ "host": true });
                        else await gameRef.update({ "guest": true });
                        console.log("start");
                        console.log(shipsIndicies);
                        console.log(ships);
                        console.log(shipOrientation);
                    }
                }
            } else {
                if (index == currentShip) {
                    ships[index] = true;
                    shipOrientation[index] = (index == 4) ? 0 : 1;
                    currentShip = -1;
                }

                var gi = hoverGrid(mouseX, mouseY);
                var check = checkShips(gi, currentShip);
                if (gi != -1 && check != -1 && updateShips(check, currentShip)) {
                    currentShip = -1;
                }
            }

        } else if (gamemode == 0) {
            if (board == 0 && turn) {
                var index = hoverGrid(mouseX, mouseY);
                if (index != -1 && tiles[index % cols][Math.floor(index / rows)].c == -1) {
                    await myRef.update({ "coord": index, state: "GET" });
                    turn = false;
                }
            }

            if (mouseX > (canvas.width - pixel * 3) / 2 && mouseX < (canvas.width - pixel * 3) / 2 + pixel * 3 && mouseY > canvas.height - (offset * 7) && mouseY < canvas.height - (offset * 7) + pixel * 1.25) {
                board = (board + 1) % 2;
            }
        }
    } else if (mouseButton == "right") {
        if (gamemode == -1) {
            if (currentShip != -1) {
                shipOrientation[currentShip] = (shipOrientation[currentShip] + 1) % 2;
            }
        }
    }
}

function checkShips(coord, ship) {
    if (shipOrientation[ship] == 0) {
        if (shipLengths[ship] % 2 == 1) {
            if (coord % cols < cols - Math.floor(shipLengths[ship] / 2) && coord % cols >= Math.floor(shipLengths[ship] / 2)) {
                return coord % cols - Math.floor(shipLengths[ship] / 2) + Math.floor(coord / rows) * 10;
            } else if (coord % cols >= cols - Math.floor(shipLengths[ship] / 2)) {
                return cols - shipLengths[ship] + Math.floor(coord / rows) * 10
            } else if (coord % cols < Math.floor(shipLengths[ship] / 2)) {
                return 0 + Math.floor(coord / rows) * 10
            }
        } else {
            if (coord % cols < cols - Math.floor(shipLengths[ship] / 2) && coord % cols >= Math.floor(shipLengths[ship] / 2) - 1) {
                return coord % cols - Math.floor(shipLengths[ship] / 2) + 1 + Math.floor(coord / rows) * 10;
            } else if (coord % cols >= cols - Math.floor(shipLengths[ship] / 2)) {
                return cols - shipLengths[ship] + Math.floor(coord / rows) * 10;
            } else if (coord % cols < Math.floor(shipLengths[ship] / 2) - 1) {
                return 0 + Math.floor(coord / rows) * 10;
            }
        }
    } else {
        if (shipLengths[ship] % 2 == 1) {
            if (Math.floor(coord / rows) < rows - Math.floor(shipLengths[ship] / 2) && Math.floor(coord / rows) >= Math.floor(shipLengths[ship] / 2)) {
                return (Math.floor(coord / rows) - Math.floor(shipLengths[ship] / 2)) * 10 + coord % cols;
            } else if (Math.floor(coord / rows) >= rows - Math.floor(shipLengths[ship] / 2)) {
                return (rows - shipLengths[ship]) * 10 + coord % cols;
            } else if (Math.floor(coord / rows) < Math.floor(shipLengths[ship] / 2)) {
                return 0 + coord % cols;
            }
        } else {
            if (Math.floor(coord / rows) < rows - Math.floor(shipLengths[ship] / 2) && Math.floor(coord / rows) >= Math.floor(shipLengths[ship] / 2) - 1) {
                return (Math.floor(coord / rows) - Math.floor(shipLengths[ship] / 2) + 1) * 10 + coord % cols;
            } else if (Math.floor(coord / rows) >= rows - Math.floor(shipLengths[ship] / 2)) {
                return (rows - shipLengths[ship]) * 10 + coord % cols;
            } else if (Math.floor(coord / rows) < Math.floor(shipLengths[ship] / 2) - 1) {
                return 0 + coord % cols;
            }
        }
    }

    return -1;
}

function updateShips(coord, ship) {
    if (shipOrientation[ship] == 0) {
        for (let i = 0; i < shipLengths[ship]; i++) {
            if (tiles[coord % cols + i][Math.floor(coord / rows)].s != -1)
                return false;
        }

        for (let i = 0; i < shipLengths[ship]; i++) {
            tiles[coord % cols + i][Math.floor(coord / rows)].s = ship;
            shipsIndicies[ship][i] = Math.floor(coord / rows) * 10 + coord % cols + i;
        }
    } else {
        for (let i = 0; i < shipLengths[ship]; i++) {
            if (tiles[coord % cols][Math.floor(coord / rows) + i].s != -1)
                return false;
        }

        for (let i = 0; i < shipLengths[ship]; i++) {
            tiles[coord % cols][Math.floor(coord / rows) + i].s = ship;
            shipsIndicies[ship][i] = Math.floor(coord / rows) * 10 + coord % cols + i * 10;
        }
    }
    return true;
}


function drawShips(ship) {
    strokeWeight(2);
    fill("#316879");
    stroke("#000000");

    // 5
    if (ship[0]) {
        for (let i = 0; i < shipLengths[0]; i++) {
            rect(pixel * cols + (offset * 2) + (side_bar * offset * 0.375) - (pixel * 0.8 / 2), ((pixel * 5) - ((pixel * 0.8 * 5))) / 2 + (pixel * 0.8 * i), pixel * 0.8, pixel * 0.8);
        }
    }

    // 4
    if (ship[1]) {
        for (let i = 0; i < shipLengths[1]; i++) {
            rect(pixel * cols + (offset * 2) + (side_bar * offset * 0.375) - (pixel * 0.8 / 2) + (side_bar * offset * 0.75), ((pixel * 5) - ((pixel * 0.8 * 4))) / 2 + (pixel * 0.8 * i), pixel * 0.8, pixel * 0.8);
        }
    }

    // 3
    if (ship[2]) {
        for (let i = 0; i < shipLengths[2]; i++) {
            rect(pixel * cols + (offset * 2) + (side_bar * offset * 0.375) - (pixel * 0.8 / 2), ((pixel * 3.5) - ((pixel * 0.8 * 3))) / 2 + (pixel * 0.8 * i) + (pixel * 5), pixel * 0.8, pixel * 0.8);
        }
    }

    // 3
    if (ship[3]) {
        for (let i = 0; i < shipLengths[3]; i++) {
            rect(pixel * cols + (offset * 2) + (side_bar * offset * 0.375) - (pixel * 0.8 / 2) + (side_bar * offset * 0.75), ((pixel * 3.5) - ((pixel * 0.8 * 3))) / 2 + (pixel * 0.8 * i) + (pixel * 5), pixel * 0.8, pixel * 0.8);
        }
    }

    // 2
    if (ship[4]) {
        // center horizontally
        for (let i = 0; i < shipLengths[4]; i++) {
            rect(pixel * cols + (offset * 2) + ((side_bar * offset * 1.5) - (pixel * 2 * 0.8)) / 2 + (pixel * 0.8 * i), pixel * 8.5 + ((pixel * 1.5 - pixel * 0.8) / 2), pixel * 0.8, pixel * 0.8);
        }
    }
}

function drawShipOutline() {
    strokeWeight(2);
    fill("#FFFFFF");
    stroke('#316879');

    // 5
    rect(pixel * cols + (offset * 2), 0, (side_bar * offset * 0.75), pixel * 5);

    // 4 
    rect(pixel * cols + (offset * 2) + (side_bar * offset * 0.75), 0, (side_bar * offset * 0.75), pixel * 5);

    // 3
    rect(pixel * cols + (offset * 2), pixel * 5, (side_bar * offset * 0.75), pixel * 3.5);

    // 3
    rect(pixel * cols + (offset * 2) + (side_bar * offset * 0.75), pixel * 5, (side_bar * offset * 0.75), pixel * 3.5);

    // 2
    rect(pixel * cols + (offset * 2), pixel * 8.5, (side_bar * offset * 1.5), pixel * 1.5);
}