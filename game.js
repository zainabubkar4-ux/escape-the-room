const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


const scoreElement =
    document.getElementById("score");

const livesElement =
    document.getElementById("lives");


const homeScreen =
    document.getElementById("homeScreen");

const gameScreen =
    document.getElementById("gameScreen");


const playButton =
    document.getElementById("playButton");

const shareButton =
    document.getElementById("shareButton");


const gameMessage =
    document.getElementById("gameMessage");

const messageTitle =
    document.getElementById("messageTitle");

const messageText =
    document.getElementById("messageText");


const restartButton =
    document.getElementById("restartButton");

const homeButton =
    document.getElementById("homeButton");


// =========================
// GAME STATE
// =========================

let score = 0;

let lives = 3;

let hasKey = false;

let gameOver = false;

let invincible = false;

let gameStarted = false;


const keys = {};


// =========================
// PLAYER
// =========================

const player = {

    x: 770,
    y: 510,

    width: 32,
    height: 42,

    speed: 4,

    velocityY: 0,

    gravity: 0.55,

    jumpPower: -10.5,

    onGround: false,

    climbing: false

};


// =========================
// PLATFORMS
// =========================

const platforms = [

    {
        x: 20,
        y: 560,
        width: 860,
        height: 20
    },

    {
        x: 80,
        y: 450,
        width: 800,
        height: 20
    },

    {
        x: 20,
        y: 340,
        width: 800,
        height: 20
    },

    {
        x: 100,
        y: 230,
        width: 780,
        height: 20
    },

    {
        x: 220,
        y: 120,
        width: 660,
        height: 20
    }

];


// =========================
// LADDERS
// =========================

const ladders = [

    {
        x: 710,
        y: 450,
        width: 48,
        height: 110
    },

    {
        x: 210,
        y: 340,
        width: 48,
        height: 110
    },

    {
        x: 640,
        y: 230,
        width: 48,
        height: 110
    },

    {
        x: 330,
        y: 120,
        width: 48,
        height: 110
    }

];


// =========================
// KEY
// =========================

const keyItem = {

    x: 55,
    y: 300,

    width: 28,
    height: 34,

    collected: false

};


// =========================
// EXIT
// =========================

const exitDoor = {

    x: 810,
    y: 60,

    width: 48,
    height: 60

};


// =========================
// ENEMIES
// =========================

const enemies = [

    {
        x: 450,
        y: 412,

        width: 36,
        height: 38,

        speed: 1.2,

        direction: 1,

        minX: 300,
        maxX: 650
    },

    {
        x: 600,
        y: 302,

        width: 36,
        height: 38,

        speed: 1.3,

        direction: -1,

        minX: 350,
        maxX: 750
    },

    {
        x: 300,
        y: 192,

        width: 36,
        height: 38,

        speed: 1.1,

        direction: 1,

        minX: 150,
        maxX: 550
    },

    {
        x: 580,
        y: 82,

        width: 36,
        height: 38,

        speed: 1,

        direction: -1,

        minX: 430,
        maxX: 730
    }

];


// =========================
// CONTROLS
// =========================

document.addEventListener(
    "keydown",
    function (event) {

        keys[event.code] = true;


        if (
            event.code === "ArrowLeft" ||
            event.code === "ArrowRight" ||
            event.code === "ArrowUp" ||
            event.code === "ArrowDown" ||
            event.code === "Space"
        ) {

            event.preventDefault();

        }

    }
);


document.addEventListener(
    "keyup",
    function (event) {

        keys[event.code] = false;

    }
);


// =========================
// COLLISION
// =========================

function isColliding(a, b) {

    return (

        a.x <
        b.x + b.width &&

        a.x + a.width >
        b.x &&

        a.y <
        b.y + b.height &&

        a.y + a.height >
        b.y

    );

}


// =========================
// LADDER DETECTION
// =========================

function getActiveLadder() {

    const centerX =
        player.x +
        player.width / 2;


    for (const ladder of ladders) {

        const insideX =

            centerX >=
            ladder.x - 10 &&

            centerX <=
            ladder.x +
            ladder.width +
            10;


        const insideY =

            player.y +
            player.height >=
            ladder.y &&

            player.y <=
            ladder.y +
            ladder.height;


        if (
            insideX &&
            insideY
        ) {

            return ladder;

        }

    }


    return null;

}


// =========================
// UPDATE PLAYER
// =========================

function updatePlayer() {

    if (
        !gameStarted ||
        gameOver
    ) {

        return;

    }


    const ladder =
        getActiveLadder();


    if (
        ladder &&
        (
            keys["ArrowUp"] ||
            keys["ArrowDown"]
        )
    ) {

        player.climbing = true;

        player.velocityY = 0;


        player.x =

            ladder.x +
            ladder.width / 2 -
            player.width / 2;

    }


    if (player.climbing) {

        const activeLadder =
            getActiveLadder();


        if (activeLadder) {

            player.velocityY = 0;


            if (keys["ArrowUp"]) {

                player.y -= 3.5;

            }


            if (keys["ArrowDown"]) {

                player.y += 3.5;

            }


            if (keys["ArrowLeft"]) {

                player.x -=
                    player.speed;

                player.climbing = false;

            }


            if (keys["ArrowRight"]) {

                player.x +=
                    player.speed;

                player.climbing = false;

            }

        }

        else {

            player.climbing = false;

        }

    }


    if (!player.climbing) {

        if (keys["ArrowLeft"]) {

            player.x -=
                player.speed;

        }


        if (keys["ArrowRight"]) {

            player.x +=
                player.speed;

        }


        if (
            keys["Space"] &&
            player.onGround
        ) {

            player.velocityY =
                player.jumpPower;

            player.onGround = false;

            keys["Space"] = false;

        }


        const previousBottom =

            player.y +
            player.height;


        player.velocityY +=
            player.gravity;


        player.y +=
            player.velocityY;


        player.onGround = false;


        for (
            const platform
            of platforms
        ) {

            const currentBottom =

                player.y +
                player.height;


            const horizontalCollision =

                player.x +
                player.width >
                platform.x &&

                player.x <
                platform.x +
                platform.width;


            if (

                horizontalCollision &&

                previousBottom <=
                platform.y &&

                currentBottom >=
                platform.y &&

                player.velocityY >= 0

            ) {

                player.y =

                    platform.y -
                    player.height;


                player.velocityY = 0;

                player.onGround = true;

            }

        }

    }


    if (player.x < 0) {

        player.x = 0;

    }


    if (
        player.x +
        player.width >
        canvas.width
    ) {

        player.x =

            canvas.width -
            player.width;

    }


    if (
        player.y >
        canvas.height + 50
    ) {

        loseLife();

    }

}


// =========================
// ENEMIES
// =========================

function updateEnemies() {

    if (
        !gameStarted ||
        gameOver
    ) {

        return;

    }


    for (const enemy of enemies) {

        enemy.x +=

            enemy.speed *
            enemy.direction;


        if (
            enemy.x <=
            enemy.minX
        ) {

            enemy.x =
                enemy.minX;

            enemy.direction = 1;

        }


        if (
            enemy.x >=
            enemy.maxX
        ) {

            enemy.x =
                enemy.maxX;

            enemy.direction = -1;

        }


        if (
            !invincible &&
            isColliding(
                player,
                enemy
            )
        ) {

            loseLife();

        }

    }

}


// =========================
// KEY
// =========================

function checkKey() {

    if (
        !gameStarted ||
        keyItem.collected
    ) {

        return;

    }


    if (
        isColliding(
            player,
            keyItem
        )
    ) {

        keyItem.collected = true;

        hasKey = true;

        score += 500;


        scoreElement.textContent =

            score
                .toString()
                .padStart(
                    4,
                    "0"
                );

    }

}


// =========================
// EXIT
// =========================

function checkExit() {

    if (
        !gameStarted ||
        !hasKey
    ) {

        return;

    }


    if (
        isColliding(
            player,
            exitDoor
        )
    ) {

        score += 1000;


        scoreElement.textContent =

            score
                .toString()
                .padStart(
                    4,
                    "0"
                );


        endGame(

            "YOU ESCAPED!",

            "You found the key and escaped the room!"

        );

    }

}


// =========================
// LOSE LIFE
// =========================

function loseLife() {

    if (
        gameOver ||
        invincible
    ) {

        return;

    }


    lives--;


    livesElement.textContent =
        lives;


    if (lives <= 0) {

        endGame(

            "GAME OVER",

            "The skeletons caught you!"

        );


        return;

    }


    resetPlayer();


    invincible = true;


    setTimeout(
        function () {

            invincible = false;

        },
        1200
    );

}


// =========================
// RESET PLAYER
// =========================

function resetPlayer() {

    player.x = 770;

    player.y = 510;

    player.velocityY = 0;

    player.climbing = false;

}


// =========================
// BACKGROUND
// =========================

function drawBackground() {

    const gradient =

        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );


    gradient.addColorStop(
        0,
        "#151b24"
    );


    gradient.addColorStop(
        1,
        "#050608"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    ctx.strokeStyle =
        "rgba(255,255,255,0.035)";


    for (
        let y = 20;
        y < canvas.height;
        y += 40
    ) {

        for (
            let x = 0;
            x < canvas.width;
            x += 80
        ) {

            const offset =

                (y / 40) %
                2 === 0
                    ? 0
                    : 40;


            ctx.strokeRect(

                x + offset,

                y,

                78,

                38

            );

        }

    }

}


// =========================
// PLATFORMS
// =========================

function drawPlatform(
    platform
) {

    ctx.fillStyle =
        "rgba(0,0,0,0.45)";


    ctx.fillRect(

        platform.x + 5,

        platform.y + 7,

        platform.width,

        platform.height

    );


    ctx.fillStyle =
        "#a13b30";


    ctx.fillRect(

        platform.x,

        platform.y,

        platform.width,

        platform.height

    );


    ctx.fillStyle =
        "#e0624d";


    ctx.fillRect(

        platform.x,

        platform.y,

        platform.width,

        4

    );


    ctx.strokeStyle =
        "#60221d";


    ctx.lineWidth = 2;


    for (

        let x =
            platform.x;

        x <
        platform.x +
        platform.width;

        x += 36

    ) {

        ctx.strokeRect(

            x,

            platform.y,

            36,

            platform.height

        );

    }

}


// =========================
// LADDERS
// =========================

function drawLadder(
    ladder
) {

    ctx.strokeStyle =
        "#4d8be2";


    ctx.lineWidth = 5;


    ctx.beginPath();


    ctx.moveTo(
        ladder.x,
        ladder.y
    );


    ctx.lineTo(

        ladder.x,

        ladder.y +
        ladder.height

    );


    ctx.stroke();


    ctx.beginPath();


    ctx.moveTo(

        ladder.x +
        ladder.width,

        ladder.y

    );


    ctx.lineTo(

        ladder.x +
        ladder.width,

        ladder.y +
        ladder.height

    );


    ctx.stroke();


    ctx.lineWidth = 4;


    for (

        let y =
            ladder.y + 10;

        y <
        ladder.y +
        ladder.height;

        y += 17

    ) {

        ctx.beginPath();


        ctx.moveTo(

            ladder.x,

            y

        );


        ctx.lineTo(

            ladder.x +
            ladder.width,

            y

        );


        ctx.stroke();

    }

}


// =========================
// PLAYER
// =========================

function drawPlayer() {

    ctx.save();


    if (
        invincible &&
        Math.floor(
            Date.now() / 100
        ) % 2 === 0
    ) {

        ctx.globalAlpha =
            0.35;

    }


    // legs

    ctx.fillStyle =
        "#285533";


    ctx.fillRect(

        player.x + 4,

        player.y + 31,

        9,

        11

    );


    ctx.fillRect(

        player.x + 20,

        player.y + 31,

        9,

        11

    );


    // body

    ctx.fillStyle =
        "#4fbd5e";


    ctx.fillRect(

        player.x + 2,

        player.y + 8,

        28,

        29

    );


    // head

    ctx.fillStyle =
        "#f2c872";


    ctx.fillRect(

        player.x + 6,

        player.y - 6,

        20,

        18

    );


    // hair

    ctx.fillStyle =
        "#3d281b";


    ctx.fillRect(

        player.x + 6,

        player.y - 6,

        20,

        5

    );


    // eyes

    ctx.fillStyle =
        "#111";


    ctx.fillRect(

        player.x + 10,

        player.y + 1,

        3,

        3

    );


    ctx.fillRect(

        player.x + 20,

        player.y + 1,

        3,

        3

    );


    // H

    ctx.fillStyle =
        "#12301a";


    ctx.font =
        "bold 16px Arial";


    ctx.fillText(

        "H",

        player.x + 10,

        player.y + 29

    );


    ctx.restore();

}


// =========================
// ENEMY
// =========================

function drawEnemy(enemy) {

    ctx.save();


    ctx.strokeStyle =
        "#e0e4dc";


    ctx.lineWidth = 5;

    ctx.lineCap =
        "round";


    // bones

    ctx.beginPath();


    ctx.moveTo(

        enemy.x + 4,

        enemy.y + 34

    );


    ctx.lineTo(

        enemy.x + 32,

        enemy.y + 20

    );


    ctx.stroke();


    ctx.beginPath();


    ctx.moveTo(

        enemy.x + 4,

        enemy.y + 20

    );


    ctx.lineTo(

        enemy.x + 32,

        enemy.y + 34

    );


    ctx.stroke();


    // skull

    ctx.fillStyle =
        "#f0f1e5";


    ctx.beginPath();


    ctx.arc(

        enemy.x + 18,

        enemy.y + 14,

        15,

        0,

        Math.PI * 2

    );


    ctx.fill();


    ctx.fillRect(

        enemy.x + 9,

        enemy.y + 18,

        18,

        11

    );


    // eyes

    ctx.fillStyle =
        "#111";


    ctx.beginPath();


    ctx.arc(

        enemy.x + 12,

        enemy.y + 13,

        4,

        0,

        Math.PI * 2

    );


    ctx.fill();


    ctx.beginPath();


    ctx.arc(

        enemy.x + 24,

        enemy.y + 13,

        4,

        0,

        Math.PI * 2

    );


    ctx.fill();


    ctx.restore();

}


// =========================
// KEY
// =========================

function drawKey() {

    if (
        keyItem.collected
    ) {

        return;

    }


    ctx.save();


    ctx.shadowColor =
        "#ffd838";


    ctx.shadowBlur =
        18;


    ctx.strokeStyle =
        "#ffd838";


    ctx.lineWidth = 6;

    ctx.lineCap =
        "round";


    ctx.beginPath();


    ctx.arc(

        keyItem.x + 9,

        keyItem.y + 10,

        8,

        0,

        Math.PI * 2

    );


    ctx.stroke();


    ctx.beginPath();


    ctx.moveTo(

        keyItem.x + 15,

        keyItem.y + 16

    );


    ctx.lineTo(

        keyItem.x + 15,

        keyItem.y + 32

    );


    ctx.lineTo(

        keyItem.x + 24,

        keyItem.y + 32

    );


    ctx.stroke();


    ctx.restore();

}


// =========================
// EXIT
// =========================

function drawExit() {

    ctx.save();


    if (hasKey) {

        ctx.shadowColor =
            "#43ff69";

        ctx.shadowBlur =
            20;

        ctx.fillStyle =
            "#48bd62";

    }

    else {

        ctx.shadowColor =
            "#ffd23c";

        ctx.shadowBlur =
            16;

        ctx.fillStyle =
            "#d4a42c";

    }


    ctx.fillRect(

        exitDoor.x,

        exitDoor.y,

        exitDoor.width,

        exitDoor.height

    );


    ctx.fillStyle =
        "#60361c";


    ctx.fillRect(

        exitDoor.x + 7,

        exitDoor.y + 8,

        exitDoor.width - 14,

        exitDoor.height - 8

    );


    ctx.strokeStyle =
        "#ffe56b";


    ctx.lineWidth = 4;


    ctx.strokeRect(

        exitDoor.x,

        exitDoor.y,

        exitDoor.width,

        exitDoor.height

    );


    ctx.fillStyle =
        "#ffe56b";


    ctx.beginPath();


    ctx.arc(

        exitDoor.x + 35,

        exitDoor.y + 34,

        4,

        0,

        Math.PI * 2

    );


    ctx.fill();


    ctx.restore();

}


// =========================
// TEXT
// =========================

function drawMissionText() {

    ctx.font =
        "bold 14px Courier New";


    if (!hasKey) {

        ctx.fillStyle =
            "#e5e8eb";


        ctx.fillText(

            "MISSION: FIND THE KEY",

            30,

            30

        );

    }

    else {

        ctx.fillStyle =
            "#61ff7c";


        ctx.fillText(

            "KEY FOUND! REACH THE EXIT",

            30,

            30

        );

    }

}


// =========================
// DRAW GAME
// =========================

function draw() {

    drawBackground();


    platforms.forEach(
        drawPlatform
    );


    ladders.forEach(
        drawLadder
    );


    drawKey();

    drawExit();


    enemies.forEach(
        drawEnemy
    );


    drawPlayer();

    drawMissionText();

}


// =========================
// END GAME
// =========================

function endGame(
    title,
    text
) {

    gameOver = true;


    messageTitle.textContent =
        title;


    messageText.textContent =
        text;


    gameMessage.classList.remove(
        "hidden-message"
    );

}


// =========================
// RESET GAME
// =========================

function resetGame() {

    score = 0;

    lives = 3;

    hasKey = false;

    gameOver = false;

    invincible = false;


    keyItem.collected =
        false;


    scoreElement.textContent =
        "0000";


    livesElement.textContent =
        "3";


    resetPlayer();


    enemies[0].x = 450;

    enemies[1].x = 600;

    enemies[2].x = 300;

    enemies[3].x = 580;

gameMessage.classList.add(
        "hidden-message"
    );

}


// =========================
// PLAY BUTTON
// =========================

playButton.addEventListener(
    "click",
    function () {

        resetGame();

        gameStarted = true;

        homeScreen.style.display =
            "none";

        gameScreen.classList.remove(
            "hidden-screen"
        );

    }
);


// =========================
// PLAY AGAIN
// =========================

restartButton.addEventListener(
    "click",
    function () {

        resetGame();

        gameStarted = true;

    }
);


// =========================
// HOME BUTTON
// =========================

homeButton.addEventListener(
    "click",
    function () {

        gameStarted = false;

        gameMessage.classList.add(
            "hidden-message"
        );

        gameScreen.classList.add(
            "hidden-screen"
        );

        homeScreen.style.display =
            "flex";

    }
);


// =========================
// SHARE BUTTON
// =========================

shareButton.addEventListener(
    "click",
    async function () {

        const url =
            window.location.href;

        if (navigator.share) {

            try {

                await navigator.share({

                    title:
                        "Escape The Room",

                    text:
                        "Can you escape my game?",

                    url:
                        url

                });

            }

            catch (error) {

                console.log(
                    "Share cancelled"
                );

            }

        }

        else {

            try {

                await navigator.clipboard.writeText(
                    url
                );

                shareButton.textContent =
                    "✓ LINK COPIED";

                setTimeout(
                    function () {

                        shareButton.textContent =
                            "🔗 SHARE WITH OTHERS";

                    },
                    1800
                );

            }

            catch (error) {

                alert(
                    "Upload the game online first, then the share link will work."
                );

            }

        }

    }
);


// =========================
// GAME LOOP
// =========================

function gameLoop() {

    if (gameStarted) {

        updatePlayer();

        updateEnemies();

        checkKey();

        checkExit();

        draw();

    }

    requestAnimationFrame(
        gameLoop
    );

}


// START GAME LOOP

gameLoop();
